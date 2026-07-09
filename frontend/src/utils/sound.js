// Apple "Tri-tone"-style notification chime, generated with the Web Audio API — no audio file needed.
let ctx = null;

function getContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
  }
  return ctx;
}

// Plays one bell-like note: a fundamental + a couple of harmonics layered for a richer,
// more present "ding" than a single flat sine tone — closer to a real notification chime.
function playBellNote(audioCtx, masterGain, freq, startTime, duration, peakGain) {
  const harmonics = [
    { mult: 1, gain: 1 },
    { mult: 2, gain: 0.35 },
    { mult: 3, gain: 0.12 },
  ];
  for (const h of harmonics) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq * h.mult;

    const g = peakGain * h.gain;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(g, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }
}

export function playNotificationChime() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.9; // loud and clearly audible
  masterGain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  // Three ascending notes, Apple Tri-tone-esque: two quick same-ish notes then a higher resolving note.
  const notes = [
    { freq: 1046.5, start: 0, duration: 0.32, gain: 0.5 },   // C6
    { freq: 1318.5, start: 0.16, duration: 0.32, gain: 0.55 }, // E6
    { freq: 1568.0, start: 0.34, duration: 0.5, gain: 0.6 },  // G6
  ];

  for (const note of notes) {
    playBellNote(audioCtx, masterGain, note.freq, now + note.start, note.duration, note.gain);
  }
}