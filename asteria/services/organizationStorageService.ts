import {
    EventCluster,
    MediaOrganizationMetadata,
    PersonCluster,
    PlaceTag
} from '@/types/asteria';
import { assetRepository } from './repositories/assetRepository';

const ORGANIZATION_METADATA_KEY = 'asteria_organization_metadata_v1';
const PERSON_CLUSTERS_KEY = 'asteria_person_clusters_v1';
const EVENT_CLUSTERS_KEY = 'asteria_event_clusters_v1';
const PLACE_TAGS_KEY = 'asteria_place_tags_v1';
const DISMISSED_SUGGESTIONS_KEY = 'asteria_dismissed_organization_suggestions_v1';

let organizationMetadataCache: Record<string, MediaOrganizationMetadata> = {};
let personClustersCache: PersonCluster[] = [];
let eventClustersCache: EventCluster[] = [];
let placeTagsCache: PlaceTag[] = [];
let dismissedSuggestionsCache: string[] = [];

export async function initializeOrganizationStorage(): Promise<void> {
    [
        organizationMetadataCache,
        personClustersCache,
        eventClustersCache,
        placeTagsCache,
        dismissedSuggestionsCache,
    ] = await Promise.all([
        assetRepository.getMetadata(ORGANIZATION_METADATA_KEY, {}),
        assetRepository.getMetadata(PERSON_CLUSTERS_KEY, []),
        assetRepository.getMetadata(EVENT_CLUSTERS_KEY, []),
        assetRepository.getMetadata(PLACE_TAGS_KEY, []),
        assetRepository.getMetadata(DISMISSED_SUGGESTIONS_KEY, []),
    ]);
}

export function loadOrganizationMetadataMap(): Record<string, MediaOrganizationMetadata> {
    return organizationMetadataCache;
}

export async function saveOrganizationMetadataMap(value: Record<string, MediaOrganizationMetadata>): Promise<void> {
    organizationMetadataCache = value;
    await assetRepository.saveMetadata(ORGANIZATION_METADATA_KEY, value);
}

export function getOrganizationMetadata(assetId: string): MediaOrganizationMetadata | undefined {
    return loadOrganizationMetadataMap()[assetId];
}

export async function setOrganizationMetadata(assetId: string, metadata: MediaOrganizationMetadata): Promise<void> {
    const current = { ...loadOrganizationMetadataMap() };
    current[assetId] = metadata;
    await saveOrganizationMetadataMap(current);
}

export async function mergeOrganizationMetadata(assetId: string, metadata: Partial<MediaOrganizationMetadata>): Promise<void> {
    const current = { ...loadOrganizationMetadataMap() };
    current[assetId] = {
        ...(current[assetId] || { mediaKind: metadata.mediaKind || 'unknown' }),
        ...metadata,
    };
    await saveOrganizationMetadataMap(current);
}

export function loadPersonClusters(): PersonCluster[] {
    return personClustersCache;
}

export async function savePersonClusters(value: PersonCluster[]): Promise<void> {
    personClustersCache = value;
    await assetRepository.saveMetadata(PERSON_CLUSTERS_KEY, value);
}

export function loadEventClusters(): EventCluster[] {
    return eventClustersCache;
}

export async function saveEventClusters(value: EventCluster[]): Promise<void> {
    eventClustersCache = value;
    await assetRepository.saveMetadata(EVENT_CLUSTERS_KEY, value);
}

export function loadPlaceTags(): PlaceTag[] {
    return placeTagsCache;
}

export async function savePlaceTags(value: PlaceTag[]): Promise<void> {
    placeTagsCache = value;
    await assetRepository.saveMetadata(PLACE_TAGS_KEY, value);
}

export function loadDismissedOrganizationSuggestions(): string[] {
    return dismissedSuggestionsCache;
}

export async function saveDismissedOrganizationSuggestions(value: string[]): Promise<void> {
    dismissedSuggestionsCache = value;
    await assetRepository.saveMetadata(DISMISSED_SUGGESTIONS_KEY, value);
}
