export const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

export const PARTYKIT_PARTY = process.env.NEXT_PUBLIC_PARTYKIT_PARTY ?? "main";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 4): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[index];
  }
  return code;
}

export function normalizeRoomCode(value: string): string {
  return value
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
}

export function getSocketProtocol(): "ws" | "wss" {
  if (typeof window === "undefined") {
    return "ws";
  }
  return window.location.protocol === "https:" ? "wss" : "ws";
}
