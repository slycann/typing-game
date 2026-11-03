// Tiny synthesized sound effects (no audio files needed). Everything is soft and friendly:
// mistakes get a gentle "boop", never a harsh buzzer.

let ctx: AudioContext | null = null;
let main: GainNode | null = null; // everything (mute switch)
let master: GainNode | null = null; // sound effects
let volume = 0.8;
let muted = false;

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    main = ctx.createGain();
    main.gain.value = muted ? 0 : 1;
    main.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(main);
  }
  return ctx;
}

/** The shared audio context and the bus music should plug into (created on first use). */
export function audioBus(): { ctx: AudioContext; out: GainNode } | null {
  const ac = audio();
  return ac && main ? { ctx: ac, out: main } : null;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.25, slideTo?: number) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

export const sfx = {
  unlock(): void {
    void audio()?.resume();
  },
  setVolume(v: number): void {
    volume = v;
    if (master) master.gain.value = v;
  },
  /** Silence everything (effects and music). */
  setMuted(on: boolean): void {
    muted = on;
    if (main) main.gain.value = on ? 0 : 1;
  },
  /** Any key press: a little wooden "tok" at a random happy pitch. */
  key(): void {
    tone(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)] / 2, 0, 0.08, 'triangle', 0.12);
  },
  good(step = 0): void {
    const f = PENTATONIC[step % PENTATONIC.length];
    tone(f, 0, 0.12, 'sine', 0.22, f * 1.5);
  },
  oops(): void {
    tone(260, 0, 0.18, 'sine', 0.16, 200);
  },
  select(): void {
    tone(660, 0, 0.07, 'triangle', 0.16);
    tone(990, 0.06, 0.09, 'triangle', 0.14);
  },
  pop(): void {
    tone(400, 0, 0.09, 'sine', 0.2, 900);
  },
  cheer(): void {
    [0, 2, 4, 5].forEach((n, i) => tone(PENTATONIC[n], i * 0.11, 0.25, 'triangle', 0.2));
    tone(1318.5, 0.5, 0.5, 'sine', 0.16);
  },
  coin(): void {
    tone(988, 0, 0.06, 'square', 0.06);
    tone(1319, 0.06, 0.14, 'square', 0.06);
  },
};
