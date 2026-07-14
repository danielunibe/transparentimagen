import { MaterialFolderMetadata } from '@/types/asteria';
import { Material3DPreview } from './Material3DPreview';

interface MaterialPreviewPlaceholderProps {
    material?: MaterialFolderMetadata | null;
}

export function MaterialPreviewPlaceholder({ material }: MaterialPreviewPlaceholderProps) {
    if (material) {
        return <Material3DPreview material={material} diagnostics={material.diagnostics} />;
    }

    return (
        <div className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-4 flex flex-col gap-4">
            <div className="aspect-[4/3] rounded-2xl bg-[radial-gradient(circle_at_top,#242828,transparent_60%),linear-gradient(180deg,#111414,#090b0b)] ring-1 ring-white/[0.04] flex items-center justify-center gap-8">
                <div className="w-24 h-24 rounded-full border border-white/[0.14] bg-white/[0.03]" />
                <div className="w-20 h-20 rounded-2xl border border-white/[0.14] bg-white/[0.03]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['Rotate', 'Light', 'Roughness', 'Environment'].map((label) => (
                    <button key={label} disabled className="px-3 py-2 rounded-xl bg-[#0c0f0f] text-[#6f7468] text-xs font-semibold ring-1 ring-white/[0.04] cursor-not-allowed">
                        {label}
                    </button>
                ))}
            </div>
            <p className="text-xs text-[#7f826f]">Attach a material folder to open the local 3D preview foundation.</p>
        </div>
    );
}
