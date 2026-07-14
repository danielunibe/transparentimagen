import { useMemo, useState } from 'react';
import { GalleryItem } from '@/types/asteria';
import { suggestCollections } from '@/services/mediaOrganizationService';
import { createOrganizationPlan } from '@/services/fileOrganizationService';
import { loadEventClusters, loadPersonClusters, loadPlaceTags } from '@/services/organizationStorageService';
import { OrganizationSuggestionCard } from './OrganizationSuggestionCard';
import { OrganizationPlanPreview } from './OrganizationPlanPreview';
import { PeoplePanel } from './PeoplePanel';
import { PlacesPanel } from './PlacesPanel';
import { EventsPanel } from './EventsPanel';

interface OrganizerViewProps {
    items: GalleryItem[];
    onApplyFilterToAssets?: (assetIds: string[]) => void;
    onBackToLibrary?: () => void;
}

export function OrganizerView({ items, onApplyFilterToAssets, onBackToLibrary }: OrganizerViewProps) {
    const [activePlanStrategy, setActivePlanStrategy] = useState<string>('by year');
    const mediaItems = useMemo(() => items.filter(item => item.kind !== 'folder'), [items]);
    const suggestions = useMemo(() => suggestCollections(items), [items]);
    const plan = useMemo(() => createOrganizationPlan(mediaItems, activePlanStrategy), [mediaItems, activePlanStrategy]);
    const people = useMemo(() => loadPersonClusters(), []);
    const places = useMemo(() => loadPlaceTags(), []);
    const events = useMemo(() => loadEventClusters(), []);

    const photos = mediaItems.filter(item => item.kind === 'image').length;
    const videos = mediaItems.filter(item => item.kind === 'video').length;
    const screenshots = mediaItems.filter(item => item.metadata?.organization?.isScreenshot).length;
    const unorganized = mediaItems.filter(item => !item.metadata?.organization?.people?.length && !item.metadata?.organization?.places?.length && !item.metadata?.organization?.eventIds?.length).length;
    const missingMetadata = mediaItems.filter(item => !item.metadata?.organization?.dateTaken || !item.metadata?.organization?.cameraModel).length;

    const statCards = [
        { label: 'Photos', value: photos },
        { label: 'Videos', value: videos },
        { label: 'Screenshots', value: screenshots },
        { label: 'Unorganized', value: unorganized },
        { label: 'Missing Metadata', value: missingMetadata },
    ];

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 bg-[radial-gradient(circle_at_top_left,rgba(77,224,130,0.08),transparent_30%),linear-gradient(180deg,#0a0b0b,#070808)]">
            <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-[#7f826f] font-bold">Organizer</div>
                        <h1 className="text-[#f2f2ef] text-[28px] font-semibold tracking-tight mt-2">Photo Intelligence Organizer Foundation</h1>
                        <p className="text-[#9ca099] text-[13px] max-w-[720px] mt-2 leading-relaxed">
                            Asteria now prepares a local-first media library for photos and videos, with lightweight metadata, safe suggestions, and preview-only organization plans.
                        </p>
                    </div>
                    {onBackToLibrary && (
                        <button
                            onClick={onBackToLibrary}
                            className="px-4 py-2 rounded-2xl bg-[#151818] text-[#f2f2ef] text-[12px] font-semibold hover:bg-[#1a1c1c] transition-colors"
                        >
                            Back to Library
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                    {statCards.map(card => (
                        <div key={card.label} className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.04] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-[#7f826f] font-bold">{card.label}</div>
                            <div className="text-[#f2f2ef] text-[24px] font-semibold mt-2">{card.value}</div>
                        </div>
                    ))}
                </div>

                <div className="grid xl:grid-cols-[1.6fr_1fr] gap-6">
                    <section className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-[#7f826f] font-bold">Suggestions</div>
                                <h2 className="text-[#f2f2ef] text-[18px] font-semibold mt-1">Suggested organization passes</h2>
                            </div>
                            <select
                                value={activePlanStrategy}
                                onChange={(event) => setActivePlanStrategy(event.target.value)}
                                className="bg-[#151818] text-[#f2f2ef] text-[12px] rounded-xl px-3 py-2 outline-none"
                            >
                                <option value="by year">Plan by Year</option>
                                <option value="videos">Plan for Videos</option>
                                <option value="screenshots">Plan for Screenshots</option>
                                <option value="by format">Plan by Format</option>
                            </select>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            {suggestions.slice(0, 8).map(suggestion => (
                                <OrganizationSuggestionCard key={suggestion.id} suggestion={suggestion} onApplyFilter={onApplyFilterToAssets} />
                            ))}
                        </div>
                    </section>

                    <OrganizationPlanPreview plan={plan} />
                </div>

                <div className="grid xl:grid-cols-3 gap-6">
                    <PeoplePanel people={people} />
                    <PlacesPanel places={places} />
                    <EventsPanel events={events} />
                </div>
            </div>
        </div>
    );
}
