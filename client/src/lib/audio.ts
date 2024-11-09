import { useEffect } from 'react';

export class AudioError extends Error {
  constructor(message: string, public code: string, public originalError?: Error) {
    super(message);
    this.name = 'AudioError';
  }
}

export class AudioController {
  private audio: HTMLAudioElement;
  private context: AudioContext | null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private debugMode: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second
  private isConnected: boolean = false;

  constructor() {
    this.audio = new Audio();
    this.context = null;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Add error event listeners
    this.audio.addEventListener('error', this.handleError);
    this.audio.addEventListener('stalled', () => this.logDebug('Audio playback stalled'));
    this.audio.addEventListener('waiting', () => this.logDebug('Audio buffering'));
    this.audio.addEventListener('suspend', () => this.logDebug('Audio context suspended'));
    this.audio.addEventListener('ended', () => this.logDebug('Audio playback ended'));
    
    // Add CORS-specific event listeners
    this.audio.crossOrigin = 'anonymous';
  }

  private async setupAudioContext() {
    try {
      await this.cleanupAudioContext();
      
      this.context = new AudioContext();
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
      
      // Create new source and connect it
      this.source = this.context.createMediaElementSource(this.audio);
      this.source.connect(this.gainNode);
      this.isConnected = true;
      
      this.logDebug('Audio context and connections setup successfully');
    } catch (error) {
      this.logDebug(`Error setting up AudioContext: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new AudioError(
        'Failed to initialize audio system',
        'INIT_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  private handleError = (event: ErrorEvent | MediaError | Event) => {
    let errorMessage = 'Unknown audio error occurred';
    let errorCode = 'UNKNOWN_ERROR';

    if (event instanceof ErrorEvent) {
      errorMessage = event.message;
      errorCode = 'MEDIA_ERROR';
      
      if (event.message.includes('CORS') || event.message.includes('cross-origin')) {
        errorCode = 'CORS_ERROR';
        errorMessage = 'Cross-origin access denied. Please check CORS configuration.';
      }
    } else if (event instanceof Event && this.audio.error) {
      const mediaError = this.audio.error;
      switch (mediaError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Audio playback aborted';
          errorCode = 'PLAYBACK_ABORTED';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred while loading audio';
          errorCode = 'NETWORK_ERROR';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Audio decoding failed';
          errorCode = 'DECODE_ERROR';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Audio format not supported';
          errorCode = 'FORMAT_ERROR';
          break;
      }
    }

    this.logDebug(`Audio Error: ${errorMessage} (${errorCode})`);
    throw new AudioError(errorMessage, errorCode);
  };

  enableDebug(enable: boolean = true) {
    this.debugMode = enable;
    this.logDebug(`Debug mode ${enable ? 'enabled' : 'disabled'}`);
  }

  private logDebug(message: string) {
    if (this.debugMode) {
      console.debug(`[AudioPlayer Debug] ${message}`);
    }
  }

  private async retry<T>(operation: () => Promise<T>, retries: number = this.maxRetries): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        this.logDebug(`Retrying operation. Attempts remaining: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retry(operation, retries - 1);
      }
      throw error;
    }
  }

  private async cleanupAudioContext() {
    try {
      if (this.source && this.isConnected) {
        this.source.disconnect();
        this.source = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
      }
      if (this.context) {
        if (this.context.state !== 'closed') {
          await this.context.close();
        }
        this.context = null;
      }
      this.isConnected = false;
      this.logDebug('Audio context and connections cleaned up successfully');
    } catch (error) {
      this.logDebug(`Error cleaning up audio context: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw here, just log the error
    }
  }

  async load(url: string) {
    return this.retry(async () => {
      try {
        this.logDebug(`Loading audio from URL: ${url}`);
        
        // Reset audio element
        this.audio.pause();
        this.audio.src = '';
        
        // Setup fresh audio context and connections
        await this.setupAudioContext();
        
        if (!this.context || !this.gainNode) {
          throw new AudioError('Audio context not initialized', 'CONTEXT_ERROR');
        }
        
        // Set new source
        this.audio.src = url;
        
        if (this.context.state === 'suspended') {
          this.logDebug('Resuming audio context');
          await this.context.resume();
        }
        
        this.logDebug('Initiating audio load');
        await this.audio.load();
        this.logDebug('Audio loaded successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logDebug(`Error loading audio: ${message}`);
        
        // Check for CORS-specific errors
        if (message.includes('CORS') || message.includes('cross-origin')) {
          throw new AudioError(
            'Cross-origin access denied. Please check CORS configuration.',
            'CORS_ERROR',
            error instanceof Error ? error : undefined
          );
        }
        
        throw new AudioError(
          'Failed to load audio',
          'LOAD_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    });
  }

  async play() {
    return this.retry(async () => {
      try {
        this.logDebug('Attempting to play audio');
        if (this.context?.state === 'suspended') {
          await this.context.resume();
        }
        
        if (!this.isConnected) {
          await this.setupAudioContext();
        }
        
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          this.logDebug('Audio playing');
        }
      } catch (error) {
        this.logDebug(`Error playing audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new AudioError(
          'Failed to play audio',
          'PLAY_ERROR',
          error instanceof Error ? error : undefined
        );
      }
    });
  }

  pause() {
    try {
      this.logDebug('Pausing audio');
      this.audio.pause();
    } catch (error) {
      this.logDebug(`Error pausing audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new AudioError(
        'Failed to pause audio',
        'PAUSE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  setVolume(value: number) {
    try {
      this.logDebug(`Setting volume to: ${value}`);
      if (this.gainNode) {
        this.gainNode.gain.value = value;
      }
    } catch (error) {
      this.logDebug(`Error setting volume: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new AudioError(
        'Failed to set volume',
        'VOLUME_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  getCurrentTime() {
    return this.audio.currentTime;
  }

  getDuration() {
    return this.audio.duration;
  }

  seek(time: number) {
    try {
      this.logDebug(`Seeking to time: ${time}`);
      this.audio.currentTime = time;
    } catch (error) {
      this.logDebug(`Error seeking: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new AudioError(
        'Failed to seek',
        'SEEK_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  getState() {
    return {
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      volume: this.gainNode?.gain.value ?? 0,
      paused: this.audio.paused,
      ended: this.audio.ended,
      readyState: this.audio.readyState,
      networkState: this.audio.networkState,
      error: this.audio.error,
      contextState: this.context?.state,
      isConnected: this.isConnected
    };
  }

  async dispose() {
    try {
      this.logDebug('Disposing audio controller');
      this.audio.removeEventListener('error', this.handleError);
      await this.cleanupAudioContext();
    } catch (error) {
      this.logDebug(`Error disposing audio controller: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new AudioError(
        'Failed to dispose audio controller',
        'DISPOSE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }
}

export const audioController = new AudioController();

// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  audioController.enableDebug(true);
}
