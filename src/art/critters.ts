// Original characters drawn as SVG in a flat, rounded, side-profile style:
// big heads, both eyes on one side, rosy cheeks, stick arms and legs.
// Each function returns an SVG string; textures.ts turns them into Phaser textures.

import type { AnimalKind } from '../save/types';
import { css, darken, lighten } from './palette';

const INK = '#3d2c5e';

export const ANIMALS: AnimalKind[] = ['bunny', 'puppy', 'kitten', 'bear', 'duckling'];

export const ANIMAL_NAMES: Record<AnimalKind, string> = {
  bunny: 'Bunny',
  puppy: 'Puppy',
  kitten: 'Kitten',
  bear: 'Bear Cub',
  duckling: 'Duckling',
};

export const FUR: Record<AnimalKind, number> = {
  bunny: 0xffc9de,
  puppy: 0xe9b07c,
  kitten: 0xffb45e,
  bear: 0xb27b53,
  duckling: 0xffe066,
};

export const CRITTER_SIZE = { w: 260, h: 320 };

/** Draw a shape twice, a fat dark outline first and the fill on top, so overlapping parts merge. */
function outlined(shapes: string[], fill: string, stroke: string, width = 9): string {
  const out = shapes.map((s) => s.replace('/>', ` fill="${stroke}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`));
  const inn = shapes.map((s) => s.replace('/>', ` fill="${fill}"/>`));
  return out.join('') + inn.join('');
}

function eyes(x1: number, y1: number, x2: number, y2: number): string {
  return `<circle cx="${x1}" cy="${y1}" r="12" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="${x2}" cy="${y2}" r="11" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="${x1 + 4}" cy="${y1 + 1}" r="5.5" fill="${INK}"/>
    <circle cx="${x2 + 4}" cy="${y2 + 1}" r="5" fill="${INK}"/>
    <circle cx="${x1 + 6}" cy="${y1 - 2}" r="1.8" fill="#fff"/>
    <circle cx="${x2 + 6}" cy="${y2 - 2}" r="1.6" fill="#fff"/>`;
}

function body(outfit: string, fur: string, legs: string, shoes: string): string {
  const furDark = css(darken(parseInt(fur.slice(1), 16), 0.25));
  const outfitDark = css(darken(parseInt(outfit.slice(1), 16), 0.25));
  return `
    <g stroke="${legs}" stroke-width="8" stroke-linecap="round">
      <line x1="114" y1="252" x2="112" y2="294"/><line x1="148" y1="252" x2="150" y2="294"/>
    </g>
    <ellipse cx="118" cy="298" rx="16" ry="9" fill="${shoes}"/>
    <ellipse cx="156" cy="298" rx="16" ry="9" fill="${shoes}"/>
    <g stroke="${furDark}" stroke-width="7" stroke-linecap="round" fill="none">
      <path d="M98 196 Q80 214 64 206"/><path d="M162 196 Q184 208 200 194"/>
    </g>
    <circle cx="62" cy="205" r="7" fill="${fur}" stroke="${furDark}" stroke-width="3"/>
    <circle cx="202" cy="193" r="7" fill="${fur}" stroke="${furDark}" stroke-width="3"/>
    <path d="M106 166 Q94 168 90 196 L76 244 Q72 262 90 262 L170 262 Q188 262 184 244 L170 196 Q166 168 154 166 Z"
      fill="${outfit}" stroke="${outfitDark}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M86 236 L174 236" stroke="${css(lighten(parseInt(outfit.slice(1), 16), 0.35))}" stroke-width="6" stroke-linecap="round"/>`;
}

function face(cheekX: number, mouth: string): string {
  return `<circle cx="${cheekX}" cy="134" r="12" fill="#ff7fa8" opacity="0.55"/>
    <path d="${mouth}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

export function critterSvg(kind: AnimalKind, outfitColor: number, furColor: number = FUR[kind]): string {
  const fur = css(furColor);
  const furDark = css(darken(furColor, 0.25));
  const outfit = css(outfitColor);
  let head = '';
  let legs = furDark;
  let shoes = '#e84a7a';

  switch (kind) {
    case 'bunny':
      head = `
        ${outlined([`<ellipse cx="112" cy="46" rx="17" ry="50" transform="rotate(-14 112 46)"/>`, `<ellipse cx="148" cy="40" rx="17" ry="50" transform="rotate(10 148 40)"/>`], fur, furDark)}
        <ellipse cx="112" cy="50" rx="8" ry="36" transform="rotate(-14 112 50)" fill="#ff9cbf"/>
        <ellipse cx="148" cy="44" rx="8" ry="36" transform="rotate(10 148 44)" fill="#ff9cbf"/>
        ${outlined([`<ellipse cx="138" cy="114" rx="62" ry="56"/>`, `<ellipse cx="190" cy="122" rx="27" ry="23"/>`], fur, furDark)}
        <ellipse cx="214" cy="116" rx="8" ry="7" fill="#ff6f9c"/>
        ${eyes(154, 98, 180, 101)}
        ${face(160, 'M180 142 Q194 154 208 140')}`;
      break;
    case 'puppy':
      head = `
        ${outlined([`<ellipse cx="136" cy="114" rx="62" ry="56"/>`, `<ellipse cx="196" cy="124" rx="36" ry="24"/>`], fur, furDark)}
        <ellipse cx="116" cy="90" rx="20" ry="16" fill="${furDark}" opacity="0.55"/>
        <ellipse cx="230" cy="114" rx="10" ry="9" fill="${INK}"/>
        ${outlined([`<ellipse cx="96" cy="122" rx="18" ry="44" transform="rotate(16 96 122)"/>`], css(darken(furColor, 0.15)), furDark)}
        ${eyes(152, 98, 178, 101)}
        ${face(158, 'M186 144 Q202 156 216 140')}
        <ellipse cx="206" cy="152" rx="7" ry="9" fill="#ff7fa8"/>`;
      break;
    case 'kitten':
      head = `
        ${outlined([`<path d="M92 92 L98 30 L140 66 Z"/>`, `<path d="M132 62 L166 22 L180 76 Z"/>`], fur, furDark)}
        <path d="M102 76 L105 46 L126 66 Z" fill="#ff9cbf"/><path d="M144 62 L162 38 L170 70 Z" fill="#ff9cbf"/>
        ${outlined([`<ellipse cx="138" cy="114" rx="62" ry="56"/>`, `<ellipse cx="188" cy="124" rx="24" ry="19"/>`], fur, furDark)}
        <path d="M118 66 Q126 80 122 92 M136 62 Q140 76 136 90" stroke="${furDark}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M204 112 L218 112 L211 122 Z" fill="#ff6f9c" stroke="#ff6f9c" stroke-width="3" stroke-linejoin="round"/>
        ${eyes(152, 98, 178, 101)}
        <g stroke="${INK}" stroke-width="2.5" stroke-linecap="round"><line x1="196" y1="128" x2="240" y2="120"/><line x1="196" y1="134" x2="240" y2="136"/></g>
        ${face(158, 'M182 140 Q194 150 206 138')}`;
      break;
    case 'bear':
      head = `
        ${outlined([`<circle cx="96" cy="68" r="22"/>`, `<circle cx="154" cy="56" r="22"/>`], fur, furDark)}
        <circle cx="96" cy="68" r="11" fill="${css(lighten(furColor, 0.4))}"/><circle cx="154" cy="56" r="11" fill="${css(lighten(furColor, 0.4))}"/>
        ${outlined([`<ellipse cx="136" cy="114" rx="62" ry="56"/>`], fur, furDark)}
        ${outlined([`<ellipse cx="190" cy="126" rx="30" ry="22"/>`], css(lighten(furColor, 0.45)), furDark, 6)}
        <ellipse cx="212" cy="114" rx="10" ry="8" fill="${INK}"/>
        ${eyes(150, 96, 176, 99)}
        ${face(152, 'M184 138 Q198 150 212 136')}`;
      break;
    case 'duckling':
      legs = '#ff9a3c';
      shoes = '#ff9a3c';
      head = `
        <path d="M128 64 Q118 36 138 32 M140 62 Q146 34 166 40" stroke="${furDark}" stroke-width="7" fill="none" stroke-linecap="round"/>
        ${outlined([`<ellipse cx="138" cy="114" rx="60" ry="56"/>`], fur, furDark)}
        ${outlined([`<path d="M186 108 Q232 98 240 116 Q232 134 186 132 Z"/>`], '#ff9a3c', '#d9741f', 6)}
        <path d="M190 120 Q214 122 236 117" stroke="#d9741f" stroke-width="3" fill="none"/>
        ${eyes(150, 96, 174, 99)}
        <circle cx="156" cy="132" r="12" fill="#ff7fa8" opacity="0.55"/>`;
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 320">
    ${body(outfit, fur, legs, shoes)}
    ${head}
  </svg>`;
}

export const TORTOISE_SIZE = { w: 360, h: 280 };

/** Grandpa Qwerty: a kind old tortoise with round glasses and bushy white eyebrows. */
export function tortoiseSvg(): string {
  const skin = '#a3d46e';
  const skinDark = '#6f9e43';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 280">
    <path d="M40 196 L14 210 L44 214 Z" fill="${skin}" stroke="${skinDark}" stroke-width="4" stroke-linejoin="round"/>
    ${[70, 118, 214, 262].map((x) => `<rect x="${x}" y="186" width="34" height="62" rx="16" fill="${skin}" stroke="${skinDark}" stroke-width="4"/>
      <ellipse cx="${x + 17}" cy="244" rx="20" ry="8" fill="${skinDark}"/>`).join('')}
    <path d="M276 178 Q300 150 300 120" stroke="${skinDark}" stroke-width="44" stroke-linecap="round" fill="none"/>
    <path d="M276 178 Q300 150 300 120" stroke="${skin}" stroke-width="34" stroke-linecap="round" fill="none"/>
    <path d="M44 196 Q50 70 172 62 Q294 70 300 196 Z" fill="#3fa34d" stroke="#2c7a37" stroke-width="6" stroke-linejoin="round"/>
    <ellipse cx="172" cy="96" rx="34" ry="22" fill="#6cc35a"/>
    <ellipse cx="108" cy="136" rx="32" ry="26" fill="#6cc35a"/>
    <ellipse cx="236" cy="136" rx="32" ry="26" fill="#6cc35a"/>
    <ellipse cx="172" cy="152" rx="30" ry="24" fill="#6cc35a"/>
    <rect x="30" y="184" width="284" height="22" rx="11" fill="#d9944f" stroke="#a8682d" stroke-width="4"/>
    <ellipse cx="312" cy="104" rx="44" ry="38" fill="${skin}" stroke="${skinDark}" stroke-width="5"/>
    <circle cx="300" cy="94" r="15" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <circle cx="332" cy="96" r="13" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <line x1="315" y1="94" x2="319" y2="95" stroke="${INK}" stroke-width="4"/>
    <circle cx="304" cy="96" r="5" fill="${INK}"/><circle cx="335" cy="98" r="4.5" fill="${INK}"/>
    <path d="M284 74 Q298 62 314 74 M322 76 Q334 66 348 78" stroke="#ffffff" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M284 74 Q298 62 314 74 M322 76 Q334 66 348 78" stroke="#d8d4e8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="316" cy="118" r="10" fill="#ff7fa8" opacity="0.5"/>
    <path d="M318 124 Q334 136 350 120" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M262 160 L282 148 L282 172 Z M302 148 L282 160 L302 172 Z" fill="#ff5d5d" stroke="#c93c3c" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="282" cy="160" r="6" fill="#ff5d5d" stroke="#c93c3c" stroke-width="3"/>
  </svg>`;
}

export const JUNI = { kind: 'bunny' as const, fur: 0xd9c3f5, outfit: 0xffd23f };
