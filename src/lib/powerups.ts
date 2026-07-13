// ── Power-up definitions & logic ──

export type PowerUpType = "double_points" | "super_size" | "frenzy";

export interface PowerUpDef {
  type: PowerUpType;
  label: string;
  icon: string;
  description: string;
  duration: number; // ms
  chance: number; // 0–1 probability per punch
}

export const POWERUPS: PowerUpDef[] = [
  {
    type: "double_points",
    label: "Double Points",
    icon: "🔥",
    description: "+2 per punch",
    duration: 5000,
    chance: 0.08,
  },
  {
    type: "super_size",
    label: "Super Size",
    icon: "💥",
    description: "Bigger impact",
    duration: 5000,
    chance: 0.08,
  },
  {
    type: "frenzy",
    label: "Frenzy",
    icon: "⚡",
    description: "Combo boost",
    duration: 5000,
    chance: 0.06,
  },
];

export interface ActivePowerUp {
  type: PowerUpType;
  def: PowerUpDef;
  expiresAt: number; // Date.now() + duration
}

/**
 * Roll for a random power-up. Returns a PowerUpDef if one triggers, else null.
 * Only one can be active at a time — caller should skip if one is already active.
 */
export function rollPowerUp(): PowerUpDef | null {
  // Shuffle so no type is always checked first
  const shuffled = [...POWERUPS].sort(() => Math.random() - 0.5);
  for (const p of shuffled) {
    if (Math.random() < p.chance) return p;
  }
  return null;
}

/**
 * Get the point multiplier for the current power-up state.
 */
export function getPointMultiplier(active: ActivePowerUp | null): number {
  if (active && active.type === "double_points" && Date.now() < active.expiresAt) {
    return 2;
  }
  return 1;
}

/**
 * Get the extra bag scale multiplier for super_size power-up.
 */
export function getSuperSizeMultiplier(active: ActivePowerUp | null): number {
  if (active && active.type === "super_size" && Date.now() < active.expiresAt) {
    return 1.3;
  }
  return 1;
}

/**
 * Get the combo threshold reduction for frenzy power-up.
 * Normal combo threshold is 3 rapid punches; frenzy reduces to 2.
 */
export function getFrenzyComboThreshold(active: ActivePowerUp | null): number {
  if (active && active.type === "frenzy" && Date.now() < active.expiresAt) {
    return 2;
  }
  return 3;
}
