export class AudioError extends Error {
  constructor(message: string, public code: string, public originalError?: Error) {
    super(message);
    this.name = 'AudioError';
  }
}

export class AudioController {
  private audio: HTMLAudioElement;
  private context: AudioContext;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode;
  private debugMode: boolean = false;

  constructor() {
    this.audio = new Audio();
    this.context = new AudioContext();
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);

    // Add error event listeners
    this.audio.addEventListener('error', this.handleError);
    this.audio.addEventListener('stalled', () => this.logDebug('Audio playback stalled'));
    this.audio.addEventListener('waiting', () => this.logDebug('Audio buffering'));
    this.audio.addEventListener('suspend', () => this.logDebug('Audio context suspended'));
    this.audio.addEventListener('ended', () => this.logDebug('Audio playback ended'));
  }

  private handleError = (event: ErrorEvent | MediaError | Event) => {
    let errorMessage = 'Unknown audio error occurred';
    let errorCode = 'UNKNOWN_ERROR';

    if (event instanceof ErrorEvent) {
      errorMessage = event.message;
      errorCode = 'MEDIA_ERROR';
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

  async load(url: string) {
    try {
      this.logDebug(`Loading audio from URL: ${url}`);
      
      if (this.source) {
        this.logDebug('Disconnecting previous audio source');
        this.source.disconnect();
      }
      
      this.audio.src = url;
      
      if (this.context.state === 'suspended') {
        this.logDebug('Resuming audio context');
        await this.context.resume();
      }
      
      this.source = this.context.createMediaElementSource(this.audio);
      this.source.connect(this.gainNode);
      
      this.logDebug('Initiating audio load');
      await this.audio.load();
      this.logDebug('Audio loaded successfully');
    } catch (error) {
      this.logDebug(`Error loading audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new AudioError(
        'Failed to load audio',
        'LOAD_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async play() {
    try {
      this.logDebug('Attempting to play audio');
      await this.context.resume();
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
      this.gainNode.gain.value = value;
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
      volume: this.gainNode.gain.value,
      paused: this.audio.paused,
      ended: this.audio.ended,
      readyState: this.audio.readyState,
      networkState: this.audio.networkState,
      error: this.audio.error,
      contextState: this.context.state,
    };
  }

  dispose() {
    try {
      this.logDebug('Disposing audio controller');
      this.audio.removeEventListener('error', this.handleError);
      if (this.source) {
        this.source.disconnect();
      }
      this.gainNode.disconnect();
      this.context.close();
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
