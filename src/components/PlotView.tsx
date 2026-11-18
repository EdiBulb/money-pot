import { AnimatePresence, motion } from 'motion/react'
import { art } from '../art'
import type { PlotKind } from '../game/config'
import type { Plot } from '../game/engine'
import { PlantView } from './PlantView'
import { BedBack, BedFront, BedMid, PotBack, PotFront } from './Pot'

export interface Gain {
  id: number
  value: number
  plot: number
  slot: number
}

interface Spot {
  /** 가운데에서 옆으로(px), 흙에서 아래로(px), 기울기(deg), 겹치는 순서 */
  x: number
  down: number
  tilt: number
  z: number
}

/** 자리 배치. 화분은 부채꼴 한 줄, 텃밭은 뒷줄 5개와 그 사이사이 앞줄 4개. */
const LAYOUT: Record<PlotKind, Spot[]> = {
  pot: [
    { x: -70, down: 0, tilt: -16, z: 2 },
    { x: -36, down: 0, tilt: -8, z: 3 },
    { x: 0, down: 0, tilt: 0, z: 4 },
    { x: 36, down: 0, tilt: 8, z: 3 },
    { x: 70, down: 0, tilt: 16, z: 2 },
  ],
  bed: [
    ...[-116, -58, 0, 58, 116].map((x) => ({ x, down: 0, tilt: 0, z: 2 })),
    ...[-87, -29, 29, 87].map((x) => ({ x, down: 20, tilt: 0, z: 4 })),
  ],
  farm: [], // 농장은 FarmView가 따로 그린다.
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

interface Props {
  plot: Plot
  wet: number
  gains: Gain[]
  dropKey: number
  onHarvest: (slot: number) => void
  onSwipe: (direction: 1 | -1) => void
  onLookDown: () => void
  onGainDone: (id: number) => void
}

export function PlotView({ plot, wet, gains, dropKey, onHarvest, onSwipe, onLookDown, onGainDone }: Props) {
  const spots = LAYOUT[plot.kind]
  const bed = plot.kind === 'bed'
  // 넣어 둔 이미지가 있으면 그 한 장을 돈 앞에 놓는다. 돈은 그림 윗변 뒤에서 솟아 나온다.
  const image = art(bed ? 'bed' : 'pot')

  return (
    <div className={`plot plot-${plot.kind}`}>
      {!image && (bed ? <BedBack wet={wet} /> : <PotBack wet={wet} />)}
      {!image && bed && <BedMid wet={wet} />}

      <div className="slots">
        {spots.map((spot, i) => {
          const p = plot.slots[i]
          return (
            <div
              key={i}
              className="stalk"
              style={{
                left: `calc(50% + ${spot.x}px)`,
                bottom: -spot.down,
                zIndex: spot.z,
                transform: `translateX(-50%) rotate(${spot.tilt}deg)`,
              }}
            >
              <AnimatePresence>
                {p && (
                  <PlantView
                    key={p.id}
                    plant={p}
                    onHarvest={() => onHarvest(i)}
                    onSwipe={onSwipe}
                    onLookDown={onLookDown}
                  />
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {gains.map((g) => (
          <motion.span
            key={g.id}
            className="gain"
            style={{ left: `calc(50% + ${spots[g.slot].x}px)` }}
            initial={{ x: '-50%', y: 0, opacity: 0, scale: 0.7 }}
            animate={{ x: '-50%', y: -90, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1 }}
            onAnimationComplete={() => onGainDone(g.id)}
          >
            +{won(g.value)}
          </motion.span>
        ))}
      </div>

      {dropKey > 0 && (
        <div key={dropKey} className="drops" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} style={{ left: `${18 + i * 11}%`, animationDelay: `${(i * 37) % 180}ms` }} />
          ))}
        </div>
      )}

      {image ? (
        <img className="art art-front" src={image} alt="" draggable={false} />
      ) : bed ? (
        <BedFront wet={wet} />
      ) : (
        <PotFront wet={wet} />
      )}
    </div>
  )
}
