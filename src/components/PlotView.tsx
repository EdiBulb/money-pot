import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties } from 'react'
import type { Plot } from '../game/engine'
import { PlantView } from './PlantView'
import { dryness, geometryOf, soilClip } from './plotGeometry'

export interface Gain {
  id: number
  value: number
  plot: number
  slot: number
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

interface Props {
  plot: Plot
  wet: number
  gains: Gain[]
  dropKey: number
  onHarvest: (slot: number) => void
  onSwipe: (direction: 1 | -1) => void
  onGainDone: (id: number) => void
}

/** 위에서 비스듬히 내려다본 화분이나 텃밭. 돈은 흙에 꽂혀 있고, 위로 당겨서 뽑는다. */
export function PlotView({ plot, wet, gains, dropKey, onHarvest, onSwipe, onGainDone }: Props) {
  const g = geometryOf(plot.kind)

  return (
    <div className={`plot plot-${plot.kind}`} style={{ aspectRatio: g.aspect }}>
      <img className="plot-img" src={g.src} alt="" draggable={false} />
      {/* 물이 마를수록 흙이 밝고 푸석해 보이게 덧칠한다. */}
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
          <div key={i} className="spot" style={style}>
            {/* 돈이 흙에 닿는 자리의 그림자. 돈보다 먼저 그려서 뒤에 깔린다. */}
            {p && <span className={`seat${p.stage <= 1 ? ' seat-coin' : ''}`} aria-hidden="true" />}
            <AnimatePresence>
              {p && <PlantView key={p.id} plant={p} onHarvest={() => onHarvest(i)} onSwipe={onSwipe} />}
            </AnimatePresence>
          </div>
        )
      })}

      {gains.map((gain) => {
        const spot = g.spots[gain.slot]
        return (
          <motion.span
            key={gain.id}
            className="gain"
            style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
            initial={{ x: '-50%', y: '-60%', opacity: 0, scale: 0.7 }}
            animate={{ x: '-50%', y: '-260%', opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1 }}
            onAnimationComplete={() => onGainDone(gain.id)}
          >
            +{won(gain.value)}
          </motion.span>
        )
      })}

      {dropKey > 0 && (
        <div key={dropKey} className="drops" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} style={{ left: `${18 + i * 11}%`, animationDelay: `${(i * 37) % 180}ms` }} />
          ))}
        </div>
      )}
    </div>
  )
}

/** 상점에 쓰는 작은 사진 */
export function PlotIcon({ kind }: { kind: Plot['kind'] }) {
  return <img className="plot-icon" src={geometryOf(kind).src} alt="" draggable={false} />
}
