import * as mm from 'music-metadata';
import { S3Service } from './S3Service';
// @ts-expect-error - no types for this package
import albumArt from 'album-art';
import { FileStorageService } from './FileStorageService';

// Define supported audio formats and their MIME types
const SUPPORTED_FORMATS = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  aac: 'audio/aac'
} as const;

export interface TrackMetadata {
  title?: string;
  artist?: string;
  duration: number;
  bitrate: number;
}

export interface Track {
  key: string;
  size: number;
  lastModified: Date;
  album: string;
  fileName: string;
  metadata?: TrackMetadata;
  downloaded?: boolean;
  localPath?: string;
  albumArtPath?: string;
}

export interface Album {
  name: string;
  tracks: Track[];
  coverUrl?: string;
  selected?: boolean;
}

// Moved from AlbumList.tsx
export const findAlbumArtUUID = (tracks: Track[]): string | null | undefined => {
  const trackWithArt = tracks.find(track => track.albumArtPath);
  return trackWithArt?.albumArtPath;
};

// Moved from AlbumList.tsx
export const findArtistName = (tracks: Track[]): string | null | undefined => {
  // Return early if no tracks or no tracks with artist metadata
  if (!tracks.length) return undefined;
  
  const tracksWithArtist = tracks.filter(track => track.metadata?.artist);
  if (!tracksWithArtist.length) return undefined;
  
  // Get the first artist to compare against
  const firstArtist = tracksWithArtist[0].metadata?.artist;
  
  // Check if all tracks have the same artist
  const allSameArtist = tracksWithArtist.every(
    track => track.metadata?.artist === firstArtist
  );
  
  // Return "Various Artists" if artists are different, otherwise return the common artist
  return allSameArtist ? firstArtist : "Various Artists";
};

interface Tracks {
  [key: string]: Track;
}

export class TrackService {
  private static instance: TrackService;
  private readonly METADATA_BYTE_RANGE = 5000;
  private s3Service = S3Service.getInstance();
  private fileStorageService = FileStorageService.getInstance();
  private constructor() {}

  public static getInstance(): TrackService {
    if (!TrackService.instance) {
        TrackService.instance = new TrackService();
    }
    return TrackService.instance;
  }
  
  public saveTracks(tracks: Tracks): void {
    try {
      localStorage.setItem('tracks', JSON.stringify(tracks));
    } catch (error) {
      console.error('[CacheService] Failed to save tracks:', error);
    }
  }
  
  public getTracks(): Tracks | null {
    try {
      const stored = localStorage.getItem('tracks');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[CacheService] Failed to retrieve tracks:', error);
      return null;
    }
  }

  public updateTrack(track: Track) {
    const tracks = this.getTracks();
    if (!tracks) {
      return;
    }

    tracks[track.key] = track;
    this.saveTracks(tracks);
  }

  public getMimeType(extension: string): string {
    return SUPPORTED_FORMATS[extension as keyof typeof SUPPORTED_FORMATS] || 'audio/mpeg';
  }

  public isAudioFile(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return extension in SUPPORTED_FORMATS;
  }

  public async populateTrackMetadata(track: Track) {
    let artIdToCheck: string | null = null; // Variable to hold the generated ID
    let artExists = false;

    try {
      // 1. Populate basic metadata first
      const range = await this.fetchTrackMetadataRange(track.key);
      const metadata = await this.extractMetadata(range);
      track.metadata = metadata;

      // 2. Handle Album Art (Check Existence -> Fetch URL -> Download/Store)
      if (metadata.artist && track.album && track.album !== 'Unknown Album') {
        // Generate the deterministic ID
        artIdToCheck = this.fileStorageService.generateAlbumArtId(metadata.artist, track.album);
        
        // Check if the art file already exists
        try {
          artExists = await this.fileStorageService.fileExists(artIdToCheck);
          if (artExists) {
            console.debug(`[TrackService] Album art for ${metadata.artist} - ${track.album} already exists as ${artIdToCheck}. Skipping download.`);
            track.albumArtPath = artIdToCheck; // Assign existing ID
          } else {
            console.debug(`[TrackService] Album art for ${metadata.artist} - ${track.album} not found locally (${artIdToCheck}). Attempting fetch.`);
            // Art doesn't exist, proceed to fetch URL and download
            try {
              const artUrl = await albumArt(metadata.artist, { album: track.album, size: 'large' });
              console.debug(`[TrackService] Fetched album art URL: ${artUrl}`);
              
              // Download and store using the deterministic ID
              const storedId = await this.fileStorageService.downloadAndStore(artUrl, artIdToCheck);
              track.albumArtPath = storedId; // Assign the ID used for storage
              console.debug(`[TrackService] Stored new album art as file ${storedId}`);
            } catch (artError) {
              console.warn(`[TrackService] Could not fetch/store album art for ${metadata.artist} - ${track.album}:`, artError);
              // Keep albumArtPath undefined if fetch/store fails
              track.albumArtPath = undefined;
            }
          }
        } catch (checkError) {
          console.error(`[TrackService] Error checking file existence for ${artIdToCheck}:`, checkError);
          // Proceed cautiously: assume file doesn't exist and try to fetch/download
          // This path is less likely if fileExists handles errors properly
          track.albumArtPath = undefined; // Ensure path is undefined before potential download attempt
        }
      } else {
         console.debug(`[TrackService] Skipping album art fetch for track ${track.key} due to missing artist/album.`);
         track.albumArtPath = undefined; // Ensure it's undefined
      }

      // 3. Update track in storage (always happens after metadata/art attempt)
      this.updateTrack(track);

    } catch (error) {
      console.error(`[TrackService] Error populating metadata/art for track ${track.key}:`, error);
      // Optional: Decide if you still want to save partial data (e.g., if only art failed)
      // Currently, if metadata extraction fails, nothing is saved. If art check/fetch fails, metadata is still saved.
      // If track.metadata is populated, we could still call updateTrack(track) here.
    }
  }

  private async fetchTrackMetadataRange(key: string): Promise<Blob|ReadableStream> {
    // Grab first chunk of the file from S3
    return await this.s3Service.fetchRange(key, 0, this.METADATA_BYTE_RANGE);
  }

  public async extractMetadata(metadataRange: Blob|ReadableStream): Promise<TrackMetadata> {
    let metadata;
    if(metadataRange instanceof Blob) {
      metadata = await mm.parseBlob(metadataRange as Blob);
    }
    else {
      // Make sure to handle potential errors during stream parsing
      try {
        metadata = await mm.parseWebStream(metadataRange as ReadableStream);
      } catch (streamError) {
        console.error('[TrackService] Error parsing metadata stream:', streamError);
        // Return a default/empty metadata object or re-throw
        return { duration: 0, bitrate: 0 }; 
      }
    }
    
    // Ensure metadata and common/format exist before accessing properties
    const common = metadata?.common || {};
    const format = metadata?.format || {};

    return {
      title: common.title,
      artist: common.artist,
      duration: format.duration || 0,
      bitrate: format.bitrate || 0,
    };
  }
}
