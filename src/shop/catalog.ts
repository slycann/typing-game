// Everything coins can buy. Prices assume ~5–10 coins a level and a 15-coin daily bonus.

export type ItemKind = 'hat' | 'glasses' | 'pet' | 'decor';
export type DecorSlot = 'rug' | 'lamp' | 'plant' | 'wall' | 'window' | 'seat' | 'shelf' | 'ceiling';

export interface ShopItem {
  id: string;
  name: string;
  kind: ItemKind;
  price: number;
  slot?: DecorSlot;
}

export const CATALOG: readonly ShopItem[] = [
  { id: 'party-hat', name: 'Party Hat', kind: 'hat', price: 15 },
  { id: 'bow', name: 'Big Bow', kind: 'hat', price: 15 },
  { id: 'cap', name: 'Sporty Cap', kind: 'hat', price: 20 },
  { id: 'flower-crown', name: 'Flower Crown', kind: 'hat', price: 25 },
  { id: 'sailor', name: 'Sailor Hat', kind: 'hat', price: 30 },
  { id: 'crown', name: 'Golden Crown', kind: 'hat', price: 40 },
  { id: 'wizard', name: 'Wizard Hat', kind: 'hat', price: 50 },
  { id: 'round-specs', name: 'Round Specs', kind: 'glasses', price: 15 },
  { id: 'star-shades', name: 'Star Shades', kind: 'glasses', price: 25 },
  { id: 'heart-shades', name: 'Heart Shades', kind: 'glasses', price: 25 },
  { id: 'ladybug', name: 'Ladybug', kind: 'pet', price: 30 },
  { id: 'snail', name: 'Snail', kind: 'pet', price: 30 },
  { id: 'chick', name: 'Chick', kind: 'pet', price: 40 },
  { id: 'butterfly', name: 'Butterfly', kind: 'pet', price: 40 },
  { id: 'fishbowl', name: 'Goldfish', kind: 'pet', price: 45 },
  { id: 'rug-rainbow', name: 'Rainbow Rug', kind: 'decor', slot: 'rug', price: 20 },
  { id: 'rug-star', name: 'Starry Rug', kind: 'decor', slot: 'rug', price: 20 },
  { id: 'lamp-mushroom', name: 'Mushroom Lamp', kind: 'decor', slot: 'lamp', price: 25 },
  { id: 'lamp-moon', name: 'Moon Lamp', kind: 'decor', slot: 'lamp', price: 25 },
  { id: 'plant-cactus', name: 'Cactus', kind: 'decor', slot: 'plant', price: 15 },
  { id: 'plant-sunflower', name: 'Sunflower', kind: 'decor', slot: 'plant', price: 15 },
  { id: 'poster-rocket', name: 'Rocket Poster', kind: 'decor', slot: 'wall', price: 15 },
  { id: 'poster-grumble', name: 'Grumble Poster', kind: 'decor', slot: 'wall', price: 20 },
  { id: 'curtains-pink', name: 'Pink Curtains', kind: 'decor', slot: 'window', price: 15 },
  { id: 'curtains-blue', name: 'Blue Curtains', kind: 'decor', slot: 'window', price: 15 },
  { id: 'beanbag', name: 'Beanbag', kind: 'decor', slot: 'seat', price: 30 },
  { id: 'hammock', name: 'Hammock', kind: 'decor', slot: 'seat', price: 35 },
  { id: 'books', name: 'Story Books', kind: 'decor', slot: 'shelf', price: 15 },
  { id: 'trophy', name: 'Trophy', kind: 'decor', slot: 'shelf', price: 40 },
  { id: 'bunting-ceiling', name: 'Party Flags', kind: 'decor', slot: 'ceiling', price: 15 },
  { id: 'disco-ball', name: 'Disco Ball', kind: 'decor', slot: 'ceiling', price: 45 },
];

export const DECOR_SLOTS: DecorSlot[] = ['ceiling', 'wall', 'window', 'shelf', 'lamp', 'plant', 'seat', 'rug'];

export const SLOT_NAMES: Record<DecorSlot, string> = {
  rug: 'Rug',
  lamp: 'Lamp',
  plant: 'Plant',
  wall: 'Poster',
  window: 'Window',
  seat: 'Comfy seat',
  shelf: 'Shelf',
  ceiling: 'Ceiling',
};

export function itemById(id: string): ShopItem {
  const item = CATALOG.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown item ${id}`);
  return item;
}

export type BuyResult = 'bought' | 'owned' | 'poor';

/** Buy an item for a player. Mutates the profile; never lets coins go below zero. */
export function buy(p: { coins: number; owned: string[] }, id: string): BuyResult {
  const item = itemById(id);
  if (p.owned.includes(id)) return 'owned';
  if (p.coins < item.price) return 'poor';
  p.coins -= item.price;
  p.owned.push(id);
  return 'bought';
}
