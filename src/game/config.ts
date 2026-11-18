/** 돈이 자라는 단계. 심는 순간 100원이고 끝까지 키우면 5만 원이 된다. */
export const DENOMS = [100, 500, 1000, 5000, 10000, 50000] as const

/** 각 단계에서 다음 단계로 자라는 데 걸리는 시간(ms). 다 자라는 데 2분. */
export const GROW_MS = [10_000, 15_000, 20_000, 30_000, 45_000] as const

export const MAX_STAGE = DENOMS.length - 1

/**
 * 심는 곳의 종류. 개수 제한 없이 살 수 있고, 살 때마다 값이 PRICE_GROWTH배씩 오른다.
 * - slots: 심을 수 있는 개수
 * - thirst: 물을 쓰는 속도(화분 하나 = 1)
 * - price: 상점에서 처음 살 때의 값
 */
export const PLOTS = {
  pot: { name: '화분', slots: 5, thirst: 1, price: 50_000 },
  bed: { name: '텃밭', slots: 9, thirst: 2, price: 300_000 },
  farm: { name: '농장', slots: 100, thirst: 10, price: 5_000_000 },
} as const

export type PlotKind = keyof typeof PLOTS

export const PRICE_GROWTH = 2.5

/**
 * 물은 '화분 하나가 버티는 시간(ms)'으로 센다.
 * 흙은 화분 하나당 4분치를 머금고, 한 번 주면 1분치가 찬다. 텃밭은 화분 2개, 농장은 10개 몫이다.
 */
export const WATER_MAX = 240_000
export const WATER_PER_TAP = 60_000

/** 물탱크 하나는 화분 하나를 30분 동안 책임진다. 화분이 둘이면 15분. */
export const TANK_MAX = 1_800_000
export const TANK_PRICE = 20_000

/**
 * 일꾼: 다 자란 돈을 뽑고, 빈자리에 심고, 흙이 마르면 물을 준다.
 * 한 명이 WORK_MS마다 한 가지 일을 하고, PAY_MS(게임 속 한 달)마다 월급을 받는다.
 * 월급을 못 받으면 받을 때까지 쉰다.
 */
export const WORK_MS = 2_000
export const PAY_MS = 300_000
export const SALARY = 100_000
/** 일꾼은 5만 원이 된 뒤 이만큼 지난 돈만 뽑는다. 다 자란 모습이 화면에 보일 틈을 준다. */
export const WORKER_WAITS_MS = 1_500
/** 흙의 물이 이 비율 아래로 떨어지면 일꾼이 물을 준다. */
export const WORKER_WATERS_BELOW = 0.25

/** 자리를 비운 동안 쳐 주는 시간의 상한. 하루 일하는 시간만큼인 8시간. */
export const OFFLINE_MAX_MS = 8 * 60 * 60 * 1000
/**
 * 자리를 비운 시간 중 마지막 이만큼만 일꾼의 일을 하나하나 따라가고,
 * 그 앞은 '몇 바퀴 돌았나'를 식으로 한 번에 계산한다.
 */
export const EXACT_TAIL_MS = 4 * 60 * 1000

export const SEED_COST = 100
export const START_VAULT = 100
export const GOAL = 100_000_000

/** 이만큼 위로 끌어올린 뒤 놓으면 뽑힌다(px, 손가락 이동 거리 기준). */
export const PULL_THRESHOLD = 90
/** 이만큼 옆으로 밀면 다음 화분으로 넘어간다(px). */
export const SWIPE_THRESHOLD = 45
