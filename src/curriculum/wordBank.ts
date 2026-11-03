// Curated, kid-safe words. Drills only use words made entirely of unlocked keys.

export const WORDS: readonly string[] = [
  // home row only
  'a', 'as', 'ad', 'add', 'all', 'ask', 'dad', 'sad', 'lad', 'had', 'has', 'gas', 'fall', 'hall',
  'half', 'flag', 'glad', 'flash', 'dash', 'salad', 'glass', 'shall', 'aha', 'ha',
  // a few common sight words for later worlds
  'the', 'and', 'see', 'is', 'it', 'up', 'we', 'go', 'to', 'you', 'look', 'play', 'red', 'yes',
  'fish', 'frog', 'duck', 'cake', 'jump', 'sun', 'hug', 'kite', 'tree', 'star', 'happy', 'funny',
];

export function wordsFrom(allowed: Iterable<string>): string[] {
  const set = new Set(allowed);
  return WORDS.filter((w) => [...w].every((c) => set.has(c)));
}
