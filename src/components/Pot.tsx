// 화분과 텃밭은 여러 겹으로 그린다. 뒤(흙) → 돈 → 앞(몸통과 흙무더기) 순서로 겹쳐서
// 돈이 흙에 꽂혀 있는 것처럼 보이게 한다. wet: 0(마름) ~ 1(촉촉함)

interface Wet {
  wet: number
}

export function PotBack({ wet }: Wet) {
  return (
    <svg className="art art-back" viewBox="0 0 200 170" aria-hidden="true">
      <ellipse cx="100" cy="160" rx="84" ry="9" fill="var(--pot-dark)" />
      <ellipse cx="100" cy="34" rx="92" ry="18" fill="var(--pot-dark)" />
      <ellipse cx="100" cy="37" rx="82" ry="13" fill="var(--soil-dry)" />
      <ellipse cx="100" cy="37" rx="82" ry="13" fill="var(--soil-wet)" opacity={wet} />
    </svg>
  )
}

export function PotFront({ wet }: Wet) {
  return (
    <svg className="art art-front" viewBox="0 0 200 170" aria-hidden="true">
      <ellipse cx="100" cy="42" rx="76" ry="9" fill="var(--soil-dry)" />
      <ellipse cx="100" cy="42" rx="76" ry="9" fill="var(--soil-wet)" opacity={wet} />
      <path d="M20 48 L180 48 L165 150 Q100 166 35 150 Z" fill="var(--pot)" />
      <path d="M150 52 L176 52 L163 148 Q150 152 140 154 Z" fill="var(--pot-dark)" opacity="0.45" />
      <path d="M8 34 A92 18 0 0 0 192 34 L192 50 A92 18 0 0 1 8 50 Z" fill="var(--pot)" />
      <path d="M8 34 A92 18 0 0 0 192 34" fill="none" stroke="var(--pot-light)" strokeWidth="2.5" />
      <path d="M8 50 A92 18 0 0 0 192 50" fill="none" stroke="var(--pot-dark)" strokeWidth="2" opacity="0.6" />
    </svg>
  )
}

/** 텃밭: 나무 상자. 뒷줄과 앞줄 두 줄로 심는다. */
export function BedBack({ wet }: Wet) {
  return (
    <svg className="art art-back" viewBox="0 0 340 150" aria-hidden="true">
      <rect x="6" y="10" width="328" height="30" rx="4" fill="var(--wood-dark)" />
      <rect x="14" y="20" width="312" height="56" fill="var(--soil-dry)" />
      <rect x="14" y="20" width="312" height="56" fill="var(--soil-wet)" opacity={wet} />
    </svg>
  )
}

/** 뒷줄 돈의 밑동을 덮는 흙. 뒷줄과 앞줄 사이에 놓인다. */
export function BedMid({ wet }: Wet) {
  return (
    <svg className="art art-mid" viewBox="0 0 340 150" aria-hidden="true">
      <rect x="16" y="36" width="308" height="14" rx="7" fill="var(--soil-dry)" />
      <rect x="16" y="36" width="308" height="14" rx="7" fill="var(--soil-wet)" opacity={wet} />
    </svg>
  )
}

export function BedFront({ wet }: Wet) {
  return (
    <svg className="art art-front" viewBox="0 0 340 150" aria-hidden="true">
      <rect x="14" y="56" width="312" height="18" fill="var(--soil-dry)" />
      <rect x="14" y="56" width="312" height="18" fill="var(--soil-wet)" opacity={wet} />
      <rect x="4" y="66" width="332" height="74" rx="5" fill="var(--wood)" />
      <rect x="4" y="66" width="332" height="8" rx="4" fill="var(--wood-light)" />
      <path d="M4 102 H336" stroke="var(--wood-dark)" strokeWidth="2" opacity="0.55" />
      <path d="M90 76 V100 M200 76 V100 M150 104 V138 M270 104 V138" stroke="var(--wood-dark)" strokeWidth="2" opacity="0.4" />
      <rect x="18" y="138" width="22" height="10" fill="var(--wood-dark)" />
      <rect x="300" y="138" width="22" height="10" fill="var(--wood-dark)" />
    </svg>
  )
}

export function Leaves({ stage }: { stage: number }) {
  const scale = 0.5 + stage * 0.1
  return (
    <svg
      className="leaves"
      width="120"
      height="46"
      viewBox="0 0 120 46"
      style={{ transform: `translateX(-50%) scale(${scale})` }}
      aria-hidden="true"
    >
      <path d="M60 46 C40 44 14 34 6 10 C34 8 54 24 60 46 Z" fill="var(--leaf)" />
      <path d="M60 46 C80 44 106 34 114 10 C86 8 66 24 60 46 Z" fill="var(--leaf-deep)" />
    </svg>
  )
}

/** 물탱크. level: 0 ~ 1 */
export function TankArt({ level }: { level: number }) {
  const top = 22
  const height = 76
  const fill = height * level
  return (
    <svg width="54" height="88" viewBox="0 0 64 104" aria-hidden="true">
      <rect x="24" y="2" width="16" height="10" rx="2" fill="var(--sash-deep)" />
      <rect x="4" y="10" width="56" height="92" rx="10" fill="#e8f1f6" stroke="var(--water-deep)" strokeWidth="3" />
      <rect x="9" y={top + height - fill} width="46" height={fill} rx="5" fill="var(--water)" opacity="0.85" />
      <path d="M12 40 H20 M12 60 H20 M12 80 H20" stroke="var(--water-deep)" strokeWidth="2" opacity="0.5" />
    </svg>
  )
}

/** 상점에 쓰는 작은 그림 */
export function PotIcon() {
  return (
    <svg width="60" height="51" viewBox="0 0 200 170" aria-hidden="true">
      <ellipse cx="100" cy="34" rx="92" ry="18" fill="var(--pot-dark)" />
      <ellipse cx="100" cy="37" rx="82" ry="13" fill="var(--soil-wet)" />
      <path d="M20 48 L180 48 L165 150 Q100 166 35 150 Z" fill="var(--pot)" />
      <path d="M8 34 A92 18 0 0 0 192 34 L192 50 A92 18 0 0 1 8 50 Z" fill="var(--pot)" />
    </svg>
  )
}

export function BedIcon() {
  return (
    <svg width="60" height="40" viewBox="0 0 340 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="6" y="10" width="328" height="30" rx="4" fill="var(--wood-dark)" />
      <rect x="14" y="20" width="312" height="56" fill="var(--soil-wet)" />
      <rect x="4" y="66" width="332" height="74" rx="5" fill="var(--wood)" />
      <rect x="4" y="66" width="332" height="8" rx="4" fill="var(--wood-light)" />
    </svg>
  )
}

export function FarmIcon() {
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" aria-hidden="true">
      <rect x="1" y="1" width="54" height="42" rx="4" fill="var(--wood)" stroke="var(--wood-dark)" strokeWidth="2" />
      <rect x="6" y="6" width="44" height="32" fill="var(--soil-wet)" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3, 4, 5].map((c) => (
          <rect key={`${r}-${c}`} x={9 + c * 7} y={9 + r * 7} width="4" height="5" rx="1" fill="var(--gold)" />
        )),
      )}
    </svg>
  )
}

export function WorkerIcon() {
  return (
    <svg width="48" height="56" viewBox="0 0 48 56" aria-hidden="true">
      <path d="M6 20 Q24 -2 42 20 Z" fill="#e2c26a" stroke="var(--wood-dark)" strokeWidth="2" />
      <circle cx="24" cy="24" r="9" fill="#f1cfa5" />
      <path d="M8 56 Q8 36 24 36 Q40 36 40 56 Z" fill="var(--safe)" />
    </svg>
  )
}
