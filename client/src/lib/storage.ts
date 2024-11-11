import { S3Credentials, Track, TrackMetadata } from "@/types/aws";

const AWS_CREDENTIALS_KEY = 'aws_credentials';
const TRACKS_CACHE_KEY = 'tracks_cache';
const METADATA_CACHE_KEY = 'metadata_cache';
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

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

export function saveAwsCredentials(credentials: S3Credentials): void {
  try {
    localStorage.setItem(AWS_CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.error('[Storage] Failed to save AWS credentials to localStorage:', error);
  }
}

export function getAwsCredentials(): S3Credentials | null {
  try {
    const stored = localStorage.getItem(AWS_CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[Storage] Failed to retrieve AWS credentials from localStorage:', error);
    return null;
  }
}

export function clearAwsCredentials(): void {
  try {
    localStorage.removeItem(AWS_CREDENTIALS_KEY);
    clearTracksCache();
    clearMetadataCache();
  } catch (error) {
    console.error('[Storage] Failed to clear AWS credentials from localStorage:', error);
  }
}

export function saveTracksToCache(
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
    
    console.log('[Storage] Saving tracks to cache:', {
      trackCount: tracks.length,
      nextToken: nextContinuationToken,
      isTruncated,
      totalFound,
      lastPage,
      pageSize
    });
    
    localStorage.setItem(TRACKS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('[Storage] Failed to save tracks to cache:', error);
  }
}

export function getTracksFromCache(): TracksCache | null {
  try {
    const cached = localStorage.getItem(TRACKS_CACHE_KEY);
    if (!cached) return null;

    const cacheData: TracksCache = JSON.parse(cached);
    const now = Date.now();

    if (now - cacheData.timestamp > CACHE_EXPIRY_TIME) {
      console.log('[Storage] Cache expired, clearing...');
      clearTracksCache();
      return null;
    }

    if (cacheData.isTruncated && !cacheData.nextContinuationToken) {
      console.log('[Storage] Invalid pagination state, clearing cache...');
      clearTracksCache();
      return null;
    }

    console.log('[Storage] Retrieved tracks from cache:', {
      trackCount: cacheData.tracks.length,
      nextToken: cacheData.nextContinuationToken,
      isTruncated: cacheData.isTruncated,
      totalFound: cacheData.totalFound,
      lastPage: cacheData.lastPage,
      pageSize: cacheData.pageSize
    });
    
    return cacheData;
  } catch (error) {
    console.error('[Storage] Failed to retrieve tracks from cache:', error);
    return null;
  }
}

export function clearTracksCache(): void {
  try {
    localStorage.removeItem(TRACKS_CACHE_KEY);
  } catch (error) {
    console.error('[Storage] Failed to clear tracks cache:', error);
  }
}

export function saveMetadataToCache(key: string, metadata: TrackMetadata, eTag?: string): void {
  try {
    const existingCache = getMetadataFromCache();
    const updatedCache: MetadataCache = {
      ...existingCache,
      [key]: {
        metadata,
        timestamp: Date.now(),
        eTag
      }
    };
    
    localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(updatedCache));
    console.log('[Storage] Saved metadata to cache:', { key, metadata });
  } catch (error) {
    console.error('[Storage] Failed to save metadata to cache:', error);
  }
}

export function getMetadataFromCache(): MetadataCache {
  try {
    const cached = localStorage.getItem(METADATA_CACHE_KEY);
    if (!cached) return {};

    const cacheData: MetadataCache = JSON.parse(cached);
    const now = Date.now();
    
    // Clean expired entries
    const cleanedCache: MetadataCache = {};
    Object.entries(cacheData).forEach(([key, entry]) => {
      if (now - entry.timestamp <= CACHE_EXPIRY_TIME) {
        cleanedCache[key] = entry;
      }
    });
    
    return cleanedCache;
  } catch (error) {
    console.error('[Storage] Failed to retrieve metadata from cache:', error);
    return {};
  }
}

export function clearMetadataCache(): void {
  try {
    localStorage.removeItem(METADATA_CACHE_KEY);
  } catch (error) {
    console.error('[Storage] Failed to clear metadata cache:', error);
  }
}

export function getCachedMetadataForTrack(key: string): TrackMetadata | null {
  const cache = getMetadataFromCache();
  return cache[key]?.metadata || null;
}

export function updateTracksCache(
  newTracks: Track[], 
  nextContinuationToken?: string, 
  isTruncated: boolean = false,
  totalFound: number = 0,
  pageSize: number = 100
): void {
  const existingCache = getTracksFromCache();
  let updatedTracks: Track[];
  let lastPage = 1;

  if (existingCache) {
    const uniqueTracks = new Map<string, Track>();
    existingCache.tracks.forEach(track => uniqueTracks.set(track.key, track));
    newTracks.forEach(track => uniqueTracks.set(track.key, track));
    updatedTracks = Array.from(uniqueTracks.values());
    lastPage = existingCache.lastPage + 1;

    if (existingCache.pageSize !== pageSize) {
      console.warn('[Storage] Page size mismatch, resetting cache:', {
        oldSize: existingCache.pageSize,
        newSize: pageSize
      });
      clearTracksCache();
      updatedTracks = newTracks;
      lastPage = 1;
    }
  } else {
    updatedTracks = newTracks;
  }

  saveTracksToCache(
    updatedTracks,
    nextContinuationToken,
    isTruncated,
    totalFound || updatedTracks.length,
    lastPage,
    pageSize
  );
}

// Album-specific cache functions
export function getCachedAlbumTracks(albumName: string): Track[] {
  const cache = getTracksFromCache();
  if (!cache) return [];
  return cache.tracks.filter(track => track.album === albumName);
}
