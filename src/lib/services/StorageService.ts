import { Track } from "@/types/aws";

export class StorageService {
  private static instance: StorageService;
  private readonly STORAGE_KEY = 'offline_albums';

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private async requestStorageAccess(): Promise<void> {
    try {
      const granted = await navigator.storage.persist();
      if (!granted) {
        throw new Error('Storage persistence denied');
      }
    } catch (error) {
      console.error('[StorageService] Failed to get storage access:', error);
      throw new Error('Storage access denied');
    }
  }

  public async downloadAlbum(tracks: Track[]): Promise<boolean> {
    try {
      // Register the download with the service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const messageChannel = new MessageChannel();
        
        const downloadPromise = new Promise((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
              resolve(true);
            } else {
              reject(new Error(event.data.error));
            }
          };
        });

        registration.active?.postMessage(
          {
            type: 'DOWNLOAD_ALBUM',
            tracks: tracks.map(track => ({
              url: track.signedUrl,
              key: track.key
            }))
          },
          [messageChannel.port2]
        );

        await downloadPromise;
        
        // Store offline album metadata
        const storedAlbums = this.getStoredAlbums();
        const albumKey = tracks[0].key.split('/')[0];
        storedAlbums.push({
          key: albumKey,
          tracks: tracks.map(t => t.key),
          downloadDate: new Date().toISOString()
        });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedAlbums));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('[StorageService] Failed to download album:', error);
      throw error;
    }
  }

  public getStoredAlbums(): Array<{
    key: string;
    tracks: string[];
    downloadDate: string;
  }> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[StorageService] Failed to get stored albums:', error);
      return [];
    }
  }

  public async isTrackAvailableOffline(trackKey: string): Promise<boolean> {
    try {
      const cache = await caches.open('offline-albums');
      const response = await cache.match(trackKey);
      return !!response;
    } catch (error) {
      console.error('[StorageService] Failed to check track availability:', error);
      return false;
    }
  }

  public async deleteAlbum(albumKey: string): Promise<boolean> {
    try {
      const storedAlbums = this.getStoredAlbums();
      const albumIndex = storedAlbums.findIndex(album => album.key === albumKey);
      
      if (albumIndex === -1) return false;
      
      const album = storedAlbums[albumIndex];
      const cache = await caches.open('offline-albums');
      
      // Remove all tracks from cache
      await Promise.all(album.tracks.map(track => cache.delete(track)));
      
      // Remove album from stored list
      storedAlbums.splice(albumIndex, 1);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedAlbums));
      
      return true;
    } catch (error) {
      console.error('[StorageService] Failed to delete album:', error);
      throw error;
    }
  }
}
