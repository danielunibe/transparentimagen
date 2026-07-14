import { getJsonRecord, setJsonRecord } from '../persistenceService';

const NAMESPACE = 'settings';

export const settingsRepository = {
  async get<T>(key: string, fallback: T): Promise<T> {
    return (await getJsonRecord<T>(NAMESPACE, key)) ?? fallback;
  },
  async set<T>(key: string, value: T): Promise<void> {
    await setJsonRecord(NAMESPACE, key, value);
  },
};
