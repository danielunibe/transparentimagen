export type CollectionSizeTier = 'small' | 'medium' | 'large' | 'huge';

export function getCollectionSizeTier(count: number): CollectionSizeTier {
  if (count <= 250) return 'small';
  if (count <= 750) return 'medium';
  if (count <= 2000) return 'large';
  return 'huge';
}

export function shouldShowLargeCollectionWarning(count: number): boolean {
  return count >= 751;
}

export function getRecommendedBatchSize(count: number): number {
  if (count <= 250) return 50;
  if (count <= 750) return 30;
  if (count <= 2000) return 20;
  return 12;
}

export function getThumbnailConcurrencyLimit(count: number): number {
  if (count <= 250) return 6;
  if (count <= 750) return 4;
  if (count <= 2000) return 3;
  return 2;
}

export function getDeferredSearchDelay(count: number): number {
  if (count <= 250) return 0;
  if (count <= 750) return 75;
  if (count <= 2000) return 120;
  return 180;
}

export function clampVisibleItemLimit(count: number): number {
  if (count <= 250) return count;
  if (count <= 750) return 750;
  if (count <= 2000) return 1200;
  return 1500;
}

export function summarizePerformanceRisk(count: number): string {
  const tier = getCollectionSizeTier(count);
  switch (tier) {
    case 'small':
      return 'Collection is small enough for normal rendering.';
    case 'medium':
      return 'Collection is moderate; keep filtering and thumbnails deferred.';
    case 'large':
      return 'Large collection detected; thumbnail throttling and deferred filtering are active.';
    case 'huge':
      return 'Huge collection detected; consider future virtualization or paging.';
  }
}
