import { S3Credentials, Track } from "@/types/aws";
import { 
  saveAwsCredentials, 
  getAwsCredentials, 
  getTracksFromCache, 
  updateTracksCache, 
  clearTracksCache 
} from "./storage";

export async function validateS3Credentials(credentials: S3Credentials) {
  const response = await fetch('/api/aws/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  
  if (!response.ok) {
    throw new Error('Invalid AWS credentials');
  }
  
  saveAwsCredentials(credentials);
  // Clear existing cache when new credentials are validated
  clearTracksCache();
  return response.json();
}

interface ListResponse {
  tracks: Track[];
  nextContinuationToken?: string;
  isTruncated: boolean;
  totalFound: number;
}

export async function listS3Objects(continuationToken?: string, limit: number = 100): Promise<ListResponse> {
  // Check cache first if no continuation token is provided
  if (!continuationToken) {
    const cachedData = getTracksFromCache();
    if (cachedData) {
      console.log('[Cache] Using cached track data');
      return {
        tracks: cachedData.tracks,
        nextContinuationToken: cachedData.nextContinuationToken,
        isTruncated: cachedData.isTruncated,
        totalFound: cachedData.tracks.length
      };
    }
  }

  const params = new URLSearchParams({
    limit: limit.toString()
  });
  
  if (continuationToken) {
    params.append('continuationToken', continuationToken);
  }

  const response = await fetch(`/api/aws/list?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    if (error.error === "No credentials") {
      clearTracksCache();
    }
    throw new Error('Failed to fetch tracks');
  }

  const data: ListResponse = await response.json();
  
  // Update cache with new data
  updateTracksCache(data.tracks, data.nextContinuationToken, data.isTruncated);
  
  return data;
}

export async function loadAllTracks(): Promise<Track[]> {
  let allTracks: Track[] = [];
  let continuationToken: string | undefined;
  let isTruncated = true;

  while (isTruncated) {
    const response = await listS3Objects(continuationToken);
    allTracks = [...allTracks, ...response.tracks];
    continuationToken = response.nextContinuationToken;
    isTruncated = response.isTruncated;
  }

  return allTracks;
}

export function checkStoredCredentials(): S3Credentials | null {
  return getAwsCredentials();
}
