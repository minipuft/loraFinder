import { PersistedClient, Persister } from '@tanstack/query-persist-client-core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';

const REACT_QUERY_DB_NAME = 'reactQueryCacheDB';
const REACT_QUERY_STORE_NAME = 'reactQueryCacheStore';
const DB_VERSION = 1; // Start with version 1

// Define the structure of the data we'll store in this specific store
interface ReactQueryCacheValue {
  timestamp: number;
  client: PersistedClient;
}

// Define the database schema using the store name and value structure
interface ReactQueryDB extends DBSchema {
  [REACT_QUERY_STORE_NAME]: {
    key: IDBValidKey; // The key we use to store the persisted client (e.g., 'reactQuery')
    value: ReactQueryCacheValue; // The structure defined above
  };
}

// Singleton promise to ensure DB is opened only once
let dbPromise: Promise<IDBPDatabase<ReactQueryDB>> | null = null;

/**
 * Opens the IndexedDB database for React Query caching.
 * Handles creation and upgrades.
 */
function openReactQueryDB(): Promise<IDBPDatabase<ReactQueryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ReactQueryDB>(REACT_QUERY_DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading React Query DB from ${oldVersion} to ${newVersion}`);
        // Create the object store if it doesn't exist
        if (!db.objectStoreNames.contains(REACT_QUERY_STORE_NAME)) {
          console.log(`Creating object store: ${REACT_QUERY_STORE_NAME}`);
          db.createObjectStore(REACT_QUERY_STORE_NAME);
        }
        // Add more upgrade logic here if DB_VERSION increases later
      },
      blocked() {
        console.error('React Query DB is blocked. Please close other tabs using this app.');
        // Potentially inform the user or attempt recovery
      },
      blocking() {
        console.warn('React Query DB is blocking another version from opening.');
        // This tab might be holding an older version open
      },
      terminated() {
        console.warn('React Query DB connection terminated unexpectedly.');
        dbPromise = null; // Reset promise to allow reopening
      },
    });
  }
  return dbPromise;
}

/**
 * Creates a Persister object using IndexedDB via the 'idb' library.
 * @param {IDBValidKey} idbValidKey - The key to use for storing the client data in IndexedDB. Defaults to 'reactQuery'.
 * @returns {Persister} An object conforming to the Persister interface.
 */
export function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery'): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      let db: IDBPDatabase<ReactQueryDB> | null = null;
      try {
        db = await openReactQueryDB();
        const tx = db.transaction(REACT_QUERY_STORE_NAME, 'readwrite');
        const store = tx.objectStore(REACT_QUERY_STORE_NAME);
        const valueToStore: ReactQueryCacheValue = {
          timestamp: Date.now(),
          client: client,
        };
        await store.put(valueToStore, idbValidKey);
        await tx.done;
        // console.log('[IDBPersister] Persisted client state.');
      } catch (error) {
        console.error('[IDBPersister] Failed to persist client state:', error);
        // Optional: Attempt recovery or notify user
      }
    },
    restoreClient: async (): Promise<PersistedClient | undefined> => {
      let db: IDBPDatabase<ReactQueryDB> | null = null;
      try {
        db = await openReactQueryDB();
        const tx = db.transaction(REACT_QUERY_STORE_NAME, 'readonly');
        const store = tx.objectStore(REACT_QUERY_STORE_NAME);
        const storedValue = await store.get(idbValidKey);
        await tx.done;

        if (storedValue) {
          // console.log(`[IDBPersister] Restored client state from timestamp: ${new Date(storedValue.timestamp).toISOString()}`);
          return storedValue.client;
        }
        // console.log('[IDBPersister] No client state found to restore.');
        return undefined;
      } catch (error) {
        console.error('[IDBPersister] Failed to restore client state:', error);
        return undefined; // Return undefined on error
      }
    },
    removeClient: async () => {
      let db: IDBPDatabase<ReactQueryDB> | null = null;
      try {
        db = await openReactQueryDB();
        const tx = db.transaction(REACT_QUERY_STORE_NAME, 'readwrite');
        const store = tx.objectStore(REACT_QUERY_STORE_NAME);
        await store.delete(idbValidKey);
        await tx.done;
        // console.log('[IDBPersister] Removed client state.');
      } catch (error) {
        console.error('[IDBPersister] Failed to remove client state:', error);
      }
    },
  };
}
