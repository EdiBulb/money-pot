import { motion, type PanInfo } from 'motion/react'
import { useRef, useState } from 'react'
import { DENOMS, GROW_MS, MAX_STAGE, PULL_THRESHOLD, SWIPE_THRESHOLD } from '../game/config'
import type { Plant } from '../game/engine'
import { playTick, vibrate } from '../game/feedback'
import { Money } from './Money'
import { Leaves } from './Pot'

interface Props {
  plant: Plant
  onHarvest: () => void
  /** 돈 위에서 옆으로 밀어도 화분이 넘어가게 한다. 1 = 다음, -1 = 이전 */
  onSwipe: (direction: 1 | -1) => void
  /** 돈 위에서 아래로 밀면 위에서 내려다본다. */
  onLookDown: () => void
}

/** 흙에 꽂힌 돈 하나. 위로 끌어올렸다 놓으면 뽑힌다. */
export function PlantView({ plant, onHarvest, onSwipe, onLookDown }: Props) {
  const [armed, setArmed] = useState(false) // 놓으면 뽑힐 만큼 당겼는가
  const armedRef = useRef(false)

  const onDrag = (_: unknown, info: PanInfo) => {
    const ready = -info.offset.y >= PULL_THRESHOLD
    if (ready !== armedRef.current) {
      armedRef.current = ready
      setArmed(ready)
      if (ready) {
        playTick()
        vibrate(8)
      }
    }
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { x, y } = info.offset
    const pulled = -y >= PULL_THRESHOLD || info.velocity.y < -900
    armedRef.current = false
    setArmed(false)
    if (pulled) onHarvest()
    else if (Math.abs(x) >= SWIPE_THRESHOLD && Math.abs(x) > Math.abs(y) * 1.2) onSwipe(x < 0 ? 1 : -1)
    else if (y >= SWIPE_THRESHOLD && y > Math.abs(x) * 1.2) onLookDown()
  }

  const growth = plant.stage < MAX_STAGE ? plant.progress / GROW_MS[plant.stage] : 1
  const value = DENOMS[plant.stage].toLocaleString('ko-KR')

  return (
    <motion.div
      className="plant"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0.04 }}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
      initial={{ y: 26, scale: 0.4, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{
        y: -340,
        scale: 0.3,
        rotate: 16,
        opacity: 0,
        transition: { duration: 0.42, ease: 'easeIn' },
      }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      aria-label={`${value}원. 위로 당겨서 뽑기`}
    >
      <Leaves stage={plant.stage} />
      <motion.div
        key={plant.stage}
        className="money"
        initial={{ scale: 0.55 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 12 }}
      >
        <div style={{ transform: `scale(${0.86 + 0.14 * growth})`, transformOrigin: '50% 100%' }}>
          <Money stage={plant.stage} />
        </div>
      </motion.div>
      {armed && <span className="hint">놓으면 뽑혀요</span>}
    </motion.div>
  )
}
