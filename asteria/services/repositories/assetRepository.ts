import type { AssetVariant } from '@/types/asteria';
import { getJsonRecord, listJsonRecords, setJsonRecord } from '../persistenceService';

const VARIANT_NAMESPACE = 'asset_variants';
const METADATA_NAMESPACE = 'asset_metadata';

export const assetRepository = {
  async getVariants(assetId: string): Promise<AssetVariant[]> {
    return (await getJsonRecord<AssetVariant[]>(VARIANT_NAMESPACE, assetId)) ?? [];
  },
  async getAllVariants(): Promise<AssetVariant[]> {
    const records = await listJsonRecords<AssetVariant[]>(VARIANT_NAMESPACE);
    return records.flatMap((record) => record.value);
  },
  async saveVariants(assetId: string, variants: AssetVariant[]): Promise<void> {
    await setJsonRecord(VARIANT_NAMESPACE, assetId, variants);
  },
  async getMetadata<T>(key: string, fallback: T): Promise<T> {
    return (await getJsonRecord<T>(METADATA_NAMESPACE, key)) ?? fallback;
  },
  async saveMetadata<T>(key: string, value: T): Promise<void> {
    await setJsonRecord(METADATA_NAMESPACE, key, value);
  },
};
