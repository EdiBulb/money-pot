import type { CSSProperties } from 'react'
import { art } from '../art'
import { PLOTS, type PlotKind } from '../game/config'

// 화분·텃밭·농장 사진 위에서 돈을 꽂을 자리.
// 모든 좌표는 사진 크기에 대한 비율(0~1)이다. 사진을 바꾸면 이 숫자도 다시 재야 한다.

/** 돈 하나가 흙에 꽂히는 점. scale은 원근(뒤쪽일수록 작게). */
export interface Spot {
  x: number
  y: number
  scale: number
}

/** 사진 속 흙이 드러난 부분. 마른 흙을 덧칠할 때 쓴다. */
type Soil =
  | { shape: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { shape: 'quad'; points: [number, number][] }

export interface Geometry {
  src: string | undefined
  /** 사진의 가로 / 세로 */
  aspect: number
  soil: Soil
  spots: Spot[]
  /** 맨 앞줄 돈의 너비(사진 너비에 대한 비율) */
  money: number
}

/** 농장 사진에서 흙의 네 모서리: 뒤 왼쪽, 뒤 오른쪽, 앞 오른쪽, 앞 왼쪽 */
const FIELD: [number, number][] = [
  [0.17, 0.06],
  [0.885, 0.06],
  [0.93, 0.83],
  [0.07, 0.83],
]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * 사다리꼴 흙 위에 rows × cols 자리를 원근에 맞춰 놓는다.
 * inset은 가장자리에서 띄울 비율. 앞줄은 크게, 뒷줄은 작게.
 */
function grid(rows: number, cols: number, inset: number, back = 0.8): Spot[] {
  const [tl, tr, br, bl] = FIELD
  const spots: Spot[] = []
  for (let r = 0; r < rows; r++) {
    // 돈은 밑동이 흙에 박히므로 줄을 조금 아래로 내려서 뒷줄이 나무틀에 걸리지 않게 한다.
    const t = inset + ((r + 0.7) / rows) * (1 - inset * 2)
    const y = lerp(tl[1], bl[1], t)
    const left = lerp(tl[0], bl[0], t)
    const right = lerp(tr[0], br[0], t)
    const pad = (right - left) * inset
    for (let c = 0; c < cols; c++) {
      const x = lerp(left + pad, right - pad, (c + 0.5) / cols)
      spots.push({ x, y, scale: lerp(back, 1, t) })
    }
  }
  return spots
}

const field = art('farm')

const GEOMETRY: Record<PlotKind, Geometry> = {
  // 흙은 가운데 (0.50, 0.42)를 중심으로 한 타원. 다섯 자리는 주사위 5 모양.
  pot: {
    src: art('pot'),
    aspect: 640 / 662,
    soil: { shape: 'ellipse', cx: 0.5, cy: 0.42, rx: 0.42, ry: 0.3 },
    spots: [
      { x: 0.31, y: 0.33, scale: 0.88 },
      { x: 0.69, y: 0.33, scale: 0.88 },
      { x: 0.5, y: 0.46, scale: 0.94 },
      { x: 0.3, y: 0.6, scale: 1 },
      { x: 0.7, y: 0.6, scale: 1 },
    ],
    money: 0.21,
  },
  // 텃밭 사진이 따로 없으면 농장 사진을 3 × 3으로 쓴다.
  bed: {
    src: art('bed') ?? field,
    aspect: 720 / 623,
    soil: { shape: 'quad', points: FIELD },
    spots: grid(3, 3, 0.08),
    money: 0.15,
  },
  farm: {
    src: field,
    aspect: 720 / 623,
    soil: { shape: 'quad', points: FIELD },
    spots: grid(10, 10, 0.02, 0.75),
    money: 0.055,
  },
}

// 자리 수가 게임 설정과 어긋나면 바로 알 수 있게 한다.
for (const kind of Object.keys(GEOMETRY) as PlotKind[]) {
  if (GEOMETRY[kind].spots.length !== PLOTS[kind].slots) {
    throw new Error(`${kind}: 자리 ${GEOMETRY[kind].spots.length}개, 설정은 ${PLOTS[kind].slots}개`)
  }
}

export const geometryOf = (kind: PlotKind) => GEOMETRY[kind]

/**
 * 흙이 얼마나 말라 보일지(0~1). 물이 절반 넘게 남아 있으면 촉촉하게 두고,
 * 그 아래로 내려가면 점점 말라 보이게 해서 물 줄 때가 됐다는 신호로 쓴다.
 */
export const dryness = (wet: number) => Math.max(0, Math.min(1, 1 - wet * 2))

/**
 * 흙 모양대로 자르는 CSS. 둥근 흙은 가장자리를 흐리게 풀어서 경계선이 보이지 않게 한다.
 */
export function soilClip(soil: Soil): CSSProperties {
  if (soil.shape === 'ellipse') {
    const mask = `radial-gradient(ellipse ${soil.rx * 100}% ${soil.ry * 100}% at ${soil.cx * 100}% ${soil.cy * 100}%, #000 78%, transparent 100%)`
    return { maskImage: mask, WebkitMaskImage: mask }
  }
  return { clipPath: `polygon(${soil.points.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(', ')})` }
}
