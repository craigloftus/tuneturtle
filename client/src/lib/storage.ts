import { S3Credentials, Track } from "@/types/aws";

const AWS_CREDENTIALS_KEY = 'aws_credentials';
const TRACKS_CACHE_KEY = 'tracks_cache';
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

interface TracksCache {
  tracks: Track[];
  timestamp: number;
  nextContinuationToken?: string;
  isTruncated: boolean;
}

export function saveAwsCredentials(credentials: S3Credentials): void {
  try {
    localStorage.setItem(AWS_CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.error('Failed to save AWS credentials to localStorage:', error);
  }
}

export function getAwsCredentials(): S3Credentials | null {
  try {
    const stored = localStorage.getItem(AWS_CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to retrieve AWS credentials from localStorage:', error);
    return null;
  }
}

export function clearAwsCredentials(): void {
  try {
    localStorage.removeItem(AWS_CREDENTIALS_KEY);
    clearTracksCache();
  } catch (error) {
    console.error('Failed to clear AWS credentials from localStorage:', error);
  }
}

export function saveTracksToCache(tracks: Track[], nextContinuationToken?: string, isTruncated: boolean = false): void {
  try {
    const cacheData: TracksCache = {
      tracks,
      timestamp: Date.now(),
      nextContinuationToken,
      isTruncated
    };
    localStorage.setItem(TRACKS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save tracks to cache:', error);
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
      clearTracksCache();
      return null;
    }

    return cacheData;
  } catch (error) {
    console.error('Failed to retrieve tracks from cache:', error);
    return null;
  }
}

export function clearTracksCache(): void {
  try {
    localStorage.removeItem(TRACKS_CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear tracks cache:', error);
  }
}

// Album-specific cache functions
export function getCachedAlbumTracks(albumName: string): Track[] {
  const cache = getTracksFromCache();
  if (!cache) return [];
  return cache.tracks.filter(track => track.album === albumName);
}

export function updateTracksCache(newTracks: Track[], nextContinuationToken?: string, isTruncated: boolean = false): void {
  const existingCache = getTracksFromCache();
  if (existingCache) {
    // Merge new tracks with existing ones, avoiding duplicates
    const uniqueTracks = [...existingCache.tracks];
    newTracks.forEach(newTrack => {
      const existingIndex = uniqueTracks.findIndex(t => t.key === newTrack.key);
      if (existingIndex === -1) {
        uniqueTracks.push(newTrack);
      } else {
        uniqueTracks[existingIndex] = newTrack;
      }
    });
    saveTracksToCache(uniqueTracks, nextContinuationToken, isTruncated);
  } else {
    saveTracksToCache(newTracks, nextContinuationToken, isTruncated);
  }
}
