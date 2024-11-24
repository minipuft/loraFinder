import fs from 'fs/promises';
import path from 'path';
/**
 * Recursively get all folders up to a specified depth
 * @param dir The directory to start from
 * @param maxDepth The maximum depth to traverse
 * @param currentDepth The current depth (used internally)
 * @returns Promise<FolderInfo[]> An array of folder information
 */
export async function getAllFolders(dir, maxDepth, currentDepth = 0) {
    if (currentDepth > maxDepth) {
        return [];
    }
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const folders = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const folderPath = path.join(dir, entry.name);
            folders.push({
                name: entry.name,
                path: folderPath,
            });
            const subFolders = await getAllFolders(folderPath, maxDepth, currentDepth + 1);
            folders.push(...subFolders);
        }
    }
    return folders;
}
//# sourceMappingURL=folderUtils.js.map