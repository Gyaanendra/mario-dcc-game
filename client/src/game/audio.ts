let ctx: AudioContext | null = null;
let muted = localStorage.getItem('mcq_game_muted') === 'true';

function getCtx(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

function playNote(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15, startDelay = 0) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime + startDelay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playSweep(startFreq: number, endFreq: number, duration: number, type: OscillatorType, volume: number) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playSequence(notes: number[], duration: number, spacing: number, type: OscillatorType, volume: number) {
  notes.forEach((freq, index) => playNote(freq, duration, type, volume, index * spacing));
}

export const gameAudio = {
  toggleMute(): boolean {
    muted = !muted;
    localStorage.setItem('mcq_game_muted', String(muted));
    return muted;
  },

  isMuted(): boolean {
    return muted;
  },

  // Short original arcade cues for the pipe quiz. No audio is sampled from a game or video.
  pipeOpen() {
    playSweep(240, 510, 0.2, 'triangle', 0.11);
    playNote(660, 0.12, 'square', 0.055, 0.12);
  },

  answerCorrect() {
    playSequence([440, 554, 740], 0.14, 0.09, 'triangle', 0.12);
  },

  answerIncorrect() {
    playSequence([294, 196], 0.19, 0.13, 'sawtooth', 0.075);
  },

  checkpoint() {
    playSequence([392, 587], 0.1, 0.09, 'sine', 0.09);
  },

  levelUp() {
    playSequence([392, 494, 622, 784], 0.2, 0.13, 'triangle', 0.11);
  },

  jump() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  },

  coin() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.07);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  },

  powerup() {
    if (muted) return;
    const notes = [330, 392, 523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playNote(freq, 0.1, 'triangle', 0.18, i * 0.06);
    });
  },

  stomp() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  },

  bump() {
    if (muted) return;
    playNote(200, 0.08, 'triangle', 0.12);
  },

  breakBlock() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'noise' as any;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  },

  damage() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  },

  death() {
    if (muted) return;
    const notes = [494, 466, 440, 392, 370, 330, 311, 262];
    notes.forEach((freq, i) => {
      playNote(freq, 0.2, 'square', 0.15, i * 0.12);
    });
  },

  flagpole() {
    if (muted) return;
    const notes = [330, 392, 494, 659, 784, 988, 1319, 1568];
    notes.forEach((freq, i) => {
      playNote(freq, 0.12, 'triangle', 0.18, i * 0.08);
    });
  },

  victory() {
    if (muted) return;
    const melody = [
      [523, 0.15], [523, 0.15], [523, 0.15],
      [523, 0.3], [415, 0.15], [466, 0.15],
      [523, 0.15], [466, 0.08], [523, 0.5],
    ] as [number, number][];
    let t = 0;
    melody.forEach(([freq, dur]) => {
      playNote(freq, dur, 'triangle', 0.2, t);
      t += dur + 0.02;
    });
  },

  gameOver() {
    if (muted) return;
    const notes = [392, 330, 262, 220, 175, 165];
    notes.forEach((freq, i) => {
      playNote(freq, 0.3, 'square', 0.15, i * 0.2);
    });
  },

  pause() {
    if (muted) return;
    playNote(523, 0.1, 'square', 0.1);
    playNote(262, 0.1, 'square', 0.1, 0.1);
  },

  landing() {
    if (muted) return;
    playNote(120, 0.06, 'triangle', 0.08);
  },

  blockHit() {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  },
};
