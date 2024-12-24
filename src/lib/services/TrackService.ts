import * as mm from 'music-metadata-browser';

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
  title: string;
  artist: string;
  duration: number;
  bitrate: number;
  mimeType: string;
}

export interface Track {
  key: string;
  size: number;
  lastModified: Date;
  album: string;
  fileName: string;
  metadata?: TrackMetadata;
  signedUrl?: string;
}

export interface Album {
  name: string;
  tracks: Track[];
  coverUrl?: string;
}

interface Tracks {
  [key: string]: Track;
}

export class TrackService {
  private static instance: TrackService;
  private readonly METADATA_BYTE_RANGE = 5000;
  private trackPrefix = "track/";
  
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

  public updateTrack(key: string, track: Track) {
    const tracks = this.getTracks();
    if (!tracks) {
      return;
    }

    tracks[key] = track;
    this.saveTracks(tracks);
  }

  public getMimeType(extension: string): string {
    return SUPPORTED_FORMATS[extension as keyof typeof SUPPORTED_FORMATS] || 'audio/mpeg';
  }

  public isAudioFile(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return extension in SUPPORTED_FORMATS;
  }

  public async extractMetadata(audioBlob: Blob, fileName: string): Promise<TrackMetadata> {
    const metadata = await mm.parseBlob(audioBlob);
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    return Promise.resolve({
      title: metadata.common.title || this.formatTitle(fileName),
      artist: metadata.common.artist || 'Unknown Artist',
      duration: metadata.format.duration || 0,
      bitrate: metadata.format.bitrate || 0,
      mimeType: this.getMimeType(fileExtension),
    });
  }

  private formatTitle(fileName: string): string {
    // Remove file extension and common prefixes
    return fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/^(?:\d+[\s.-]+)+/, '') // Remove leading numbers and separators
      .replace(/^\[.*?\]\s*/, '') // Remove brackets and content
      .trim();
  }
}