// Short two-note notification chime generated with the Web Audio API — no audio file needed.
let ctx = null;

function getContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
  }
  return ctx;
}

export function playNotificationChime() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const now = audioCtx.currentTime;
  const notes = [
    { freq: 880, start: 0, duration: 0.14 },   // A5
    { freq: 1318.5, start: 0.1, duration: 0.22 }, // E6
  ];

  for (const note of notes) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = note.freq;

    gain.gain.setValueAtTime(0, now + note.start);
    gain.gain.linearRampToValueAtTime(0.18, now + note.start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + note.start);
    osc.stop(now + note.start + note.duration + 0.02);
  }
}