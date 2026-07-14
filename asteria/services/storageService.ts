import { settingsRepository } from './repositories/settingsRepository';

export interface StorageRecord<T> {
  version: number;
  updatedAt: string;
  data: T;
}

export async function readNativeJson<T>(key: string, fallback: T): Promise<T> {
  return settingsRepository.get(key, fallback);
}

export async function writeNativeJson<T>(key: string, value: T): Promise<void> {
  await settingsRepository.set(key, value);
}
