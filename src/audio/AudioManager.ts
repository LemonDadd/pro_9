import { Howl } from 'howler';
import type { GameSettings } from '../types';

type SoundType = 'collision' | 'level_complete' | 'game_over' | 'combo' | 'click';

export class AudioManager {
  private sounds: Map<SoundType, Howl> = new Map();
  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = settings;
    this.initSounds();
  }

  private initSounds(): void {
    this.sounds.set('collision', this.createCollisionSound());
    this.sounds.set('level_complete', this.createLevelCompleteSound());
    this.sounds.set('game_over', this.createGameOverSound());
    this.sounds.set('combo', this.createComboSound());
    this.sounds.set('click', this.createClickSound());
  }

  private createCollisionSound(): Howl {
    return new Howl({
      src: [this.generateCollisionTone()],
      volume: this.settings.sfxVolume * 0.5
    });
  }

  private createLevelCompleteSound(): Howl {
    return new Howl({
      src: [this.generateLevelCompleteTone()],
      volume: this.settings.sfxVolume * 0.8
    });
  }

  private createGameOverSound(): Howl {
    return new Howl({
      src: [this.generateGameOverTone()],
      volume: this.settings.sfxVolume * 0.8
    });
  }

  private createComboSound(): Howl {
    return new Howl({
      src: [this.generateComboTone()],
      volume: this.settings.sfxVolume * 0.6
    });
  }

  private createClickSound(): Howl {
    return new Howl({
      src: [this.generateClickTone()],
      volume: this.settings.sfxVolume * 0.4
    });
  }

  private generateCollisionTone(): string {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const duration = 0.15;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    return this.encodeAudio(ctx, duration);
  }

  private generateLevelCompleteTone(): string {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const duration = 0.15;
    let offset = 0;

    notes.forEach(freq => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + offset);

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime + offset);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + duration);

      oscillator.start(ctx.currentTime + offset);
      oscillator.stop(ctx.currentTime + offset + duration);
      offset += duration;
    });

    return this.encodeAudio(ctx, offset);
  }

  private generateGameOverTone(): string {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [400, 350, 300, 200];
    const duration = 0.2;
    let offset = 0;

    notes.forEach(freq => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + offset);

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime + offset);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + duration);

      oscillator.start(ctx.currentTime + offset);
      oscillator.stop(ctx.currentTime + offset + duration);
      offset += duration;
    });

    return this.encodeAudio(ctx, offset);
  }

  private generateComboTone(): string {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const duration = 0.1;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + duration);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    return this.encodeAudio(ctx, duration);
  }

  private generateClickTone(): string {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const duration = 0.05;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    return this.encodeAudio(ctx, duration);
  }

  private encodeAudio(ctx: AudioContext, duration: number): string {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin(i * 0.01) * 0.1;
    }

    const wav = this.audioBufferToWav(buffer);
    return 'data:audio/wav;base64,' + this.arrayBufferToBase64(wav);
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  play(type: SoundType, pitch?: number): void {
    if (!this.settings.soundEnabled) return;

    const sound = this.sounds.get(type);
    if (sound) {
      if (pitch) {
        sound.rate(pitch);
      }
      sound.play();
    }
  }

  playCollision(speed: number): void {
    if (!this.settings.soundEnabled) return;

    const pitch = 0.8 + (speed / 20) * 0.8;
    const sound = this.sounds.get('collision');
    if (sound) {
      sound.rate(pitch);
      sound.play();
    }
  }

  updateSettings(settings: GameSettings): void {
    this.settings = settings;
    this.sounds.forEach((sound) => {
      sound.volume(this.settings.sfxVolume * 0.5);
    });
  }

  vibrate(pattern: number | number[]): void {
    if (this.settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
}
