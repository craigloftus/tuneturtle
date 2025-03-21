import * as mm from 'music-metadata';
import { S3Service } from './S3Service';

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
  artist: string;
  fileName: string;
  metadata?: TrackMetadata;
  downloaded?: boolean;
  localPath?: string;
}

export interface Album {
  name: string;
  tracks: Track[];
  coverUrl?: string;
  selected?: boolean;
}

interface Tracks {
  [key: string]: Track;
}

export class TrackService {
  private static instance: TrackService;
  private readonly METADATA_BYTE_RANGE = 5000;
  private s3Service = S3Service.getInstance();
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
    const range = await this.fetchTrackMetadataRange(track.key);
    track.metadata = await this.extractMetadata(range);
    this.updateTrack(track);
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
      metadata = await mm.parseWebStream(metadataRange as ReadableStream)
    }
    return Promise.resolve({
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      duration: metadata.format.duration || 0,
      bitrate: metadata.format.bitrate || 0,
    });
  }
}