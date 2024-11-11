import { S3Credentials, Track } from "@/types/aws";

const AWS_CREDENTIALS_KEY = 'aws_credentials';
const TRACKS_CACHE_KEY = 'tracks_cache';
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

    // Check if cache is expired
    if (now - cacheData.timestamp > CACHE_EXPIRY_TIME) {
      console.log('[Storage] Cache expired, clearing...');
      clearTracksCache();
      return null;
    }

    // Check if we have all pages when the data is truncated
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
    // Merge new tracks with existing ones, avoiding duplicates
    const uniqueTracks = new Map<string, Track>();
    
    // First add existing tracks to the map
    existingCache.tracks.forEach(track => {
      uniqueTracks.set(track.key, track);
    });

    // Then add/update with new tracks
    newTracks.forEach(track => {
      uniqueTracks.set(track.key, track);
    });

    updatedTracks = Array.from(uniqueTracks.values());
    lastPage = existingCache.lastPage + 1;

    // Validate pagination consistency
    if (existingCache.pageSize !== pageSize) {
      console.warn('[Storage] Page size mismatch, resetting cache:', {
        oldSize: existingCache.pageSize,
        newSize: pageSize
      });
      clearTracksCache();
      updatedTracks = newTracks;
      lastPage = 1;
    }

    console.log('[Storage] Updated tracks cache:', {
      previousCount: existingCache.tracks.length,
      newCount: newTracks.length,
      totalCount: updatedTracks.length,
      lastPage
    });
  } else {
    updatedTracks = newTracks;
    console.log('[Storage] Created new tracks cache:', {
      trackCount: newTracks.length,
      lastPage
    });
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
