// ── Achievements / Badges system ──

export interface AchievementDef {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_blood", label: "First Blood", icon: "🥊", description: "Land your first punch" },
  { id: "centurion", label: "Centurion", icon: "💯", description: "Reach 100 total score" },
  { id: "combo_starter", label: "Combo Starter", icon: "🔗", description: "Get a 3x combo" },
  { id: "combo_king", label: "Combo King", icon: "👑", description: "Get a 10x combo" },
  { id: "rising_star", label: "Rising Star", icon: "⭐", description: "Reach Level 3" },
  { id: "powerhouse", label: "Powerhouse", icon: "💪", description: "Reach Level 5" },
  { id: "legendary", label: "Legendary", icon: "🏅", description: "Reach Level 10" },
  { id: "power_collector", label: "Power Collector", icon: "🎁", description: "Activate 5 power-ups" },
  { id: "double_trouble", label: "Double Trouble", icon: "2️⃣", description: "Score with Double Points active" },
];

const LS_KEY = "pm_achievements";

/** Get set of unlocked achievement IDs from localStorage. */
export function getUnlocked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Persist the unlocked set. */
function saveUnlocked(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

/** Stats passed to the checker each punch. */
export interface AchievementStats {
  totalScore: number;
  level: number;
  maxCombo: number;
  currentCombo: number;
  totalPowerUpsActivated: number;
  doublePointsScored: boolean; // true if this punch scored during double points
}

/**
 * Check stats against all achievements.
 * Returns an array of *newly* unlocked AchievementDefs (empty if none).
 */
export function checkAchievements(stats: AchievementStats): AchievementDef[] {
  const unlocked = getUnlocked();
  const newlyUnlocked: AchievementDef[] = [];

  const conditions: Record<string, boolean> = {
    first_blood: stats.totalScore >= 1,
    centurion: stats.totalScore >= 100,
    combo_starter: stats.maxCombo >= 3 || stats.currentCombo >= 3,
    combo_king: stats.maxCombo >= 10 || stats.currentCombo >= 10,
    rising_star: stats.level >= 3,
    powerhouse: stats.level >= 5,
    legendary: stats.level >= 10,
    power_collector: stats.totalPowerUpsActivated >= 5,
    double_trouble: stats.doublePointsScored,
  };

  for (const achievement of ACHIEVEMENTS) {
    if (!unlocked.has(achievement.id) && conditions[achievement.id]) {
      unlocked.add(achievement.id);
      newlyUnlocked.push(achievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlocked(unlocked);
  }

  return newlyUnlocked;
}

/** Get all achievements with their unlock status. */
export function getAllWithStatus(): (AchievementDef & { unlocked: boolean })[] {
  const unlocked = getUnlocked();
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }));
}
