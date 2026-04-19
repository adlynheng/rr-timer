let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!ctx) ctx = new Ctx()
  return ctx
}

/** Call after a user gesture so iOS Safari allows playback. */
export async function unlockAudio(): Promise<void> {
  const c = getCtx()
  if (c?.state === 'suspended') await c.resume()
}

function tone(freq: number, duration: number, gain = 0.12): void {
  const c = getCtx()
  if (!c) return
  const t0 = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

/** Short tick for countdown seconds (last 10s). */
export function playTick(): void {
  tone(880, 0.08, 0.1)
}

function scheduleChime(
  c: AudioContext,
  start: number,
  freq: number,
  duration: number,
  peakGain: number,
  type: OscillatorType,
  slideTo?: number,
): void {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), start + duration * 0.65)
  }
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(peakGain, start + 0.018)
  g.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(start)
  osc.stop(start + duration + 0.06)
}

/**
 * Short “kitchen timer done” fanfare: bouncy major arpeggio + sparkly finish.
 */
export function playTimeUp(): void {
  const c = getCtx()
  if (!c) return
  const t0 = c.currentTime
  const lead: OscillatorType = 'triangle'

  const notes: { f: number; at: number; d: number; g: number; slide?: number }[] = [
    { f: 523.25, at: 0, d: 0.1, g: 0.1 }, // C5
    { f: 659.25, at: 0.08, d: 0.1, g: 0.1 }, // E5
    { f: 783.99, at: 0.16, d: 0.1, g: 0.1 }, // G5
    { f: 1046.5, at: 0.26, d: 0.28, g: 0.13, slide: 1318.51 }, // C6 → E6 shimmer
  ]

  for (const n of notes) {
    scheduleChime(c, t0 + n.at, n.f, n.d, n.g, lead, n.slide)
  }

  // Soft fifth under the peak for a fuller “ta-da”
  scheduleChime(c, t0 + 0.26, 392.0, 0.22, 0.055, 'sine')
  // Tiny sparkle on top (high sine ping)
  scheduleChime(c, t0 + 0.34, 2093.0, 0.12, 0.04, 'sine')
}
