export const POINTS_PER_PUNCH = 1;
export const POINTS_PER_LEVEL = 10;

// Cheerful, distinct bag colors that cycle as the player levels up.
export const BAG_COLORS = [
  "#d4af37", // metallic gold
  "#8a9a86", // sage green
  "#c3b091", // khaki/sand
  "#a2b9bc", // slate/sea-foam
  "#b8a9c9", // soft lavender grey
  "#e0a899", // terracotta
  "#96858f", // muted plum
  "#625750", // warm clay
  "#d6cbd3", // dusty grey
  "#eca1a6", // rose quartz
  "#bdc3c7", // silver/pewter
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

export interface Skin {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description: string;
  color?: string; // Theme color overrides
  faceEmoji?: string; // Custom face icon
}

export const SKINS: Skin[] = [
  { id: "default", name: "Classic Bag", emoji: "🔴", price: 0, description: "Your reliable training partner" },
  { id: "boss", name: "Grumpy Boss", emoji: "💼", price: 150, description: "Picture their face, take it out!", faceEmoji: "😡" },
  { id: "kitty", name: "Cute Kitty", emoji: "🐱", price: 400, description: "A playful target, meow!", faceEmoji: "🐱", color: "#f43f5e" },
  { id: "cyber", name: "Neon Cyber", emoji: "⚡", price: 1000, description: "Glowing high-tech holographic bag", faceEmoji: "🤖", color: "#a855f7" },
  { id: "shark", name: "Shark Master", emoji: "🦈", price: 2000, description: "Fierce predator of the ocean", faceEmoji: "🦈", color: "#06b6d4" }
];

const UNLOCKED_SKINS_KEY = "pm_unlocked_skins";
const SELECTED_SKIN_KEY = "pm_selected_skin";

export function getUnlockedSkins(): string[] {
  if (typeof window === "undefined") return ["default"];
  try {
    const raw = localStorage.getItem(UNLOCKED_SKINS_KEY);
    if (!raw) return ["default"];
    return JSON.parse(raw) as string[];
  } catch {
    return ["default"];
  }
}

export function unlockSkin(id: string): string[] {
  const current = getUnlockedSkins();
  if (current.includes(id)) return current;
  const next = [...current, id];
  if (typeof window !== "undefined") {
    localStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(next));
  }
  return next;
}

export function getSelectedSkin(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(SELECTED_SKIN_KEY) || "default";
}

export function setSelectedSkin(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SELECTED_SKIN_KEY, id);
  }
}




