// Web Audio punch sound generator (no assets required).
let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
  if (typeof window !== "undefined") localStorage.setItem("pm_muted", v ? "1" : "0");
}
export function isMuted() {
  if (typeof window !== "undefined") {
    muted = localStorage.getItem("pm_muted") === "1";
  }
  return muted;
}

export function playPunch() {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  // Low thump
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.9, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.24);

  // Noise slap
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const nGain = ac.createGain();
  nGain.gain.setValueAtTime(0.35, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  noise.connect(hp).connect(nGain).connect(ac.destination);
  noise.start(now);
}

export function playLevelUp() {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  [440, 660, 880].forEach((f, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.4, now + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.35);
    o.connect(g).connect(ac.destination);
    o.start(now + i * 0.08);
    o.stop(now + i * 0.08 + 0.4);
  });
}

export function playUppercut() {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  // Upward swoosh
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(500, now + 0.2);
  
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1200;

  osc.connect(lp).connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.22);

  // Impact thump
  const thump = ac.createOscillator();
  const tGain = ac.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(150, now + 0.1);
  thump.frequency.exponentialRampToValueAtTime(50, now + 0.25);
  tGain.gain.setValueAtTime(0.0001, now + 0.1);
  tGain.gain.exponentialRampToValueAtTime(0.8, now + 0.11);
  tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  thump.connect(tGain).connect(ac.destination);
  thump.start(now + 0.1);
  thump.stop(now + 0.3);
}

export function playSlam() {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  // Heavy low thump
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
  
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(1.0, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.4);

  // Crash rumble
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const nGain = ac.createGain();
  nGain.gain.setValueAtTime(0.5, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 350;
  noise.connect(lp).connect(nGain).connect(ac.destination);
  noise.start(now);
}

export function playCrit() {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  // Sharp, bright metallic bell
  [987.77, 1318.51].forEach((f, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.4, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    o.connect(g).connect(ac.destination);
    o.start(now);
    o.stop(now + 0.28);
  });
}

export function playDodge() {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  // Sweep whoosh
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const nGain = ac.createGain();
  nGain.gain.setValueAtTime(0.4, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(2000, now);
  bp.frequency.exponentialRampToValueAtTime(600, now + 0.15);
  
  noise.connect(bp).connect(nGain).connect(ac.destination);
  noise.start(now);
}

export function playHitStun() {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  // Buzz alert
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 95;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 400;

  osc.connect(lp).connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

