// This file is kept for maintaining types and interfaces
export class AudioError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "AudioError";
  }
}

// Minimal type definitions to maintain interface compatibility
export interface AudioState {
  currentTime: number;
  duration: number;
  volume: number;
  paused: boolean;
  ended: boolean;
  readyState: number;
  networkState: number;
  error: MediaError | null;
}

// Basic audio controller interface to ensure type consistency
export class AudioController {
  private audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio();
  }

  async load(url: string): Promise<void> {
    this.audio.src = url;
    return Promise.resolve();
  }

  async play(): Promise<void> {
    return this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  getState(): AudioState {
    return {
      currentTime: this.audio.currentTime,
      duration: this.audio.duration,
      volume: this.audio.volume,
      paused: this.audio.paused,
      ended: this.audio.ended,
      readyState: this.audio.readyState,
      networkState: this.audio.networkState,
      error: this.audio.error,
    };
  }
}

export const audioController = new AudioController();
