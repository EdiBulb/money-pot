import { useEffect, useRef, useState } from 'react'
import { goalLabel } from '../game/config'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** 금액이 바뀌면 숫자가 차르르 올라가게 한다. */
function useCountUp(target: number, ms = 450): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms)
      const eased = 1 - Math.pow(1 - k, 3)
      const value = Math.round(a + (target - a) * eased)
      from.current = value
      setShown(value)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])

  return shown
}

interface Props {
  amount: number
  harvests: number
  /** 지금 도전 중인 목표 금액 */
  goal: number
}

export function Vault({ amount, harvests, goal }: Props) {
  const shown = useCountUp(amount)
  const label = goalLabel(goal)
  const ratio = Math.min(1, amount / goal)
  const percent = (ratio * 100).toFixed(ratio < 0.01 ? 4 : 2)
  const left = Math.max(0, goal - amount)

  return (
    <header className="vault">
      <div className="vault-top">
        <span className="vault-label">내 자산</span>
        <span className="vault-count">수확 {harvests.toLocaleString('ko-KR')}번</span>
      </div>
      <output className="vault-amount" aria-live="polite">
        {won(shown)}
      </output>
      <div
        className="vault-bar"
        role="progressbar"
        aria-label={`${label} 모으기 진행률`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(percent)}
      >
        <div className="vault-bar-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="vault-goal">
        {left === 0 ? `${label} 달성!` : `${label}까지 ${won(left)} 남음 · ${percent}%`}
      </p>
    </header>
  )
}
