import { GalleryItem } from '@/types/asteria';
import { hasTauri } from './runtimeService';

export interface OrganizationPlanItem {
    assetId: string;
    assetName: string;
    sourceLabel?: string;
    targetFolder: string;
    operation: 'move' | 'copy';
    warning?: string;
}

export interface OrganizationPlan {
    id: string;
    strategy: string;
    operation: 'move' | 'copy';
    items: OrganizationPlanItem[];
    createdAt: string;
    requiresDesktop: boolean;
    canExecute: boolean;
    warnings: string[];
}

export function planMoveAssetsToFolder(assetIds: string[], targetFolder: string): OrganizationPlan {
    return {
        id: `org_plan_move_${Date.now()}`,
        strategy: 'manual',
        operation: 'move',
        items: assetIds.map(assetId => ({
            assetId,
            assetName: assetId,
            targetFolder,
            operation: 'move',
        })),
        createdAt: new Date().toISOString(),
        requiresDesktop: true,
        canExecute: false,
        warnings: ['File moves remain preview-only in this phase.'],
    };
}

export function planCopyAssetsToFolder(assetIds: string[], targetFolder: string): OrganizationPlan {
    return {
        id: `org_plan_copy_${Date.now()}`,
        strategy: 'manual',
        operation: 'copy',
        items: assetIds.map(assetId => ({
            assetId,
            assetName: assetId,
            targetFolder,
            operation: 'copy',
        })),
        createdAt: new Date().toISOString(),
        requiresDesktop: true,
        canExecute: false,
        warnings: ['File copies remain preview-only in this phase.'],
    };
}

export function createOrganizationPlan(assets: GalleryItem[], strategy: string): OrganizationPlan {
    const targetFolder = strategy === 'by year' ? 'By Year' : strategy === 'videos' ? 'Videos' : 'Organizer Preview';
    return {
        id: `org_plan_${Date.now()}`,
        strategy,
        operation: 'move',
        items: assets
            .filter(asset => asset.kind !== 'folder')
            .map(asset => ({
                assetId: asset.id,
                assetName: asset.name,
                sourceLabel: 'pathLabel' in asset ? (asset as any).pathLabel : undefined,
                targetFolder,
                operation: 'move',
            })),
        createdAt: new Date().toISOString(),
        requiresDesktop: true,
        canExecute: false,
        warnings: ['Preview only. Desktop-safe execution will be a later phase.'],
    };
}

export async function executeOrganizationPlan(plan: OrganizationPlan): Promise<{ ok: boolean; status: 'unsupported' | 'success' | 'error'; message: string; }> {
    if (!hasTauri()) {
        return { ok: false, status: 'unsupported', message: 'File moving requires desktop mode.' };
    }
    return { ok: false, status: 'unsupported', message: 'Organization plan execution is still preview-only in this phase.' };
}
