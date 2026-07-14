import type { AssetSearchMetadata, PbrMapType, SmartFolderKind } from '@/types/asteria';

export function normalizeBooleanLike(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return null;
}

export function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePbrMapToken(value: string): PbrMapType | string {
  return normalizeSearchValue(value)
    .replace(/basecolor/g, 'base_color')
    .replace(/-/g, '_');
}

export function normalizeSmartFolderToken(value: string): SmartFolderKind | string {
  const normalized = normalizeSearchValue(value).replace(/-/g, '_');
  return normalized === 'smart' ? 'unknown_folder' : `${normalized}_folder`;
}

export function normalizeCanonicalCriteriaToken(key: string, value: string): string {
  const normalizedKey = normalizeSearchValue(key);
  const normalizedValue = normalizeSearchValue(value);
  if (normalizedKey === 'map' || normalizedKey === 'missing') return normalizePbrMapToken(normalizedValue);
  if (normalizedKey === 'folder' || normalizedKey === 'smart') return normalizeSmartFolderToken(normalizedValue);
  return normalizedValue;
}

export function isTruthLike(value: string): boolean {
  return normalizeBooleanLike(value) === true;
}

export function isFalseLike(value: string): boolean {
  return normalizeBooleanLike(value) === false;
}

export function matchesBool(value: string, actual: boolean | undefined): boolean {
  const normalized = normalizeBooleanLike(value);
  if (normalized === null) return false;
  return normalized ? Boolean(actual) : !actual;
}

export function matchesPbrMapList(values: string[] | undefined, candidate: string): boolean {
  return values?.includes(candidate) || false;
}

export function hasCanonicalMaterialState(meta: AssetSearchMetadata, value: string): boolean {
  const normalized = normalizeSearchValue(value);
  if (normalized === 'ready') return (meta.materialCompletenessScore || 0) >= 90 && !meta.materialNeedsReview;
  if (normalized === 'incomplete') return (meta.materialCompletenessScore || 0) < 90;
  if (normalized === 'review') return !!meta.materialNeedsReview;
  if (normalized === 'needs_review') return !!meta.materialNeedsReview;
  if (normalized === 'warnings') return !!meta.hasMaterialWarnings;
  if (normalized === 'errors') return !!meta.hasMaterialErrors;
  if (normalized === 'manual' || normalized === 'overrides' || normalized === 'override') {
    return Boolean(meta.pbrMapTypes?.some((type) => meta.pbrMapType && type !== meta.pbrMapType));
  }
  if (normalized === 'complete' || normalized === 'partial' || normalized === 'texture_set' || normalized === 'unknown') {
    return meta.materialStatus === normalized;
  }
  return false;
}
