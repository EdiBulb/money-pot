import { useEffect, useState } from 'react'

// 앱 안의 브라우저(카카오톡, 인스타그램 등)에서 바깥 브라우저로 넘어가지 못했을 때 띄우는 안내.
// 넘기는 일은 index.html의 스크립트가 페이지가 열리자마자 한다.

declare global {
  interface Window {
    /** 앱 안의 브라우저라면 그 앱 이름 */
    __inApp?: string
    /** 기본 브라우저로 다시 열기 */
    __openExternal?: () => void
  }
}

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)

export function InAppNotice() {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const app = window.__inApp

  // 넘어가는 데 성공했다면 이 화면은 곧 가려진다. 잠시 기다렸다가 아직 여기 있으면 안내를 띄운다.
  useEffect(() => {
    if (!app) return
    const id = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(id)
  }, [app])

  if (!app || !show) return null

  const where = app === '앱' ? '앱 안의 브라우저' : `${app} 안의 브라우저`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.origin + location.pathname)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="inapp" role="dialog" aria-labelledby="inapp-title">
      <p id="inapp-title" className="inapp-title">
        {where}에서 열렸어요
      </p>
      <p className="inapp-text">
        여기서 키운 돈은 크롬이나 사파리로 이어지지 않아요. 기본 브라우저에서 열어 주세요.
        {isIos() && ' 안 넘어가면 화면 위나 아래의 ⋯ 메뉴에서 “Safari로 열기”를 눌러 주세요.'}
      </p>
      <div className="inapp-actions">
        <button type="button" className="inapp-main" onClick={() => window.__openExternal?.()}>
          기본 브라우저로 열기
        </button>
        <button type="button" className="inapp-sub" onClick={copy}>
          {copied ? '주소를 복사했어요' : '주소 복사'}
        </button>
        <button type="button" className="inapp-sub" onClick={() => setShow(false)}>
          여기서 할게요
        </button>
      </div>
    </div>
  )
}
