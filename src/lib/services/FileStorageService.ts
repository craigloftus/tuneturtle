export class FileStorageService {
  private static instance: FileStorageService;

  private constructor() {}

  public static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  private sanitizeFilename(input: string): string {
    // Replace invalid filename characters with underscores
    // Keep it relatively simple, might need more robust sanitization depending on environment
    return input.replace(/[\/\\?%*:|\"<> ]/g, '_').toLowerCase();
  }

  public generateAlbumArtId(artist: string, album: string): string {
    const sanitizedArtist = this.sanitizeFilename(artist || 'unknown_artist');
    const sanitizedAlbum = this.sanitizeFilename(album || 'unknown_album');
    // Combine them, ensuring a unique prefix/suffix if needed, though artist/album combo should be fairly unique
    return `art-${sanitizedArtist}-${sanitizedAlbum}`;
  }

  /**
   * Downloads content from a URL and stores it in the private origin file system using a specific ID.
   * @param url The URL to fetch the content from.
   * @param fileId The deterministic ID (filename) to use for storing the file.
   * @returns The fileId used.
   * @throws If the download or file writing fails.
   */
  public async downloadAndStore(url: string, fileId: string): Promise<string> {
    console.debug(`[FileStorageService] Attempting to download from ${url} and store as ${fileId}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error fetching ${url}: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();

      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(fileId, { create: true });
      const writer = await fileHandle.createWritable();
      await writer.write(blob);
      await writer.close();
      console.debug(`[FileStorageService] Successfully stored ${url} as ${fileId}`);
      return fileId; // Return the ID used
    } catch (error) {
      console.error(`[FileStorageService] Failed to download/store ${url} as ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a file blob from storage using its UUID.
   * @param uuid The UUID of the file to retrieve.
   * @returns A Promise resolving to the File object.
   * @throws If the file cannot be found or read.
   */
  public async retrieveFile(uuid: string): Promise<File> {
     try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(uuid);
      const file = await fileHandle.getFile();
      return file;
    } catch (error) {
      console.error(`[FileStorageService] Failed to retrieve file ${uuid}:`, error);
      throw error;
    }
  }
  
  /**
   * Deletes a file from storage using its UUID.
   * @param uuid The UUID of the file to delete.
   * @throws If the file cannot be deleted.
   */
   public async deleteFile(uuid: string): Promise<void> {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(uuid);
      console.debug(`[FileStorageService] Deleted file ${uuid}`);
    } catch (error) {
      // Make deletion errors less noisy if file simply doesn't exist
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        console.warn(`[FileStorageService] Attempted to delete non-existent file ${uuid}`);
      } else {
        console.error(`[FileStorageService] Failed to delete file ${uuid}:`, error);
        throw error;
      }
    }
  }

  /**
   * Checks if a file exists in storage.
   * @param fileId The ID of the file to check.
   * @returns A Promise resolving to true if the file exists, false otherwise.
   */
  public async fileExists(fileId: string): Promise<boolean> {
    try {
      const root = await navigator.storage.getDirectory();
      await root.getFileHandle(fileId); // Try to get the handle
      return true; // If successful, file exists
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        return false; // Not found is expected
      }
      // Log other unexpected errors
      console.error(`[FileStorageService] Error checking existence for file ${fileId}:`, error);
      return false; // Treat other errors as file not existing for safety
    }
  }
} 