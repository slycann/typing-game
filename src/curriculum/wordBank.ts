// Curated, kid-safe words. Drills only use words made entirely of unlocked keys.

export const WORDS: readonly string[] = [
  // home row only
  'a', 'as', 'ad', 'add', 'all', 'ask', 'dad', 'sad', 'lad', 'had', 'has', 'gas', 'fall', 'hall',
  'half', 'flag', 'glad', 'flash', 'dash', 'salad', 'glass', 'shall', 'aha', 'ha', 'asks', 'adds',
  'falls', 'halls', 'flags', 'dads', 'lads', 'flask', 'sash', 'gala', 'alas', 'sag', 'fad', 'lag', 'shh',
  // top row (Treetop Village)
  'the', 'see', 'is', 'it', 'up', 'we', 'to', 'you', 'yes', 'tree', 'free', 'were', 'wet', 'pet', 'pit',
  'sit', 'fit', 'get', 'yet', 'tie', 'pie', 'toy', 'try', 'fry', 'dry', 'our', 'out', 'rope', 'ripe',
  'wipe', 'tire', 'tiger', 'water', 'pretty', 'party', 'puppy', 'happy', 'sleepy', 'teddy', 'jelly',
  'eggs', 'legs', 'feet', 'sheep', 'street', 'write', 'story', 'tooth', 'pool', 'door', 'road', 'toad',
  'goat', 'kite', 'red', 'go', 'play', 'look', 'frog', 'tea', 'fig', 'pear', 'apple', 'dog', 'pig',
  'owl', 'hat', 'top', 'hop', 'jump', 'free', 'tired', 'fruit', 'dress', 'flower', 'ladder', 'kitty',
  // bottom row (Sandy Bottom Beach)
  'and', 'cat', 'bat', 'van', 'man', 'mom', 'nap', 'map', 'cab', 'web', 'bun', 'sun', 'fun', 'run', 'box',
  'fox', 'zoo', 'buzz', 'zebra', 'mix', 'six', 'cub', 'bus', 'bed', 'bag', 'big', 'zip', 'bike', 'cave',
  'game', 'name', 'moon', 'snow', 'fish', 'duck', 'cake', 'hug', 'star', 'funny', 'beach', 'sand',
  'crab', 'shell', 'wave', 'swim', 'boat', 'ice', 'cream', 'milk', 'bread', 'butter', 'sugar', 'jam',
  'lemon', 'honey', 'banana', 'cookie', 'muffin', 'candle', 'bunny', 'kitten', 'robin', 'zigzag',
];

// Fun names for capitals practice in Shifty Mountains.
export const NAMES: readonly string[] = ['Juni', 'Qwerty', 'Pip', 'Rory', 'Midge', 'Izzy', 'Grumble', 'Max', 'Zoe', 'Sam', 'Ada', 'Bo', 'Kit', 'Leo', 'Mia', 'Tom'];

export function wordsFrom(allowed: Iterable<string>): string[] {
  const set = new Set(allowed);
  return [...new Set(WORDS)].filter((w) => [...w].every((c) => set.has(c)));
}
