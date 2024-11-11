import * as mm from 'music-metadata-browser';
import { TrackMetadata } from '@/types/aws';

// Define supported audio formats and their MIME types
const SUPPORTED_FORMATS = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  aac: 'audio/aac'
} as const;

export class MetadataService {
  private static instance: MetadataService;
  private readonly METADATA_BYTE_RANGE = 5000;

  private constructor() {}

  public static getInstance(): MetadataService {
    if (!MetadataService.instance) {
      MetadataService.instance = new MetadataService();
    }
    return MetadataService.instance;
  }

  public getMimeType(extension: string): string {
    return SUPPORTED_FORMATS[extension as keyof typeof SUPPORTED_FORMATS] || 'audio/mpeg';
  }

  public isAudioFile(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return extension in SUPPORTED_FORMATS;
  }

  public async extractMetadata(audioBlob: Blob, fileName: string): Promise<TrackMetadata> {
    try {
      const metadata = await mm.parseBlob(audioBlob, { duration: true });
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

      return {
        title: metadata.common.title || this.formatTitle(fileName),
        artist: metadata.common.artist || 'Unknown Artist',
        duration: metadata.format.duration || 0,
        bitrate: metadata.format.bitrate || 0,
        mimeType: this.getMimeType(fileExtension)
      };
    } catch (error) {
      console.warn('[MetadataService] Metadata extraction failed:', { error, fileName });
      // Return basic metadata based on filename
      return this.createBasicMetadata(fileName);
    }
  }

  private formatTitle(fileName: string): string {
    // Remove file extension and common prefixes
    return fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/^(?:\d+[\s.-]+)+/, '') // Remove leading numbers and separators
      .replace(/^\[.*?\]\s*/, '') // Remove brackets and content
      .trim();
  }

  private createBasicMetadata(fileName: string): TrackMetadata {
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    return {
      title: this.formatTitle(fileName),
      artist: 'Unknown Artist',
      duration: 0,
      bitrate: 0,
      mimeType: this.getMimeType(fileExtension)
    };
  }
}
