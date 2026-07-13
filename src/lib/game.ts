export const POINTS_PER_PUNCH = 1;
export const POINTS_PER_LEVEL = 10;

// Cheerful, distinct bag colors that cycle as the player levels up.
export const BAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#a855f7", // purple
  "#facc15", // gold
];

export function bagColor(level: number) {
  return BAG_COLORS[(level - 1) % BAG_COLORS.length];
}

// Bag scales up noticeably each level, capped so it stays on screen.
export function bagScale(level: number) {
  return Math.min(1 + (level - 1) * 0.12, 2.0);
}

// Level 1 = scores 1–10, Level 2 = 11–20, Level 3 = 21–30, etc.
export function levelFromScore(score: number) {
  if (score <= 0) return 1;
  return Math.floor((score - 1) / POINTS_PER_LEVEL) + 1;
}

// Progress within the current level (0 → ~1).
export function progressInLevel(score: number) {
  if (score <= 0) return 0;
  return ((score - 1) % POINTS_PER_LEVEL) / POINTS_PER_LEVEL;
}

const LS_KEY = "pm_player_id";
export function saveLoginId(id: string) {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
}
export function loadLoginId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_KEY);
}
export function clearLoginId() {
  if (typeof window !== "undefined") localStorage.removeItem(LS_KEY);
}

const CAPTION_KEY = "pm_punch_caption";
export const DEFAULT_CAPTION = "CAST SHARK";
export function loadCaption(): string {
  if (typeof window === "undefined") return DEFAULT_CAPTION;
  return localStorage.getItem(CAPTION_KEY) || DEFAULT_CAPTION;
}
export function saveCaption(text: string) {
  if (typeof window === "undefined") return;
  const t = text.trim();
  if (!t) localStorage.removeItem(CAPTION_KEY);
  else localStorage.setItem(CAPTION_KEY, t.slice(0, 20).toUpperCase());
}

/**
 * Generates a simple, short user ID (6 to 8 characters) that contains the cleaned username.
 * Example outputs:
 * - "Kim" -> "kimx4d" (6 chars)
 * - "Alex" -> "alexw7e" (7 chars)
 * - "Adithyan" -> "adithm2n" (8 chars)
 */
export function generateSimpleUserId(username: string): string {
  const clean = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = clean || "user";
  
  let baseLength = Math.min(base.length, 5);
  if (baseLength < 3) {
    baseLength = 3;
  }
  
  let basePart = base.slice(0, baseLength);
  if (basePart.length < 3) {
    basePart = basePart.padEnd(3, "x");
  }
  
  const suffixLength = 3;
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < suffixLength; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return basePart + suffix;
}

