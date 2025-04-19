import { DBSchema, IDBPDatabase, openDB } from 'idb';

const UI_STATE_DB_NAME = 'mediaFlowUIScrollDB';
const SCROLL_STATE_STORE_NAME = 'scrollPosition';
const DB_VERSION = 1;

// Define the structure of the state we want to store - ONLY scrollTop
export interface ScrollState {
  scrollTop: number;
  timestamp: number;
}

// Define the database schema
interface ScrollStateDB extends DBSchema {
  [SCROLL_STATE_STORE_NAME]: {
    key: string; // folderPath
    value: ScrollState;
  };
}

// Singleton promise to ensure DB is opened only once
let dbPromise: Promise<IDBPDatabase<ScrollStateDB>> | null = null;

function openScrollStateDB(): Promise<IDBPDatabase<ScrollStateDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ScrollStateDB>(UI_STATE_DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create the object store if it doesn't exist
        if (!db.objectStoreNames.contains(SCROLL_STATE_STORE_NAME)) {
          db.createObjectStore(SCROLL_STATE_STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Saves the scroll top position for a specific folder path to IndexedDB.
 * @param folderPath - The identifier for the folder.
 * @param scrollTop - The scroll position to save.
 */
export async function saveScrollState(folderPath: string, scrollTop: number): Promise<void> {
  try {
    const db = await openScrollStateDB();
    const tx = db.transaction(SCROLL_STATE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(SCROLL_STATE_STORE_NAME);
    const stateToSave: ScrollState = {
      scrollTop: scrollTop,
      timestamp: Date.now(),
    };
    await store.put(stateToSave, folderPath);
    await tx.done;
  } catch (error) {
    console.error('Failed to save scroll state for path:', folderPath, error);
  }
}

/**
 * Loads the scroll state for a specific folder path from IndexedDB.
 * @param folderPath - The identifier for the folder.
 * @returns The saved ScrollState object (containing scrollTop and timestamp) or null.
 */
export async function loadScrollState(folderPath: string): Promise<ScrollState | null> {
  try {
    const db = await openScrollStateDB();
    const tx = db.transaction(SCROLL_STATE_STORE_NAME, 'readonly');
    const store = tx.objectStore(SCROLL_STATE_STORE_NAME);
    const state = await store.get(folderPath);
    await tx.done;
    return state ?? null;
  } catch (error) {
    console.error('Failed to load scroll state for path:', folderPath, error);
    return null;
  }
}
