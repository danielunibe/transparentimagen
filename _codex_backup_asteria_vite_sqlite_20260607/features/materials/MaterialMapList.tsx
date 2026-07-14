import { PbrMapType, PbrTextureMap } from '@/types/asteria';
import { MaterialMapOverrideMenu } from './MaterialMapOverrideMenu';

interface MaterialMapListProps {
    maps: PbrTextureMap[];
    onOverrideMapType?: (mapId: string, mapType: PbrMapType) => void;
    onResetOverride?: (mapId: string) => void;
}

export function MaterialMapList({ maps, onOverrideMapType, onResetOverride }: MaterialMapListProps) {
    if (maps.length === 0) {
        return <p className="text-xs text-[#7f826f]">No recognized maps yet.</p>;
    }

    const overrideCount = maps.filter((map) => map.isManualOverride).length;

    return (
        <div className="flex flex-wrap gap-2">
            {overrideCount > 0 ? (
                <div className="w-full text-[10px] text-[#fde400]">
                    {overrideCount} manual override{overrideCount === 1 ? '' : 's'} active
                </div>
            ) : null}
            {maps.map((map) => (
                <div key={map.id} className="px-2.5 py-1.5 rounded-lg bg-[#101212] ring-1 ring-white/[0.05]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#f2f2ef]">{map.mapType.replace(/_/g, ' ')}</div>
                    <div className="text-[10px] text-[#7f826f] truncate max-w-[160px]">{map.fileName}</div>
                    {map.isManualOverride ? (
                        <div className="text-[10px] text-[#fde400] mt-1">Manual override</div>
                    ) : null}
                    {onOverrideMapType && onResetOverride ? (
                        <MaterialMapOverrideMenu
                            currentType={map.mapType}
                            onOverride={(nextType) => onOverrideMapType(map.id, nextType)}
                            onReset={() => onResetOverride(map.id)}
                        />
                    ) : null}
                </div>
            ))}
        </div>
    );
}
