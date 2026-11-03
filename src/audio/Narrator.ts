// Characters talk using the device's built-in voice for now; recorded clips can replace
// individual lines later without changing callers.

const LETTER_NAMES: Record<string, string> = {
  a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'eff', g: 'jee', h: 'aitch', i: 'eye',
  j: 'jay', k: 'kay', l: 'el', m: 'em', n: 'en', o: 'oh', p: 'pee', q: 'cue', r: 'ar', s: 'ess',
  t: 'tee', u: 'you', v: 'vee', w: 'double you', x: 'ex', y: 'why', z: 'zee',
  ' ': 'space', ';': 'semicolon', ',': 'comma', '.': 'period', '/': 'slash', "'": 'apostrophe',
  '\n': 'return', '\t': 'tab', '-': 'dash', '=': 'equals', '[': 'open bracket', ']': 'close bracket',
  '\\': 'backslash', '`': 'backtick',
};

const PREFERRED_VOICES = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Google US English', 'Microsoft Aria'];

let enabled = true;
let voice: SpeechSynthesisVoice | null = null;

function synth(): SpeechSynthesis | null {
  return typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices().filter((v) => v.lang.startsWith('en'));
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((x) => x.name.startsWith(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang === 'en-US') ?? voices[0] ?? null;
}

synth()?.addEventListener?.('voiceschanged', () => (voice = pickVoice()));

export const narrator = {
  setEnabled(on: boolean): void {
    enabled = on;
    if (!on) synth()?.cancel();
  },
  say(text: string, opts: { interrupt?: boolean; pitch?: number; rate?: number } = {}): void {
    const s = synth();
    if (!s || !enabled) return;
    if (opts.interrupt ?? true) s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    voice ??= pickVoice();
    if (voice) u.voice = voice;
    u.pitch = opts.pitch ?? 1.15;
    u.rate = opts.rate ?? 0.95;
    s.speak(u);
  },
  stop(): void {
    synth()?.cancel();
  },
  nameOf(char: string): string {
    if (/^[A-Z]$/.test(char)) return `big ${LETTER_NAMES[char.toLowerCase()]}`;
    return LETTER_NAMES[char] ?? char;
  },
};
