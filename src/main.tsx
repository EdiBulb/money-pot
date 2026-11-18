import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { OFFLINE_MAX_MS } from './game/config'
import { advance, newGame, restore } from './game/engine'
import { isGuideDone, loadGame } from './game/storage'
import './index.css'

// Claude 아티팩트 뷰어에서 새 버전으로 바뀔 때 진행 상황을 넘겨받기 위한 훅.
// 뷰어 밖(GitHub Pages 등)에서는 없으므로 전부 선택적으로 다룬다.
interface ClaudeHot {
  ready?: (start: (data: unknown) => void) => void
  snapshot?: (get: () => unknown) => void
  data?: unknown
}

declare global {
  interface Window {
    claude?: { hot?: ClaudeHot }
  }
}

function start(data: unknown) {
  const now = Date.now()
  const saved = restore(data) ?? loadGame()
  // 자리를 비운 동안 흐른 시간을 한꺼번에 반영한다.
  const initial = advance(saved ?? newGame(now), now)
  // 자리를 비운 동안 무슨 일이 있었는지 한 줄로 알려 준다.
  const away = saved
    ? {
        ms: Math.min(now - saved.lastSeen, OFFLINE_MAX_MS),
        earned: initial.vault - saved.vault,
        harvests: initial.harvests - saved.harvests,
      }
    : null

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App initial={initial} away={away} firstVisit={!saved && !isGuideDone()} />
    </StrictMode>,
  )
}

const hot = window.claude?.hot
if (hot?.ready) hot.ready(start)
else start(hot?.data ?? {})
