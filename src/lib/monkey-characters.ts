export const MONKEY_CHARACTER_SVGS = [
  "monkey-emojis-1.svg",
  "monkey-emojis-2.svg",
  "monkey-emojis-3.svg",
  "monkey-emojis-4.svg",
  "monkey-emojis-5.svg",
  "monkey-emojis-6.svg",
  "monkey-emojis-7.svg",
  "monkey-emojis-8.svg",
  "monkey-emojis-9.svg",
  "monkey-emojis-10.svg",
  "monkey-emojis-11.svg",
  "monkey-emojis-12.svg",
  "monkey-emojis-13.svg",
  "monkey-emojis-14.svg",
  "monkey-emojis-15.svg",
] as const;

export type MonkeySvgType = (typeof MONKEY_CHARACTER_SVGS)[number];

export const MONKEY_CHARACTER_COLORS = [
  "#FFD600",
  "#FFB300",
  "#FF7043",
  "#8D6E63",
  "#4E342E",
  "#90CAF9",
  "#C5E1A5",
  "#F06292",
  "#1976D2",
  "#D32F2F",
  "#7B1FA2",
  "#0097A7",
] as const;

export const DEFAULT_MONKEY_SVG: MonkeySvgType = "monkey-emojis-1.svg";
export const DEFAULT_MONKEY_COLOR = "#8D6E63";

const MONKEY_SVG_SET = new Set<string>(MONKEY_CHARACTER_SVGS);
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function isValidMonkeySvgType(value: string): value is MonkeySvgType {
  return MONKEY_SVG_SET.has(value);
}

export function isValidCharacterColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value);
}
