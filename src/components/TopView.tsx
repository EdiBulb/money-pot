import { DENOMS, GROW_MS, MAX_STAGE } from '../game/config'
import type { Plant, Plot } from '../game/engine'

// 위에서 내려다본 모습. 지폐는 돌돌 말려 꽂혀 있고, 동전은 세워져 있어 옆면만 보인다.
// 둘레의 고리는 다음 단계까지 자란 정도다. 뽑는 건 옆에서 볼 때만 한다.

const ROLL: Record<number, { light: string; base: string; dark: string }> = {
  1000: { light: '#cfe1f3', base: '#86add9', dark: '#2c5a92' },
  5000: { light: '#f5dcc6', base: '#dd9f72', dark: '#8c4721' },
  50000: { light: '#fbecb4', base: '#efc95c', dark: '#86600c' },
}

const SHORT: Record<number, string> = { 100: '100', 500: '500', 1000: '1천', 5000: '5천', 50000: '5만' }

/** 종이가 말린 모양의 나선 */
function spiral(turns: number, maxR: number): string {
  const steps = Math.round(turns * 24)
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = t * turns * Math.PI * 2
    const r = 1.5 + (maxR - 1.5) * t
    d += `${i === 0 ? 'M' : 'L'}${(Math.cos(angle) * r).toFixed(2)} ${(Math.sin(angle) * r).toFixed(2)} `
  }
  return d
}

function Roll({ plant, x, y }: { plant: Plant; x: number; y: number }) {
  const value = DENOMS[plant.stage]
  const growth = plant.stage < MAX_STAGE ? plant.progress / GROW_MS[plant.stage] : 1
  const ring = 2 * Math.PI * 19
  const look = ROLL[value]

  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="19" fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="3" />
      <circle
        r="19"
        fill="none"
        stroke={plant.stage === MAX_STAGE ? 'var(--gold)' : 'var(--leaf)'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${ring * growth} ${ring}`}
        transform="rotate(-90)"
      />
      {look ? (
        <>
          <circle r={11 + plant.stage} fill={look.light} stroke={look.dark} strokeWidth="1.5" />
          <path d={spiral(2 + plant.stage * 0.5, 9 + plant.stage)} fill="none" stroke={look.base} strokeWidth="2.4" />
          <path d={spiral(2 + plant.stage * 0.5, 9 + plant.stage)} fill="none" stroke={look.dark} strokeWidth="0.8" />
        </>
      ) : (
        <rect
          x={value === 100 ? -11 : -14}
          y="-3.5"
          width={value === 100 ? 22 : 28}
          height="7"
          rx="3.5"
          fill="#d5d9dc"
          stroke="#767d81"
          strokeWidth="1.2"
        />
      )}
      <text y="34" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily="var(--font-body)">
        {SHORT[value]}
      </text>
    </g>
  )
}

const POT_SPOTS = [
  [48, 128],
  [84, 112],
  [120, 104],
  [156, 112],
  [192, 128],
]

const BED_SPOTS = [
  ...[-116, -58, 0, 58, 116].map((x) => [170 + x, 62]),
  ...[-87, -29, 29, 87].map((x) => [170 + x, 126]),
]

export function TopView({ plot, wet }: { plot: Plot; wet: number }) {
  const bed = plot.kind === 'bed'
  const spots = bed ? BED_SPOTS : POT_SPOTS

  return (
    <div className={`top top-${plot.kind}`}>
      <svg viewBox={bed ? '0 0 340 190' : '0 0 240 240'} role="img" aria-label="위에서 본 모습">
        {bed ? (
          <>
            <rect x="4" y="4" width="332" height="182" rx="8" fill="var(--wood)" />
            <rect x="4" y="4" width="332" height="182" rx="8" fill="none" stroke="var(--wood-dark)" strokeWidth="3" />
            <rect x="18" y="18" width="304" height="154" rx="4" fill="var(--soil-dry)" />
            <rect x="18" y="18" width="304" height="154" rx="4" fill="var(--soil-wet)" opacity={wet} />
          </>
        ) : (
          <>
            <circle cx="120" cy="120" r="116" fill="var(--pot)" />
            <circle cx="120" cy="120" r="116" fill="none" stroke="var(--pot-light)" strokeWidth="3" />
            <circle cx="120" cy="120" r="102" fill="var(--pot-dark)" />
            <circle cx="120" cy="120" r="96" fill="var(--soil-dry)" />
            <circle cx="120" cy="120" r="96" fill="var(--soil-wet)" opacity={wet} />
          </>
        )}
        {plot.slots.map((p, i) => p && <Roll key={p.id} plant={p} x={spots[i][0]} y={spots[i][1]} />)}
      </svg>
      <p className="top-note">위로 밀면 옆에서 봐요</p>
    </div>
  )
}
