const DEFAULT_PARTYKIT_PORT = "1999";

function isLocalHostname(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

function normalizeConfiguredHost(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^wss?:\/\//i, "")
    .replace(/\/+$/, "");
}

const configuredHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST?.trim();

export const PARTYKIT_HOST = configuredHost
  ? normalizeConfiguredHost(configuredHost)
  : `localhost:${DEFAULT_PARTYKIT_PORT}`;

export function getPartyKitHost(): string {
  if (configuredHost) {
    const normalizedConfiguredHost = normalizeConfiguredHost(configuredHost);

    if (typeof window !== "undefined") {
      const browserHostname = window.location.hostname;
      const configuredHostname = normalizedConfiguredHost.split(":")[0] ?? "";

      if (
        browserHostname &&
        !isLocalHostname(browserHostname) &&
        isLocalHostname(configuredHostname)
      ) {
        return `${browserHostname}:${DEFAULT_PARTYKIT_PORT}`;
      }
    }

    return normalizedConfiguredHost;
  }

  if (typeof window === "undefined") {
    return PARTYKIT_HOST;
  }

  const hostname = window.location.hostname;
  if (!hostname) {
    return PARTYKIT_HOST;
  }

  return `${hostname}:${DEFAULT_PARTYKIT_PORT}`;
}

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
