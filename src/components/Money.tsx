import { art, type ArtName } from '../art'
import { DENOMS } from '../game/config'

// 임시 그래픽: 실제 돈의 색감과 느낌만 따온 SVG. 나중에 AI로 만든 이미지로 교체한다.

interface BillLook {
  base: string
  light: string
  dark: string
  width: number
}

const BILLS: Record<number, BillLook> = {
  1000: { base: '#86add9', light: '#cfe1f3', dark: '#2c5a92', width: 64 },
  5000: { base: '#dd9f72', light: '#f5dcc6', dark: '#8c4721', width: 68 },
  10000: { base: '#8ec79b', light: '#d6eedb', dark: '#2d6b45', width: 71 },
  50000: { base: '#efc95c', light: '#fbecb4', dark: '#86600c', width: 76 },
}

function Coin({ value }: { value: number }) {
  const size = value === 100 ? 58 : 74
  const id = `coin-${value}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${value}원 동전`}>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#d5d9dc" />
          <stop offset="1" stopColor="#8d9498" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${id})`} stroke="#767d81" strokeWidth="2" />
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke="#7f878b"
        strokeWidth={value === 500 ? 3 : 1.5}
        strokeDasharray={value === 500 ? '2 3' : undefined}
      />
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="30"
        fill="#565d61"
      >
        {value}
      </text>
    </svg>
  )
}

function Bill({ value }: { value: number }) {
  const look = BILLS[value]
  const id = `bill-${value}`
  const lines = [0, 1, 2, 3, 4, 5, 6]
  return (
    <svg
      width={look.width}
      height={look.width * 2}
      viewBox="0 0 80 160"
      role="img"
      aria-label={`${value.toLocaleString('ko-KR')}원 지폐`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={look.light} />
          <stop offset="0.5" stopColor={look.base} />
          <stop offset="1" stopColor={look.light} />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="78" height="158" rx="4" fill={`url(#${id})`} stroke={look.dark} strokeWidth="1.5" />
      <rect x="6" y="6" width="68" height="148" rx="2" fill="none" stroke={look.dark} strokeWidth="0.8" opacity="0.6" />
      {lines.map((i) => (
        <path
          key={i}
          d={`M6 ${92 + i * 7} q17 -8 34 0 t34 0`}
          fill="none"
          stroke={look.dark}
          strokeWidth="0.7"
          opacity="0.35"
        />
      ))}
      <ellipse cx="40" cy="62" rx="20" ry="25" fill={look.light} stroke={look.dark} strokeWidth="1" opacity="0.85" />
      <text
        x="40"
        y="69"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="18"
        fill={look.dark}
        opacity="0.75"
      >
        원
      </text>
      <text x="40" y="27" textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" fill={look.dark}>
        {value}
      </text>
    </svg>
  )
}

/**
 * fluid: 부모 너비에 맞춰 그린다(화분·밭 위에 꽂을 때). 동전은 지폐보다 작게 보이도록 부모 너비의 일부만 쓴다.
 */
export function Money({ stage, fluid = false }: { stage: number; fluid?: boolean }) {
  const value = DENOMS[stage]
  const image = art(`money-${value}` as ArtName)
  const coin = value <= 500
  const fluidWidth = coin ? (value === 100 ? '82%' : '96%') : '100%'

  if (image) {
    const width = coin ? (value === 100 ? 58 : 74) : BILLS[value].width
    return (
      <img
        src={image}
        width={fluid ? undefined : width}
        alt={`${value.toLocaleString('ko-KR')}원`}
        draggable={false}
        style={{ display: 'block', width: fluid ? fluidWidth : width, height: 'auto', margin: '0 auto' }}
      />
    )
  }
  const drawn = coin ? <Coin value={value} /> : <Bill value={value} />
  return fluid ? (
    <span className="money-fluid" style={{ width: fluidWidth }}>
      {drawn}
    </span>
  ) : (
    drawn
  )
}
