import { Track } from "@/types/aws";
import { S3Service } from "./S3Service";

export class StorageService {
  private s3Service = S3Service.getInstance();
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

  public async downloadAlbum(albumKey: string, tracks: Track[]): Promise<boolean> {
    try {
      await this.requestStorageAccess();

      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker is not supported in this browser');
      }

      const registration = await navigator.serviceWorker.ready;
      if (!registration.active) {
        throw new Error('Service Worker is not active');
      }

      const tracksWithUrls = await Promise.all(
        tracks.map(async track => ({
          ...track,
          url: await s3Service.getSignedUrl(track.key)
        }))
      );

      const messageChannel = new MessageChannel();
      const downloadPromise = new Promise<boolean>((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve(true);
          } else {
            reject(new Error(event.data.error));
          }
        };
      });

      registration.active.postMessage(
        {
          type: 'DOWNLOAD_ALBUM',
          albumKey,
          tracks: tracksWithUrls.map(track => ({
            url: track.url,
            key: track.key
          }))
        },
        [messageChannel.port2]
      );

      const success = await downloadPromise;
      
      if (success) {
        // Store offline album metadata
        const storedAlbums = this.getStoredAlbums();
        const albumMetadata = {
          key: albumKey,
          tracks: tracks.map(t => t.key),
          downloadDate: new Date().toISOString()
        };
        
        const existingIndex = storedAlbums.findIndex(a => a.key === albumKey);
        if (existingIndex >= 0) {
          storedAlbums[existingIndex] = albumMetadata;
        } else {
          storedAlbums.push(albumMetadata);
        }
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedAlbums));
      }
      
      return success;
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
