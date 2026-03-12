const BANNED_SUBSTRINGS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "whore",
  "slut",
  "rape",
  "kys",
  "naz",
];

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
};

function normalizeForProfanity(value: string): string {
  const lower = value.toLowerCase();
  let mapped = "";
  for (const char of lower) {
    mapped += LEET_MAP[char] ?? char;
  }
  return mapped.replace(/[^a-z]/g, "");
}

export function hasProfanity(value: string): boolean {
  const normalized = normalizeForProfanity(value);
  if (!normalized) {
    return false;
  }

  return BANNED_SUBSTRINGS.some((word) => normalized.includes(word));
}

export function sanitizePlayerName(value: string): string {
  const cleaned = value
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);

  if (!cleaned) {
    return "Player";
  }

  return cleaned;
}

export function getPlayerNameValidationError(value: string): string | null {
  const sanitized = sanitizePlayerName(value);

  if (sanitized.length < 2) {
    return "Name must be at least 2 characters.";
  }

  if (hasProfanity(sanitized)) {
    return "Please choose a different player name.";
  }

  return null;
}
