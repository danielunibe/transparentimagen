'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { MaterialDiagnostics, MaterialFolderMetadata } from '@/types/asteria';
import { explainUnavailableFeature, getRuntimeFeatureStatus } from '@/services/runtimeCapabilityService';
import { getCachedRuntimeCapabilitySnapshot } from '@/services/capabilityStatusService';
import { getPreferredAoMap, getPreferredBaseColorMap, getPreferredMetalnessMap, getPreferredNormalMap, getPreferredRoughnessMap, resolveMaterialPreviewMaps, summarizeMaterialPreviewReadiness } from '@/services/materialPreviewBindingService';
import { hasMaterialOverrides } from '@/services/materialDiagnosticsService';

export type Material3DPreviewGeometry = 'sphere' | 'cube' | 'plane';

interface Material3DPreviewProps {
    material: MaterialFolderMetadata;
    diagnostics?: MaterialDiagnostics;
    fallbackReason?: string;
}

interface MaterialTextureHandle {
    mapType: string;
    texture: THREE.Texture;
    objectUrl?: string;
}

function getDirectWebGLSupport() {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
}

function getFallbackReason(material: MaterialFolderMetadata, diagnostics?: MaterialDiagnostics, fallbackReason?: string): string {
    if (fallbackReason) return fallbackReason;
    if (!diagnostics) return 'Material diagnostics are not available yet.';
    if (!diagnostics.completeness.presentRequiredMaps.some((map) => ['base_color', 'albedo', 'diffuse'].includes(map))) {
        return 'A base color map is required for the 3D preview.';
    }
    if (!diagnostics.completeness.presentRequiredMaps.includes('normal')) {
        return 'A normal map is recommended before enabling the full preview.';
    }
    if (diagnostics.completeness.missingRequiredMaps.length > 0) {
        return `Missing required maps: ${diagnostics.completeness.missingRequiredMaps.join(', ')}.`;
    }
    if (hasMaterialOverrides(material)) {
        return 'Manual overrides are active and will be respected by the preview.';
    }
    return 'Preview uses Three.js direct rendering with local-only resources.';
}

function getPreviewColor(material: MaterialFolderMetadata): string {
    switch ((material.category || 'other').toLowerCase()) {
        case 'wood': return '#8b6f4b';
        case 'metal': return '#8c939e';
        case 'stone': return '#7f7f84';
        case 'fabric': return '#6f7e91';
        case 'plastic': return '#7a7dd1';
        case 'organic': return '#5c8f60';
        case 'ground': return '#867455';
        case 'wall': return '#9f968b';
        case 'ceramic': return '#d9d0c6';
        case 'glass': return '#8ad4e8';
        case 'tile': return '#c3b8a9';
        case 'skin': return '#c98f79';
        default: return '#b2a58f';
    }
}

function getGeometry(kind: Material3DPreviewGeometry): THREE.BufferGeometry {
    if (kind === 'cube') return new THREE.BoxGeometry(1.25, 1.25, 1.25);
    if (kind === 'plane') return new THREE.PlaneGeometry(1.8, 1.2, 1, 1);
    return new THREE.SphereGeometry(0.8, 64, 48);
}

function getTextureSource(map: { objectUrl?: string; file?: File } | undefined): { source: string; objectUrl?: string } | null {
    if (!map) return null;
    if (map.objectUrl) return { source: map.objectUrl };
    if (map.file) {
        const objectUrl = URL.createObjectURL(map.file);
        return { source: objectUrl, objectUrl };
    }
    return null;
}

async function loadTextureForMap(map: { objectUrl?: string; file?: File } | undefined, mapType: string): Promise<MaterialTextureHandle | null> {
    const source = getTextureSource(map);
    if (!source) return null;
    try {
        const loader = new THREE.TextureLoader();
        const texture = await loader.loadAsync(source.source);
        texture.colorSpace = mapType === 'base_color' || mapType === 'emissive' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.flipY = false;
        texture.needsUpdate = true;
        return { mapType, texture, objectUrl: source.objectUrl };
    } catch {
        if (source.objectUrl) URL.revokeObjectURL(source.objectUrl);
        return null;
    }
}

function disposeMaterialTexture(texture?: THREE.Texture | null) {
    texture?.dispose();
}

function disposeThreeMaterialPreviewResources(params: {
    material?: THREE.MeshStandardMaterial | null;
    geometry?: THREE.BufferGeometry | null;
    textures?: MaterialTextureHandle[];
}) {
    params.textures?.forEach((entry) => {
        disposeMaterialTexture(entry.texture);
        if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
    });
    params.material?.dispose();
    params.geometry?.dispose();
}

function isPlaneGeometry(kind: Material3DPreviewGeometry) {
    return kind === 'plane';
}

function applyTextureBindings(material: THREE.MeshStandardMaterial, textures: MaterialTextureHandle[], geometryKind: Material3DPreviewGeometry) {
    const textureByType = new Map(textures.map((entry) => [entry.mapType, entry.texture]));
    const baseColor = textureByType.get('base_color');
    const normal = textureByType.get('normal');
    const roughness = textureByType.get('roughness');
    const metalness = textureByType.get('metallic');
    const ao = textureByType.get('ambient_occlusion');
    const emissive = textureByType.get('emissive');

    if (baseColor) {
        material.map = baseColor;
        material.color.set('#ffffff');
    }
    if (normal) material.normalMap = normal;
    if (roughness) material.roughnessMap = roughness;
    if (metalness) material.metalnessMap = metalness;
    if (ao) {
        material.aoMap = ao;
        material.aoMapIntensity = 1;
    }
    if (emissive) {
        material.emissiveMap = emissive;
        material.emissive.set('#ffffff');
        material.emissiveIntensity = 0.5;
    }
    if (isPlaneGeometry(geometryKind)) {
        material.side = THREE.DoubleSide;
    }
    material.needsUpdate = true;
}

export function Material3DPreview({ material, diagnostics, fallbackReason }: Material3DPreviewProps) {
    const [geometry, setGeometry] = useState<Material3DPreviewGeometry>('sphere');
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const baseMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const frameRef = useRef<number | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const activeTexturesRef = useRef<MaterialTextureHandle[]>([]);
    const activeObjectUrlsRef = useRef<string[]>([]);
    const geometryKindRef = useRef<Material3DPreviewGeometry>('sphere');

    const previewBinding = useMemo(() => resolveMaterialPreviewMaps(material), [material]);
    const previewFallback = useMemo(() => getFallbackReason(material, diagnostics, fallbackReason), [material, diagnostics, fallbackReason]);
    const capabilitySnapshot = useMemo(() => getCachedRuntimeCapabilitySnapshot(), []);
    const webglStatus = getRuntimeFeatureStatus(capabilitySnapshot, 'webgl');
    const rendererStatus = getRuntimeFeatureStatus(capabilitySnapshot, 'material_3d_preview');
    const directWebglSupport = getDirectWebGLSupport();
    const canUseWebGL = Boolean(webglStatus?.available ?? directWebglSupport);
    const canUseRenderer = Boolean(rendererStatus?.available ?? canUseWebGL);

    const capabilityMessage = useMemo(() => {
        if (rendererStatus) return explainUnavailableFeature(rendererStatus);
        if (!canUseWebGL) return 'Material 3D preview is unavailable because WebGL is missing.';
        if (!canUseRenderer) return 'Material 3D preview needs the local Three.js renderer bundle.';
        return 'Three.js renderer is available.';
    }, [canUseRenderer, canUseWebGL, rendererStatus]);

    const bindingSummary = useMemo(() => summarizeMaterialPreviewReadiness(previewBinding), [previewBinding]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !canUseRenderer || rendererRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#111414');
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0.1, 3.2);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        rendererRef.current = renderer;
        container.replaceChildren(renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 1.35);
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.15);
        keyLight.position.set(3, 5, 4);
        const fillLight = new THREE.DirectionalLight(0x88aaff, 0.7);
        fillLight.position.set(-4, 0, -2);
        scene.add(ambient, keyLight, fillLight);

        const geometryInstance = getGeometry(geometryKindRef.current);
        const materialInstance = new THREE.MeshStandardMaterial({
            color: new THREE.Color(getPreviewColor(material)),
            roughness: 0.82,
            metalness: material.targetEngine === 'unreal' || material.targetEngine === 'blender' ? 0.18 : 0.06,
        });
        baseMaterialRef.current = materialInstance;

        const mesh = new THREE.Mesh(geometryInstance, materialInstance);
        if (geometryKindRef.current === 'plane') {
            mesh.rotation.x = -Math.PI / 2.1;
        }
        meshRef.current = mesh;
        scene.add(mesh);

        const resize = () => {
            const currentContainer = containerRef.current;
            const currentRenderer = rendererRef.current;
            const currentCamera = cameraRef.current;
            if (!currentContainer || !currentRenderer || !currentCamera) return;
            const rect = currentContainer.getBoundingClientRect();
            const width = Math.max(1, rect.width);
            const height = Math.max(1, rect.height);
            currentRenderer.setSize(width, height, false);
            currentCamera.aspect = width / height;
            currentCamera.updateProjectionMatrix();
        };

        resize();
        resizeObserverRef.current = new ResizeObserver(resize);
        resizeObserverRef.current.observe(container);

        const animate = () => {
            frameRef.current = window.requestAnimationFrame(animate);
            if (meshRef.current) {
                meshRef.current.rotation.y += 0.006;
                if (geometryKindRef.current === 'cube') {
                    meshRef.current.rotation.x += 0.0025;
                }
            }
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
            resizeObserverRef.current?.disconnect();
            resizeObserverRef.current = null;
            if (meshRef.current) {
                scene.remove(meshRef.current);
                meshRef.current = null;
            }
            disposeThreeMaterialPreviewResources({
                material: baseMaterialRef.current,
                geometry: undefined,
                textures: activeTexturesRef.current,
            });
            baseMaterialRef.current = null;
            activeTexturesRef.current = [];
            activeObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            activeObjectUrlsRef.current = [];
            renderer.dispose();
            rendererRef.current = null;
            sceneRef.current = null;
            cameraRef.current = null;
            container.replaceChildren();
        };
    }, [canUseRenderer, material]);

    useEffect(() => {
        geometryKindRef.current = geometry;
        if (!meshRef.current) return;

        const previousGeometry = meshRef.current.geometry;
        const nextGeometry = getGeometry(geometry);
        meshRef.current.geometry = nextGeometry;
        previousGeometry.dispose();

        if (geometry === 'plane' && meshRef.current.material instanceof THREE.MeshStandardMaterial) {
            meshRef.current.rotation.x = -Math.PI / 2.1;
        } else if (meshRef.current) {
            meshRef.current.rotation.x = 0;
        }
    }, [geometry]);

    useEffect(() => {
        const currentMaterial = baseMaterialRef.current;
        if (!currentMaterial || !meshRef.current || !canUseRenderer) return;

        activeTexturesRef.current.forEach((entry) => {
            entry.texture.dispose();
            if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
        });
        activeTexturesRef.current = [];

        const bindingCandidates = [
            { mapType: 'base_color', map: getPreferredBaseColorMap(material) },
            { mapType: 'normal', map: getPreferredNormalMap(material) },
            { mapType: 'roughness', map: getPreferredRoughnessMap(material) },
            { mapType: 'metallic', map: getPreferredMetalnessMap(material) },
            { mapType: 'ambient_occlusion', map: getPreferredAoMap(material) },
        ] as const;

        Promise.all(bindingCandidates.map(async ({ mapType, map }) => {
            if (!map) return null;
            const extendedMap = map as unknown as { objectUrl?: string; file?: File };
            const source = extendedMap.objectUrl || null;
            if (!source && !extendedMap.file) return null;
            const loaded = await loadTextureForMap(extendedMap, mapType);
            return loaded;
        }))
            .then((results) => {
                const textures = results.filter((entry): entry is MaterialTextureHandle => Boolean(entry));
                activeTexturesRef.current = textures;
                activeObjectUrlsRef.current = textures.map((entry) => entry.objectUrl).filter((url): url is string => Boolean(url));
                applyTextureBindings(currentMaterial, textures, geometryKindRef.current);
            })
            .catch(() => {
                activeTexturesRef.current = [];
                activeObjectUrlsRef.current = [];
                currentMaterial.needsUpdate = true;
            });
    }, [canUseRenderer, geometry, material, previewBinding]);

    const fallbackCopy = useMemo(() => {
        if (previewBinding.previewReadiness === 'basic') {
            return `${previewFallback} ${bindingSummary}`;
        }
        if (previewBinding.previewReadiness === 'partial') {
            return `${previewFallback} ${bindingSummary}`;
        }
        if (previewBinding.appliedOverrides.length > 0) {
            return `${previewFallback} Manual overrides are active and respected by the preview.`;
        }
        return `${previewFallback} ${bindingSummary}`;
    }, [bindingSummary, previewBinding.appliedOverrides.length, previewBinding.previewReadiness, previewFallback]);

    const mapMessages = useMemo(() => [
        `Base color: ${previewBinding.baseColorMap ? 'bound' : 'missing'}`,
        `Normal: ${previewBinding.normalMap ? 'bound' : 'missing'}`,
        `Roughness: ${previewBinding.roughnessMap ? 'bound' : 'missing'}`,
        `Metallic: ${previewBinding.metalnessMap ? 'bound' : 'missing'}`,
        `AO: ${previewBinding.aoMap ? 'bound' : 'missing'}`,
        `Readiness: ${previewBinding.previewReadiness}`,
    ], [previewBinding]);

    return (
        <section className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs text-[#7f826f]">3D preview</div>
                    <div className="text-sm font-semibold text-[#f2f2ef]">{material.materialName || material.folderName}</div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#151818] text-[11px] text-[#b8b59f] ring-1 ring-white/[0.04]">
                    {canUseRenderer ? 'Three.js renderer' : 'Foundation scaffold'}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {(['sphere', 'cube', 'plane'] as Material3DPreviewGeometry[]).map((item) => (
                    <button
                        key={item}
                        onClick={() => setGeometry(item)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${geometry === item ? 'bg-[#fde400] text-[#121414]' : 'bg-[#0c0f0f] text-[#b8b59f] ring-1 ring-white/[0.04]'}`}
                    >
                        {item}
                    </button>
                ))}
            </div>

            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[radial-gradient(circle_at_top,#242828,transparent_60%),linear-gradient(180deg,#111414,#090b0b)] ring-1 ring-white/[0.04]">
                {canUseRenderer ? (
                    <div ref={containerRef} className="w-full h-full" />
                ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center">
                        <div className="max-w-md">
                            <div className="text-sm font-semibold text-[#f2f2ef] mb-2">3D preview is not active yet.</div>
                            <div className="text-xs text-[#b8b59f] leading-relaxed">{fallbackCopy}</div>
                            <div className="mt-3 text-[11px] text-[#7f826f]">{capabilityMessage}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-xl bg-[#0c0f0f] px-3 py-2 text-xs text-[#b8b59f] ring-1 ring-white/[0.04]">
                    Base color: {previewBinding.baseColorMap ? 'bound' : 'missing'}
                </div>
                <div className="rounded-xl bg-[#0c0f0f] px-3 py-2 text-xs text-[#b8b59f] ring-1 ring-white/[0.04]">
                    Normal: {previewBinding.normalMap ? 'bound' : 'missing'}
                </div>
                <div className="rounded-xl bg-[#0c0f0f] px-3 py-2 text-xs text-[#b8b59f] ring-1 ring-white/[0.04]">
                    Target: {material.targetEngine || 'generic'}
                </div>
                <div className="rounded-xl bg-[#0c0f0f] px-3 py-2 text-xs text-[#b8b59f] ring-1 ring-white/[0.04]">
                    Diagnostics: {diagnostics?.completeness.score ?? material.completenessScore ?? 0}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {mapMessages.map((message) => (
                    <div key={message} className="rounded-xl bg-[#0c0f0f] px-3 py-2 text-xs text-[#b8b59f] ring-1 ring-white/[0.04]">
                        {message}
                    </div>
                ))}
            </div>
        </section>
    );
}
