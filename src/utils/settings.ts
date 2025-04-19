const HOME_DIRECTORY_KEY = 'loraFinderHomeDirectory';

/**
 * Retrieves the stored home directory path from localStorage.
 * @returns The stored path string, or null if not set.
 */
export const getHomeDirectory = (): string | null => {
  try {
    return localStorage.getItem(HOME_DIRECTORY_KEY);
  } catch (error) {
    console.error('Error reading home directory from localStorage:', error);
    return null;
  }
};

/**
 * Stores the given directory path as the home directory in localStorage.
 * @param folderPath - The path to store.
 */
export const setHomeDirectory = (folderPath: string): void => {
  try {
    localStorage.setItem(HOME_DIRECTORY_KEY, folderPath);
  } catch (error) {
    console.error('Error setting home directory in localStorage:', error);
  }
};
