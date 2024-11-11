import { S3Credentials, Track } from "@/types/aws";
import { 
  saveAwsCredentials, 
  getAwsCredentials, 
  getTracksFromCache, 
  updateTracksCache, 
  clearTracksCache 
} from "./storage";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

export async function validateS3Credentials(credentials: S3Credentials) {
  const response = await fetch('/api/aws/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Invalid AWS credentials');
  }
  
  saveAwsCredentials(credentials);
  clearTracksCache(); // Clear cache when new credentials are validated
  return response.json();
}

interface ListResponse {
  tracks: Track[];
  nextContinuationToken?: string;
  isTruncated: boolean;
  totalFound: number;
  maxKeys: number;
}

interface PaginationOptions {
  limit?: number;
  continuationToken?: string;
  useCache?: boolean;
  retryCount?: number;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function listS3Objects(options: PaginationOptions = {}): Promise<ListResponse> {
  const { 
    limit = 100,
    continuationToken,
    useCache = true,
    retryCount = 0
  } = options;

  // Check cache first if no continuation token is provided and cache is enabled
  if (!continuationToken && useCache) {
    const cachedData = getTracksFromCache();
    if (cachedData) {
      console.log('[AWS] Using cached track data:', {
        trackCount: cachedData.tracks.length,
        nextToken: cachedData.nextContinuationToken,
        isTruncated: cachedData.isTruncated,
        currentPage: cachedData.lastPage
      });
      return {
        tracks: cachedData.tracks,
        nextContinuationToken: cachedData.nextContinuationToken,
        isTruncated: cachedData.isTruncated,
        totalFound: cachedData.totalFound,
        maxKeys: limit
      };
    }
  }

  const params = new URLSearchParams({
    limit: limit.toString()
  });
  
  if (continuationToken) {
    params.append('continuationToken', continuationToken);
  }

  try {
    console.log('[AWS] Fetching tracks:', {
      limit,
      continuationToken: continuationToken || 'none',
      retryAttempt: retryCount
    });

    const response = await fetch(`/api/aws/list?${params.toString()}`);
    if (!response.ok) {
      const error = await response.json();
      if (error.error === "No credentials") {
        clearTracksCache();
      }
      throw new Error(error.message || 'Failed to fetch tracks');
    }

    const data: ListResponse = await response.json();
    console.log('[AWS] Received track data:', {
      trackCount: data.tracks.length,
      nextToken: data.nextContinuationToken,
      isTruncated: data.isTruncated,
      totalFound: data.totalFound
    });
    
    // Update cache with new data
    updateTracksCache(
      data.tracks, 
      data.nextContinuationToken, 
      data.isTruncated,
      data.totalFound
    );
    
    return data;
  } catch (error) {
    console.error('[AWS] Error fetching tracks:', error);
    
    // Implement exponential backoff for retries
    if (retryCount < MAX_RETRIES) {
      const backoffTime = INITIAL_BACKOFF * Math.pow(2, retryCount);
      console.log(`[AWS] Retrying in ${backoffTime}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      await delay(backoffTime);
      
      return listS3Objects({
        limit,
        continuationToken,
        useCache,
        retryCount: retryCount + 1
      });
    }
    
    throw error;
  }
}

export async function loadAllTracks(pageSize: number = 100): Promise<Track[]> {
  console.log('[AWS] Starting to load all tracks');
  let allTracks: Track[] = [];
  let continuationToken: string | undefined;
  let isTruncated = true;
  let page = 1;
  let totalPages = 0;
  let failedAttempts = 0;

  try {
    while (isTruncated) {
      console.log('[AWS] Loading page', page, {
        token: continuationToken || 'none',
        tracksLoaded: allTracks.length,
        failedAttempts
      });

      try {
        const response = await listS3Objects({
          limit: pageSize,
          continuationToken,
          useCache: page === 1 // Only use cache for first page
        });

        allTracks = [...allTracks, ...response.tracks];
        continuationToken = response.nextContinuationToken;
        isTruncated = response.isTruncated;
        
        // Calculate total pages if we have the total count
        if (response.totalFound && !totalPages) {
          totalPages = Math.ceil(response.totalFound / pageSize);
        }

        console.log('[AWS] Loaded page', page, {
          newTracks: response.tracks.length,
          totalTracks: allTracks.length,
          progress: totalPages ? `${page}/${totalPages}` : 'unknown',
          hasMore: isTruncated
        });

        // Reset failed attempts on successful request
        failedAttempts = 0;
        page++;
      } catch (error) {
        failedAttempts++;
        console.error('[AWS] Error loading page', page, error);

        if (failedAttempts >= MAX_RETRIES) {
          throw new Error(`Failed to load page ${page} after ${MAX_RETRIES} attempts`);
        }

        const backoffTime = INITIAL_BACKOFF * Math.pow(2, failedAttempts - 1);
        console.log(`[AWS] Retrying page ${page} in ${backoffTime}ms (attempt ${failedAttempts}/${MAX_RETRIES})`);
        await delay(backoffTime);
        // Continue without incrementing page to retry the same page
        continue;
      }
    }

    console.log('[AWS] Finished loading all tracks:', {
      totalPages: page - 1,
      totalTracks: allTracks.length
    });
    return allTracks;
  } catch (error) {
    console.error('[AWS] Error loading all tracks:', error);
    throw error;
  }
}

export function checkStoredCredentials(): S3Credentials | null {
  return getAwsCredentials();
}
