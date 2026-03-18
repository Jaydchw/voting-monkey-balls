const SESSION_KEY = "vmb.player-session";
const SESSION_TTL_MS = 30 * 60 * 1000;

export type PlayerSession = {
  roomCode: string;
  playerName: string;
  playerToken: string;
  savedAt: number;
};

export function savePlayerSession(
  session: Omit<PlayerSession, "savedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    const data: PlayerSession = { ...session, savedAt: Date.now() };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {}
}

export function loadPlayerSession(): PlayerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PlayerSession;
    if (Date.now() - data.savedAt > SESSION_TTL_MS) {
      clearPlayerSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearPlayerSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}
