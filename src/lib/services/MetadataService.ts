import * as mm from 'music-metadata-browser';
import { TrackMetadata, MetadataProgress } from '@/types/aws';
import { EventEmitter } from 'events';

// Define supported audio formats and their MIME types
const SUPPORTED_FORMATS = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  aac: 'audio/aac'
} as const;

export class MetadataService extends EventEmitter {
  private static instance: MetadataService;
  private readonly METADATA_BYTE_RANGE = 5000;

  private constructor() {
    super();
  }

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

  private emitProgress(progress: MetadataProgress): void {
    this.emit('metadata-progress', progress);
  }

  public async extractMetadata(audioBlob: Blob, fileName: string): Promise<TrackMetadata> {
    try {
      // Report initial progress
      this.emitProgress({
        progress: 0,
        stage: 'initializing',
        fileName
      });

      // Report reading stage
      this.emitProgress({
        progress: 25,
        stage: 'reading',
        fileName
      });

      // Start parsing metadata
      this.emitProgress({
        progress: 50,
        stage: 'parsing',
        fileName
      });

      const metadata = await mm.parseBlob(audioBlob, { duration: true });
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

      // Report completion
      this.emitProgress({
        progress: 100,
        stage: 'complete',
        fileName
      });

      return {
        title: metadata.common.title || this.formatTitle(fileName),
        artist: metadata.common.artist || 'Unknown Artist',
        duration: metadata.format.duration || 0,
        bitrate: metadata.format.bitrate || 0,
        mimeType: this.getMimeType(fileExtension),
        extractionProgress: {
          progress: 100,
          stage: 'complete',
          fileName
        }
      };
    } catch (error) {
      console.warn('[MetadataService] Metadata extraction failed:', { error, fileName });
      this.emitProgress({
        progress: 100,
        stage: 'complete',
        fileName
      });
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
      mimeType: this.getMimeType(fileExtension),
      extractionProgress: {
        progress: 100,
        stage: 'complete',
        fileName
      }
    };
  }

  // Add method to subscribe to progress events
  public onProgress(callback: (progress: MetadataProgress) => void): void {
    this.on('metadata-progress', callback);
  }

  // Add method to unsubscribe from progress events
  public offProgress(callback: (progress: MetadataProgress) => void): void {
    this.off('metadata-progress', callback);
  }
}
