// 상점에 쓰는 작은 그림. 사진(src/art의 tank, worker)이 있으면 그쪽을 쓴다.

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

export function WorkerIcon() {
  return (
    <svg width="48" height="56" viewBox="0 0 48 56" aria-hidden="true">
      <path d="M6 20 Q24 -2 42 20 Z" fill="#e2c26a" stroke="var(--wood-dark)" strokeWidth="2" />
      <circle cx="24" cy="24" r="9" fill="#f1cfa5" />
      <path d="M8 56 Q8 36 24 36 Q40 36 40 56 Z" fill="var(--safe)" />
    </svg>
  )
}
