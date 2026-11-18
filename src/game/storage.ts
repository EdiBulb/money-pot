import { restore, type GameState } from './engine'

const KEY = 'money-pot/v4'
const OLD_KEYS = ['money-pot/v3', 'money-pot/v2']

// 저장소는 없거나 막혀 있을 수 있다. 실패해도 게임은 그대로 돌아가야 한다.
export function loadGame(): GameState | null {
  try {
    for (const key of [KEY, ...OLD_KEYS]) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const state = restore(JSON.parse(raw))
      if (state) return state
    }
    return null
  } catch {
    return null
  }
}

const GUIDE_KEY = 'money-pot/guide-done'

/** 조작 안내를 이미 봤는가. 저장소를 못 쓰면 매번 처음으로 본다. */
export function isGuideDone(): boolean {
  try {
    return localStorage.getItem(GUIDE_KEY) === '1'
  } catch {
    return false
  }
}

export function setGuideDone(): void {
  try {
    localStorage.setItem(GUIDE_KEY, '1')
  } catch {
    /* 저장 실패는 무시한다 */
  }
}

const MUTED_KEY = 'money-pot/muted'

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === '1'
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
  } catch {
    /* 저장 실패는 무시한다 */
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* 저장 실패는 무시한다 */
  }
}
