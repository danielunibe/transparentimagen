import { BrandBlock } from './BrandBlock';
import { WorkspaceStatus } from './WorkspaceStatus';
import { NavigationSection } from './NavigationSection';
import { FolderSourcesSection } from './FolderSourcesSection';
import { SmartCollectionsSection } from './SmartCollectionsSection';
import { OrganizerSection } from './OrganizerSection';
import { SidebarFooter } from './SidebarFooter';
import { AppView, AssetFilterMode, SmartCollection, SavedView } from '@/types/asteria';

interface SidebarProps {
    currentView: AppView;
    activeMode: string;
    filterMode: AssetFilterMode;
    setActiveMode: (mode: string) => void;
    setCurrentView: (view: AppView) => void;
    setFilterMode: (filter: AssetFilterMode) => void;
    workspace: any;
    builtInCollections?: SmartCollection[];
    savedViews?: SavedView[];
    activeCollectionId?: string | null;
    onSelectCollection?: (id: string) => void;
    onDeleteSavedView?: (id: string) => void;
}

export function Sidebar({
    currentView,
    activeMode,
    filterMode,
    setActiveMode,
    setCurrentView,
    setFilterMode,
    workspace,
    builtInCollections = [],
    savedViews = [],
    activeCollectionId = null,
    onSelectCollection = () => {},
    onDeleteSavedView = () => {}
}: SidebarProps) {
    return (
        <aside className="hidden md:flex w-[260px] bg-[#101212] flex-col shrink-0 overflow-hidden z-20 rounded-3xl ring-1 ring-white/[0.035] shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
            <BrandBlock />

            <div className="flex-1 overflow-y-auto no-scrollbar py-4 flex flex-col gap-6">
                <WorkspaceStatus />
                
                <NavigationSection 
                    currentView={currentView}
                    activeMode={activeMode}
                    setActiveMode={setActiveMode}
                    setCurrentView={setCurrentView}
                />

                {(currentView === 'library' || currentView === 'organizer' || currentView === 'smart_folders' || currentView === 'materials') && (
                    <>
                        <FolderSourcesSection 
                            filterMode={filterMode}
                            setFilterMode={setFilterMode}
                            workspace={workspace}
                        />
                        <SmartCollectionsSection
                            builtInCollections={builtInCollections}
                            savedViews={savedViews}
                            activeCollectionId={activeCollectionId}
                            onSelectCollection={onSelectCollection}
                            onDeleteSavedView={onDeleteSavedView}
                        />
                        <OrganizerSection onSelectCollection={onSelectCollection} />
                    </>
                )}
            </div>

            <SidebarFooter />
        </aside>
    );
}
