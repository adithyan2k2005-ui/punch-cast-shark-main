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
} from "@/lib/game";
import { isMuted, playLevelUp, playPunch, setMuted } from "@/lib/audio";
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
  | "summary";

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
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden">
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
            key="li"
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
        {screen === "play" && player && (
          <PlayScreen
            key="pl"
            initial={player}
            onSettings={() => setScreen("settings")}
            onLeaderboard={() => openLeaderboard("play")}
            onSessionEnd={(stats) => {
              setSessionStats(stats);
              setScreen("summary");
            }}
          />
        )}
        {screen === "summary" && player && (
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
            currentPlayerId={player?.id ?? null}
            onBack={() => setScreen(leaderboardReturn)}
          />
        )}
        {screen === "settings" && player && (
          <SettingsScreen
            key="st"
            player={player}
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
  );
}

/* ---------------- Screens ---------------- */

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
                "radial-gradient(circle, oklch(0.78 0.19 55 / 0.18) 0%, transparent 70%)",
              animation: "glow-pulse 2s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 300,
              height: 300,
              background:
                "radial-gradient(circle, oklch(0.68 0.22 340 / 0.1) 0%, transparent 70%)",
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
                  "linear-gradient(135deg, oklch(0.80 0.21 52), oklch(0.70 0.24 338), oklch(0.84 0.22 178))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 30px oklch(0.78 0.19 55 / 0.5))",
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
          className="display text-4xl tracking-widest"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.80 0.21 52), oklch(0.84 0.22 178))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ALL IS WELL
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
          className="display text-3xl tracking-widest"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.80 0.21 52), oklch(0.84 0.22 178))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ALL IS WELL
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

/* ---------------- Play ---------------- */

const MAX_FLOATERS = 12;
const MAX_SHARKS = 30;

function PlayScreen({
  initial,
  onSettings,
  onLeaderboard,
  onSessionEnd,
}: {
  initial: Player;
  onSettings: () => void;
  onLeaderboard: () => void;
  onSessionEnd: (stats: SessionStats) => void;
}) {
  const [score, setScore] = useState(initial.score);
  const [high, setHigh] = useState(initial.high_score);
  const [level, setLevel] = useState(initial.level);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showHighScore, setShowHighScore] = useState(false);
  const [floaters, setFloaters] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
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
  useEffect(() => setCaption(loadCaption()), []);

  // Refresh caption whenever screen becomes visible again (e.g. after settings).
  useEffect(() => {
    const onFocus = () => setCaption(loadCaption());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Debounced DB save — always uses the latest pendingRef snapshot.
  useEffect(() => {
    if (!pendingRef.current) return;
    const snapshot = { ...pendingRef.current };
    const t = setTimeout(async () => {
      // Only save if pendingRef still matches (no newer pending save queued up)
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

  const color = bagColor(level);
  const scale = bagScale(level);

  // Cleanup idle timer and power-up timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (powerUpTimerRef.current) clearTimeout(powerUpTimerRef.current);
    };
  }, []);

  // Achievement toast display — show one at a time from queue
  useEffect(() => {
    if (achievementToast) return; // already showing one
    const next = achievementQueueRef.current.shift();
    if (next) {
      setAchievementToast(next);
      setTimeout(() => {
        setAchievementToast(null);
      }, 2800);
    }
  }, [achievementToast]);

  function punch(e: React.MouseEvent | React.TouchEvent) {
    // Prevent click from also firing on touch devices
    if (e.type === "touchstart") {
      e.preventDefault();
    }

    // Idle detection: after 4s of no punching, show session summary
    hasPunchedRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (hasPunchedRef.current) onSessionEnd({ ...sessionRef.current });
    }, 4000);

    // Power-up: roll for a new one if none active
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
        // Clear power-up when it expires
        if (powerUpTimerRef.current) clearTimeout(powerUpTimerRef.current);
        powerUpTimerRef.current = setTimeout(() => {
          setActivePowerUp(null);
        }, rolled.duration);
      }
    }

    // Calculate points (power-up aware)
    const pointMultiplier = getPointMultiplier(activePowerUp);
    const pointsThisPunch = POINTS_PER_PUNCH * pointMultiplier;
    const isDoubleActive = pointMultiplier > 1;

    // Session tracking
    sessionRef.current.punches++;

    playPunch();
    const rect = bagRef.current?.getBoundingClientRect();
    let x = rect ? rect.width / 2 : 0;
    let y = rect ? rect.height / 2 : 0;
    if ("touches" in e && e.touches[0] && rect) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else if ("clientX" in e && rect) {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    // Score floater — capped at MAX_FLOATERS
    const fid = ++idRef.current;
    setFloaters((f) => {
      const next = [...f, { id: fid, x, y, color }];
      return next.length > MAX_FLOATERS ? next.slice(next.length - MAX_FLOATERS) : next;
    });
    setTimeout(() => setFloaters((f) => f.filter((p) => p.id !== fid)), 800);

    // Shark burst — capped at MAX_SHARKS
    const burstBase = ++idRef.current;
    const burst = Array.from({ length: 6 }, (_, i) => ({
      id: burstBase + i,
      angle: (360 / 6) * i + Math.random() * 25,
    }));
    setSharks((s) => {
      const next = [...s, ...burst];
      return next.length > MAX_SHARKS ? next.slice(next.length - MAX_SHARKS) : next;
    });
    setTimeout(
      () => setSharks((s) => s.filter((k) => !burst.find((b) => b.id === k.id))),
      650,
    );

    setShake((n) => n + 1);

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
      {/* Top HUD — glassmorphism card */}
      <div className="glass rounded-2xl px-4 py-3">
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
              onClick={onLeaderboard}
              aria-label="Leaderboard"
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card/60 text-xl transition-all hover:bg-muted hover:scale-110 active:scale-95"
            >
              🏆
            </button>
            <button
              onClick={onSettings}
              aria-label="Settings"
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card/60 text-xl transition-all hover:bg-muted hover:scale-110 active:scale-95"
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
          onClick={punch}
          onTouchStart={punch}
          aria-label="Punch the bag"
          className="relative touch-none select-none"
          animate={{ scale: scale * superSizeMultiplier }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
        >
          <motion.div
            key={shake}
            animate={{
              rotate: [0, -7, 7, -4, 4, 0],
              y: [0, 5, -3, 4, 0],
            }}
            transition={{ duration: 0.32 }}
            whileTap={{ scale: 0.91 }}
          >
            <BagArt color={color} scale={1} glowing />
          </motion.div>

          {/* Score floaters */}
          <AnimatePresence>
            {floaters.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 1, y: 0, scale: 0.7 }}
                animate={{ opacity: 0, y: -90, scale: 1.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="pointer-events-none absolute display text-3xl font-bold drop-shadow-lg"
                style={{
                  left: f.x,
                  top: f.y,
                  color: f.color,
                  textShadow: `0 0 12px ${f.color}99`,
                }}
              >
                +{currentPointMultiplier > 1 ? POINTS_PER_PUNCH * currentPointMultiplier : POINTS_PER_PUNCH}
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
                className="pointer-events-none absolute left-1/2 top-1/2 display text-xs font-bold tracking-widest text-accent drop-shadow-[0_0_8px_rgba(0,0,0,0.7)]"
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
              className="pointer-events-none absolute top-4 right-4 flex flex-col items-center rounded-2xl px-4 py-2 glass"
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

      <p className="mt-3 text-center text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
        Tap the bag · Breathe · Let it out
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
            className="mx-auto mt-2 flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: "linear-gradient(135deg, oklch(0.80 0.21 52 / 0.25), oklch(0.70 0.24 338 / 0.2))",
              border: "1px solid oklch(0.80 0.21 52 / 0.4)",
              animation: "powerup-glow 1.5s ease-in-out infinite",
            }}
          >
            <span className="text-xl">{activePowerUp.def.icon}</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest">
                {activePowerUp.def.label}
              </div>
              <div className="text-[10px] text-muted-foreground">
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
            className="absolute left-4 right-4 top-4 z-30 flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: "linear-gradient(135deg, oklch(0.25 0.08 52 / 0.95), oklch(0.22 0.06 275 / 0.95))",
              border: "1px solid oklch(0.80 0.21 52 / 0.5)",
              boxShadow: "0 8px 32px oklch(0.80 0.21 52 / 0.3)",
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
            className="absolute inset-0 z-20 grid place-items-center bg-background/75 backdrop-blur-md"
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
                  background: `linear-gradient(135deg, ${color}, oklch(0.84 0.22 178))`,
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
            className="absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full border border-primary/50 bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-xl"
            style={{ boxShadow: "0 0 24px oklch(0.78 0.19 55 / 0.5)" }}
          >
            ✨ New High Score!
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenWrap>
  );
}
/* ---------------- Session Summary ---------------- */

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
                "linear-gradient(135deg, oklch(0.80 0.21 52), oklch(0.84 0.22 178))",
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
                    background: "linear-gradient(135deg, oklch(0.80 0.21 52 / 0.2), oklch(0.70 0.24 338 / 0.15))",
                    border: "1px solid oklch(0.80 0.21 52 / 0.35)",
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

/* ---------------- Leaderboard ---------------- */

type LeaderboardEntry = {
  id: string;
  name: string;
  level: number;
  high_score: number;
  score: number;
};

const MEDAL = ["🥇", "🥈", "🥉"];

/** Return ordinal suffix string for a number: 1→"1st", 2→"2nd", 3→"3rd", 11→"11th", etc. */
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Compute competition-style ("1224") rankings for a score-descending sorted list.
 * Tied scores receive the same placement; the next distinct score skips to
 * position-in-list + 1. Returns a parallel array of rank numbers.
 *
 * Example: scores [100, 90, 90, 80] → ranks [1, 2, 2, 4]
 */
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
              "linear-gradient(135deg, oklch(0.80 0.21 52 / 0.15), oklch(0.70 0.24 338 / 0.1))",
            borderColor: "oklch(0.80 0.21 52 / 0.35)",
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
            background: "oklch(0.19 0.05 275 / 0.7)",
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
                          ? { borderLeft: "3px solid oklch(0.80 0.21 52 / 0.7)" }
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
                                background: "oklch(0.80 0.21 52 / 0.25)",
                                color: "oklch(0.80 0.21 52)",
                                border: "1px solid oklch(0.80 0.21 52 / 0.4)",
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
  onBack,
  onLogout,
  onExit,
}: {
  player: Player;
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
                : "bg-gradient-to-r from-primary to-secondary"
            }`}
            style={
              !mutedState
                ? { boxShadow: "0 0 12px oklch(0.78 0.19 55 / 0.4)" }
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
      className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary px-5 py-4 font-bold text-primary-foreground shadow-lg transition-all active:scale-[0.97] hover:opacity-95 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ boxShadow: "0 4px 20px oklch(0.78 0.19 55 / 0.3)" }}
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
      className="w-full rounded-2xl border border-border bg-card/60 px-5 py-4 font-semibold text-foreground backdrop-blur-sm transition-all hover:bg-muted active:scale-[0.97]"
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
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        aria-label="Back"
        className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/70 transition-all hover:bg-muted hover:scale-110 active:scale-95"
      >
        ←
      </button>
      <h2 className="display text-xl tracking-widest">{title}</h2>
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
function BagArt({ color, scale, glowing = false }: { color: string; scale: number; glowing?: boolean }) {
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
      {/* primary highlight band */}
      <rect x="50" y="48" width="16" height="155" rx="8" fill={`url(#${gradId}-shine)`} />
      {/* secondary specular dot */}
      <ellipse cx="62" cy="62" rx="6" ry="12" fill="#ffffff18" />
    </svg>
  );
}
