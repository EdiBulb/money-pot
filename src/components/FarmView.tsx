import { useRef, type CSSProperties, type PointerEvent } from 'react'
import { DENOMS, MAX_STAGE, SWIPE_THRESHOLD } from '../game/config'
import type { Plot } from '../game/engine'
import { Money } from './Money'
import { dryness, geometryOf, soilClip } from './plotGeometry'

// 농장은 100칸이라 돈을 하나씩 당겨 뽑지 않는다.
// 다 자란 돈(5만 원) 위를 손가락으로 훑으면 벼 베듯 거둔다.

interface Props {
  plot: Plot
  wet: number
  onHarvest: (slot: number) => void
  onSwipe: (direction: 1 | -1) => void
}

export function FarmView({ plot, wet, onHarvest, onSwipe }: Props) {
  const stroke = useRef<{ x: number; y: number; cut: boolean } | null>(null)
  const g = geometryOf('farm')

  /** 손가락 아래에 다 자란 돈이 있으면 거둔다. */
  const cutAt = (x: number, y: number) => {
    const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot]')
    if (!cell) return
    const slot = Number(cell.dataset.slot)
    if (plot.slots[slot]?.stage !== MAX_STAGE) return
    onHarvest(slot)
    if (stroke.current) stroke.current.cut = true
  }

  const onDown = (e: PointerEvent) => {
    e.stopPropagation() // 밭 위에서 시작한 손짓은 여기서 끝까지 처리한다.
    e.currentTarget.setPointerCapture(e.pointerId)
    stroke.current = { x: e.clientX, y: e.clientY, cut: false }
    cutAt(e.clientX, e.clientY)
  }

  const onMove = (e: PointerEvent) => {
    if (stroke.current) cutAt(e.clientX, e.clientY)
  }

  const onUp = (e: PointerEvent) => {
    e.stopPropagation()
    const s = stroke.current
    stroke.current = null
    if (!s || s.cut) return
    // 아무것도 거두지 않은 옆 밀기는 화면 넘기기로 본다.
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2) onSwipe(dx < 0 ? 1 : -1)
  }

  return (
    <div
      className="plot plot-farm"
      style={{ aspectRatio: g.aspect }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => (stroke.current = null)}
    >
      <img className="plot-img" src={g.src} alt="" draggable={false} />
      <div className="dry" style={{ opacity: dryness(wet) * 0.6, ...soilClip(g.soil) }} aria-hidden="true" />

      {g.spots.map((spot, i) => {
        const p = plot.slots[i]
        const style: CSSProperties = {
          left: `${spot.x * 100}%`,
          top: `${spot.y * 100}%`,
          width: `${g.money * spot.scale * 100}%`,
          zIndex: Math.round(spot.y * 100),
        }
        return (
          <div
            key={i}
            data-slot={i}
            className={`cell${p?.stage === MAX_STAGE ? ' cell-ready' : ''}`}
            style={style}
            aria-label={p ? `${DENOMS[p.stage].toLocaleString('ko-KR')}원` : '빈자리'}
          >
            {p && (
              <span key={`${p.id}-${p.stage}`} className="cell-money">
                <Money stage={p.stage} fluid />
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
