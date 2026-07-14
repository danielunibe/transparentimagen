const trackedUrls = new Map<string, Set<string>>();

export function createTrackedObjectUrl(blob: Blob, ownerId: string): string {
  const url = URL.createObjectURL(blob);
  if (!trackedUrls.has(ownerId)) trackedUrls.set(ownerId, new Set());
  trackedUrls.get(ownerId)!.add(url);
  return url;
}

export function revokeTrackedObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
  for (const urls of trackedUrls.values()) {
    urls.delete(url);
  }
}

export function revokeObjectUrlsByOwner(ownerId: string): void {
  const urls = trackedUrls.get(ownerId);
  if (!urls) return;
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
  trackedUrls.delete(ownerId);
}

export function revokeAllTrackedObjectUrls(): void {
  for (const urls of trackedUrls.values()) {
    for (const url of urls) URL.revokeObjectURL(url);
  }
  trackedUrls.clear();
}

export function getTrackedObjectUrlCount(): number {
  let total = 0;
  for (const urls of trackedUrls.values()) total += urls.size;
  return total;
}
