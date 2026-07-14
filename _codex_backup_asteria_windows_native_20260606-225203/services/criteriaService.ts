import type { AssetSearchMetadata, GalleryItem, ParsedSearchToken, SearchTokenKind, SmartCollection, SmartCollectionCriteria, SmartCollectionKind } from '@/types/asteria';
import { getSearchTokenDefinition, normalizeSearchKey, SEARCH_STATUS_ALIASES } from '@/data/searchTokens';
import {
  hasCanonicalMaterialState,
  isFalseLike,
  isTruthLike,
  matchesBool,
  matchesPbrMapList,
  normalizeCanonicalCriteriaToken,
  normalizeSearchValue,
  normalizeSmartFolderToken,
} from '@/data/canonicalCriteria';

export function parseCanonicalSearchQuery(query: string): ParsedSearchToken[] {
  if (!query || !query.trim()) return [];
  return query.split(/\s+/).filter(Boolean).map((part) => {
    let kind: SearchTokenKind = 'text';
    let key: string | undefined;
    let value = part;

    if (part.includes(':')) {
      const [rawKey, ...rest] = part.split(':');
      key = normalizeSearchKey(rawKey);
      value = rest.join(':');
      const definition = getSearchTokenDefinition(key);
      if (definition) kind = definition.kind;
      else if (SEARCH_STATUS_ALIASES.includes(key)) kind = 'status';
    } else if (part.includes('>') || part.includes('<')) {
      const operator = part.includes('>') ? '>' : '<';
      const [rawKey, rawValue] = part.split(operator);
      key = normalizeSearchKey(rawKey);
      value = `${operator}${rawValue}`;
      if (['width', 'height', 'w', 'h'].includes(key)) kind = 'dimension';
    }

    return { raw: part, kind, key, value };
  });
}

export function getCanonicalSearchHints(query: string): string[] {
  return parseCanonicalSearchQuery(query)
    .filter((token) => token.kind !== 'text')
    .map((token) => `${token.key || token.kind}:${token.value}`);
}

export function matchesCanonicalSearchToken(meta: AssetSearchMetadata, token: ParsedSearchToken): boolean {
  const valLow = normalizeSearchValue(token.value);

  switch (token.kind) {
    case 'text':
      return meta.name.toLowerCase().includes(valLow);
    case 'extension':
    case 'format':
      return (meta.extension === valLow) || (meta.format === valLow) || meta.name.toLowerCase().endsWith(`.${valLow}`);
    case 'dimension': {
      const numeric = Number(valLow.replace(/^[<>]/, ''));
      if (Number.isNaN(numeric)) return false;
      const dimValue = token.key === 'w' || token.key === 'width' ? meta.width : meta.height;
      if (dimValue === undefined) return false;
      return token.value.startsWith('>') ? dimValue > numeric : dimValue < numeric;
    }
    case 'variant':
      return meta.variantKinds?.some((kind) => kind.toLowerCase().includes(valLow)) || false;
    case 'preset':
      return meta.presetLabels?.some((label) => label.toLowerCase().includes(valLow)) || false;
    case 'ai':
      return isTruthLike(valLow) ? !!meta.hasAiJobs : isFalseLike(valLow) ? !meta.hasAiJobs : false;
    case 'export':
      return isTruthLike(valLow) ? !!meta.hasExports : isFalseLike(valLow) ? !meta.hasExports : false;
    case 'source':
      return meta.sourceName?.toLowerCase().includes(valLow) || false;
    case 'status':
      return matchesCanonicalStatus(meta, token.key || '', valLow);
    default:
      return false;
  }
}

export function matchesCanonicalStatus(meta: AssetSearchMetadata, key: string, value: string): boolean {
  const normalizedValue = normalizeSearchValue(value);

  if (key === 'edited') return matchesBool(value, !!meta.hasAdjustments || !!meta.hasVariants);
  if (key === 'metadata') return matchesBool(value, !!meta.hasMetadataOnlyVariants);
  if (key === 'session') return matchesBool(value, !!meta.hasSessionOutputs);
  if (key === 'upscale' || key === 'upscaled') return matchesBool(value, !!meta.hasUpscaled);
  if (key === 'scale') return meta.upscaleScales?.some((scale) => String(scale) === normalizedValue.replace('x', '')) || false;
  if (key === 'engine') return meta.upscaleEngines?.some((engine) => normalizeSearchValue(engine).includes(normalizedValue.replace(/[_-]/g, ''))) || false;
  if (key === 'quality') return meta.upscaleQualityPresets?.some((preset) => normalizeSearchValue(preset) === normalizedValue) || false;
  if (key === 'tile') return meta.upscaleTileSizes?.some((size) => String(size) === normalizedValue) || false;
  if (key === 'model') return meta.upscaleModelIds?.some((modelId) => normalizeSearchValue(modelId).includes(normalizedValue.replace(/[_-]/g, ''))) || false;
  if (key === 'media') return meta.mediaKind === normalizedValue;
  if (key === 'smart') {
    return isTruthLike(normalizedValue)
      ? !!meta.isSmartFolder
      : meta.smartFolderKind === `${normalizedValue.replace(/-/g, '_')}_folder` || meta.smartFolderKind === normalizedValue.replace(/-/g, '_');
  }
  if (key === 'folder') {
    const normalized = normalizedValue.replace(/-/g, '_');
    return normalized === 'smart'
      ? !!meta.isSmartFolder
      : meta.smartFolderKind === `${normalized}_folder` || meta.smartFolderKind === normalized;
  }
  if (key === 'video') return matchesBool(value, !!meta.isVideo);
  if (key === 'screenshot') return matchesBool(value, !!meta.isScreenshot);
  if (key === 'person') return meta.people?.some((person) => person.toLowerCase().includes(normalizedValue)) || false;
  if (key === 'place') return meta.places?.some((place) => place.toLowerCase().includes(normalizedValue)) || false;
  if (key === 'event') return meta.eventIds?.some((eventId) => eventId.toLowerCase().includes(normalizedValue)) || false;
  if (key === 'year') return meta.year === normalizedValue;
  if (key === 'month') return meta.month === normalizedValue;
  if (key === 'unorganized') return matchesBool(value, !!meta.isUnorganized);
  if (key === 'duplicate') return matchesBool(value, !!meta.isDuplicateCandidate);
  if (key === 'material') return hasCanonicalMaterialState(meta, normalizedValue) || (isTruthLike(normalizedValue) && !!meta.isMaterialFolder);
  if (key === 'pbr') return isTruthLike(normalizedValue) ? !!meta.isMaterialFolder || !!meta.pbrMapType : false;
  if (key === 'map') return meta.pbrMapType === normalizeCanonicalCriteriaToken(key, normalizedValue) || matchesPbrMapList(meta.pbrMapTypes, normalizeCanonicalCriteriaToken(key, normalizedValue));
  if (key === 'missing') return matchesPbrMapList(meta.missingMaps, normalizeCanonicalCriteriaToken(key, normalizedValue));
  if (key === 'favorite') return !!meta.isFavoriteMaterial;
  if (key === 'category') return meta.materialCategory?.toLowerCase().includes(normalizedValue) || false;
  if (key === 'ready') return meta.materialTargetEngine === normalizedValue && (meta.materialCompletenessScore || 0) >= 90 && !meta.materialNeedsReview;
  if (key === 'mismatch') return normalizedValue === 'resolution' ? !!meta.hasResolutionMismatch : false;
  if (key === 'score') return (meta.materialCompletenessScore || 0) >= Number(normalizedValue);
  return false;
}

export function matchesCanonicalCollectionCriteria(
  item: GalleryItem,
  context: { variantsByAsset: Record<string, unknown[]>; activeJobsByAsset: Record<string, unknown[]>; exportJobsByAsset: Record<string, unknown[]> },
  collection: SmartCollection,
  fallbackEvaluator: (item: GalleryItem, context: { variantsByAsset: Record<string, unknown[]>; activeJobsByAsset: Record<string, unknown[]>; exportJobsByAsset: Record<string, unknown[]> }, criteria: SmartCollectionCriteria) => boolean,
): boolean {
  if (collection.criteria.searchQuery) {
    const tokens = parseCanonicalSearchQuery(collection.criteria.searchQuery);
    if (tokens.length === 0) return fallbackEvaluator(item, context, collection.criteria);
  }
  return fallbackEvaluator(item, context, collection.criteria);
}
