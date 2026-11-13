let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor = window.AudioContext ||
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  if (!audioContext) {
    try {
      audioContext = new AudioContextConstructor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

/** Unlocks audio after a user gesture so later background notifications can chime. */
export function unlockNotificationSound() {
  const context = getAudioContext();
  if (context?.state === "suspended") void context.resume().catch(() => {});
}

/** A short, restrained two-tone chime inspired by new-mail sounds. */
export function playNotificationSound() {
  const context = getAudioContext();
  if (!context) return;

  const start = () => {
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.075, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
    master.connect(context.destination);

    [880, 1174.66].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.11);
      oscillator.connect(master);
      oscillator.start(now + index * 0.11);
      oscillator.stop(now + 0.58);
    });
  };

  if (context.state === "suspended") void context.resume().then(start).catch(() => {});
  else {
    try { start(); } catch { /* Some browsers reject Web Audio after a locked-down gesture. */ }
  }
}
