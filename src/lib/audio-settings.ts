export type AudioSettings = {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 1,
  sfxVolume: 0.1,
  musicVolume: 1,
};

const AUDIO_SETTINGS_STORAGE_KEY = "vmb.audio-settings";
const AUDIO_SETTINGS_EVENT = "vmb:audio-settings-changed";

let cachedSettings: AudioSettings = DEFAULT_AUDIO_SETTINGS;
let initialized = false;

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function sanitizeSettings(value: unknown): AudioSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }

  const incoming = value as Partial<AudioSettings>;
  return {
    masterVolume: clamp01(
      typeof incoming.masterVolume === "number"
        ? incoming.masterVolume
        : DEFAULT_AUDIO_SETTINGS.masterVolume,
    ),
    sfxVolume: clamp01(
      typeof incoming.sfxVolume === "number"
        ? incoming.sfxVolume
        : DEFAULT_AUDIO_SETTINGS.sfxVolume,
    ),
    musicVolume: clamp01(
      typeof incoming.musicVolume === "number"
        ? incoming.musicVolume
        : DEFAULT_AUDIO_SETTINGS.musicVolume,
    ),
  };
}

function readStoredSettings(): AudioSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;
  cachedSettings = readStoredSettings();

  window.addEventListener("storage", (event) => {
    if (event.key !== AUDIO_SETTINGS_STORAGE_KEY) {
      return;
    }
    cachedSettings = readStoredSettings();
  });
}

function persistAndBroadcast(next: AudioSettings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {}

  window.dispatchEvent(
    new CustomEvent<AudioSettings>(AUDIO_SETTINGS_EVENT, { detail: next }),
  );
}

export function getAudioSettings(): AudioSettings {
  ensureInitialized();
  return { ...cachedSettings };
}

export function setAudioSettings(
  update: Partial<AudioSettings>,
): AudioSettings {
  ensureInitialized();
  cachedSettings = sanitizeSettings({
    ...cachedSettings,
    ...update,
  });
  persistAndBroadcast(cachedSettings);
  return { ...cachedSettings };
}

export function subscribeAudioSettings(
  listener: (settings: AudioSettings) => void,
): () => void {
  ensureInitialized();
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleSettingsChanged = (event: Event) => {
    const customEvent = event as CustomEvent<AudioSettings>;
    if (customEvent.detail) {
      cachedSettings = sanitizeSettings(customEvent.detail);
      listener({ ...cachedSettings });
      return;
    }

    const latest = readStoredSettings();
    cachedSettings = latest;
    listener({ ...latest });
  };

  window.addEventListener(AUDIO_SETTINGS_EVENT, handleSettingsChanged);
  return () => {
    window.removeEventListener(AUDIO_SETTINGS_EVENT, handleSettingsChanged);
  };
}
