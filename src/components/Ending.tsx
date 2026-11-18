import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'

// 1억 달성 엔딩: 금고가 터지면서 지폐와 동전이 쏟아진다.

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  spin: number
  turn: number
  flip: number
  flutter: number
  look: (typeof LOOKS)[number]
}

/** 떨어지는 돈의 생김새. 5만 원이 가장 많이 나온다. */
const LOOKS = [
  { coin: false, w: 26, h: 54, fill: '#efc95c', edge: '#86600c', light: '#fbecb4' },
  { coin: false, w: 26, h: 54, fill: '#efc95c', edge: '#86600c', light: '#fbecb4' },
  { coin: false, w: 26, h: 54, fill: '#efc95c', edge: '#86600c', light: '#fbecb4' },
  { coin: false, w: 24, h: 50, fill: '#dd9f72', edge: '#8c4721', light: '#f5dcc6' },
  { coin: false, w: 23, h: 48, fill: '#86add9', edge: '#2c5a92', light: '#cfe1f3' },
  { coin: true, w: 18, h: 18, fill: '#d5d9dc', edge: '#767d81', light: '#ffffff' },
] as const

const MAX_PIECES = 150
const rand = (min: number, max: number) => min + Math.random() * (max - min)

function useMoneyRain() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    let width = 0
    let height = 0

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * ratio
      canvas.height = height * ratio
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const pieces: Piece[] = []
    const add = (x: number, y: number, vx: number, vy: number) =>
      pieces.push({
        x,
        y,
        vx,
        vy,
        spin: rand(0, Math.PI * 2),
        turn: rand(-0.12, 0.12),
        flip: rand(0, Math.PI * 2),
        flutter: rand(0.05, 0.16),
        look: LOOKS[Math.floor(Math.random() * LOOKS.length)],
      })

    const draw = (p: Piece) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.spin)
      ctx.scale(1, p.look.coin ? 1 : Math.cos(p.flip)) // 지폐는 팔랑팔랑 뒤집힌다.
      ctx.fillStyle = p.look.fill
      ctx.strokeStyle = p.look.edge
      ctx.lineWidth = 1.5
      ctx.beginPath()
      if (p.look.coin) ctx.arc(0, 0, p.look.w / 2, 0, Math.PI * 2)
      else ctx.roundRect(-p.look.w / 2, -p.look.h / 2, p.look.w, p.look.h, 3)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = p.look.light
      ctx.beginPath()
      ctx.ellipse(0, p.look.coin ? 0 : -p.look.h * 0.12, p.look.w * 0.26, p.look.w * (p.look.coin ? 0.26 : 0.34), 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // 움직임을 줄인 설정이면 흩어진 모습 한 장만 그린다.
    if (still) {
      for (let i = 0; i < 60; i++) add(rand(0, width), rand(0, height), 0, 0)
      pieces.forEach(draw)
      return () => window.removeEventListener('resize', resize)
    }

    // 금고(화면 위쪽 가운데)에서 사방으로 터져 나온다.
    for (let i = 0; i < 110; i++) {
      const angle = rand(0, Math.PI * 2)
      const speed = rand(3, 15)
      add(width / 2, height * 0.24, Math.cos(angle) * speed, Math.sin(angle) * speed - 5)
    }

    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(34, now - last) / 16.7
      last = now
      ctx.clearRect(0, 0, width, height)

      // 터진 뒤로는 위에서 계속 흩날린다.
      if (pieces.length < MAX_PIECES && Math.random() < 0.35) add(rand(0, width), -40, rand(-1, 1), rand(1, 3))

      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]
        p.vy = Math.min(7, p.vy + 0.22 * dt)
        p.vx *= 0.985
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.spin += p.turn * dt
        p.flip += p.flutter * dt
        if (p.y > height + 60) pieces.splice(i, 1)
        else draw(p)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return ref
}

interface Props {
  /** 시작부터 1억까지 걸린 시간(글자로) */
  took: string
  harvests: number
  workers: number
  onContinue: () => void
  onRestart: () => void
}

export function Ending({ took, harvests, workers, onContinue, onRestart }: Props) {
  const canvas = useMoneyRain()

  return (
    <motion.div
      className="ending"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ending-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="ending-flash"
        initial={{ opacity: 0.95 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        aria-hidden="true"
      />
      <canvas ref={canvas} className="ending-rain" aria-hidden="true" />

      <div className="ending-body">
        <p className="ending-kicker">금고가 터졌어요</p>
        <motion.h2
          id="ending-title"
          className="ending-title"
          initial={{ scale: 0.2, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 11, delay: 0.15 }}
        >
          1억
        </motion.h2>
        <p className="ending-sub">100,000,000원을 모았어요</p>

        <dl className="ending-stats">
          <div>
            <dt>걸린 시간</dt>
            <dd>{took}</dd>
          </div>
          <div>
            <dt>수확</dt>
            <dd>{harvests.toLocaleString('ko-KR')}번</dd>
          </div>
          <div>
            <dt>일꾼</dt>
            <dd>{workers}명</dd>
          </div>
        </dl>

        <div className="ending-actions">
          <button type="button" className="btn btn-gold" onClick={onContinue}>
            계속 키우기
          </button>
          <button type="button" className="ending-restart" onClick={onRestart}>
            처음부터 다시
          </button>
        </div>
      </div>
    </motion.div>
  )
}
