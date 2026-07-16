import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  POINTS_PER_LEVEL,
  POINTS_PER_PUNCH,
  bagColor,
  bagScale,
  clearLoginId,
  DEFAULT_CAPTION,
  levelFromScore,
  loadCaption,
  loadLoginId,
  progressInLevel,
  saveCaption,
  saveLoginId,
  SKINS,
  type Skin,
  getUnlockedSkins,
  unlockSkin,
  getSelectedSkin,
  setSelectedSkin,
} from "@/lib/game";
import {
  isMuted,
  playLevelUp,
  playPunch,
  setMuted,
  playUppercut,
  playSlam,
  playCrit,
  playDodge,
  playHitStun,
} from "@/lib/audio";
import {
  type ActivePowerUp,
  rollPowerUp,
  getPointMultiplier,
  getSuperSizeMultiplier,
  getFrenzyComboThreshold,
} from "@/lib/powerups";
import {
  type AchievementDef,
  checkAchievements,
  getAllWithStatus,
} from "@/lib/achievements";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/")({
  component: PunchMeApp,
});

type Player = {
  id: string;
  name: string;
  age: number;
  score: number;
  level: number;
  high_score: number;
};

type Screen =
  | "splash"
  | "welcome"
  | "signup"
  | "login"
  | "resume"
  | "play"
  | "settings"
  | "leaderboard"
  | "summary"
  | "shop";

/** Stats tracked for the current play session (reset when entering play). */
type SessionStats = {
  punches: number;
  startLevel: number;
  levelsGained: number;
  maxCombo: number;
  powerUpsActivated: number;
  achievementsUnlocked: AchievementDef[];
};

const EMPTY_SESSION: SessionStats = {
  punches: 0,
  startLevel: 1,
  levelsGained: 0,
  maxCombo: 0,
  powerUpsActivated: 0,
  achievementsUnlocked: [],
};

function PunchMeApp() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [player, setPlayer] = useState<Player | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [leaderboardReturn, setLeaderboardReturn] = useState<Screen>("welcome");
  const [sessionStats, setSessionStats] = useState<SessionStats>({ ...EMPTY_SESSION });

  // Persistent theme state
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("pm_theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("pm_theme", next);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const el = document.body;
      if (theme === "light") {
        el.classList.add("light");
        el.classList.remove("dark");
      } else {
        el.classList.add("dark");
        el.classList.remove("light");
      }
    }
  }, [theme]);

  const openLeaderboard = (returnTo: Screen) => {
    setLeaderboardReturn(returnTo);
    setScreen("leaderboard");
  };

  // Splash timer
  useEffect(() => {
    const t = setTimeout(() => {
      const id = loadLoginId();
      setSavedId(id);
      setScreen(id ? "resume" : "welcome");
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${theme === "light" ? "light" : "dark"} bg-background`}>
      <div className="relative mx-auto flex min-h-screen w-full flex-col justify-center items-center p-0 sm:p-4 lg:p-6">
        <GameBackground theme={theme} />

        {/* Responsive Dashboard wrapper on desktop if player is logged in */}
        {player && ["play", "shop", "settings", "summary", "leaderboard"].includes(screen) ? (
          <div className="z-10 grid w-full max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-12 lg:px-0">
            
            {/* Desktop Left Sidebar: Achievements */}
            <aside className="hidden lg:block lg:col-span-3 h-full">
              <AchievementsSidebar />
            </aside>

            {/* Center: Main Game Screen */}
            <main className="col-span-1 lg:col-span-6 relative flex min-h-[750px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card/45 backdrop-blur-xl shadow-2xl mx-auto text-foreground">
              <AnimatePresence mode="wait">
                {screen === "play" && (
                  <PlayScreen
                    key="pl"
                    initial={player}
                    onSettings={() => setScreen("settings")}
                    onShop={() => setScreen("shop")}
                    onLeaderboard={() => openLeaderboard("play")}
                    onSessionEnd={(stats) => {
                      setSessionStats(stats);
                      setScreen("summary");
                    }}
                  />
                )}
                {screen === "shop" && (
                  <ShopScreen
                    key="sh"
                    player={player}
                    onUpdatePlayer={(p) => setPlayer(p)}
                    onBack={() => setScreen("play")}
                  />
                )}
                {screen === "summary" && (
                  <SessionSummaryScreen
                    key="sum"
                    stats={sessionStats}
                    onLeaderboard={() => openLeaderboard("summary")}
                    onResume={() => setScreen("play")}
                  />
                )}
                {screen === "leaderboard" && (
                  <LeaderboardScreen
                    key="lb"
                    currentPlayerId={player.id}
                    onBack={() => setScreen(leaderboardReturn)}
                  />
                )}
                {screen === "settings" && (
                  <SettingsScreen
                    key="st"
                    player={player}
                    currentTheme={theme}
                    onToggleTheme={toggleTheme}
                    onBack={() => setScreen("play")}
                    onLogout={() => {
                      clearLoginId();
                      setPlayer(null);
                      setSavedId(null);
                      setScreen("welcome");
                    }}
                    onExit={() => setScreen("welcome")}
                  />
                )}
              </AnimatePresence>
            </main>

            {/* Desktop Right Sidebar: Leaderboard */}
            <aside className="hidden lg:block lg:col-span-3 h-full">
              <LeaderboardSidebar currentPlayerId={player.id} />
            </aside>

          </div>
        ) : (
          /* Locked centered panel for Welcome/Login/Signup/Splash screens */
          <main className="z-10 relative flex min-h-[750px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card/45 backdrop-blur-xl shadow-2xl text-foreground">
            <AnimatePresence mode="wait">
              {screen === "splash" && <SplashScreen key="s" />}
              {screen === "welcome" && (
                <WelcomeScreen
                  key="w"
                  hasSaved={!!savedId}
                  onNew={() => setScreen("signup")}
                  onLogin={() => setScreen("login")}
                />
              )}
              {screen === "signup" && (
                <SignupScreen
                  key="sn"
                  onDone={(p) => {
                    setPlayer(p);
                    saveLoginId(p.id);
                    setScreen("play");
                  }}
                  onBack={() => setScreen("welcome")}
                />
              )}
              {screen === "login" && (
                <LoginScreen
                  key="l"
                  onDone={(p) => {
                    setPlayer(p);
                    saveLoginId(p.id);
                    setScreen("play");
                  }}
                  onBack={() => setScreen("welcome")}
                />
              )}
              {screen === "resume" && savedId && (
                <ResumeScreen
                  key="rs"
                  id={savedId}
                  onDone={(p) => {
                    setPlayer(p);
                    setScreen("play");
                  }}
                  onSwitch={() => {
                    clearLoginId();
                    setSavedId(null);
                    setScreen("welcome");
                  }}
                />
              )}
            </AnimatePresence>
          </main>
        )}
      </div>
    </div>
  );
}

/* ---------------- Screens ---------------- */

function GameBackground({ theme }: { theme: "light" | "dark" }) {
  return (
    <div className="arena-bg-container">
      {/* Dynamic Arena spotlights */}
      <div className="arena-spotlight arena-spotlight-left" />
      <div className="arena-spotlight arena-spotlight-right" />

      {/* Crowd Camera Flashes */}
      <div className="arena-flashes">
        <div className="arena-flash-dot arena-flash-1" />
        <div className="arena-flash-dot arena-flash-2" />
        <div className="arena-flash-dot arena-flash-3" />
        <div className="arena-flash-dot arena-flash-4" />
        <div className="arena-flash-dot arena-flash-5" />
        <div className="arena-flash-dot arena-flash-6" />
      </div>

      {/* Arena Floor Grid lines for depth */}
      <div className="arena-floor-lines" />

      {/* Ring Ropes */}
      <div className="arena-ropes">
        <div className="arena-rope" />
        <div className="arena-rope" />
        <div className="arena-rope" />
      </div>
    </div>
  );
}

/* ---------------- Types & Helpers ---------------- */

export type LeaderboardEntry = {
  id: string;
  name: string;
  level: number;
  high_score: number;
  score: number;
};

const MEDAL = ["🥇", "🥈", "🥉"];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function computePlacements(entries: LeaderboardEntry[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    if (i === 0 || entries[i].score !== entries[i - 1].score) {
      ranks.push(i + 1);
    } else {
      ranks.push(ranks[i - 1]);
    }
  }
  return ranks;
}

/* ---------------- Sidebars ---------------- */

function AchievementsSidebar() {
  const [achievements, setAchievements] = useState<(AchievementDef & { unlocked: boolean })[]>([]);

  useEffect(() => {
    setAchievements(getAllWithStatus());

    const handleUpdate = () => {
      setAchievements(getAllWithStatus());
    };
    window.addEventListener("achievement-unlocked", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    const interval = setInterval(handleUpdate, 2000);

    return () => {
      window.removeEventListener("achievement-unlocked", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="glass-premium sidebar-slide-left flex h-full flex-col rounded-3xl p-5 text-foreground">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h3 className="display text-lg tracking-widest text-primary">Badges</h3>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Achievements</p>
        </div>
        <div className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
          {unlockedCount} / {achievements.length}
        </div>
      </div>
      <div className="mt-4 flex-1 overflow-y-auto pr-1 flex flex-col gap-3 max-h-[calc(100vh-14rem)]">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`achievement-badge flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200 ${
              ach.unlocked
                ? "bg-primary/5 border-primary/25"
                : "bg-card/20 border-border/40 opacity-55"
            }`}
          >
            <div className="text-3xl select-none">{ach.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs leading-snug">{ach.label}</div>
              <div className="text-[10px] text-muted-foreground leading-normal mt-0.5">{ach.description}</div>
            </div>
            {ach.unlocked && <span className="text-xs text-primary font-bold">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardSidebar({ currentPlayerId }: { currentPlayerId: string | null }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    const { data, error } = await supabase
      .from("players")
      .select("id, name, level, high_score, score")
      .order("score", { ascending: false })
      .order("high_score", { ascending: false });
    
    if (error) {
      setErr(error.message);
    } else {
      setEntries((data ?? []) as LeaderboardEntry[]);
      setErr(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const placements = computePlacements(entries);

  return (
    <div className="glass-premium sidebar-slide-right flex h-full flex-col rounded-3xl p-5 text-foreground">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h3 className="display text-lg tracking-widest text-primary">Ranks</h3>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Leaderboard</p>
        </div>
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="rounded-full bg-muted/65 hover:bg-muted border border-border/60 p-1.5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center h-7 w-7"
          aria-label="Refresh Leaderboard"
        >
          {loading ? (
            <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
          ) : (
            <span className="text-[10px] leading-none">↻</span>
          )}
        </button>
      </div>

      {err && (
        <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-center text-xs text-destructive">
          {err}
        </div>
      )}

      <div className="mt-4 flex-1 overflow-y-auto pr-1 max-h-[calc(100vh-14rem)] flex flex-col gap-2">
        {entries.map((entry, idx) => {
          const isMe = entry.id === currentPlayerId;
          const rank = placements[idx];
          const isTop3 = rank <= 3;
          const bagCol = bagColor(entry.level);

          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between rounded-xl border p-2.5 transition-all duration-200 ${
                isMe
                  ? "bg-primary/10 border-primary/35 shadow-sm"
                  : "bg-card/30 border-border/40 hover:bg-card/50"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 text-center font-bold text-xs shrink-0">
                  {isTop3 ? (
                    <span className="text-base">{MEDAL[rank - 1]}</span>
                  ) : (
                    <span className="text-muted-foreground">{rank}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`truncate text-xs font-bold ${isMe ? "text-primary" : "text-foreground/90"}`}>
                      {entry.name}
                    </span>
                    {isMe && (
                      <span className="shrink-0 rounded-full bg-primary/20 px-1 py-0.2 text-[8px] font-bold text-primary border border-primary/30">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    Lv <span style={{ color: bagCol }} className="font-bold">{entry.level}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-accent">{entry.score.toLocaleString()}</div>
                <div className="text-[8px] text-muted-foreground mt-0.5">Best {entry.high_score.toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScreenWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex min-h-screen w-full flex-col px-5 pb-10 pt-10"
    >
      {children}
    </motion.section>
  );
}

function SplashScreen() {
  return (
    <ScreenWrap>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {/* Pulsing glow rings */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute rounded-full"
            style={{
              width: 220,
              height: 220,
              background:
                "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
              animation: "glow-pulse 2s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 300,
              height: 300,
              background:
                "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
              animation: "glow-pulse 2.5s ease-in-out infinite 0.4s",
            }}
          />
          <motion.div
            initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="relative text-center"
          >
            <div
              className="display text-8xl leading-none"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary), var(--accent))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 30px var(--primary))",
              }}
            >
              PUNCH
              <br />
              ME
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-xs uppercase tracking-[0.5em] text-muted-foreground"
        >
          Stress relief · Mood lift
        </motion.p>

        {/* Animated dots loader */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
              className="h-1.5 w-1.5 rounded-full bg-primary"
            />
          ))}
        </motion.div>
      </div>
    </ScreenWrap>
  );
}

function WelcomeScreen({
  hasSaved,
  onNew,
  onLogin,
}: {
  hasSaved: boolean;
  onNew: () => void;
  onLogin: () => void;
}) {
  return (
    <ScreenWrap>
      <div className="text-center">
        <h1
          className="display text-4xl tracking-widest neon-glow-primary"
          style={{
            background:
              "linear-gradient(135deg, var(--primary), var(--accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          PUNCH ME
        </h1>
        <div className="mt-2 text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Take a breath. Then swing.
        </div>
      </div>

      <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
        >
          <BagArt color="#ef4444" scale={1} glowing />
        </motion.div>

        <div className="mt-6 flex w-full flex-col gap-3">
          <PrimaryButton onClick={onNew}>New Player</PrimaryButton>
          <SecondaryButton onClick={onLogin}>
            {hasSaved ? "Sign in with a different ID" : "I already have a login ID"}
          </SecondaryButton>
        </div>
      </div>
    </ScreenWrap>
  );
}

function SignupScreen({
  onDone,
  onBack,
}: {
  onDone: (p: Player) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [created, setCreated] = useState<Player | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const rawName = name.trim();
    if (!rawName) return setErr("Please enter your name.");
    
    const n = rawName
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    const a = Number(age);
    if (!Number.isFinite(a) || a < 4 || a > 120) return setErr("Enter a valid age (4–120).");
    setLoading(true);

    const { data, error } = await supabase
      .from("players")
      .insert({ name: n, age: a })
      .select()
      .single();

    setLoading(false);
    if (error || !data) {
      return setErr(error?.message || "Failed to create account. Please try again.");
    }

    setCreatedId(data.id);
    setCreated(data as Player);
  }

  function handleCopy(id: string) {
    navigator.clipboard?.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (createdId && created) {
    return (
      <ScreenWrap>
        <BackBar onBack={onBack} title="Your Login ID" />
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-lg">
          <p className="text-sm text-muted-foreground">
            Save this ID. You'll need it to sign in on another device.
          </p>
          <div className="mt-3 break-all rounded-xl bg-input px-4 py-3 font-mono text-sm text-accent leading-relaxed">
            {createdId}
          </div>
          <button
            onClick={() => handleCopy(createdId)}
            className="mt-3 flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            {copied ? (
              <span className="text-accent">✓ Copied!</span>
            ) : (
              "Tap to copy"
            )}
          </button>
        </div>
        <div className="mt-auto pt-8">
          <PrimaryButton onClick={() => onDone(created)}>Start Punching →</PrimaryButton>
        </div>
      </ScreenWrap>
    );
  }

  return (
    <ScreenWrap>
      <BackBar onBack={onBack} title="New Player" />
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <Field label="Name">
          <StyledInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Alex"
            autoFocus
          />
        </Field>
        <Field label="Age">
          <StyledInput
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="18"
          />
        </Field>
        {err && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-destructive/15 px-4 py-2 text-sm text-destructive"
          >
            {err}
          </motion.p>
        )}
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingDots /> Creating…
            </span>
          ) : (
            "Create Account"
          )}
        </PrimaryButton>
      </form>
    </ScreenWrap>
  );
}

function LoginScreen({
  onDone,
  onBack,
}: {
  onDone: (p: Player) => void;
  onBack: () => void;
}) {
  const [id, setId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data, error } = await supabase
      .from("players")
      .select()
      .eq("id", id.trim())
      .maybeSingle();
    setLoading(false);
    if (error) return setErr(error.message);
    if (!data) return setErr("No player found for that ID. Double-check and try again.");
    onDone(data as Player);
  }

  return (
    <ScreenWrap>
      <BackBar onBack={onBack} title="Sign In" />
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <Field label="Login ID">
          <StyledInput
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="paste your login ID"
            className="font-mono text-sm"
            autoFocus
          />
        </Field>
        {err && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-destructive/15 px-4 py-2 text-sm text-destructive"
          >
            {err}
          </motion.p>
        )}
        <PrimaryButton type="submit" disabled={loading || !id.trim()}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingDots /> Loading…
            </span>
          ) : (
            "Continue →"
          )}
        </PrimaryButton>
      </form>
    </ScreenWrap>
  );
}

function ResumeScreen({
  id,
  onDone,
  onSwitch,
}: {
  id: string;
  onDone: (p: Player) => void;
  onSwitch: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlayer = useCallback(async () => {
    setErr(null);
    setLoading(true);
    setPlayer(null);
    const { data, error } = await supabase
      .from("players")
      .select()
      .eq("id", id)
      .maybeSingle();
    setLoading(false);
    if (error) return setErr(error.message);
    if (!data) return setErr("Saved account not found. It may have been deleted.");
    setPlayer(data as Player);
  }, [id]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  return (
    <ScreenWrap>
      <div className="text-center">
        <h1
          className="display text-3xl tracking-widest neon-glow-primary"
          style={{
            background:
              "linear-gradient(135deg, var(--primary), var(--accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          PUNCH ME
        </h1>
        <div className="mt-2 text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Welcome back
        </div>
      </div>

      <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-6">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                  className="h-2 w-2 rounded-full bg-primary"
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Loading your progress…</p>
          </div>
        )}
        {err && (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="rounded-xl bg-destructive/15 px-5 py-3 text-center text-sm text-destructive">
              {err}
            </div>
            <SecondaryButton onClick={fetchPlayer}>Try again</SecondaryButton>
          </div>
        )}
        {player && (
          <>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
            >
              <BagArt color="#ef4444" scale={0.85} glowing />
            </motion.div>

            <div className="glass rounded-2xl px-8 py-4 text-center">
              <div className="text-xl font-bold">Hi, {player.name}!</div>
              <div className="mt-1 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <span>Lv {player.level}</span>
                <span className="opacity-40">·</span>
                <span className="text-accent font-semibold">{player.score} pts</span>
                <span className="opacity-40">·</span>
                <span>Best {player.high_score}</span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3">
              <PrimaryButton onClick={() => onDone(player)}>Resume Game →</PrimaryButton>
              <SecondaryButton onClick={onSwitch}>Switch account</SecondaryButton>
            </div>
          </>
        )}
      </div>
    </ScreenWrap>
  );
}

/* ---------------- Shop ---------------- */
function ShopScreen({
  player,
  onUpdatePlayer,
  onBack,
}: {
  player: Player;
  onUpdatePlayer: (p: Player) => void;
  onBack: () => void;
}) {
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("default");
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setUnlocked(getUnlockedSkins());
    setSelected(getSelectedSkin());
  }, []);

  async function handleBuy(skin: Skin) {
    if (player.score < skin.price) {
      setErr(`Not enough points to buy ${skin.name}! Keep punching the bag.`);
      setTimeout(() => setErr(null), 3000);
      return;
    }

    setLoading(skin.id);
    const newScore = player.score - skin.price;

    const { data, error } = await supabase
      .from("players")
      .update({ score: newScore })
      .eq("id", player.id)
      .select()
      .single();

    setLoading(null);

    if (error || !data) {
      setErr(error?.message || "Transaction failed. Try again.");
      setTimeout(() => setErr(null), 3000);
      return;
    }

    // Success
    const nextUnlocked = unlockSkin(skin.id);
    setUnlocked(nextUnlocked);
    onUpdatePlayer(data as Player);
    playLevelUp(); // play success chime
  }

  function handleSelect(skin: Skin) {
    setSelectedSkin(skin.id);
    setSelected(skin.id);
  }

  return (
    <ScreenWrap>
      <BackBar onBack={onBack} title="Skins Shop" />

      {/* Points indicator */}
      <div className="mt-4 glass rounded-2xl p-4 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Your Balance</div>
        <div className="display text-3xl text-accent mt-1">{player.score.toLocaleString()} <span className="text-sm font-sans text-muted-foreground">pts</span></div>
      </div>

      {err && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl bg-destructive/15 px-4 py-2 text-center text-sm text-destructive"
        >
          {err}
        </motion.p>
      )}

      {/* Skins list */}
      <div className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {SKINS.map((skin) => {
          const isUnlocked = unlocked.includes(skin.id);
          const isSelected = selected === skin.id;
          const isBuying = loading === skin.id;

          return (
            <div
              key={skin.id}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 bg-card/40 ${
                isSelected ? "border-accent shadow-md bg-card/75" : "border-border/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-4xl">{skin.emoji}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm leading-snug">{skin.name}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{skin.description}</div>
                  {skin.price > 0 && !isUnlocked && (
                    <div className="text-[10px] text-accent font-semibold mt-1">Price: {skin.price} pts</div>
                  )}
                </div>
              </div>

              <div>
                {isUnlocked ? (
                  isSelected ? (
                    <button
                      disabled
                      className="rounded-full bg-accent/20 border border-accent/40 px-3.5 py-1.5 text-xs font-bold text-accent select-none"
                    >
                      Active
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelect(skin)}
                      className="rounded-full bg-muted border border-border px-3.5 py-1.5 text-xs font-bold text-foreground transition-all hover:bg-card active:scale-95"
                    >
                      Select
                    </button>
                  )
                ) : (
                  <button
                    disabled={isBuying}
                    onClick={() => handleBuy(skin)}
                    className="rounded-full bg-accent text-accent-foreground px-3.5 py-1.5 text-xs font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                  >
                    {isBuying ? "..." : `Buy`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScreenWrap>
  );
}
/* ---------------- Play ---------------- */

const MAX_FLOATERS = 12;
const MAX_SHARKS = 30;

function PlayScreen({
  initial,
  onSettings,
  onShop,
  onLeaderboard,
  onSessionEnd,
}: {
  initial: Player;
  onSettings: () => void;
  onShop: () => void;
  onLeaderboard: () => void;
  onSessionEnd: (stats: SessionStats) => void;
}) {
  const [score, setScore] = useState(initial.score);
  const [high, setHigh] = useState(initial.high_score);
  const [level, setLevel] = useState(initial.level);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showHighScore, setShowHighScore] = useState(false);
  const [floaters, setFloaters] = useState<{ id: number; x: number; y: number; color: string; text: string; isCrit?: boolean }[]>([]);
  const [sharks, setSharks] = useState<{ id: number; angle: number }[]>([]);
  const [shake, setShake] = useState(0);
  
  // Combo counter
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const punchTimestampsRef = useRef<number[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPunchedRef = useRef(false);

  // Power-up state
  const [activePowerUp, setActivePowerUp] = useState<ActivePowerUp | null>(null);
  const [showPowerUpToast, setShowPowerUpToast] = useState(false);
  const powerUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Achievement toast queue
  const [achievementToast, setAchievementToast] = useState<AchievementDef | null>(null);
  const achievementQueueRef = useRef<AchievementDef[]>([]);

  // Session stats
  const sessionRef = useRef<SessionStats>({
    punches: 0,
    startLevel: initial.level,
    levelsGained: 0,
    maxCombo: 0,
    powerUpsActivated: 0,
    achievementsUnlocked: [],
  });
  // Total power-ups activated (persisted across sessions for achievements)
  const totalPowerUpsRef = useRef(0);

  const bagRef = useRef<HTMLButtonElement>(null);
  const idRef = useRef(0);
  const pendingRef = useRef<{ score: number; level: number; high: number } | null>(null);
  // Reset highAnnouncedRef whenever the player id changes (new session)
  const highAnnouncedRef = useRef(initial.score <= initial.high_score);
  const [caption, setCaption] = useState(DEFAULT_CAPTION);
  
  // New features state
  const [selectedSkin, setSelectedSkinState] = useState<string>("default");
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; tx: number; ty: number }[]>([]);
  const [dodgeState, setDodgeState] = useState<"idle" | "warning" | "dodged" | "failed" | "stunned">("idle");
  const [dodgeProgress, setDodgeProgress] = useState(100);
  const [shakeExtreme, setShakeExtreme] = useState(false);
  const punchesSinceLastDodgeRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  // Load selected skin on mount
  useEffect(() => {
    setSelectedSkinState(getSelectedSkin());
  }, []);

  // Update skin if user returns from shop
  useEffect(() => {
    const handleFocus = () => {
      setSelectedSkinState(getSelectedSkin());
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Target spot spawner
  const spawnTarget = useCallback(() => {
    const x = 50 + Math.random() * 100; // 50px to 150px (inside 200px SVG)
    const y = 80 + Math.random() * 100; // 80px to 180px (inside 250px SVG)
    setTargetPos({ x, y });
  }, []);

  // Spawn target on mount
  useEffect(() => {
    spawnTarget();
  }, [spawnTarget]);

  // Target auto-relocate if not hit
  useEffect(() => {
    const interval = setInterval(() => {
      spawnTarget();
    }, 4500);
    return () => clearInterval(interval);
  }, [spawnTarget]);

  // QTE Dodge Timer
  useEffect(() => {
    if (dodgeState !== "warning") return;
    const duration = 1200; // 1.2s QTE window
    const intervalTime = 30;
    const decrement = (100 / duration) * intervalTime;

    const timer = setInterval(() => {
      setDodgeProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setDodgeState("stunned");
          setCombo(0);
          playHitStun();
          setShakeExtreme(true);
          setTimeout(() => setShakeExtreme(false), 400);
          setTimeout(() => {
            setDodgeState("idle");
          }, 1200);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [dodgeState]);

  const selectedSkinObj = SKINS.find((s) => s.id === selectedSkin) || SKINS[0];
  const color = selectedSkinObj?.color || bagColor(level);
  const scale = bagScale(level);

  // Refresh caption whenever screen becomes visible again
  useEffect(() => {
    const onFocus = () => setCaption(loadCaption());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Debounced DB save
  useEffect(() => {
    if (!pendingRef.current) return;
    const snapshot = { ...pendingRef.current };
    const t = setTimeout(async () => {
      if (
        pendingRef.current &&
        pendingRef.current.score === snapshot.score
      ) {
        await supabase
          .from("players")
          .update({
            score: snapshot.score,
            level: snapshot.level,
            high_score: snapshot.high,
          })
          .eq("id", initial.id);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [score, level, high, initial.id]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (powerUpTimerRef.current) clearTimeout(powerUpTimerRef.current);
    };
  }, []);

  // Achievement toast queue display
  useEffect(() => {
    if (achievementToast) return;
    const next = achievementQueueRef.current.shift();
    if (next) {
      setAchievementToast(next);
      setTimeout(() => {
        setAchievementToast(null);
      }, 2800);
    }
  }, [achievementToast]);

  function handleDodge() {
    if (dodgeState !== "warning") return;
    setDodgeState("dodged");
    playDodge();

    // Reward points for successful dodge
    const points = 50;
    setScore((prev) => {
      const next = prev + points;
      let newHigh = high;
      if (next > high) {
        newHigh = next;
        setHigh(newHigh);
      }
      const newLevel = levelFromScore(next);
      if (newLevel > level) {
        setLevel(newLevel);
        setShowLevelUp(true);
        playLevelUp();
        setTimeout(() => setShowLevelUp(false), 1800);
      }
      pendingRef.current = { score: next, level: Math.max(newLevel, level), high: newHigh };
      return next;
    });

    setTimeout(() => {
      setDodgeState("idle");
    }, 1000);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (dodgeState === "stunned" || dodgeState === "warning") return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (dodgeState === "stunned" || dodgeState === "warning") {
      if (dodgeState === "stunned") playHitStun();
      return;
    }
    if (!pointerStartRef.current) return;
    const diffX = e.clientX - pointerStartRef.current.x;
    const diffY = e.clientY - pointerStartRef.current.y;
    pointerStartRef.current = null;

    const threshold = 40;
    if (Math.abs(diffX) > threshold || Math.abs(diffY) > threshold) {
      // Swipe Detected
      if (Math.abs(diffY) > Math.abs(diffX)) {
        if (diffY < -threshold) {
          triggerPunch("uppercut", e);
        } else if (diffY > threshold) {
          triggerPunch("slam", e);
        }
      } else {
        if (diffX < -threshold) {
          triggerPunch("hook-left", e);
        } else if (diffX > threshold) {
          triggerPunch("hook-right", e);
        }
      }
    } else {
      // Tap Detected
      const rect = bagRef.current?.getBoundingClientRect();
      if (rect) {
        const relativeX = e.clientX - rect.left;
        if (relativeX < rect.width / 2) {
          triggerPunch("jab", e);
        } else {
          triggerPunch("hook", e);
        }
      } else {
        triggerPunch("jab", e);
      }
    }
  }

  function triggerPunch(moveType: string, e: React.PointerEvent<HTMLButtonElement>) {
    hasPunchedRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (hasPunchedRef.current) onSessionEnd({ ...sessionRef.current });
    }, 15000);

    // Roll dodge swinging alert
    punchesSinceLastDodgeRef.current++;
    if (punchesSinceLastDodgeRef.current >= 13 + Math.floor(Math.random() * 5)) {
      punchesSinceLastDodgeRef.current = 0;
      setDodgeState("warning");
      setDodgeProgress(100);
      return;
    }

    // Power-up roll
    if (!activePowerUp || Date.now() >= activePowerUp.expiresAt) {
      const rolled = rollPowerUp();
      if (rolled) {
        const newPU: ActivePowerUp = {
          type: rolled.type,
          def: rolled,
          expiresAt: Date.now() + rolled.duration,
        };
        setActivePowerUp(newPU);
        setShowPowerUpToast(true);
        setTimeout(() => setShowPowerUpToast(false), 1500);
        sessionRef.current.powerUpsActivated++;
        totalPowerUpsRef.current++;
        if (powerUpTimerRef.current) clearTimeout(powerUpTimerRef.current);
        powerUpTimerRef.current = setTimeout(() => {
          setActivePowerUp(null);
        }, rolled.duration);
      }
    }

    const rect = bagRef.current?.getBoundingClientRect();
    let hitX = rect ? rect.width / 2 : 100;
    let hitY = rect ? rect.height / 2 : 125;
    if (rect && e) {
      hitX = e.clientX - rect.left;
      hitY = e.clientY - rect.top;
    }

    let moveLabel = "";
    let basePoints = 1;
    let customSound = "";

    if (moveType === "uppercut") {
      moveLabel = "UPPERCUT";
      basePoints = 3;
      customSound = "uppercut";
    } else if (moveType === "slam") {
      moveLabel = "SLAM";
      basePoints = 2;
      customSound = "slam";
    } else if (moveType.startsWith("hook")) {
      moveLabel = "HOOK";
      basePoints = 1;
      customSound = "punch";
    } else {
      moveLabel = "JAB";
      basePoints = 1;
      customSound = "punch";
    }

    // Collision target check
    let isCrit = false;
    if (targetPos) {
      const dx = hitX - targetPos.x;
      const dy = hitY - targetPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 38) {
        isCrit = true;
        spawnTarget();
      }
    }

    const pointMultiplier = getPointMultiplier(activePowerUp);
    const critMultiplier = isCrit ? 5 : 1;
    const pointsThisPunch = basePoints * critMultiplier * pointMultiplier;
    const isDoubleActive = pointMultiplier > 1;

    // Trigger Audio Synthesis
    if (isCrit) {
      playCrit();
    } else if (customSound === "uppercut") {
      playUppercut();
    } else if (customSound === "slam") {
      playSlam();
    } else {
      playPunch();
    }

    // Generate gold sparkle particles
    if (isCrit) {
      const newSparkles = Array.from({ length: 12 }, (_, idx) => {
        const angle = (idx * (360 / 12) * Math.PI) / 180;
        const distance = 40 + Math.random() * 50;
        return {
          id: ++idRef.current,
          x: hitX,
          y: hitY,
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance,
        };
      });
      setSparkles((s) => [...s, ...newSparkles]);
      setTimeout(() => {
        setSparkles((s) => s.filter((sp) => !newSparkles.find((ns) => ns.id === sp.id)));
      }, 700);
    }

    if (moveType === "slam") {
      setShakeExtreme(true);
      setTimeout(() => setShakeExtreme(false), 400);
    } else {
      setShake((n) => n + 1);
    }

    // Floating text label
    const labelText = `${isCrit ? "🔥 CRIT " : ""}${moveLabel} +${pointsThisPunch}`;
    const fid = ++idRef.current;
    setFloaters((f) => {
      const next = [...f, { id: fid, x: hitX, y: hitY, color, text: labelText, isCrit }];
      return next.length > MAX_FLOATERS ? next.slice(next.length - MAX_FLOATERS) : next;
    });
    setTimeout(() => setFloaters((f) => f.filter((p) => p.id !== fid)), 800);

    // Shark burst flings
    const burstBase = idRef.current;
    const burstCount = moveType === "uppercut" ? 10 : 6;
    const burst = Array.from({ length: burstCount }, (_, i) => ({
      id: burstBase + i + 1,
      angle: (360 / burstCount) * i + Math.random() * 25,
    }));
    idRef.current += burstCount;
    setSharks((s) => {
      const next = [...s, ...burst];
      return next.length > MAX_SHARKS ? next.slice(next.length - MAX_SHARKS) : next;
    });
    setTimeout(
      () => setSharks((s) => s.filter((k) => !burst.find((b) => b.id === k.id))),
      650,
    );

    // Combo tracking — count punches in the last 1000ms
    const now = Date.now();
    const comboThreshold = getFrenzyComboThreshold(activePowerUp);
    punchTimestampsRef.current = punchTimestampsRef.current
      .filter((t) => now - t < 1000)
      .concat(now);
    const recentCount = punchTimestampsRef.current.length;
    if (recentCount >= comboThreshold) {
      setCombo(recentCount);
      setShowCombo(true);
      if (recentCount > sessionRef.current.maxCombo) {
        sessionRef.current.maxCombo = recentCount;
      }
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        setShowCombo(false);
        punchTimestampsRef.current = [];
      }, 900);
    }

    sessionRef.current.punches++;

    setScore((prev) => {
      const next = prev + pointsThisPunch;
      const newLevel = levelFromScore(next);
      let newHigh = high;
      if (next > high) {
        newHigh = next;
        if (!highAnnouncedRef.current) {
          highAnnouncedRef.current = true;
          setShowHighScore(true);
          setTimeout(() => setShowHighScore(false), 2000);
        }
        setHigh(newHigh);
      }
      if (newLevel > level) {
        setLevel(newLevel);
        sessionRef.current.levelsGained++;
        setShowLevelUp(true);
        playLevelUp();
        setTimeout(() => setShowLevelUp(false), 1800);
      }
      pendingRef.current = { score: next, level: Math.max(newLevel, level), high: newHigh };

      // Check achievements
      const newAch = checkAchievements({
        totalScore: next,
        level: Math.max(newLevel, level),
        maxCombo: sessionRef.current.maxCombo,
        currentCombo: recentCount,
        totalPowerUpsActivated: totalPowerUpsRef.current,
        doublePointsScored: isDoubleActive,
      });
      if (newAch.length > 0) {
        sessionRef.current.achievementsUnlocked.push(...newAch);
        achievementQueueRef.current.push(...newAch);
        // Trigger toast display
        if (!achievementToast && achievementQueueRef.current.length > 0) {
          const first = achievementQueueRef.current.shift()!;
          setAchievementToast(first);
          setTimeout(() => setAchievementToast(null), 2800);
        }
      }

      return next;
    });
  }

  const progress = progressInLevel(score);
  const toNext = score <= 0 ? POINTS_PER_LEVEL : POINTS_PER_LEVEL - ((score - 1) % POINTS_PER_LEVEL);
  const superSizeMultiplier = getSuperSizeMultiplier(activePowerUp);
  const currentPointMultiplier = getPointMultiplier(activePowerUp);

  return (
    <ScreenWrap>
      {/* Warning backdrop strobe for QTE dodge warnings */}
      {dodgeState === "warning" && (
        <div className="pointer-events-none absolute inset-0 z-40 animate-warning-flash rounded-[2.5rem]" />
      )}
      {dodgeState === "stunned" && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-destructive/25 rounded-[2.5rem]" />
      )}

      {/* Warning indicators */}
      {dodgeState === "warning" && (
        <div className="absolute top-[35%] left-1/2 z-50 w-[80%] -translate-x-1/2 rounded-2xl border border-destructive bg-background/95 p-4 text-center shadow-2xl glass">
          <div className="display text-lg text-destructive animate-pulse">⚠️ SWING BACK!</div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">DODGE IMMEDIATELY!</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-destructive transition-all duration-30"
              style={{ width: `${dodgeProgress}%` }}
            />
          </div>
        </div>
      )}

      {dodgeState === "stunned" && (
        <div className="absolute top-[35%] left-1/2 z-50 w-[80%] -translate-x-1/2 rounded-2xl border border-red-500 bg-background/95 p-4 text-center shadow-2xl glass">
          <div className="display text-lg text-red-500 animate-pulse font-bold">💥 HIT & STUNNED!</div>
          <p className="text-xs text-muted-foreground mt-1">Dodge failed. Combo lost.</p>
        </div>
      )}

      {dodgeState === "dodged" && (
        <div className="absolute top-[35%] left-1/2 z-50 w-[80%] -translate-x-1/2 rounded-2xl border border-emerald-500 bg-background/95 p-4 text-center shadow-2xl glass">
          <div className="display text-lg text-emerald-500">🛡️ PERFECT DODGE!</div>
          <p className="text-xs text-muted-foreground mt-1">Bonus +50 points awarded!</p>
        </div>
      )}

      {/* Top HUD — glassmorphism card */}
      <div className="glass rounded-2xl px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          {/* Level */}
          <div className="flex flex-col items-center min-w-[60px]">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Level
            </div>
            <div className="display text-3xl leading-tight" style={{ color }}>
              {level}
            </div>
          </div>

          {/* Score (center) */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Score
            </div>
            <div className="display text-3xl leading-tight text-accent">
              {score.toLocaleString()}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onShop}
              aria-label="Skins Shop"
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card/60 text-lg transition-all hover:bg-muted hover:scale-110 active:scale-95"
            >
              👕
            </button>
            <button
              onClick={onLeaderboard}
              aria-label="Leaderboard"
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card/60 text-lg transition-all hover:bg-muted hover:scale-110 active:scale-95"
            >
              🏆
            </button>
            <button
              onClick={onSettings}
              aria-label="Settings"
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card/60 text-lg transition-all hover:bg-muted hover:scale-110 active:scale-95"
            >
              ⚙︎
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${color}99, ${color})`,
                boxShadow: `0 0 8px ${color}88`,
              }}
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: "spring", stiffness: 130, damping: 22 }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{toNext} to next level</span>
            <span>Best: <span className="text-foreground font-semibold">{high.toLocaleString()}</span></span>
          </div>
        </div>
      </div>

      {/* Bag arena */}
      <div className="relative flex flex-1 items-center justify-center">
        <motion.button
          ref={bagRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          aria-label="Punch the bag"
          className="relative touch-none select-none outline-none"
          animate={{ scale: scale * superSizeMultiplier }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
        >
          <motion.div
            key={shake}
            className={shakeExtreme ? "animate-shake-extreme" : ""}
            animate={
              shakeExtreme
                ? {}
                : {
                    rotate: [0, -7, 7, -4, 4, 0],
                    y: [0, 5, -3, 4, 0],
                  }
            }
            transition={{ duration: 0.32 }}
            whileTap={{ scale: 0.91 }}
          >
            <BagArt color={color} scale={1} glowing faceEmoji={selectedSkinObj?.faceEmoji} />
          </motion.div>

          {/* Target critical bullseye */}
          {targetPos && (
            <div
              className="pointer-events-none absolute flex h-10 w-10 animate-crit-pulse items-center justify-center rounded-full border-2 border-yellow-400 bg-yellow-400/25 z-10"
              style={{
                left: targetPos.x - 20,
                top: targetPos.y - 20,
              }}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            </div>
          )}

          {/* Sparkles */}
          {sparkles.map((s) => (
            <span
              key={s.id}
              className="crit-sparkle h-2 w-2 z-20"
              style={{
                left: s.x,
                top: s.y,
                "--tx": `${s.tx}px`,
                "--ty": `${s.ty}px`,
              } as React.CSSProperties}
            />
          ))}

          {/* Score floaters */}
          <AnimatePresence>
            {floaters.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 1, y: 0, scale: 0.7 }}
                animate={{ opacity: 0, y: -90, scale: 1.25 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`pointer-events-none absolute display font-bold drop-shadow-lg text-center whitespace-nowrap z-25 ${
                  f.isCrit ? "text-xl text-yellow-400 font-extrabold" : "text-xs"
                }`}
                style={{
                  left: f.x,
                  top: f.y,
                  color: f.isCrit ? "#facc15" : f.color,
                  textShadow: f.isCrit
                    ? "0 0 16px #facc15, 0 0 8px #f97316"
                    : `0 0 12px ${f.color}99`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                {f.text}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* CAST SHARK burst */}
          <AnimatePresence>
            {sharks.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.3, 1.2, 1.5],
                  x: Math.cos((s.angle * Math.PI) / 180) * 120,
                  y: Math.sin((s.angle * Math.PI) / 180) * 120,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="pointer-events-none absolute left-1/2 top-1/2 display text-xs font-bold tracking-widest text-accent drop-shadow-[0_0_8px_rgba(0,0,0,0.7)] z-20"
                style={{ translateX: "-50%", translateY: "-50%" }}
              >
                {caption}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.button>

        {/* Combo counter — floating above/beside bag */}
        <AnimatePresence>
          {showCombo && combo >= 3 && (
            <motion.div
              key={`combo-${combo}`}
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="pointer-events-none absolute top-4 right-4 flex flex-col items-center rounded-2xl px-4 py-2 glass z-20"
            >
              <span className="display text-2xl leading-none" style={{ color }}>
                {combo}x
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                combo
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.35em] text-muted-foreground z-10">
        JAB (Tap left) · HOOK (Tap right) · UPPERCUT (Swipe Up) · SLAM (Swipe Down)
      </p>

      {/* Active Power-up indicator */}
      <AnimatePresence>
        {activePowerUp && Date.now() < activePowerUp.expiresAt && (
          <motion.div
            key={`pu-${activePowerUp.type}`}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mx-auto mt-2 flex items-center gap-2 rounded-full px-4 py-2 z-10"
            style={{
              background: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 25%, transparent), color-mix(in oklch, var(--secondary) 20%, transparent))",
              border: "1px solid color-mix(in oklch, var(--primary) 40%, transparent)",
              animation: "powerup-glow 1.5s ease-in-out infinite",
            }}
          >
            <span className="text-xl">{activePowerUp.def.icon}</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest leading-none">
                {activePowerUp.def.label}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5 leading-none">
                {activePowerUp.def.description}
              </div>
            </div>
            {/* Timer bar */}
            <div className="ml-2 h-1.5 w-16 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{
                  animation: `powerup-timer ${activePowerUp.def.duration}ms linear forwards`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement toast */}
      <AnimatePresence>
        {achievementToast && (
          <motion.div
            key={`ach-${achievementToast.id}`}
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
            className="absolute left-4 right-4 top-4 z-50 flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: "linear-gradient(135deg, color-mix(in oklch, var(--card) 95%, transparent), color-mix(in oklch, var(--background) 95%, transparent))",
              border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span className="text-3xl">{achievementToast.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary">
                Achievement Unlocked!
              </div>
              <div className="text-sm font-bold truncate">{achievementToast.label}</div>
              <div className="text-xs text-muted-foreground">{achievementToast.description}</div>
            </div>
            <span className="text-xl">🏆</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            key="lu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 grid place-items-center bg-background/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -8, y: 30 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="glass rounded-3xl px-10 py-8 text-center shadow-2xl"
            >
              <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Level Up!
              </div>
              <div
                className="mt-2 display text-6xl"
                style={{
                  background: `linear-gradient(135deg, ${color}, var(--primary))`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: `drop-shadow(0 0 20px ${color}66)`,
                }}
              >
                LV {level}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Keep going — you're unstoppable 🔥
              </div>
              {/* Mini confetti using emojis */}
              <div className="mt-4 flex justify-center gap-3 text-2xl">
                {["🥊", "⚡", "🎯", "💥"].map((em, i) => (
                  <motion.span
                    key={em}
                    initial={{ y: 0, opacity: 0 }}
                    animate={{ y: [-8, 0, -5, 0], opacity: [0, 1, 1, 0] }}
                    transition={{ delay: i * 0.08, duration: 0.9 }}
                  >
                    {em}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
        {showHighScore && (
          <motion.div
            key="hs"
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full border border-primary/50 bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-xl"
            style={{ boxShadow: "0 0 24px oklch(0.78 0.19 55 / 0.5)" }}
          >
            ✨ New High Score!
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenWrap>
  );
}

function SessionSummaryScreen({
  stats,
  onLeaderboard,
  onResume,
}: {
  stats: SessionStats;
  onLeaderboard: () => void;
  onResume: () => void;
}) {
  const allAchievements = getAllWithStatus();
  const unlockedCount = allAchievements.filter((a) => a.unlocked).length;

  const statItems = [
    { icon: "🥊", label: "Punches", value: stats.punches },
    { icon: "📈", label: "Levels Gained", value: stats.levelsGained },
    { icon: "🔥", label: "Max Combo", value: `${stats.maxCombo}x` },
    { icon: "⚡", label: "Power-ups", value: stats.powerUpsActivated },
    { icon: "🏆", label: "Badges", value: `${unlockedCount}/${allAchievements.length}` },
  ];

  return (
    <ScreenWrap>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="text-center"
        >
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Session Complete
          </div>
          <h2
            className="mt-2 display text-4xl tracking-widest"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            GREAT WORK
          </h2>
        </motion.div>

        {/* Stat cards */}
        <div className="w-full space-y-2">
          {statItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 250, damping: 20 }}
              className="glass flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 300, damping: 15 }}
                className="display text-xl text-accent"
              >
                {item.value}
              </motion.span>
            </motion.div>
          ))}
        </div>

        {/* New achievements unlocked this session */}
        {stats.achievementsUnlocked.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full"
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
              New Achievements
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.achievementsUnlocked.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 20%, transparent), color-mix(in oklch, var(--secondary) 15%, transparent))",
                    border: "1px solid color-mix(in oklch, var(--primary) 35%, transparent)",
                  }}
                >
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex w-full flex-col gap-3 mt-2"
        >
          <PrimaryButton onClick={onResume}>Keep Punching →</PrimaryButton>
          <SecondaryButton onClick={onLeaderboard}>🏆 View Leaderboard</SecondaryButton>
        </motion.div>
      </div>
    </ScreenWrap>
  );
}

/* ---------------- Leaderboard Screen ---------------- */

function LeaderboardScreen({
  currentPlayerId,
  onBack,
}: {
  currentPlayerId: string | null;
  onBack: () => void;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const currentRowRef = useRef<HTMLTableRowElement>(null);

  const fetchLeaderboard = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const { data, error } = await supabase
      .from("players")
      .select("id, name, level, high_score, score")
      .order("score", { ascending: false })
      .order("high_score", { ascending: false });
    setLoading(false);
    if (error) return setErr(error.message);
    setEntries((data ?? []) as LeaderboardEntry[]);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!loading && currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [loading, entries.length]);

  const placements = computePlacements(entries);

  const currentIndex = currentPlayerId
    ? entries.findIndex((e) => e.id === currentPlayerId)
    : -1;
  const currentEntry =
    currentIndex >= 0 ? entries[currentIndex] : null;
  const currentPlacement =
    currentIndex >= 0 ? placements[currentIndex] : -1;

  return (
    <ScreenWrap>
      <BackBar onBack={onBack} title="Leaderboard" />

      <p className="mt-2 text-center text-xs text-muted-foreground">
        All players ranked by total score
      </p>

      {currentEntry && currentIndex >= 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-border px-4 py-3"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--primary) 15%, transparent), color-mix(in oklch, var(--secondary) 10%, transparent))",
            borderColor: "color-mix(in oklch, var(--primary) 35%, transparent)",
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Your placement
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold">{currentEntry.name}</div>
              <div className="text-xs text-muted-foreground">
                {ordinal(currentPlacement)} place · {entries.length} player{entries.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Score
              </div>
              <div className="display text-2xl text-accent">
                {currentEntry.score.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Best {currentEntry.high_score.toLocaleString()} · Lv {currentEntry.level}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:text-foreground disabled:opacity-50"
        >
          {loading ? <LoadingDots /> : <>↻ Refresh</>}
        </button>
      </div>

      {loading && !entries.length && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                className="h-2 w-2 rounded-full bg-primary"
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Loading scores…</p>
        </div>
      )}

      {err && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="rounded-xl bg-destructive/15 px-5 py-3 text-center text-sm text-destructive">
            {err}
          </div>
          <SecondaryButton onClick={fetchLeaderboard}>Try again</SecondaryButton>
        </div>
      )}

      {!loading && !err && entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-3 overflow-hidden rounded-2xl border border-border"
          style={{
            background: "color-mix(in oklch, var(--card) 70%, transparent)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-h-[calc(100vh-24rem)] overflow-y-auto overscroll-contain">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10 px-3 text-[10px] uppercase tracking-widest">
                    #
                  </TableHead>
                  <TableHead className="px-3 text-[10px] uppercase tracking-widest">
                    Player
                  </TableHead>
                  <TableHead className="w-12 px-2 text-center text-[10px] uppercase tracking-widest">
                    Lv
                  </TableHead>
                  <TableHead className="w-16 px-2 text-right text-[10px] uppercase tracking-widest">
                    Score
                  </TableHead>
                  <TableHead className="w-16 px-3 text-right text-[10px] uppercase tracking-widest">
                    Best
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, i) => {
                  const isMe = entry.id === currentPlayerId;
                  const bagCol = bagColor(entry.level);
                  const rank = placements[i];
                  return (
                    <TableRow
                      key={entry.id}
                      ref={isMe ? currentRowRef : undefined}
                      className={`border-border/50 ${isMe ? "bg-primary/10 hover:bg-primary/10" : ""}`}
                      style={
                        isMe
                          ? { borderLeft: "3px solid var(--primary)" }
                          : undefined
                      }
                    >
                      <TableCell className="px-3 py-3 text-sm font-bold">
                        {rank <= 3 ? (
                          <span className="text-lg leading-none">{MEDAL[rank - 1]}</span>
                        ) : (
                          <span className="text-muted-foreground">{ordinal(rank)}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={`truncate text-sm font-semibold ${isMe ? "text-foreground" : "text-foreground/80"}`}
                          >
                            {entry.name}
                          </span>
                          {isMe && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                              style={{
                                background: "color-mix(in oklch, var(--primary) 25%, transparent)",
                                color: "var(--primary)",
                                border: "1px solid color-mix(in oklch, var(--primary) 40%, transparent)",
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className="px-2 py-3 text-center text-sm font-bold"
                        style={{ color: bagCol }}
                      >
                        {entry.level}
                      </TableCell>
                      <TableCell
                        className={`px-2 py-3 text-right text-sm font-bold tabular-nums ${
                          isMe ? "text-accent" : "text-foreground"
                        }`}
                      >
                        {entry.score.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums text-muted-foreground">
                        {entry.high_score.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      {!loading && !err && entries.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">No players yet. Be the first!</p>
        </div>
      )}
    </ScreenWrap>
  );
}

/* ---------------- Settings ---------------- */

function SettingsScreen({
  player,
  currentTheme,
  onToggleTheme,
  onBack,
  onLogout,
  onExit,
}: {
  player: Player;
  currentTheme: "dark" | "light";
  onToggleTheme: () => void;
  onBack: () => void;
  onLogout: () => void;
  onExit: () => void;
}) {
  const [mutedState, setMutedState] = useState(isMuted());
  const [captionInput, setCaptionInput] = useState("");
  const [captionSaved, setCaptionSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setMutedState(isMuted());
    setCaptionInput(loadCaption());
  }, []);

  function handleCopy() {
    navigator.clipboard?.writeText(player.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <ScreenWrap>
      <BackBar onBack={onBack} title="Settings" />
      <div className="mt-5 space-y-4">
        {/* Player info card */}
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Player
          </div>
          <div className="mt-1 text-xl font-bold">{player.name}</div>
          <div className="text-sm text-muted-foreground">Age {player.age}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-input/60 px-2 py-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Score
              </div>
              <div className="mt-0.5 font-bold text-accent">{player.score.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-input/60 px-2 py-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Best
              </div>
              <div className="mt-0.5 font-bold">{player.high_score.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-input/60 px-2 py-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Level
              </div>
              <div className="mt-0.5 font-bold">{player.level}</div>
            </div>
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Login ID
          </div>
          <div className="mt-1 break-all rounded-lg bg-input px-3 py-2 font-mono text-xs text-accent leading-relaxed">
            {player.id}
          </div>
          <button
            onClick={handleCopy}
            className="mt-2 text-xs uppercase tracking-widest transition-colors text-muted-foreground hover:text-foreground"
          >
            {copied ? <span className="text-accent">✓ Copied!</span> : "Tap to copy"}
          </button>
        </div>

        {/* Sound toggle */}
        <div className="glass flex items-center justify-between rounded-2xl p-4">
          <div>
            <div className="font-semibold">Sound effects</div>
            <div className="text-xs text-muted-foreground">
              Punches, thumps, level-ups
            </div>
          </div>
          <button
            role="switch"
            aria-checked={!mutedState}
            onClick={() => {
              const next = !mutedState;
              setMuted(next);
              setMutedState(next);
            }}
            className={`relative h-8 w-14 rounded-full transition-all duration-300 ${
              mutedState
                ? "bg-muted"
                : "bg-primary"
            }`}
            style={
              !mutedState
                ? { boxShadow: "0 0 12px color-mix(in oklch, var(--primary) 40%, transparent)" }
                : {}
            }
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                mutedState ? "left-1" : "left-7"
              }`}
            />
          </button>
        </div>

        {/* Theme toggle */}
        <div className="glass flex items-center justify-between rounded-2xl p-4">
          <div>
            <div className="font-semibold">Light theme</div>
            <div className="text-xs text-muted-foreground">
              Toggle between light and dark visual styles
            </div>
          </div>
          <button
            role="switch"
            aria-checked={currentTheme === "light"}
            onClick={onToggleTheme}
            className={`relative h-8 w-14 rounded-full transition-all duration-300 ${
              currentTheme === "light"
                ? "bg-primary"
                : "bg-muted"
            }`}
            style={
              currentTheme === "light"
                ? { boxShadow: "0 0 12px color-mix(in oklch, var(--primary) 40%, transparent)" }
                : {}
            }
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                currentTheme === "light" ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>

        {/* Punch caption */}
        <div className="glass rounded-2xl p-4">
          <div className="font-semibold">Punch caption</div>
          <div className="text-xs text-muted-foreground">
            Shown around the bag on every punch. Max 20 chars.
          </div>
          <StyledInput
            className="mt-3 tracking-widest"
            value={captionInput}
            maxLength={20}
            onChange={(e) => {
              setCaptionInput(e.target.value);
              setCaptionSaved(false);
            }}
            placeholder={DEFAULT_CAPTION}
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => {
                setCaptionInput(DEFAULT_CAPTION);
                saveCaption(DEFAULT_CAPTION);
                setCaptionSaved(true);
              }}
              className="text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Reset
            </button>
            <button
              onClick={() => {
                saveCaption(captionInput);
                setCaptionInput(loadCaption());
                setCaptionSaved(true);
              }}
              className="rounded-full bg-gradient-to-r from-primary to-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-md transition-all hover:opacity-90"
            >
              {captionSaved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
        <SecondaryButton onClick={onLogout}>Sign out</SecondaryButton>
        <button
          onClick={onExit}
          className="w-full rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-3 font-semibold text-destructive transition-colors hover:bg-destructive/20"
        >
          Exit Game
        </button>
      </div>
    </ScreenWrap>
  );
}

/* ---------------- UI atoms ---------------- */

function PrimaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="w-full rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground shadow-md transition-all active:scale-[0.97] hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ boxShadow: "0 4px 20px color-mix(in oklch, var(--primary) 30%, transparent)" }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="w-full rounded-2xl border border-border bg-muted/40 px-5 py-4 font-semibold text-foreground backdrop-blur-sm transition-all hover:bg-muted/70 active:scale-[0.97]"
    >
      {children}
    </button>
  );
}

function StyledInput({
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function BackBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="flex items-center gap-3 text-foreground">
      <button
        onClick={onBack}
        aria-label="Back"
        className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/70 text-foreground transition-all hover:bg-muted hover:scale-110 active:scale-95"
      >
        ←
      </button>
      <h2 className="display text-xl tracking-widest text-foreground">{title}</h2>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5 items-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
          className="inline-block h-1.5 w-1.5 rounded-full bg-current"
        />
      ))}
    </span>
  );
}

/* SVG punching bag — colored per level, scales up as levels progress. */
function BagArt({
  color,
  scale,
  glowing = false,
  faceEmoji,
}: {
  color: string;
  scale: number;
  glowing?: boolean;
  faceEmoji?: string;
}) {
  const size = 200 * scale;
  const gradId = `bg-body-${color.replace("#", "")}`;
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 200 250"
      style={{
        filter: glowing
          ? `drop-shadow(0 0 28px ${color}66) drop-shadow(0 20px 24px ${color}44)`
          : `drop-shadow(0 20px 20px ${color}55)`,
      }}
    >
      {/* strap */}
      <rect x="94" y="4" width="12" height="28" rx="3" fill="#6b7280" />
      <rect x="68" y="26" width="64" height="12" rx="4" fill="#4b5563" />
      {/* shadow ellipse at base */}
      <ellipse cx="100" cy="224" rx="68" ry="9" fill="#00000077" />
      {/* body */}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="60%" stopColor={color} stopOpacity="0.75" />
          <stop offset="100%" stopColor="#0a0a14" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${gradId}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* main body */}
      <rect x="40" y="38" width="120" height="180" rx="32" fill={`url(#${gradId})`} />
      {/* stripes */}
      <rect x="40" y="88" width="120" height="10" fill="#00000030" />
      <rect x="40" y="152" width="120" height="10" fill="#00000030" />
      
      {/* face emoji overlay */}
      {faceEmoji && (
        <text
          x="100"
          y="135"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="48"
          style={{ userSelect: "none" }}
        >
          {faceEmoji}
        </text>
      )}

      {/* primary highlight band */}
      <rect x="50" y="48" width="16" height="155" rx="8" fill={`url(#${gradId}-shine)`} />
      {/* secondary specular dot */}
      <ellipse cx="62" cy="62" rx="6" ry="12" fill="#ffffff18" />
    </svg>
  );
}
