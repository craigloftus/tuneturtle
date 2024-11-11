import { S3Credentials, Track, TrackMetadata } from "@/types/aws";

interface TracksCache {
  tracks: Track[];
  timestamp: number;
  nextContinuationToken?: string;
  isTruncated: boolean;
  totalFound: number;
  lastPage: number;
  pageSize: number;
}

interface MetadataCache {
  [key: string]: {
    metadata: TrackMetadata;
    timestamp: number;
    eTag?: string;
  };
}

export class CacheService {
  private static instance: CacheService;
  private readonly AWS_CREDENTIALS_KEY = 'aws_credentials';
  private readonly TRACKS_CACHE_KEY = 'tracks_cache';
  private readonly METADATA_CACHE_KEY = 'metadata_cache';
  private readonly CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public saveCredentials(credentials: S3Credentials): void {
    try {
      localStorage.setItem(this.AWS_CREDENTIALS_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error('[CacheService] Failed to save AWS credentials:', error);
    }
  }

  public getCredentials(): S3Credentials | null {
    try {
      const stored = localStorage.getItem(this.AWS_CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[CacheService] Failed to retrieve AWS credentials:', error);
      return null;
    }
  }

  public clearCredentials(): void {
    try {
      localStorage.removeItem(this.AWS_CREDENTIALS_KEY);
      this.clearTracksCache();
      this.clearMetadataCache();
    } catch (error) {
      console.error('[CacheService] Failed to clear AWS credentials:', error);
    }
  }

  public saveTracksToCache(
    tracks: Track[],
    nextContinuationToken?: string,
    isTruncated: boolean = false,
    totalFound: number = 0,
    lastPage: number = 1,
    pageSize: number = 100
  ): void {
    try {
      const cacheData: TracksCache = {
        tracks,
        timestamp: Date.now(),
        nextContinuationToken,
        isTruncated,
        totalFound,
        lastPage,
        pageSize
      };
      
      localStorage.setItem(this.TRACKS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('[CacheService] Failed to save tracks to cache:', error);
    }
  }

  public getTracksFromCache(): TracksCache | null {
    try {
      const cached = localStorage.getItem(this.TRACKS_CACHE_KEY);
      if (!cached) return null;

      const cacheData: TracksCache = JSON.parse(cached);
      const now = Date.now();

      if (now - cacheData.timestamp > this.CACHE_EXPIRY_TIME) {
        this.clearTracksCache();
        return null;
      }

      return cacheData;
    } catch (error) {
      console.error('[CacheService] Failed to retrieve tracks from cache:', error);
      return null;
    }
  }

  public clearTracksCache(): void {
    try {
      localStorage.removeItem(this.TRACKS_CACHE_KEY);
    } catch (error) {
      console.error('[CacheService] Failed to clear tracks cache:', error);
    }
  }

  public saveMetadataToCache(key: string, metadata: TrackMetadata, eTag?: string): void {
    try {
      const existingCache = this.getMetadataFromCache();
      const updatedCache: MetadataCache = {
        ...existingCache,
        [key]: {
          metadata,
          timestamp: Date.now(),
          eTag
        }
      };
      
      localStorage.setItem(this.METADATA_CACHE_KEY, JSON.stringify(updatedCache));
    } catch (error) {
      console.error('[CacheService] Failed to save metadata to cache:', error);
    }
  }

  public getMetadataFromCache(): MetadataCache {
    try {
      const cached = localStorage.getItem(this.METADATA_CACHE_KEY);
      if (!cached) return {};

      const cacheData: MetadataCache = JSON.parse(cached);
      const now = Date.now();
      
      // Clean expired entries
      const cleanedCache: MetadataCache = {};
      Object.entries(cacheData).forEach(([key, entry]) => {
        if (now - entry.timestamp <= this.CACHE_EXPIRY_TIME) {
          cleanedCache[key] = entry;
        }
      });
      
      return cleanedCache;
    } catch (error) {
      console.error('[CacheService] Failed to retrieve metadata from cache:', error);
      return {};
    }
  }

  public clearMetadataCache(): void {
    try {
      localStorage.removeItem(this.METADATA_CACHE_KEY);
    } catch (error) {
      console.error('[CacheService] Failed to clear metadata cache:', error);
    }
  }

  public updateTracksCache(
    newTracks: Track[],
    nextContinuationToken?: string,
    isTruncated: boolean = false,
    totalFound: number = 0,
    pageSize: number = 100
  ): void {
    const existingCache = this.getTracksFromCache();
    let updatedTracks: Track[];
    let lastPage = 1;

    if (existingCache) {
      const uniqueTracks = new Map<string, Track>();
      existingCache.tracks.forEach(track => uniqueTracks.set(track.key, track));
      newTracks.forEach(track => uniqueTracks.set(track.key, track));
      updatedTracks = Array.from(uniqueTracks.values());
      lastPage = existingCache.lastPage + 1;

      if (existingCache.pageSize !== pageSize) {
        this.clearTracksCache();
        updatedTracks = newTracks;
        lastPage = 1;
      }
    } else {
      updatedTracks = newTracks;
    }

    this.saveTracksToCache(
      updatedTracks,
      nextContinuationToken,
      isTruncated,
      totalFound || updatedTracks.length,
      lastPage,
      pageSize
    );
  }
}
