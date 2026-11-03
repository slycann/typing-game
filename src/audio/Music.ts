import { Rng } from '../engine/Rng';
import { audioBus } from './Sfx';

// Gentle background music made on the fly with Web Audio (no audio files): a soft chord pad,
// a bass line and a little pentatonic tune, looping. Each world gets its own key, tempo and sound.

interface Track {
  bpm: number;
  root: number; // MIDI note of the key
  lead: OscillatorType;
  chords: number[]; // scale degrees (0-based) of each bar's chord
  seed: number;
  density: number; // how busy the tune is (0..1)
  drums: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTA = [0, 2, 4, 7, 9];

const TRACKS: Record<string, Track> = {
  title: { bpm: 104, root: 60, lead: 'triangle', chords: [0, 4, 5, 3], seed: 1, density: 0.55, drums: true },
  calm: { bpm: 84, root: 65, lead: 'sine', chords: [0, 3, 5, 4], seed: 2, density: 0.35, drums: false },
  race: { bpm: 132, root: 62, lead: 'square', chords: [0, 5, 3, 4], seed: 3, density: 0.7, drums: true },
  boss: { bpm: 116, root: 57, lead: 'triangle', chords: [5, 3, 0, 4], seed: 4, density: 0.6, drums: true },
};
const WORLD_ROOTS = [60, 62, 65, 67, 57, 63, 64];
const WORLD_LEADS: OscillatorType[] = ['triangle', 'triangle', 'sine', 'triangle', 'square', 'sine', 'sine'];

function trackFor(id: string): Track {
  if (TRACKS[id]) return TRACKS[id];
  const m = id.match(/^(map|game)-(\d)$/);
  const w = m ? Number(m[2]) - 1 : 0;
  const game = m?.[1] === 'game';
  return {
    bpm: (game ? 108 : 92) + w * 2,
    root: WORLD_ROOTS[w] ?? 60,
    lead: WORLD_LEADS[w] ?? 'triangle',
    chords: game ? [0, 4, 5, 3] : [0, 3, 4, 0],
    seed: 10 + w * 2 + (game ? 1 : 0),
    density: game ? 0.55 : 0.4,
    drums: game,
  };
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class MusicPlayer {
  private gain: GainNode | null = null;
  private timer: number | null = null;
  private current = '';
  private step = 0;
  private nextTime = 0;
  private track: Track | null = null;
  private melody: (number | null)[] = [];
  private volume = 0.5;
  private ducked = false;
  private enabled = true;
  private noise: AudioBuffer | null = null;

  setVolume(v: number): void {
    this.volume = v;
    this.applyGain();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.stop();
    else if (this.current) this.play(this.current, true);
  }

  /** Lower the music while a character is talking. */
  duck(on: boolean): void {
    this.ducked = on;
    this.applyGain(0.25);
  }

  private applyGain(ramp = 0.6): void {
    const bus = audioBus();
    if (!bus || !this.gain) return;
    const target = this.volume * 0.22 * (this.ducked ? 0.35 : 1);
    this.gain.gain.cancelScheduledValues(bus.ctx.currentTime);
    this.gain.gain.setTargetAtTime(target, bus.ctx.currentTime, ramp / 3);
  }

  /** Play a track (keeps going if it's already playing). */
  play(id: string, force = false): void {
    if (id === this.current && !force && this.timer !== null) return;
    this.current = id;
    if (!this.enabled) return;
    const bus = audioBus();
    if (!bus) return;
    this.stopLoop();
    const old = this.gain;
    if (old) {
      old.gain.setTargetAtTime(0, bus.ctx.currentTime, 0.2);
      window.setTimeout(() => old.disconnect(), 1500);
    }
    this.gain = bus.ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(bus.out);
    this.applyGain(1.2);
    this.track = trackFor(id);
    this.melody = this.compose(this.track);
    this.step = 0;
    this.nextTime = bus.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop(): void {
    this.stopLoop();
    const bus = audioBus();
    if (bus && this.gain) this.gain.gain.setTargetAtTime(0, bus.ctx.currentTime, 0.2);
  }

  private stopLoop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  /** A 32-step tune that always sounds the same for the same track. */
  private compose(t: Track): (number | null)[] {
    const rng = new Rng(t.seed * 7919);
    let last = 2;
    return Array.from({ length: 32 }, (_, i) => {
      if (i % 8 === 0) return PENTA[0] + 12; // land on the home note each bar
      if (rng.next() > t.density) return null;
      last = Math.max(0, Math.min(PENTA.length * 2 - 1, last + rng.int(-2, 2)));
      return PENTA[last % PENTA.length] + 12 * Math.floor(last / PENTA.length);
    });
  }

  private schedule(): void {
    const bus = audioBus();
    if (!bus || !this.track || !this.gain) return;
    const t = this.track;
    const eighth = 60 / t.bpm / 2;
    while (this.nextTime < bus.ctx.currentTime + 0.15) {
      const s = this.step % 32;
      const bar = Math.floor(s / 8);
      const chordRoot = MAJOR[t.chords[bar] % 7];
      if (s % 8 === 0) this.chord(t.root - 12 + chordRoot, this.nextTime, eighth * 8);
      if (s % 4 === 0) this.note(freq(t.root - 24 + chordRoot), this.nextTime, eighth * 3, 'sine', 0.5);
      const m = this.melody[s];
      if (m !== null) this.note(freq(t.root + m), this.nextTime, eighth * 1.6, t.lead, t.lead === 'square' ? 0.12 : 0.3);
      if (t.drums && s % 2 === 1) this.hat(this.nextTime);
      this.nextTime += eighth;
      this.step++;
    }
  }

  private chord(root: number, at: number, dur: number): void {
    for (const iv of [0, 4, 7]) this.note(freq(root + iv), at, dur, 'sine', 0.12, 0.3);
  }

  private note(f: number, at: number, dur: number, type: OscillatorType, vol: number, attack = 0.01): void {
    const bus = audioBus();
    if (!bus || !this.gain) return;
    const osc = bus.ctx.createOscillator();
    const g = bus.ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(this.gain);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  private hat(at: number): void {
    const bus = audioBus();
    if (!bus || !this.gain) return;
    if (!this.noise) {
      // One short burst of noise, made once and reused for every hi-hat tick.
      const len = Math.floor(bus.ctx.sampleRate * 0.04);
      this.noise = bus.ctx.createBuffer(1, len, bus.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = bus.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = bus.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = bus.ctx.createGain();
    g.gain.value = 0.08;
    src.connect(hp).connect(g).connect(this.gain);
    src.start(at);
  }
}

export const music = new MusicPlayer();
