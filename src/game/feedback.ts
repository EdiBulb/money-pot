// 소리는 파일 없이 Web Audio로 만든다. 단위가 클수록 음이 많아지고 묵직해진다.

let ctx: AudioContext | null = null
let muted = false

/** 소리를 끄거나 켠다. 진동과 화면 흔들림은 그대로 둔다. */
export function setMuted(value: boolean): void {
  muted = value
}

/** 첫 터치에서 불러 줘야 브라우저가 소리를 허용한다. */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

function tone(
  freq: number,
  at: number,
  dur: number,
  gain: number,
  type: OscillatorType = 'sine',
  slideTo?: number,
) {
  if (!ctx || muted) return
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise(at: number, dur: number, gain: number, filter: BiquadFilterType, freq: number) {
  if (!ctx || muted) return
  const t = ctx.currentTime + at
  const len = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(ctx.destination)
  src.start(t)
}

export function playPlant(): void {
  tone(160, 0, 0.16, 0.25, 'sine', 70)
  noise(0, 0.12, 0.08, 'lowpass', 900)
}

export function playWater(): void {
  noise(0, 0.45, 0.12, 'bandpass', 1900)
  tone(900, 0.05, 0.08, 0.04, 'sine', 1400)
  tone(1100, 0.16, 0.08, 0.04, 'sine', 1700)
}

export function playGrow(stage: number): void {
  const base = 520 + stage * 90
  tone(base, 0, 0.14, 0.12, 'triangle')
  tone(base * 1.5, 0.09, 0.2, 0.12, 'triangle')
}

/** 당기다가 뽑힐 만큼 올라온 순간의 짧은 '틱'. */
export function playTick(): void {
  tone(1400, 0, 0.04, 0.06, 'square')
}

const ARPEGGIO = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568]

export function playHarvest(stage: number): void {
  // 흙에서 빠지는 '뽁'
  tone(240 + stage * 20, 0, 0.12, 0.3, 'sine', 70)
  noise(0, 0.08, 0.1, 'lowpass', 700)

  if (stage <= 1) {
    // 동전: 짤랑
    tone(2637, 0.05, 0.35, 0.12)
    tone(3520, 0.09, 0.4, 0.1)
    if (stage === 1) tone(4186, 0.15, 0.45, 0.09)
    return
  }

  // 지폐: 종이 스치는 소리 + 단위만큼 길어지는 상승음
  noise(0.03, 0.22, 0.12, 'highpass', 3200)
  const notes = stage === 2 ? 3 : stage === 3 ? 4 : 6
  for (let i = 0; i < notes; i++) {
    tone(ARPEGGIO[i], 0.06 + i * 0.07, 0.3, 0.13, 'triangle')
  }
  if (stage === 4) {
    tone(65, 0, 0.5, 0.4, 'sine', 40) // 묵직한 한 방
    tone(2093, 0.5, 0.6, 0.08)
    tone(2637, 0.56, 0.6, 0.07)
  }
}

/** 1억 달성: 금고가 터지는 소리와 길게 올라가는 팡파르 */
export function playEnding(): void {
  tone(70, 0, 0.9, 0.5, 'sine', 32)
  noise(0, 0.5, 0.25, 'lowpass', 500)
  noise(0.05, 0.9, 0.12, 'highpass', 3000)
  const fanfare = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1568]
  fanfare.forEach((f, i) => tone(f, 0.25 + i * 0.11, 0.4, 0.14, 'triangle'))
  ;[2093, 2637, 3136, 4186].forEach((f, i) => tone(f, 1.25 + i * 0.09, 0.9, 0.07))
}

const HAPTICS: number[][] = [
  [12],
  [22],
  [20, 30, 30],
  [30, 30, 40, 30, 50],
  [40, 30, 40, 30, 60, 40, 140],
]

/** 진동을 지원하면 울리고 true를 돌려준다. (아이폰·데스크탑은 대부분 false) */
export function vibrate(pattern: number | number[]): boolean {
  try {
    return 'vibrate' in navigator ? navigator.vibrate(pattern) : false
  } catch {
    return false
  }
}

export function harvestHaptic(stage: number): boolean {
  return vibrate(HAPTICS[stage] ?? HAPTICS[0])
}

/** 화면 흔들림 세기(px). 진동이 안 되는 기기에서는 이걸로 손맛을 대신한다. */
export function shakeAmount(stage: number, vibrated: boolean): number {
  const base = [0, 2, 4, 7, 12][stage] ?? 0
  return vibrated ? base * 0.6 : base + 2
}
