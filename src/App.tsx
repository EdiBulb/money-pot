import { motion, useAnimationControls } from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { art } from './art'
import { Ending } from './components/Ending'
import { FarmView } from './components/FarmView'
import { PlotIcon, PlotView, type Gain } from './components/PlotView'
import { TankArt, WorkerIcon } from './components/ShopArt'
import { Shop, type ShopItem } from './components/Shop'
import { Vault } from './components/Vault'
import {
  DENOMS,
  MAX_STAGE,
  PAY_MS,
  PLOTS,
  SALARY,
  SEED_COST,
  SWIPE_THRESHOLD,
  TANK_MAX,
  WORK_MS,
  type PlotKind,
} from './game/config'
import {
  advance,
  buyPlot,
  buyTank,
  canPlant,
  countOf,
  dismiss,
  harvest,
  hasGrown,
  hire,
  markGoal,
  nextGoal,
  msToNextGrowth,
  newGame,
  plant,
  plantAll,
  plantCount,
  plotPrice,
  reachedGoal,
  startNextGoal,
  refillTank,
  tankCap,
  tankPrice,
  totalThirst,
  water,
  waterCap,
  type GameState,
} from './game/engine'
import {
  harvestHaptic,
  playEnding,
  playGrow,
  playHarvest,
  playPlant,
  playWater,
  setMuted,
  shakeAmount,
  unlockAudio,
  vibrate,
} from './game/feedback'
import { loadMuted, saveGame, saveMuted, setGuideDone } from './game/storage'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

function clock(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface Away {
  ms: number
  earned: number
  harvests: number
}

function duration(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}초`
  const minutes = Math.round(ms / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`
}

interface Props {
  initial: GameState
  away: Away | null
  /** 처음 온 사람인가. 그때만 조작 안내를 보여 준다. */
  firstVisit: boolean
}

export default function App({ initial, away, firstVisit }: Props) {
  const [state, setState] = useState(initial)
  // 1분 넘게 비웠다 돌아왔을 때만 보여 준다.
  const [awayNote, setAwayNote] = useState(away && away.ms >= 60_000 ? away : null)
  const [active, setActive] = useState(0) // 지금 보고 있는 화분·텃밭
  const [slideFrom, setSlideFrom] = useState<1 | -1>(1) // 새 화면이 들어오는 방향
  const [gains, setGains] = useState<Gain[]>([])
  const [dropKey, setDropKey] = useState(0)
  const [shopOpen, setShopOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [guide, setGuide] = useState(firstVisit)
  const [ending, setEnding] = useState(false)
  const [soundOff, setSoundOff] = useState(() => {
    const off = loadMuted()
    setMuted(off)
    return off
  })

  const toggleSound = () => {
    const off = !soundOff
    setMuted(off)
    saveMuted(off)
    setSoundOff(off)
    if (!off) {
      // 켰을 때는 바로 들리는지 알 수 있게 짧은 소리를 낸다.
      unlockAudio()
      playGrow(1)
    }
  }
  const shake = useAnimationControls()

  const stateRef = useRef(state)
  const lastSave = useRef(0)
  const stages = useRef(new Map<number, { stage: number; plot: number; slot: number }>())
  const pulledByHand = useRef(new Set<number>())
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  // 시간 흐름: 0.1초마다 지난 시간만큼 자라게 한다.
  useEffect(() => {
    const id = setInterval(() => setState((s) => advance(s, Date.now())), 100)
    return () => clearInterval(id)
  }, [])

  // 저장: 1초에 한 번, 그리고 화면을 떠날 때.
  useEffect(() => {
    stateRef.current = state
    if (state.lastSeen - lastSave.current >= 1000) {
      lastSave.current = state.lastSeen
      saveGame(state)
    }
  }, [state])

  useEffect(() => {
    const flush = () => saveGame(stateRef.current)
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    window.claude?.hot?.snapshot?.(() => stateRef.current)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  // 단계가 오른 돈이 있으면 소리로 알려 준다.
  const stageKey = state.plots
    .flatMap((plot) => plot.slots)
    .map((p) => (p ? `${p.id}:${p.stage}` : '-'))
    .join(',')
  useEffect(() => {
    const next = new Map<number, { stage: number; plot: number; slot: number }>()
    let grewTo = -1
    stateRef.current.plots.forEach((plot, plotIndex) =>
      plot.slots.forEach((p, slot) => {
        if (!p) return
        const before = stages.current.get(p.id)
        if (before && p.stage > before.stage) grewTo = Math.max(grewTo, p.stage)
        next.set(p.id, { stage: p.stage, plot: plotIndex, slot })
      }),
    )
    // 일꾼이 뽑아 간 돈은 얼마였는지 띄워 준다(지금 보고 있는 화분·텃밭만).
    const byWorker: Gain[] = []
    for (const [id, was] of stages.current) {
      if (next.has(id)) continue
      if (pulledByHand.current.delete(id)) continue
      if (was.plot === active && stateRef.current.plots[was.plot]?.kind !== 'farm')
        byWorker.push({ id, value: DENOMS[was.stage], plot: was.plot, slot: was.slot })
    }
    if (byWorker.length) setGains((g) => [...g, ...byWorker])
    stages.current = next
    if (grewTo >= 0) {
      playGrow(grewTo)
      vibrate(10)
    }
    // stageKey가 바뀔 때만 비교하면 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageKey])

  const commit = (next: GameState) => {
    stateRef.current = next
    setState(next)
    saveGame(next)
  }

  const current = () => advance(stateRef.current, Date.now())

  // 1억을 처음 넘기면 엔딩. 한 판에 한 번만 나온다.
  const goal = reachedGoal(state)
  useEffect(() => {
    if (!goal) return
    commit(markGoal(stateRef.current, Date.now()))
    setShopOpen(false)
    setEnding(true)
    playEnding()
    vibrate([60, 40, 60, 40, 60, 40, 300])
    // goal이 참으로 바뀌는 순간에만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal])

  const endGuide = () => {
    setGuide(false)
    setGuideDone()
  }

  const restart = () => {
    setActive(0)
    setGains([])
    commit(newGame(Date.now()))
  }

  /** 옆 화분으로 넘긴다. 1 = 다음(왼쪽으로 밀기), -1 = 이전(오른쪽으로 밀기) */
  const go = (direction: 1 | -1) => {
    const next = active + direction
    if (next < 0 || next >= stateRef.current.plots.length) return
    setSlideFrom(direction)
    setActive(next)
    vibrate(6)
  }



  // 데스크탑에서는 방향키로도 넘긴다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onScenePointerDown = (e: PointerEvent) => {
    // 돈은 PlantView가, 버튼은 버튼이 직접 처리한다.
    if ((e.target as HTMLElement).closest('.plant, button')) return
    swipeStart.current = { x: e.clientX, y: e.clientY }
    // 손가락이 화면 밖에서 떨어져도 끝을 알 수 있게 한다.
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onScenePointerUp = (e: PointerEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1)
  }

  const handlePlant = () => {
    unlockAudio()
    const now = current()
    if (!canPlant(now, active)) return
    playPlant()
    vibrate(15)
    // 농장은 자리가 100개라 한 번에 모두 심는다.
    commit(now.plots[active].kind === 'farm' ? plantAll(now, active) : plant(now, active))
  }

  const handleWater = () => {
    unlockAudio()
    playWater()
    vibrate(8)
    setDropKey((k) => k + 1)
    commit(water(current()))
  }

  const handleHarvest = (slot: number) => {
    const now = current()
    const p = now.plots[active]?.slots[slot]
    if (!p) return
    const farm = now.plots[active].kind === 'farm'
    pulledByHand.current.add(p.id)
    playHarvest(p.stage)
    // 농장에서는 연달아 거두므로 흔들림을 약하게 한다.
    const amount = farm ? 3 : shakeAmount(p.stage, harvestHaptic(p.stage))
    if (farm) vibrate(18)
    if (amount > 0 && !reducedMotion()) {
      void shake.start({
        x: [0, -amount, amount, -amount * 0.6, amount * 0.4, 0],
        y: [0, amount * 0.5, -amount * 0.3, 0],
        transition: { duration: 0.38 },
      })
    }
    if (!farm) setGains((g) => [...g, { id: p.id, value: DENOMS[p.stage], plot: active, slot }])
    commit(harvest(now, active, slot))
  }

  const handleRefillTank = () => {
    unlockAudio()
    playWater()
    vibrate(8)
    commit(refillTank(current()))
  }

  const handleBuyPlot = (kind: PlotKind) => {
    unlockAudio()
    const before = stateRef.current.plots.length
    const next = buyPlot(current(), kind)
    if (next.plots.length === before) return
    playPlant()
    vibrate(20)
    commit(next)
    setSlideFrom(1)
    setActive(next.plots.length - 1)
    setShopOpen(false)
  }

  const handleBuyTank = () => {
    unlockAudio()
    const next = buyTank(current())
    if (next.tanks === stateRef.current.tanks) return
    playPlant()
    vibrate(20)
    commit(next)
    setShopOpen(false)
  }

  const handleHire = () => {
    unlockAudio()
    const next = hire(current())
    if (next.workers === stateRef.current.workers) return
    playPlant()
    vibrate(20)
    commit(next)
    setShopOpen(false)
  }

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    setConfirmReset(false)
    restart()
  }

  const index = Math.min(active, state.plots.length - 1)
  const plot = state.plots[index]
  const kind = PLOTS[plot.kind]
  const farm = plot.kind === 'farm'
  const count = plantCount(plot)
  const grownCount = plot.slots.filter((p) => p?.stage === MAX_STAGE).length
  const wait = msToNextGrowth(plot)
  const thirst = totalThirst(state)
  const cap = waterCap(state)
  const wet = Math.min(1, state.water / cap)
  const full = state.water >= cap
  const tankLevel = state.tanks ? state.tank / tankCap(state) : 0
  const pots = countOf(state, 'pot')
  const beds = countOf(state, 'bed')
  const farms = countOf(state, 'farm')

  let status: string
  if (count === 0) status = `${kind.name}이 비었어요. ${won(SEED_COST)}을 심어 보세요.`
  else if (farm && grownCount > 0) status = `다 자란 돈 ${grownCount}개. 손가락으로 훑어서 거두세요.`
  else if (wait === null) status = '다 자랐어요. 위로 쭉 당겨서 뽑으세요.'
  else if (state.water < 1) status = '흙이 말랐어요. 물을 줘야 자라요.'
  else status = `다음 성장까지 ${clock(wait)}${grownCount ? ` · 다 자란 돈 ${grownCount}개` : ''}`

  // 조작 안내: 심기 → 물 주기 → 당겨 뽑기 순서로, 첫 수확을 하면 마무리 안내를 띄운다.
  const anyPlant = state.plots.some((each) => each.slots.some(Boolean))
  const guideStep = !guide
    ? null
    : state.harvests > 0
      ? 'done'
      : !anyPlant
        ? 'plant'
        : state.water < 1
          ? 'water'
          : 'pull'
  const coach = {
    plant: { n: 1, text: `‘${won(SEED_COST)} 심기’를 눌러 화분에 돈을 심어요.` },
    water: { n: 2, text: '‘물 주기’를 눌러요. 물이 있어야 돈이 자라요.' },
    pull: {
      n: 3,
      text: '돈이 자라고 있어요. 2분이면 5만 원이 돼요. 뽑을 때는 돈을 잡고 위로 쭉 당겼다 놓아요. 지금 뽑아도 돼요.',
    },
  }
  const coachNow = guideStep && guideStep !== 'done' ? coach[guideStep] : null

  const backdrop = art('veranda')
  const tankMinutes = TANK_MAX / 60_000
  const shopItems: ShopItem[] = [
    {
      id: 'pot',
      name: `화분 (${pots}개)`,
      description: `돈을 ${PLOTS.pot.slots}개 심을 수 있어요.`,
      art: <PlotIcon kind="pot" />,
      price: plotPrice(state, 'pot'),
      ownedLabel: '',
      onBuy: () => handleBuyPlot('pot'),
    },
    {
      id: 'bed',
      name: `텃밭 (${beds}개)`,
      description: `돈을 ${PLOTS.bed.slots}개 심을 수 있어요. 물은 화분 ${PLOTS.bed.thirst}개만큼 써요.`,
      art: <PlotIcon kind="bed" />,
      price: plotPrice(state, 'bed'),
      ownedLabel: '',
      onBuy: () => handleBuyPlot('bed'),
    },
    {
      id: 'farm',
      name: `농장 (${farms}개)`,
      description: `돈을 ${PLOTS.farm.slots}개 심을 수 있어요. 한 번에 모두 심고, 다 자란 돈은 손가락으로 훑어서 거둬요. 물은 화분 ${PLOTS.farm.thirst}개만큼 써요.`,
      art: <PlotIcon kind="farm" />,
      price: plotPrice(state, 'farm'),
      ownedLabel: '',
      onBuy: () => handleBuyPlot('farm'),
    },
    {
      id: 'tank',
      name: `물탱크 (${state.tanks}개)`,
      description: `흙의 물이 줄면 저절로 채워 줘요. 탱크 하나가 화분 하나를 ${tankMinutes}분 책임져요. 화분이 늘면 그만큼 빨리 줄어요.`,
      art: art('tank') ? <img src={art('tank')} width={54} alt="" /> : <TankArt level={1} />,
      price: tankPrice(state),
      ownedLabel: '',
      onBuy: handleBuyTank,
    },
    {
      id: 'worker',
      name: `일꾼 (${state.workers}명)`,
      description: `다 자란 돈을 뽑고, 빈자리에 다시 심고, 흙이 마르면 물을 줘요. ${WORK_MS / 1000}초에 한 가지씩 해요. 월급은 ${PAY_MS / 60_000}분마다 ${won(SALARY)}이고, 고용할 때 첫 월급을 먼저 줘요. 자산이 모자라면 월급을 받을 때까지 쉬어요.`,
      art: art('worker') ? <img src={art('worker')} width={54} alt="" /> : <WorkerIcon />,
      price: SALARY,
      ownedLabel: '',
      onBuy: handleHire,
      extra:
        state.workers > 0
          ? { label: '한 명 내보내기', onClick: () => commit(dismiss(current())) }
          : undefined,
    },
  ]

  const ownedText = [`화분 ${pots}개`, beds && `텃밭 ${beds}개`, farms && `농장 ${farms}개`]
    .filter(Boolean)
    .join(' · ')

  return (
    <motion.div className="app" animate={shake} onPointerDown={unlockAudio}>
      <Vault amount={state.vault} harvests={state.harvests} goal={state.goal} />

      <main
        className="scene"
        onPointerDown={onScenePointerDown}
        onPointerUp={onScenePointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {backdrop ? (
          <img className="backdrop" src={backdrop} alt="" draggable={false} />
        ) : (
          <div className="concrete" aria-hidden="true" />
        )}

        <div className="owned">
          <p className="owned-count">{ownedText}</p>
          {state.plots.length > 1 &&
            (state.plots.length <= 10 ? (
              <p className="owned-dots" aria-label={`${state.plots.length}곳 중 ${index + 1}번째`}>
                {state.plots.map((each, i) => (
                  <span
                    key={i}
                    className={`dot${i === index ? ' dot-on' : ''}${hasGrown(each) ? ' dot-ready' : ''}${each.kind !== 'pot' ? ' dot-bed' : ''}`}
                  />
                ))}
              </p>
            ) : (
              <p className="owned-count owned-page">
                {index + 1} / {state.plots.length} · {kind.name}
              </p>
            ))}
          {state.workers > 0 && (
            <p className={`owned-count owned-worker${state.unpaid ? ' owned-unpaid' : ''}`}>
              {state.unpaid
                ? `일꾼 ${state.workers}명 쉬는 중 · 월급 ${won(SALARY * state.workers)} 부족`
                : `일꾼 ${state.workers}명 · 월급날까지 ${clock(PAY_MS - state.payClock)}`}
            </p>
          )}
        </div>

        {awayNote && (
          <button type="button" className="away" onClick={() => setAwayNote(null)}>
            자리를 비운 {duration(awayNote.ms)} 동안{' '}
            {awayNote.earned >= 0 ? `+${won(awayNote.earned)}` : `-${won(-awayNote.earned)}`}
            {awayNote.harvests > 0 && ` · 수확 ${awayNote.harvests.toLocaleString('ko-KR')}번`}
            <small>눌러서 닫기</small>
          </button>
        )}

        <button type="button" className="shop-open" onClick={() => setShopOpen(true)}>
          상점
        </button>

        {guideStep === 'pull' && !farm && (
          <p className="pull-cue" aria-hidden="true">
            <span className="pull-arrow" />
            위로 당기기
          </p>
        )}

        <motion.div
          key={index}
          className="plot-stage"
          initial={reducedMotion() ? false : { x: slideFrom * 160, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 38 }}
        >
          {farm ? (
            <FarmView plot={plot} wet={wet} onHarvest={handleHarvest} onSwipe={go} />
          ) : (
            <PlotView
              plot={plot}
              wet={wet}
              gains={gains.filter((g) => g.plot === index)}
              dropKey={dropKey}
              onHarvest={handleHarvest}
              onSwipe={go}
              onGainDone={(id) => setGains((all) => all.filter((g) => g.id !== id))}
            />
          )}
        </motion.div>
      </main>

      <footer className="controls">
        {coachNow ? (
          <div className="coach" role="status">
            <span className="coach-step">{coachNow.n} / 3</span>
            <p>{coachNow.text}</p>
            <button type="button" className="coach-skip" onClick={endGuide}>
              안내 끄기
            </button>
          </div>
        ) : (
          <p className="status" aria-live="polite">
            {status}
          </p>
        )}

        <div className="meter-row">
          <span className="meter-label">물</span>
          <div
            className="meter"
            role="meter"
            aria-label="흙에 남은 물"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(wet * 100)}
          >
            <div className="meter-fill" style={{ width: `${wet * 100}%` }} />
          </div>
          <span className="meter-time">{clock(state.water / thirst)}</span>
        </div>

        {state.tanks > 0 && (
          <div className="meter-row">
            <span className="meter-label">탱크 {state.tanks}개</span>
            <div
              className="meter"
              role="meter"
              aria-label="물탱크에 남은 물"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(tankLevel * 100)}
            >
              <div className="meter-fill meter-tank" style={{ width: `${tankLevel * 100}%` }} />
            </div>
            <button type="button" className="mini" onClick={handleRefillTank} disabled={tankLevel > 0.995}>
              채우기
            </button>
          </div>
        )}

        <div className="btn-row">
          <button
            type="button"
            className={`btn btn-plant${guideStep === 'plant' ? ' pulse' : ''}`}
            onClick={handlePlant} disabled={!canPlant(state, index)}>
            {farm ? '모두 심기' : `${won(SEED_COST)} 심기`}
            <small>
              {count}/{plot.slots.length}
            </small>
          </button>
          <button
            type="button"
            className={`btn btn-water${guideStep === 'water' ? ' pulse' : ''}`}
            onClick={handleWater}
            disabled={full}
          >
            {full ? '물 가득' : '물 주기'}
          </button>
        </div>

        <div className="foot">
          <button type="button" className="reset" aria-pressed={soundOff} onClick={toggleSound}>
            {soundOff ? '소리 켜기' : '소리 끄기'}
          </button>
          <button
            type="button"
            className="reset"
            onClick={handleReset}
            onBlur={() => setConfirmReset(false)}
          >
            {confirmReset ? '한 번 더 누르면 모은 자산까지 모두 지워져요' : '처음부터 다시'}
          </button>
        </div>
      </footer>

      {shopOpen && <Shop vault={state.vault} items={shopItems} onClose={() => setShopOpen(false)} />}

      {guideStep === 'done' && !ending && (
        <div className="shop-backdrop">
          <motion.section
            className="shop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <h2 id="guide-title" className="guide-title">
              첫 수확이에요
            </h2>
            <ul className="guide-list">
              <li>번 돈으로 화분 하나에 5개까지 심어요.</li>
              <li>
                <b>상점</b>에서 화분, 물탱크, 일꾼을 사요. 일꾼은 알아서 뽑고, 심고, 물을 줘요.
              </li>
              <li>
                화분이 여러 개면 <b>옆으로 밀어서</b> 넘겨요.
              </li>
              <li>1억을 모으면 10억에 도전할 수 있어요.</li>
            </ul>
            <button type="button" className="btn btn-plant" onClick={endGuide}>
              시작하기
            </button>
          </motion.section>
        </div>
      )}

      {ending && (
        <Ending
          goal={state.goal}
          next={nextGoal(state)}
          took={duration((state.goalAt ?? Date.now()) - state.startedAt)}
          harvests={state.harvests}
          workers={state.workers}
          onNext={() => {
            setEnding(false)
            commit(startNextGoal(stateRef.current))
          }}
          onContinue={() => setEnding(false)}
          onRestart={() => {
            setEnding(false)
            restart()
          }}
        />
      )}
    </motion.div>
  )
}
