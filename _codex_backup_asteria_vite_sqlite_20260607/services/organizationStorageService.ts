import {
    EventCluster,
    MediaOrganizationMetadata,
    PersonCluster,
    PlaceTag
} from '@/types/asteria';
import { safeGetJson, safeSetJson } from './storageService';

const ORGANIZATION_METADATA_KEY = 'asteria_organization_metadata_v1';
const PERSON_CLUSTERS_KEY = 'asteria_person_clusters_v1';
const EVENT_CLUSTERS_KEY = 'asteria_event_clusters_v1';
const PLACE_TAGS_KEY = 'asteria_place_tags_v1';
const DISMISSED_SUGGESTIONS_KEY = 'asteria_dismissed_organization_suggestions_v1';

export function loadOrganizationMetadataMap(): Record<string, MediaOrganizationMetadata> {
    return safeGetJson<Record<string, MediaOrganizationMetadata>>(ORGANIZATION_METADATA_KEY, {});
}

export function saveOrganizationMetadataMap(value: Record<string, MediaOrganizationMetadata>): void {
    safeSetJson(ORGANIZATION_METADATA_KEY, value);
}

export function getOrganizationMetadata(assetId: string): MediaOrganizationMetadata | undefined {
    return loadOrganizationMetadataMap()[assetId];
}

export function setOrganizationMetadata(assetId: string, metadata: MediaOrganizationMetadata): void {
    const current = loadOrganizationMetadataMap();
    current[assetId] = metadata;
    saveOrganizationMetadataMap(current);
}

export function mergeOrganizationMetadata(assetId: string, metadata: Partial<MediaOrganizationMetadata>): void {
    const current = loadOrganizationMetadataMap();
    current[assetId] = {
        ...(current[assetId] || { mediaKind: metadata.mediaKind || 'unknown' }),
        ...metadata,
    };
    saveOrganizationMetadataMap(current);
}

export function loadPersonClusters(): PersonCluster[] {
    return safeGetJson<PersonCluster[]>(PERSON_CLUSTERS_KEY, []);
}

export function savePersonClusters(value: PersonCluster[]): void {
    safeSetJson(PERSON_CLUSTERS_KEY, value);
}

export function loadEventClusters(): EventCluster[] {
    return safeGetJson<EventCluster[]>(EVENT_CLUSTERS_KEY, []);
}

export function saveEventClusters(value: EventCluster[]): void {
    safeSetJson(EVENT_CLUSTERS_KEY, value);
}

export function loadPlaceTags(): PlaceTag[] {
    return safeGetJson<PlaceTag[]>(PLACE_TAGS_KEY, []);
}

export function savePlaceTags(value: PlaceTag[]): void {
    safeSetJson(PLACE_TAGS_KEY, value);
}

export function loadDismissedOrganizationSuggestions(): string[] {
    return safeGetJson<string[]>(DISMISSED_SUGGESTIONS_KEY, []);
}

export function saveDismissedOrganizationSuggestions(value: string[]): void {
    safeSetJson(DISMISSED_SUGGESTIONS_KEY, value);
}
