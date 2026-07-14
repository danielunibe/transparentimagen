import { Search, LayoutGrid, RotateCcw, FolderOpen, ArrowDownUp, Filter, BookmarkPlus, X } from 'lucide-react';
import { ViewDensity, AssetSortMode, AssetFilterMode, SmartCollection } from '@/types/asteria';
import { useState } from 'react';
import { getSearchHint } from '@/services/searchService';
import { shouldShowLargeCollectionWarning } from '@/services/performanceService';

interface LibraryHeaderProps {
    viewDensity: ViewDensity;
    cycleViewDensity: () => void;
    sortMode: AssetSortMode;
    setSortMode: (mode: AssetSortMode) => void;
    filterMode: AssetFilterMode;
    setFilterMode: (mode: AssetFilterMode) => void;
    workspace: any;
    activeCollection?: SmartCollection | null;
    clearActiveCollection?: () => void;
    saveCurrentView?: (label: string, criteria: any) => void;
}

export function LibraryHeader({ 
    viewDensity, 
    cycleViewDensity, 
    sortMode, setSortMode, filterMode, setFilterMode, workspace,
    activeCollection,
    clearActiveCollection,
    saveCurrentView
}: LibraryHeaderProps) {
    const { breadcrumb, folders, images, videos, rescanCurrent, addFolderSource, currentHandle, isScanning, searchQuery } = workspace;
    const totalCount = folders.length + images.length + videos.length;
    
    const [isSavingView, setIsSavingView] = useState(false);
    const [viewName, setViewName] = useState('');

    const searchHints = getSearchHint(searchQuery || '');

    // Title is the last breadcrumb or default, unless there's an active collection
    const title = activeCollection ? activeCollection.label : (breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'Local Library');
    
    const subtitle = activeCollection 
        ? (activeCollection.description || 'Smart Collection')
        : (currentHandle 
            ? (isScanning ? 'Scanning...' : `${images.length} photos · ${videos.length} videos · ${folders.length} folders`)
            : (workspace.needsReconnect ? 'Connection lost, click reconnect' : 'Ready to connect a folder')
        );

    const handleSaveViewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (viewName.trim() && saveCurrentView) {
            saveCurrentView(viewName.trim(), {
                filterMode,
                sortMode,
                viewDensity,
                searchQuery,
                ...activeCollection?.criteria
            });
            setIsSavingView(false);
            setViewName('');
        }
    };

    return (
        <header className="h-[64px] flex items-center justify-between px-1 sm:px-2 bg-transparent shrink-0 z-10 transition-colors">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-[15px] font-bold tracking-wide text-[#f2f2ef] leading-tight">
                                {title}
                            </h1>
                            {activeCollection && (
                                <button 
                                    onClick={clearActiveCollection}
                                    className="px-1.5 py-0.5 rounded-full bg-[#1d1e1e] hover:bg-[#282a2a] text-[#b8b59f] hover:text-[#f2f2ef] transition-colors"
                                    title="Clear collection filter"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <span className="text-[11px] text-[#7f826f] font-medium leading-tight">
                            {subtitle}
                        </span>
                    </div>
                </div>

                {!activeCollection && breadcrumb.length > 0 && (
                    <div className="hidden lg:flex items-center gap-2 text-[11px] font-medium text-[#7f826f] px-4 py-1.5 ml-2 border-l border-white/[0.04]">
                        {breadcrumb.map((b: {name: string}, i: number) => {
                            const isLast = i === breadcrumb.length - 1;
                            return (
                                <div key={i} className="flex items-center gap-2">
                                    <span 
                                        className={`${isLast ? 'text-[#f2f2ef]' : 'hover:text-[#f2f2ef] cursor-pointer transition-colors'}`}
                                        onClick={() => !isLast && workspace.navigateToBreadcrumb(i)}
                                    >
                                        {b.name}
                                    </span>
                                    {!isLast && <span className="text-[#333535]">/</span>}
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {searchHints.length > 0 && (
                    <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-white/[0.04]">
                        {searchHints.map((hint, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#4de082]/10 text-[#4de082] text-[10px] font-bold uppercase tracking-wider rounded border border-[#4de082]/20">
                                {hint}
                            </span>
                        ))}
                    </div>
                )}
                {shouldShowLargeCollectionWarning(totalCount) && (
                    <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full border border-[#fde400]/20 bg-[#fde400]/8 text-[#fde400] text-[9px] font-bold uppercase tracking-wider">
                        Large collection
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5 mr-2">
                    {isSavingView ? (
                        <form onSubmit={handleSaveViewSubmit} className="flex items-center gap-2 mr-2">
                            <input 
                                type="text"
                                autoFocus
                                value={viewName}
                                onChange={(e) => setViewName(e.target.value)}
                                placeholder="View name..."
                                className="bg-[#151818] border border-[#1d1e1e] px-2 py-1.5 rounded-lg text-[12px] text-[#f2f2ef] outline-none focus:border-[#4de082]/50 w-32"
                            />
                            <div className="flex items-center gap-1">
                                <button type="submit" className="text-[10px] font-bold text-[#f2f2ef] bg-[#4de082]/20 hover:bg-[#4de082]/30 px-2 py-1.5 rounded uppercase">Save</button>
                                <button type="button" onClick={() => setIsSavingView(false)} className="text-[10px] font-bold text-[#b8b59f] hover:text-[#f2f2ef] bg-[#1d1e1e] hover:bg-[#282a2a] px-2 py-1.5 rounded uppercase">Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <button 
                            onClick={() => setIsSavingView(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent hover:bg-white/[0.035] text-[#b8b59f] hover:text-[#f2f2ef] text-[12px] font-medium rounded-xl transition-colors mr-2"
                            title="Save current view"
                        >
                            <BookmarkPlus className="w-4 h-4 text-[#7f826f]" />
                            Save View
                        </button>
                    )}

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#151818] rounded-xl text-[12px] text-[#b8b59f] focus-within:text-[#f2f2ef] focus-within:bg-[#1a1c1c] transition-colors border border-transparent focus-within:border-white/[0.035]">
                        <Search className="w-4 h-4 text-[#7f826f]" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={workspace.searchQuery}
                            onChange={(e) => workspace.setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-28 placeholder:text-[#7f826f] text-[#f2f2ef]" 
                        />
                    </div>
                    
                    <div className="flex items-center ml-2 border-l border-white/[0.04] pl-2 gap-1.5">
                        <select 
                            value={filterMode} 
                            onChange={e => setFilterMode(e.target.value as AssetFilterMode)}
                            className="appearance-none bg-transparent text-[#b8b59f] hover:text-[#f2f2ef] text-[12px] font-medium px-2 h-9 rounded-xl outline-none hover:bg-white/[0.035] cursor-pointer"
                        >
                            <option value="all">All</option>
                            <option value="images">Images</option>
                            <option value="videos">Videos</option>
                            <option value="folders">Folders</option>
                            <option value="png">PNG</option>
                            <option value="jpg">JPG</option>
                            <option value="svg">SVG</option>
                            <option value="webp">WebP</option>
                        </select>
                        
                        <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-[#7f826f] pointer-events-none"><ArrowDownUp className="w-3.5 h-3.5" /></span>
                            <select 
                                value={sortMode} 
                                onChange={e => setSortMode(e.target.value as AssetSortMode)}
                                className="appearance-none bg-transparent text-[#b8b59f] hover:text-[#f2f2ef] pl-7 pr-3 text-[12px] font-medium h-9 rounded-xl outline-none hover:bg-white/[0.035] cursor-pointer"
                            >
                                <option value="name_asc">Name (A-Z)</option>
                                <option value="name_desc">Name (Z-A)</option>
                                <option value="date_desc">Newest</option>
                                <option value="date_asc">Oldest</option>
                                <option value="size_desc">Largest</option>
                                <option value="size_asc">Smallest</option>
                                <option value="type">Type</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={cycleViewDensity}
                        className="w-9 h-9 flex items-center justify-center text-[#7f826f] hover:text-[#f2f2ef] hover:bg-white/[0.035] rounded-xl transition-all ml-1"
                        title="Switch view mode"
                    >
                        <LayoutGrid className="w-4 h-4 ml-[1px]" />
                    </button>
                </div>
                {!activeCollection && (
                    <button onClick={rescanCurrent} className="px-3 py-2 text-[#b8b59f] text-[12px] font-medium bg-transparent rounded-xl hover:bg-white/[0.035] hover:text-[#f2f2ef] transition-colors flex items-center gap-2">
                        <RotateCcw className={`w-4 h-4 text-[#7f826f] ${isScanning ? 'animate-spin' : ''}`} /> Rescan
                    </button>
                )}
                <button onClick={addFolderSource} className="px-4 py-1.5 bg-[#fde400] text-[#121414] font-bold text-[12px] rounded-xl hover:brightness-110 transition-colors flex items-center gap-2 ml-1 shadow-[0_4px_12px_rgba(253,228,0,0.15)] ring-1 ring-white/[0.05]">
                    <FolderOpen className="w-4 h-4" /> Add Folder
                </button>
            </div>
        </header>
    );
}
