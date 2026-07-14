import { ParsedSearchToken, AssetSearchMetadata, GalleryItem, AssetVariant, ExportJob, AiProcessingJob } from '@/types/asteria';

export function parseSearchQuery(query: string): ParsedSearchToken[] {
    if (!query || !query.trim()) return [];
    
    const tokens: ParsedSearchToken[] = [];
    // Super basic rudimentary parser
    const parts = query.split(/\s+/);
    
    for (const part of parts) {
        if (!part) continue;
        
        let kind: ParsedSearchToken['kind'] = 'text';
        let key: string | undefined = undefined;
        let value = part;

        if (part.includes(':')) {
            const [k, ...vParts] = part.split(':');
            key = k.toLowerCase();
            value = vParts.join(':');
            
            if (['type', 'ext', 'extension'].includes(key)) kind = 'extension';
            else if (['format', 'fmt'].includes(key)) kind = 'format';
            else if (['variant', 'var'].includes(key)) kind = 'variant';
            else if (['preset'].includes(key)) kind = 'preset';
            else if (['ai'].includes(key)) kind = 'ai';
            else if (['export', 'exported'].includes(key)) kind = 'export';
            else if (['source', 'folder'].includes(key)) kind = 'source';
            else if (['edited', 'metadata', 'session'].includes(key)) kind = 'status';
        } else if (part.includes('>')) {
            const [k, v] = part.split('>');
            key = k.toLowerCase();
            value = '>' + v;
            if (['width', 'height', 'w', 'h'].includes(key)) kind = 'dimension';
        } else if (part.includes('<')) {
            const [k, v] = part.split('<');
            key = k.toLowerCase();
            value = '<' + v;
            if (['width', 'height', 'w', 'h'].includes(key)) kind = 'dimension';
        }
        
        tokens.push({ raw: part, kind, key, value });
    }
    
    return tokens;
}

export interface SearchContext {
    variantsByAsset: Record<string, AssetVariant[]>;
    activeJobsByAsset: Record<string, AiProcessingJob[]>;
    exportJobsByAsset: Record<string, ExportJob[]>;
}

export function buildAssetSearchMetadata(item: GalleryItem, context: SearchContext): AssetSearchMetadata {
    const isImage = item.kind === 'image';
    const metadata = isImage ? (item as any).metadata : undefined;
    const variants = context.variantsByAsset[item.id] || [];
    const aiJobs = context.activeJobsByAsset[item.id] || [];
    const exports = context.exportJobsByAsset[item.id] || [];

    const variantKinds = Array.from(new Set(variants.map(v => v.kind)));
    const presetLabels = variants.map(v => v.presetLabel).filter(Boolean) as string[];

    return {
        assetId: item.id,
        name: item.name,
        extension: metadata?.extension?.toLowerCase(),
        format: metadata?.mimeType?.split('/')[1]?.toLowerCase(),
        width: metadata?.width,
        height: metadata?.height,
        size: metadata?.size,
        sourceName: (item as any).handle?.name, // Approximation
        hasVariants: variants.length > 0,
        hasAdjustments: variantKinds.includes('adjustment'),
        hasAiJobs: aiJobs.length > 0 || variantKinds.some(k => ['enhanced', 'cutout', 'portrait', 'ue5', 'ai_preview'].includes(k)),
        hasExports: exports.some(e => e.status === 'completed'),
        hasMetadataOnlyVariants: variants.some(v => v.metadataOnly),
        hasSessionOutputs: variants.some(v => v.sessionOnly && !!v.objectUrl),
        presetLabels,
        variantKinds
    };
}

function parseOperatorValue(val: string): { op: string, num: number } | null {
    if (val.startsWith('>')) return { op: '>', num: parseInt(val.substring(1), 10) };
    if (val.startsWith('<')) return { op: '<', num: parseInt(val.substring(1), 10) };
    return null;
}

export function assetMatchesSearch(meta: AssetSearchMetadata, tokens: ParsedSearchToken[]): boolean {
    for (const token of tokens) {
        const valLow = token.value.toLowerCase();
        let matched = false;

        switch (token.kind) {
            case 'text':
                matched = meta.name.toLowerCase().includes(valLow);
                break;
            case 'extension':
            case 'format':
                matched = (meta.extension === valLow) || (meta.format === valLow) || meta.name.toLowerCase().endsWith('.' + valLow);
                break;
            case 'dimension': {
                const parsed = parseOperatorValue(token.value);
                if (parsed) {
                    const dimValue = (token.key === 'w' || token.key === 'width') ? meta.width : meta.height;
                    if (dimValue !== undefined) {
                        if (parsed.op === '>') matched = dimValue > parsed.num;
                        else if (parsed.op === '<') matched = dimValue < parsed.num;
                    }
                }
                break;
            }
            case 'variant':
                matched = meta.variantKinds?.some(k => k.toLowerCase().includes(valLow)) || false;
                break;
            case 'preset':
                matched = meta.presetLabels?.some(l => l.toLowerCase().includes(valLow)) || false;
                break;
            case 'ai':
                matched = (valLow === 'true' || valLow === '1') ? !!meta.hasAiJobs : !meta.hasAiJobs;
                break;
            case 'export':
                matched = (valLow === 'true' || valLow === '1') ? !!meta.hasExports : !meta.hasExports;
                break;
            case 'status':
                if (token.key === 'edited') matched = (valLow === 'true' || valLow === '1') ? !!meta.hasAdjustments || !!meta.hasVariants : !meta.hasAdjustments && !meta.hasVariants;
                else if (token.key === 'metadata') matched = (valLow === 'true' || valLow === '1') ? !!meta.hasMetadataOnlyVariants : !meta.hasMetadataOnlyVariants;
                else if (token.key === 'session') matched = (valLow === 'true' || valLow === '1') ? !!meta.hasSessionOutputs : !meta.hasSessionOutputs;
                break;
            case 'source':
                matched = meta.sourceName?.toLowerCase().includes(valLow) || false;
                break;
        }

        // If even one token doesn't match (AND logic), the whole search fails.
        if (!matched) return false;
    }
    return true;
}

export function filterItemsBySearch(items: GalleryItem[], query: string, context: SearchContext): GalleryItem[] {
    const tokens = parseSearchQuery(query);
    if (tokens.length === 0) return items;

    // We only build metadata for items when searching to avoid pre-computation cost
    return items.filter(item => {
        const meta = buildAssetSearchMetadata(item, context);
        return assetMatchesSearch(meta, tokens);
    });
}

export function getSearchHint(query: string): string[] {
    const tokens = parseSearchQuery(query);
    return tokens.filter(t => t.kind !== 'text').map(t => `${t.key || t.kind}:${t.value}`);
}
