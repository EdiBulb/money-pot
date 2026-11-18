import { motion } from 'motion/react'
import type { ReactNode } from 'react'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export interface ShopItem {
  id: string
  name: string
  description: string
  art: ReactNode
  /** null이면 더 살 수 없는 품목(이미 샀거나 최대치). */
  price: number | null
  /** 살 수 없을 때 버튼 자리에 보여 줄 말. */
  ownedLabel: string
  onBuy: () => void
  /** 구매 말고 한 가지 더 할 수 있는 일(예: 일꾼 내보내기) */
  extra?: { label: string; onClick: () => void }
}

interface Props {
  vault: number
  items: ShopItem[]
  onClose: () => void
}

export function Shop({ vault, items, onClose }: Props) {
  return (
    <div className="shop-backdrop" onClick={onClose}>
      <motion.section
        className="shop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        <div className="shop-head">
          <h2 id="shop-title">상점</h2>
          <span className="shop-vault">내 자산 {won(vault)}</span>
          <button type="button" className="shop-close" onClick={onClose}>
            닫기
          </button>
        </div>

        <ul className="shop-list">
          {items.map((item) => {
            const short = item.price === null ? 0 : item.price - vault
            return (
              <li key={item.id} className="shop-item">
                <div className="shop-art">{item.art}</div>
                <div className="shop-info">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  {item.price !== null && <p className="shop-price">{won(item.price)}</p>}
                </div>
                {item.price === null ? (
                  <span className="shop-owned">{item.ownedLabel}</span>
                ) : (
                  <button type="button" className="btn btn-buy" onClick={item.onBuy} disabled={short > 0}>
                    {short > 0 ? `${won(short)} 부족` : '구매'}
                  </button>
                )}
                {item.extra && (
                  <button type="button" className="shop-extra" onClick={item.extra.onClick}>
                    {item.extra.label}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </motion.section>
    </div>
  )
}
