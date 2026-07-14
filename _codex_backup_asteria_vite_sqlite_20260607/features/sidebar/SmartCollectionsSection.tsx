import { Inbox, Clock, Layers, Sparkles, Download, SlidersHorizontal, Database, MemoryStick, Image as ImageIcon, Folder, X, Maximize2, Film, Monitor, HardDrive, Calendar, Copy } from 'lucide-react';
import { SmartCollection, SavedView, SmartCollectionKind } from '@/types/asteria';

interface SmartCollectionsSectionProps {
    builtInCollections: SmartCollection[];
    savedViews: SavedView[];
    activeCollectionId: string | null;
    onSelectCollection: (id: string) => void;
    onDeleteSavedView: (id: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
    'Clock': <Clock className="w-3.5 h-3.5" />,
    'Layers': <Layers className="w-3.5 h-3.5" />,
    'Sparkles': <Sparkles className="w-3.5 h-3.5" />,
    'Download': <Download className="w-3.5 h-3.5" />,
    'SlidersHorizontal': <SlidersHorizontal className="w-3.5 h-3.5" />,
    'Database': <Database className="w-3.5 h-3.5" />,
    'MemoryStick': <MemoryStick className="w-3.5 h-3.5" />,
    'Maximize2': <Maximize2 className="w-3.5 h-3.5" />,
    'Image': <ImageIcon className="w-3.5 h-3.5" />,
    'Folder': <Folder className="w-3.5 h-3.5" />,
    'Film': <Film className="w-3.5 h-3.5" />,
    'Monitor': <Monitor className="w-3.5 h-3.5" />,
    'HardDrive': <HardDrive className="w-3.5 h-3.5" />,
    'Calendar': <Calendar className="w-3.5 h-3.5" />,
    'Copy': <Copy className="w-3.5 h-3.5" />
};

export function SmartCollectionsSection({
    builtInCollections,
    savedViews,
    activeCollectionId,
    onSelectCollection,
    onDeleteSavedView
}: SmartCollectionsSectionProps) {
    
    // Group collections? Maybe just show list.
    const topCollections = builtInCollections.filter(c => ['recently_edited', 'has_variants', 'ai_processed'].includes(c.kind));
    const otherCollections = builtInCollections.filter(c => !topCollections.includes(c));

    const renderItem = (id: string, label: string, iconNode: React.ReactNode, isDeletable?: boolean) => {
        const isActive = activeCollectionId === id;
        return (
            <div 
                key={id}
                onClick={() => onSelectCollection(id)}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border ${
                    isActive 
                        ? 'bg-[#4de082]/10 border-[#4de082]/30 text-[#4de082]' 
                        : 'border-transparent text-[#b8b59f] hover:bg-[#151818] hover:text-[#f2f2ef]'
                }`}
            >
                <div className="flex items-center gap-2">
                    <div className={isActive ? 'text-[#4de082]' : 'text-[#7f826f] group-hover:text-[#f2f2ef] transition-colors'}>
                        {iconNode}
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide truncate flex-1">{label}</span>
                </div>
                {isDeletable && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteSavedView(id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#7f826f] hover:text-red-400 transition-colors"
                        title="Delete saved view"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-1 px-3 mt-4">
            <h3 className="text-[9px] font-bold text-[#7f826f] uppercase tracking-widest px-2 mb-1.5 font-sans">Smart Collections</h3>
            
            {topCollections.map(c => renderItem(c.id, c.label, c.icon ? iconMap[c.icon] : <Layers className="w-3.5 h-3.5" />))}
            
            <div className="h-2"></div>
            
            {otherCollections.map(c => renderItem(c.id, c.label, c.icon ? iconMap[c.icon] : <Layers className="w-3.5 h-3.5" />))}

            {savedViews.length > 0 && (
                <>
                    <h3 className="text-[9px] font-bold text-[#7f826f] uppercase tracking-widest px-2 mt-4 mb-1.5 font-sans">Saved Views</h3>
                    {savedViews.map(v => renderItem(v.id, v.label, <Inbox className="w-3.5 h-3.5" />, true))}
                </>
            )}
        </div>
    );
}
