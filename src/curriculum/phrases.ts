// Practice phrases for the punctuation, number, symbol and accent worlds. Each list is filtered
// to keys the player has unlocked, so only phrases they can actually type ever appear.

export const SHIFT_PHRASES: readonly string[] = [
  'Wow!', 'Yes!', 'Hi!', 'Go!', 'Yay!', 'Who?', 'Why?', 'Me?', 'Ready?', 'Hello!', 'Look!', 'Help!', 'Oops!', 'Hooray!',
];

export const NUMBER_NOUNS: readonly string[] = ['cats', 'dogs', 'hats', 'eggs', 'pigs', 'frogs', 'stars', 'kites', 'cakes', 'bugs', 'ducks', 'trees', 'apples', 'buns'];

export const SYMBOL_PHRASES: readonly string[] = [
  "it's", "I'm", "don't", "Juni's", "can't", "let's", '"hi"', '"wow"', '"yes"',
  'yo-yo', 'x-ray', 'ice-cream', 'c_t', 'd_g', 'b_g',
  '(hi)', '(yes)', '(ok)', '(1)',
  'me@home', '@juni', '#1', '#fun', '#2',
  '$5', '$10', '50%', '100%',
  'cats & dogs', 'you & me', '*star*', '5*2',
  '2+2=4', '1+1=2', 'a=b', '3:30', 'note:',
  '[ok]', '[1]', '[hi]',
];

export const OPTION_PHRASES: readonly string[] = [
  'café', 'olé', 'purée', 'José', 'été', 'piñata', 'niño', 'año', 'señor', 'über', 'müsli',
  '©2026', '© Juni', 'Letterlings™', 'Rocket™',
  '¡hola!', '¿qué?', '¡olé!', '¿sí?',
  '90°', 'hot 30°', '8÷2', '10÷5', 'straße', 'Maß',
];

/** Sentence frames for Story Pages; slots are filled from the word bank and names. */
export const STORY_FRAMES: readonly string[][] = [
  ['the', '{adj}', '{animal}', 'sees', 'a', '{noun}'],
  ['a', '{animal}', 'likes', 'the', '{adj}', '{noun}'],
  ['we', 'see', 'the', '{noun}'],
  ['the', '{noun}', 'is', '{adj}'],
  ['{name}', 'has', 'a', '{adj}', '{noun}'],
  ['{name}', 'jumps', 'up'],
];

export const STORY_SLOTS: Record<string, readonly string[]> = {
  adj: ['big', 'red', 'happy', 'funny', 'sleepy', 'little', 'pretty', 'wet', 'fat', 'sad', 'glad'],
  animal: ['duck', 'frog', 'cat', 'dog', 'pig', 'fish', 'bunny', 'owl', 'goat', 'toad', 'sheep', 'crab'],
  noun: ['cake', 'kite', 'tree', 'star', 'sun', 'hat', 'pie', 'boat', 'map', 'box', 'moon', 'apple'],
};
