export class AudioController {
  private audio: HTMLAudioElement;
  private context: AudioContext;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode;

  constructor() {
    this.audio = new Audio();
    this.context = new AudioContext();
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
  }

  async load(url: string) {
    if (this.source) {
      this.source.disconnect();
    }
    
    this.audio.src = url;
    this.source = this.context.createMediaElementSource(this.audio);
    this.source.connect(this.gainNode);
    
    await this.audio.load();
  }

  play() {
    this.context.resume();
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  setVolume(value: number) {
    this.gainNode.gain.value = value;
  }

  getCurrentTime() {
    return this.audio.currentTime;
  }

  getDuration() {
    return this.audio.duration;
  }

  seek(time: number) {
    this.audio.currentTime = time;
  }
}

export const audioController = new AudioController();
