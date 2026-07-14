import { GalleryItem, PersonCluster, PlaceTag, EventCluster } from '@/types/asteria';
import { OrganizationPlan } from './fileOrganizationService';
import { OrganizationSuggestion } from './mediaOrganizationService';
import { downloadBlob } from './exportService';

export interface OrganizationReport {
    id: string;
    createdAt: string;
    totalAssets: number;
    photos: number;
    videos: number;
    screenshots: number;
    unorganized: number;
    suggestions: Pick<OrganizationSuggestion, 'id' | 'type' | 'label'>[];
    plannedMoves: number;
    manualTags: {
        people: number;
        places: number;
        events: number;
    };
}

export function createOrganizationReport(params: {
    assets: GalleryItem[];
    suggestions: OrganizationSuggestion[];
    plans?: OrganizationPlan[];
    peopleClusters?: PersonCluster[];
    placeTags?: PlaceTag[];
    eventClusters?: EventCluster[];
}): OrganizationReport {
    const { assets, suggestions, plans = [], peopleClusters = [], placeTags = [], eventClusters = [] } = params;
    const mediaAssets = assets.filter(asset => asset.kind !== 'folder');
    return {
        id: `organization_report_${Date.now()}`,
        createdAt: new Date().toISOString(),
        totalAssets: mediaAssets.length,
        photos: assets.filter(asset => asset.kind === 'image').length,
        videos: assets.filter(asset => asset.kind === 'video').length,
        screenshots: mediaAssets.filter(asset => asset.metadata?.organization?.isScreenshot).length,
        unorganized: mediaAssets.filter(asset => {
            const organization = asset.metadata?.organization;
            return !organization?.people?.length && !organization?.places?.length && !organization?.eventIds?.length;
        }).length,
        suggestions: suggestions.map(({ id, type, label }) => ({ id, type, label })),
        plannedMoves: plans.reduce((acc, plan) => acc + plan.items.length, 0),
        manualTags: {
            people: peopleClusters.length,
            places: placeTags.length,
            events: eventClusters.length,
        },
    };
}

export function exportOrganizationReportJson(report: OrganizationReport): void {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${report.id}.json`);
}
