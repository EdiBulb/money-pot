import {
  DENOMS,
  EXACT_TAIL_MS,
  GOAL,
  GROW_MS,
  MAX_STAGE,
  OFFLINE_MAX_MS,
  PAY_MS,
  PLOTS,
  PRICE_GROWTH,
  SALARY,
  SEED_COST,
  START_VAULT,
  TANK_MAX,
  TANK_PRICE,
  WATER_MAX,
  WATER_PER_TAP,
  WORKER_WAITS_MS,
  WORKER_WATERS_BELOW,
  WORK_MS,
  type PlotKind,
} from './config'

export interface Plant {
  id: number
  /** DENOMS의 인덱스 */
  stage: number
  /** 현재 단계에서 자란 시간(ms) */
  progress: number
  /** 5만 원이 된 뒤 지난 시간(ms). 일꾼이 있을 때만 센다. */
  ripe?: number
}

/** 심는 곳 하나(화분 또는 텃밭). 빈 자리는 null. */
export interface Plot {
  kind: PlotKind
  slots: (Plant | null)[]
}

export interface GameState {
  vault: number
  plots: Plot[]
  /** 흙에 남은 물. 모든 화분과 텃밭이 함께 쓴다. 단위는 '화분 하나가 버티는 ms'. */
  water: number
  /** 물탱크 개수와 탱크에 남은 물(같은 단위). */
  tanks: number
  tank: number
  /** 일꾼 수, 다음 일까지 쌓인 시간, 다음 월급날까지 쌓인 시간, 월급을 못 받아 쉬는 중인지 */
  workers: number
  workClock: number
  payClock: number
  unpaid: boolean
  harvests: number
  nextId: number
  /** 이 판을 시작한 시각과 1억을 처음 넘긴 시각(아직이면 null). 엔딩은 한 판에 한 번만 나온다. */
  startedAt: number
  goalAt: number | null
  /** 저장할 때 돈의 단계가 몇 개였는지. 단계가 바뀐 옛 저장본을 알아보는 데 쓴다. */
  money: number
  /** 마지막으로 계산한 시각. 다시 접속했을 때 지난 시간을 한꺼번에 반영한다. */
  lastSeen: number
}

/** 심는 순서: 가운데부터 바깥쪽으로. 텃밭은 뒷줄(0~4)을 채운 뒤 앞줄(5~8). 농장은 앞에서부터. */
const PLANT_ORDER: Record<PlotKind, number[]> = {
  pot: [2, 1, 3, 0, 4],
  bed: [2, 1, 3, 0, 4, 6, 7, 5, 8],
  farm: Array.from({ length: PLOTS.farm.slots }, (_, i) => i),
}

const emptyPlot = (kind: PlotKind): Plot => ({
  kind,
  slots: Array<Plant | null>(PLOTS[kind].slots).fill(null),
})

export function newGame(now: number): GameState {
  return {
    vault: START_VAULT,
    plots: [emptyPlot('pot')],
    water: 0,
    tanks: 0,
    tank: 0,
    workers: 0,
    workClock: 0,
    payClock: 0,
    unpaid: false,
    harvests: 0,
    nextId: 1,
    startedAt: now,
    goalAt: null,
    money: DENOMS.length,
    lastSeen: now,
  }
}

// ── 물 ────────────────────────────────────────────────

const isGrowing = (plot: Plot) => plot.slots.some((p) => p && p.stage < MAX_STAGE)

/** 가진 화분·텃밭 전체의 물 소비 속도. 흙이 머금는 양도 이만큼 늘어난다. */
export function totalThirst(state: GameState): number {
  return state.plots.reduce((sum, plot) => sum + PLOTS[plot.kind].thirst, 0)
}

/** 지금 자라는 돈이 있는 곳만 센 물 소비 속도. */
export function activeThirst(state: GameState): number {
  return state.plots.filter(isGrowing).reduce((sum, plot) => sum + PLOTS[plot.kind].thirst, 0)
}

export const waterCap = (state: GameState) => WATER_MAX * totalThirst(state)
export const tankCap = (state: GameState) => TANK_MAX * state.tanks

/** 탱크가 있으면 흙을 먼저 가득 채우고 남는 물을 탱크에 둔다. */
function settleWater(state: GameState, total: number): GameState {
  const water = Math.min(waterCap(state), total)
  const tank = state.tanks > 0 ? Math.min(tankCap(state), total - water) : 0
  return { ...state, water, tank }
}

// ── 시간 ───────────────────────────────────────────────

function growPlant(p: Plant, ms: number): Plant {
  let { stage, progress } = p
  let left = ms
  while (left > 0 && stage < MAX_STAGE) {
    const need = GROW_MS[stage] - progress
    if (left >= need) {
      left -= need
      stage += 1
      progress = 0
    } else {
      progress += left
      left = 0
    }
  }
  return { ...p, stage, progress }
}

/** 이 돈이 5만 원이 될 때까지 남은 시간(ms). */
function msToFull(p: Plant): number {
  let ms = -p.progress
  for (let s = p.stage; s < MAX_STAGE; s++) ms += GROW_MS[s]
  return Math.max(0, ms)
}

const msToFinish = (plot: Plot) =>
  Math.max(...plot.slots.map((p) => (p && p.stage < MAX_STAGE ? msToFull(p) : 0)))

/**
 * ms만큼 돈을 키운다.
 * 돈은 물이 남아 있는 동안에만 자란다. 물은 자라는 돈이 있는 화분·텃밭 수만큼 빨리 줄어들고,
 * 어느 한 곳이 다 자라면 그만큼 느려지므로 속도가 바뀌는 지점마다 구간을 나눠 계산한다.
 */
function growBy(state: GameState, ms: number): GameState {
  let time = ms
  let supply = state.water + state.tank
  let plots = state.plots

  for (let guard = 0; guard < 64 && time > 0 && supply > 0; guard++) {
    const growing = plots.filter(isGrowing)
    const thirst = growing.reduce((sum, plot) => sum + PLOTS[plot.kind].thirst, 0)
    if (thirst === 0) break

    const untilDry = supply / thirst
    const step = Math.min(time, untilDry, ...growing.map(msToFinish))
    if (step <= 0) break

    plots = plots.map((plot) =>
      isGrowing(plot) ? { ...plot, slots: plot.slots.map((p) => p && growPlant(p, step)) } : plot,
    )
    supply = step >= untilDry ? 0 : supply - step * thirst
    time -= step
  }

  return settleWater({ ...state, plots }, supply)
}

/** 다 자란 돈이 얼마나 기다렸는지 센다. */
function ripen(state: GameState, ms: number): GameState {
  if (!state.plots.some(hasGrown)) return state
  const plots = state.plots.map((plot) =>
    hasGrown(plot)
      ? {
          ...plot,
          slots: plot.slots.map((p) => (p?.stage === MAX_STAGE ? { ...p, ripe: (p.ripe ?? 0) + ms } : p)),
        }
      : plot,
  )
  return { ...state, plots }
}

/** 일꾼이 뽑아도 되는 돈: 5만 원이 되고 잠깐 지난 것만. */
const readyForWorker = (p: Plant | null) =>
  p?.stage === MAX_STAGE && (p.ripe ?? 0) >= WORKER_WAITS_MS

/** 일꾼 한 명이 한 번에 하는 일 한 가지. 물 → 뽑기 → 심기 순서로 급한 것부터. */
function workOnce(state: GameState): GameState {
  if (state.water < waterCap(state) * WORKER_WATERS_BELOW) {
    return state.tanks > 0 && state.tank < 1 ? refillTank(state) : water(state)
  }
  for (let i = 0; i < state.plots.length; i++) {
    const slot = state.plots[i].slots.findIndex(readyForWorker)
    if (slot >= 0) return harvest(state, i, slot)
  }
  const empty = state.plots.findIndex((_, i) => canPlant(state, i))
  return empty >= 0 ? plant(state, empty) : state
}

function payday(s: GameState): GameState {
  const due = SALARY * s.workers
  const paid = s.vault >= due
  return { ...s, payClock: 0, vault: paid ? s.vault - due : s.vault, unpaid: !paid }
}

/**
 * 일꾼의 일을 하나하나 따라가며 ms만큼 진행한다. 일과 월급날 사이사이를 끊어서 계산하므로 정확하지만,
 * 긴 시간에 쓰면 느리다. maxSteps를 넘는 시간은 돈만 자란다.
 */
export function stepExactly(state: GameState, ms: number, maxSteps = 6000): GameState {
  let s = state
  let left = ms

  for (let step = 0; s.workers > 0 && left > 0 && step < maxSteps; step++) {
    const every = WORK_MS / s.workers
    const toWork = s.unpaid ? Infinity : Math.max(0, every - s.workClock)
    const toPay = Math.max(0, PAY_MS - s.payClock)
    const dt = Math.min(left, toWork, toPay)

    s = ripen(s, dt) // 이번 구간에 막 다 자란 돈은 다음 구간부터 센다.
    s = growBy(s, dt)
    s = { ...s, workClock: s.unpaid ? 0 : s.workClock + dt, payClock: s.payClock + dt }
    left -= dt

    if (s.payClock >= PAY_MS) s = payday(s)
    if (!s.unpaid && s.workClock >= every) s = { ...workOnce(s), workClock: 0 }
  }

  return left > 0 ? growBy(s, left) : s
}

/** 100원이 5만 원이 될 때까지 걸리는 시간 */
const FULL_GROW_MS = GROW_MS.reduce((sum, ms) => sum + ms, 0)

/**
 * 일꾼이 일하는 ms 동안 번 돈을 식으로 한 번에 계산한다.
 *
 * 일꾼은 다 자란 돈이 있으면 뽑기부터 하므로, 오래 두면 '전부 심기 → 자라기 → 전부 뽑기'가
 * 한 덩어리로 되풀이된다. 자리가 N개, 일 한 번에 e(ms)가 걸리면 한 바퀴는
 *   N×e(전부 심기 또는 뽑기) + max(자라는 시간, N×e)
 * 이고, 한 바퀴마다 N개를 거둔다. 일꾼이 넉넉하면 자라는 시간이, 모자라면 일꾼의 손이 속도를 정한다.
 * 화분에 꽂힌 돈과 물은 건드리지 않는다(일꾼이 물을 챙기는 것으로 본다).
 */
function workInBulk(s: GameState, ms: number, carry: number): { state: GameState; carry: number } {
  const slots = s.plots.reduce((n, plot) => n + plot.slots.length, 0)
  const planted = s.plots.some((plot) => plot.slots.some(Boolean))
  if (!planted && s.vault < SEED_COST) return { state: s, carry } // 심을 돈조차 없으면 할 일이 없다.

  const every = WORK_MS / s.workers
  const sweep = slots * every
  const lap = sweep + Math.max(FULL_GROW_MS + WORKER_WAITS_MS, sweep)
  const working = ms * (1 - every / WATER_PER_TAP) // 1분에 한 번쯤은 물 주는 데 쓴다.
  // 소수로 남는 바퀴는 다음 구간으로 넘긴다(carry).
  const exact = carry + (slots * working) / lap
  const cycles = Math.floor(exact)

  return {
    state: {
      ...s,
      vault: s.vault + cycles * (DENOMS[MAX_STAGE] - SEED_COST),
      harvests: s.harvests + cycles,
    },
    carry: exact - cycles,
  }
}

/** 긴 시간을 월급날 단위로 끊어 한 번에 계산한다. 8시간이어도 100번 안쪽으로 끝난다. */
function awayInBulk(state: GameState, ms: number): GameState {
  let s = state
  let left = ms
  let carry = 0
  while (left > 0) {
    const part = Math.min(left, Math.max(0, PAY_MS - s.payClock))
    if (s.unpaid) {
      s = growBy(s, part) // 월급을 못 받은 달에는 돈만 자란다.
    } else {
      const worked = workInBulk(s, part, carry)
      s = worked.state
      carry = worked.carry
    }
    s = { ...s, payClock: s.payClock + part }
    left -= part
    if (s.payClock >= PAY_MS) s = payday(s)
  }
  return s
}

/**
 * now 시각까지 흐른 시간을 반영한다. 자리를 비운 시간은 OFFLINE_MAX_MS까지만 쳐 준다.
 * - 일꾼이 없으면 growBy 한 번으로 끝난다.
 * - 일꾼이 있고 비운 시간이 길면, 앞부분은 식으로 한 번에 계산하고(awayInBulk)
 *   마지막 EXACT_TAIL_MS만 하나하나 따라가서(stepExactly) 화분의 모습을 맞춘다.
 */
export function advance(state: GameState, now: number): GameState {
  let left = Math.min(Math.max(0, now - state.lastSeen), OFFLINE_MAX_MS)
  let s: GameState = { ...state, lastSeen: now }
  if (s.workers === 0) return growBy(s, left)

  if (left > EXACT_TAIL_MS) {
    s = awayInBulk(s, left - EXACT_TAIL_MS)
    left = EXACT_TAIL_MS
  }
  return stepExactly(s, left)
}

// ── 심기 · 물 주기 · 뽑기 ─────────────────────────────────

export const plantCount = (plot: Plot) => plot.slots.filter(Boolean).length

export function canPlant(state: GameState, index: number): boolean {
  const plot = state.plots[index]
  return !!plot && plantCount(plot) < plot.slots.length && state.vault >= SEED_COST
}

function withSlots(state: GameState, index: number, slots: (Plant | null)[]): Plot[] {
  return state.plots.map((plot, i) => (i === index ? { ...plot, slots } : plot))
}

export function plant(state: GameState, index: number): GameState {
  if (!canPlant(state, index)) return state
  const plot = state.plots[index]
  const slot = PLANT_ORDER[plot.kind].find((i) => !plot.slots[i])
  if (slot === undefined) return state
  const slots = [...plot.slots]
  slots[slot] = { id: state.nextId, stage: 0, progress: 0 }
  return {
    ...state,
    vault: state.vault - SEED_COST,
    plots: withSlots(state, index, slots),
    nextId: state.nextId + 1,
  }
}

/** 빈자리를 돈이 되는 만큼 모두 채운다. 농장처럼 자리가 많은 곳에서 쓴다. */
export function plantAll(state: GameState, index: number): GameState {
  let s = state
  while (canPlant(s, index)) s = plant(s, index)
  return s
}

/** 한 번 주면 가진 화분·텃밭 모두에 1분치씩 들어간다. */
export function water(state: GameState): GameState {
  const added = WATER_PER_TAP * totalThirst(state)
  return { ...state, water: Math.min(waterCap(state), state.water + added) }
}

export function harvest(state: GameState, index: number, slot: number): GameState {
  const plot = state.plots[index]
  const p = plot?.slots[slot]
  if (!p) return state
  const slots = [...plot.slots]
  slots[slot] = null
  return {
    ...state,
    vault: state.vault + DENOMS[p.stage],
    plots: withSlots(state, index, slots),
    harvests: state.harvests + 1,
  }
}

// ── 상점 ───────────────────────────────────────────────

export const countOf = (state: GameState, kind: PlotKind) =>
  state.plots.filter((plot) => plot.kind === kind).length

/** 살 때마다 PRICE_GROWTH배씩 오르는 값. 앞 두 자리만 남겨 깔끔하게 만든다. */
function risingPrice(base: number, bought: number): number {
  const raw = base * PRICE_GROWTH ** bought
  const unit = 10 ** (Math.floor(Math.log10(raw)) - 1)
  return Math.round(raw / unit) * unit
}

/** 다음에 살 화분·텃밭·농장의 값. 화분은 하나를 갖고 시작하므로 그만큼 빼고 센다. */
export function plotPrice(state: GameState, kind: PlotKind): number {
  const bought = countOf(state, kind) - (kind === 'pot' ? 1 : 0)
  return risingPrice(PLOTS[kind].price, Math.max(0, bought))
}

export function buyPlot(state: GameState, kind: PlotKind): GameState {
  const price = plotPrice(state, kind)
  if (state.vault < price) return state
  return { ...state, vault: state.vault - price, plots: [...state.plots, emptyPlot(kind)] }
}

export const tankPrice = (state: GameState) => risingPrice(TANK_PRICE, state.tanks)

/** 새 물탱크는 가득 찬 채로 온다. */
export function buyTank(state: GameState): GameState {
  const price = tankPrice(state)
  if (state.vault < price) return state
  const next = { ...state, vault: state.vault - price, tanks: state.tanks + 1 }
  return settleWater(next, state.water + state.tank + TANK_MAX)
}

/** 일꾼을 고용한다. 첫 월급을 먼저 준다. */
export function hire(state: GameState): GameState {
  if (state.vault < SALARY) return state
  return {
    ...state,
    vault: state.vault - SALARY,
    workers: state.workers + 1,
    // 첫 일꾼이면 월급날을 오늘부터 센다.
    payClock: state.workers === 0 ? 0 : state.payClock,
    workClock: state.workers === 0 ? 0 : state.workClock,
  }
}

/** 일꾼 한 명을 내보낸다. */
export function dismiss(state: GameState): GameState {
  if (state.workers === 0) return state
  const workers = state.workers - 1
  return { ...state, workers, unpaid: workers > 0 && state.unpaid }
}

export function refillTank(state: GameState): GameState {
  if (state.tanks === 0) return state
  return settleWater(state, waterCap(state) + tankCap(state))
}

// ── 목표 ───────────────────────────────────────────────

export const reachedGoal = (state: GameState) => state.goalAt === null && state.vault >= GOAL

/** 1억을 처음 넘긴 순간을 적어 둔다. */
export function markGoal(state: GameState, now: number): GameState {
  return reachedGoal(state) ? { ...state, goalAt: now } : state
}

// ── 화면에 보여 줄 값 ─────────────────────────────────────

/** 이곳에서 가장 빨리 다음 단계가 되는 시간(ms). 자라는 돈이 없으면 null. */
export function msToNextGrowth(plot: Plot): number | null {
  const waits = plot.slots
    .filter((p): p is Plant => !!p && p.stage < MAX_STAGE)
    .map((p) => GROW_MS[p.stage] - p.progress)
  return waits.length ? Math.min(...waits) : null
}

export const hasGrown = (plot: Plot) => plot.slots.some((p) => p?.stage === MAX_STAGE)

// ── 저장된 값 읽기 ───────────────────────────────────────

function isPlant(v: unknown): v is Plant {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    typeof p.id === 'number' &&
    typeof p.stage === 'number' &&
    p.stage >= 0 &&
    p.stage <= MAX_STAGE &&
    typeof p.progress === 'number' &&
    (p.ripe === undefined || typeof p.ripe === 'number')
  )
}

function isPlot(v: unknown): v is Plot {
  if (typeof v !== 'object' || v === null) return false
  const plot = v as Record<string, unknown>
  const kind = plot.kind
  return (
    (kind === 'pot' || kind === 'bed' || kind === 'farm') &&
    Array.isArray(plot.slots) &&
    plot.slots.length === PLOTS[kind].slots &&
    plot.slots.every((p) => p === null || isPlant(p))
  )
}

export function isGameState(v: unknown): v is GameState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.vault === 'number' &&
    typeof s.water === 'number' &&
    typeof s.tanks === 'number' &&
    typeof s.tank === 'number' &&
    typeof s.workers === 'number' &&
    typeof s.workClock === 'number' &&
    typeof s.payClock === 'number' &&
    typeof s.unpaid === 'boolean' &&
    typeof s.lastSeen === 'number' &&
    typeof s.harvests === 'number' &&
    typeof s.nextId === 'number' &&
    typeof s.startedAt === 'number' &&
    (s.goalAt === null || typeof s.goalAt === 'number') &&
    s.money === DENOMS.length &&
    Array.isArray(s.plots) &&
    s.plots.length >= 1 &&
    s.plots.every(isPlot)
  )
}

/**
 * 저장된 값을 지금 형식으로 읽는다. 이전 형식도 받아 준다.
 * - 화분이 하나뿐이던 때: plants, tank(없으면 null)
 * - 화분만 여러 개이던 때: pots, tank(없으면 null)
 * - 일꾼이 없던 때: workers 등이 없음
 * - 엔딩이 없던 때: startedAt, goalAt이 없음
 * - 만 원권이 없던 때(money 없음): 단계가 5개라 4번째 단계가 5만 원이었다
 */
export function restore(v: unknown): GameState | null {
  if (isGameState(v)) return v
  if (typeof v !== 'object' || v === null) return null
  const raw = v as Record<string, unknown>
  let upgraded: Record<string, unknown> = {
    workers: 0,
    workClock: 0,
    payClock: 0,
    unpaid: false,
    // 시작 시각을 적기 전의 저장본은 마지막으로 본 시각부터 센다.
    startedAt: typeof raw.lastSeen === 'number' ? raw.lastSeen : 0,
    goalAt: null,
    ...raw,
  }

  if (!Array.isArray(raw.plots)) {
    const oldPots = Array.isArray(raw.pots) ? raw.pots : [raw.plants]
    upgraded = {
      ...upgraded,
      plots: oldPots.map((slots) => ({ kind: 'pot', slots })),
      tanks: typeof raw.tank === 'number' ? 1 : 0,
      tank: typeof raw.tank === 'number' ? raw.tank : 0,
    }
  }
  if (upgraded.money !== DENOMS.length) {
    upgraded = { ...upgraded, plots: addTenThousand(upgraded.plots), money: DENOMS.length }
  }
  return isGameState(upgraded) ? upgraded : null
}

/**
 * 만 원권이 생기기 전 저장본을 옮긴다. 5만 원(옛 4단계)은 새 5단계로 올리고,
 * 나머지는 단계를 그대로 두되 새 성장 시간을 넘지 않게 자른다.
 */
function addTenThousand(plots: unknown): unknown {
  if (!Array.isArray(plots)) return plots
  return plots.map((plot) => {
    if (typeof plot !== 'object' || plot === null || !Array.isArray(plot.slots)) return plot
    const slots = plot.slots.map((p: unknown) => {
      if (!isPlant(p)) return p
      if (p.stage >= 4) return { ...p, stage: MAX_STAGE, progress: 0 }
      return { ...p, progress: Math.min(p.progress, GROW_MS[p.stage] - 1) }
    })
    return { ...plot, slots }
  })
}
