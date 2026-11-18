import { useCallback, useEffect, useState } from 'react'

// '내 자산'을 작은 창으로 띄워 다른 창 위에 항상 떠 있게 한다.
// 크롬·엣지 데스크탑의 Document Picture-in-Picture를 쓴다. 다른 브라우저에서는 버튼을 숨긴다.

interface PipApi {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
  window: Window | null
}

declare global {
  interface Window {
    documentPictureInPicture?: PipApi
  }
}

export const pipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window

/** 게임 화면의 스타일과 글꼴을 작은 창에 그대로 옮긴다. */
function copyStyles(target: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = target.document.createElement('style')
      style.textContent = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n')
      target.document.head.appendChild(style)
    } catch {
      // 다른 곳에서 불러온 스타일(구글 글꼴)은 규칙을 읽을 수 없으니 링크째 옮긴다.
      if (sheet.href) {
        const link = target.document.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        target.document.head.appendChild(link)
      }
    }
  }
}

/** 작은 창을 열고 닫는다. 열려 있는 창(Window)을 돌려준다. */
export function useMiniWindow() {
  const [win, setWin] = useState<Window | null>(null)
  const [error, setError] = useState(false)

  const open = useCallback(async () => {
    const api = window.documentPictureInPicture
    if (!api) return
    if (api.window) {
      api.window.focus()
      return
    }
    try {
      const next = await api.requestWindow({ width: 300, height: 128 })
      copyStyles(next)
      next.document.title = '내 자산'
      next.document.body.className = 'pip-body'
      next.addEventListener('pagehide', () => setWin(null), { once: true })
      setError(false)
      setWin(next)
    } catch {
      // 미리보기 화면 안처럼 막혀 있는 곳에서는 열리지 않는다.
      setError(true)
    }
  }, [])

  const close = useCallback(() => win?.close(), [win])

  // 게임을 닫으면 작은 창도 닫는다.
  useEffect(() => () => win?.close(), [win])

  // 작은 창은 게임 탭이 있어야 떠 있을 수 있다. 작은 창이 떠 있을 때 탭을 닫으려 하면 한 번 묻는다.
  useEffect(() => {
    if (!win) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [win])

  return { win, open, close, error }
}
