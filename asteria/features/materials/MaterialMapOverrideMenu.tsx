import { PbrMapType } from '@/types/asteria';

const OVERRIDE_TYPES: PbrMapType[] = [
    'base_color',
    'normal',
    'roughness',
    'metallic',
    'ambient_occlusion',
    'height',
    'opacity',
    'emissive',
    'specular',
    'gloss',
    'unknown',
];

interface MaterialMapOverrideMenuProps {
    currentType: PbrMapType;
    onOverride: (mapType: PbrMapType) => void;
    onReset: () => void;
}

export function MaterialMapOverrideMenu({ currentType, onOverride, onReset }: MaterialMapOverrideMenuProps) {
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {OVERRIDE_TYPES.map((type) => (
                <button
                    key={type}
                    onClick={() => onOverride(type)}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                        currentType === type ? 'bg-[#fde400] text-[#121414]' : 'bg-[#151818] text-[#b8b59f] hover:text-[#f2f2ef]'
                    }`}
                >
                    {type}
                </button>
            ))}
            <button onClick={onReset} className="px-2 py-1 rounded-md text-[10px] font-semibold bg-[#0c0f0f] text-[#7f826f] hover:text-[#f2f2ef] ring-1 ring-white/[0.04]">
                Reset override
            </button>
        </div>
    );
}
