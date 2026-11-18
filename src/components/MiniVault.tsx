import { goalLabel } from '../game/config'

// 작은 창(useMiniWindow)에 들어가는 '내 자산'.

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** 작은 창에 들어가는 내용. 숫자 애니메이션은 넣지 않는다(게임 탭이 가려지면 멈추기 때문). */
export function MiniVault({ amount, goal }: { amount: number; goal: number }) {
  const ratio = Math.min(1, amount / goal)
  const percent = (ratio * 100).toFixed(ratio < 0.01 ? 4 : 2)

  return (
    <div className="pip">
      <p className="pip-label">내 자산</p>
      <p className="pip-amount">{won(amount)}</p>
      <div className="vault-bar pip-bar">
        <div className="vault-bar-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="pip-goal">
        {ratio >= 1 ? `${goalLabel(goal)} 달성!` : `${goalLabel(goal)}까지 ${percent}%`}
      </p>
    </div>
  )
}
