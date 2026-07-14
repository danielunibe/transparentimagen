export interface SearchTokenDefinition {
  key: string;
  aliases: string[];
  kind: 'text' | 'extension' | 'format' | 'dimension' | 'status' | 'variant' | 'preset' | 'ai' | 'export' | 'source';
}

export const SEARCH_TOKEN_DEFINITIONS: SearchTokenDefinition[] = [
  { key: 'extension', aliases: ['type', 'ext', 'extension'], kind: 'extension' },
  { key: 'format', aliases: ['format', 'fmt'], kind: 'format' },
  { key: 'variant', aliases: ['variant', 'var'], kind: 'variant' },
  { key: 'preset', aliases: ['preset'], kind: 'preset' },
  { key: 'ai', aliases: ['ai'], kind: 'ai' },
  { key: 'export', aliases: ['export', 'exported'], kind: 'export' },
  { key: 'source', aliases: ['source'], kind: 'source' },
];

export const SEARCH_STATUS_ALIASES = [
  'folder',
  'smart',
  'edited',
  'metadata',
  'session',
  'upscale',
  'upscaled',
  'scale',
  'engine',
  'quality',
  'tile',
  'model',
  'media',
  'video',
  'screenshot',
  'person',
  'place',
  'event',
  'year',
  'month',
  'unorganized',
  'duplicate',
  'material',
  'manual',
  'overrides',
  'override',
  'pbr',
  'map',
  'missing',
  'favorite',
  'category',
  'target',
  'targetengine',
  'ready',
  'needs_review',
  'review',
  'incomplete',
  'mismatch',
  'score',
];

export function normalizeSearchKey(key: string): string {
  return key.trim().toLowerCase();
}

export function getSearchTokenDefinition(key: string): SearchTokenDefinition | undefined {
  const normalized = normalizeSearchKey(key);
  return SEARCH_TOKEN_DEFINITIONS.find((definition) => definition.aliases.includes(normalized));
}
