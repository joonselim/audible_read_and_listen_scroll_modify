'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BookWord,
  PlayerState,
  dune,
  formatClock,
  paragraphs,
  wordForTime,
  wordsForChapter
} from '@/lib/book'
import { BookCover } from './BookCover'

type Mode = 'listen' | 'read-listen'

const START_TIME = 78 // begin on paragraph 3, "Paul saw it now — the jihad to come,"

export function Player() {
  const words = useMemo(() => wordsForChapter(dune.chapter, paragraphs), [])

  const [state, setState] = useState<PlayerState>({
    isPlaying: true,
    currentTime: START_TIME,
    isLocked: true,
    activeWordId: wordForTime(words, START_TIME).id,
    previousTime: null
  })
  const [mode, setMode] = useState<Mode>('read-listen')
  const [showDrawer, setShowDrawer] = useState(false)
  // Two-step scroll unlock: first scroll shows hint, second scroll unlocks
  const [hintVisible, setHintVisible] = useState(false)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Drive playback clock
  useEffect(() => {
    if (!state.isPlaying) return
    const id = window.setInterval(() => {
      setState(s => ({ ...s, currentTime: s.currentTime + 1 }))
    }, 1000)
    return () => window.clearInterval(id)
  }, [state.isPlaying])

  // Sync activeWordId to currentTime
  useEffect(() => {
    const active = wordForTime(words, state.currentTime)
    if (active && active.id !== state.activeWordId) {
      setState(s => ({ ...s, activeWordId: active.id }))
    }
  }, [state.currentTime, state.activeWordId, words])

  // Refs + programmatic-scroll guard
  const textViewportRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<Map<string, HTMLSpanElement>>(new Map())
  const programmaticScroll = useRef(false)

  // Auto-scroll active word into view while locked
  useLayoutEffect(() => {
    if (!state.isLocked) return
    const viewport = textViewportRef.current
    const el = wordRefs.current.get(state.activeWordId)
    if (!viewport || !el) return
    // Word spans inline → offsetTop will effectively be the top of its line
    const target = el.offsetTop - viewport.clientHeight / 2 + el.clientHeight / 2
    programmaticScroll.current = true
    viewport.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    const t = window.setTimeout(() => {
      programmaticScroll.current = false
    }, 500)
    return () => window.clearTimeout(t)
  }, [state.activeWordId, state.isLocked])

  // Two-step gesture detection: first scroll → show hint, second scroll → unlock
  const hintVisibleRef = useRef(false)
  // keep ref in sync so event handlers see latest value
  hintVisibleRef.current = hintVisible

  useEffect(() => {
    const el = textViewportRef.current
    if (!el) return

    let touchY: number | null = null

    const handleGesture = () => {
      if (!state.isLocked) return

      if (!hintVisibleRef.current) {
        // Step 1: show hint, DON'T unlock
        setHintVisible(true)
        // Auto-dismiss hint after 3s if user doesn't scroll again
        if (hintTimer.current) clearTimeout(hintTimer.current)
        hintTimer.current = setTimeout(() => setHintVisible(false), 3000)
      } else {
        // Step 2: actually unlock
        if (hintTimer.current) clearTimeout(hintTimer.current)
        setHintVisible(false)
        setState(s => (s.isLocked ? { ...s, isLocked: false } : s))
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (!state.isLocked) return
      if (Math.abs(e.deltaY) > 2) handleGesture()
    }
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!state.isLocked || touchY == null) return
      const dy = (e.touches[0]?.clientY ?? touchY) - touchY
      if (Math.abs(dy) > 8) handleGesture()
    }

    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [state.isLocked])

  // Tap a word → seek + record previousTime (only first time) + re-lock
  const handleWordTap = useCallback(
    (word: BookWord) => {
      if (state.isLocked) return // ignore taps while locked
      setHintVisible(false)
      setState(s => ({
        ...s,
        previousTime: s.previousTime == null ? s.currentTime : s.previousTime,
        currentTime: word.timestamp,
        activeWordId: word.id,
        isLocked: true
      }))
    },
    [state.isLocked]
  )

  const goBack = () => {
    setState(s => {
      if (s.previousTime == null) return s
      const back = wordForTime(words, s.previousTime)
      return {
        ...s,
        currentTime: s.previousTime,
        activeWordId: back.id,
        previousTime: null,
        isLocked: true
      }
    })
  }

  const dismissGoBack = () =>
    setState(s => ({ ...s, previousTime: null }))

  const resumeLock = () => {
    setHintVisible(false)
    setState(s => ({ ...s, isLocked: true }))
  }
  const togglePlay = () => setState(s => ({ ...s, isPlaying: !s.isPlaying }))
  const skipBack30 = () =>
    setState(s => {
      const t = Math.max(0, s.currentTime - 30)
      return { ...s, currentTime: t, isLocked: true }
    })

  const remaining = Math.max(0, dune.chapter.duration - state.currentTime)
  const hrs = Math.floor(remaining / 3600)
  const mins = Math.floor((remaining % 3600) / 60)
  const timeLeftLabel = hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`

  return (
    <div className="relative flex h-screen flex-col bg-ink text-neutral-100">
      <StatusBar />

      {/* Top nav */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 text-neutral-300">
        <Link href="/" aria-label="Close player" className="p-2 -ml-2">
          <ChevronDown />
        </Link>
        <div className="flex items-center gap-3">
          <button aria-label="Cast" className="p-2">
            <CastIcon />
          </button>
          <button aria-label="More" className="p-2 -mr-2">
            <MoreIcon />
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="mx-auto my-3 flex w-[230px] rounded-full bg-panel2 p-1">
        <ToggleBtn active={mode === 'listen'} onClick={() => setMode('listen')}>
          Listen
        </ToggleBtn>
        <ToggleBtn
          active={mode === 'read-listen'}
          onClick={() => setMode('read-listen')}
        >
          Read &amp; Listen
        </ToggleBtn>
      </div>

      {/* Text viewport */}
      <div className="relative flex-1 min-h-0">
        {/* Lock / hint / unlock indicator — three states */}
        {state.isLocked && !hintVisible && (
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[10px] text-neutral-400 ring-1 ring-white/5 backdrop-blur-sm">
            <LockIcon />
            <span>Following playback</span>
            <span
              className="ml-0.5 inline-block h-1 w-1 rounded-full bg-amber pulse-dot"
              aria-hidden
            />
          </div>
        )}
        {state.isLocked && hintVisible && (
          <div className="fade-in pointer-events-none absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber/40 bg-black/85 px-2.5 py-1.5 text-[10px] text-amber shadow-lg shadow-black/50 backdrop-blur-sm">
            <ScrollUpIcon />
            <span className="font-medium">Scroll up to unlock</span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-300">Tap to listen from there</span>
          </div>
        )}
        {!state.isLocked && (
          <button
            onClick={resumeLock}
            className="fade-in absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber/60 bg-black/90 px-2.5 py-1 text-[10px] text-amber shadow-lg shadow-black/50 backdrop-blur-sm active:scale-[0.98]"
          >
            <SeekIcon />
            <span className="font-medium">Scroll to seek</span>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-200">Tap to lock</span>
          </button>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-12 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-12 bg-gradient-to-t from-ink to-transparent" />

        <div
          ref={textViewportRef}
          className={`no-scrollbar h-full overflow-y-auto ${
            state.isLocked ? 'cursor-default' : 'cursor-pointer'
          }`}
          style={{
            paddingTop: 72,
            paddingBottom: 72,
            overscrollBehavior: 'contain'
          }}
        >
          {mode === 'read-listen' ? (
            <article className="px-7 text-[17px] leading-[1.72] tracking-[-0.005em] text-neutral-600">
              {paragraphs.map((p, pi) => {
                const paraWords = words.filter(w => w.paragraphId === p.id)
                const base =
                  p.role === 'attribution'
                    ? 'mt-4 italic text-right text-[15px]'
                    : p.role === 'dialogue'
                    ? 'mt-5'
                    : pi === 0
                    ? 'mt-0'
                    : 'mt-5'
                return (
                  <p key={p.id} className={base}>
                    {paraWords.map((w, i) => {
                      const active = w.id === state.activeWordId
                      const tappable = !state.isLocked
                      const isLast = i === paraWords.length - 1
                      return (
                        <span key={w.id}>
                          <span
                            ref={el => {
                              if (el) wordRefs.current.set(w.id, el)
                            }}
                            onClick={tappable ? () => handleWordTap(w) : undefined}
                            className={[
                              'rounded transition-colors',
                              active
                                ? 'bg-[rgba(255,180,0,0.18)] text-white px-0.5 -mx-0.5 shadow-[inset_0_0_0_1px_rgba(255,180,0,0.35)]'
                                : tappable
                                ? 'cursor-pointer hover:bg-white/5 hover:text-white px-0.5 -mx-0.5'
                                : ''
                            ].join(' ')}
                          >
                            {w.text}
                          </span>
                          {!isLast && ' '}
                        </span>
                      )
                    })}
                  </p>
                )
              })}
            </article>
          ) : (
            <div className="flex h-full items-center justify-center px-7">
              <BookCover
                id={dune.id}
                title={dune.title}
                author={dune.author.toUpperCase()}
                size="lg"
                className="h-[260px] w-[180px]"
              />
            </div>
          )}
        </div>

        {/* "Go back to X:XX" pill — replaces old Jumped-to toast */}
        {state.previousTime != null && (
          <div className="fade-in absolute bottom-[16px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1">
            <button
              onClick={goBack}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-ink shadow-xl shadow-black/50 active:scale-95"
            >
              <BackArrowIcon />
              Go back to {formatClock(state.previousTime)}
            </button>
            <button
              onClick={dismissGoBack}
              aria-label="Dismiss"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-xl shadow-black/50 active:scale-95"
            >
              <XIcon />
            </button>
          </div>
        )}
      </div>

      {/* Controls row above player bar */}
      <div className="flex items-center gap-5 px-5 pb-2 pt-1 text-neutral-400">
        <button
          onClick={() => setShowDrawer(true)}
          aria-label="Chapters"
          className="flex items-center gap-2 rounded-md p-1 text-neutral-300"
        >
          <ChaptersIcon />
        </button>
        <button
          aria-label="Typography"
          className="text-[15px] font-semibold text-neutral-300"
        >
          Aa
        </button>
      </div>

      {/* Player bar */}
      <div className="flex items-center gap-3 border-t border-hair/80 px-4 py-3 pb-6 bg-ink">
        <BookCover
          id={dune.id}
          title="Dune"
          size="sm"
          className="h-11 w-11 flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-neutral-100">
            {dune.title} | {dune.chapter.title}
          </p>
          <p className="text-[11px] text-neutral-500">{timeLeftLabel}</p>
        </div>
        <button
          onClick={skipBack30}
          aria-label="Back 30 seconds"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-neutral-500/70 text-neutral-200 active:scale-95"
        >
          <Back30 />
        </button>
        <button
          onClick={togglePlay}
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink active:scale-95"
        >
          {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>

      {showDrawer && (
        <ChapterDrawer currentId={dune.chapter.id} onClose={() => setShowDrawer(false)} />
      )}
    </div>
  )
}

function ToggleBtn({
  active,
  children,
  onClick
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active ? 'bg-white text-ink' : 'text-neutral-400'
      }`}
    >
      {children}
    </button>
  )
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[12px] font-medium text-neutral-200">
      <span>6:19</span>
      <div className="flex items-center gap-1.5 text-neutral-400">
        <span className="text-[10px]">•••</span>
        <span className="text-[10px]">📶</span>
        <span className="rounded-sm bg-amber px-1 text-[9px] font-bold text-ink">37</span>
      </div>
    </div>
  )
}

function ChapterDrawer({
  currentId,
  onClose
}: {
  currentId: string
  onClose: () => void
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl bg-panel p-4 pb-8 fade-in-plain"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-700" />
        <h3 className="mb-3 px-1 text-[15px] font-semibold">Chapters</h3>
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
          {Array.from({ length: 10 }, (_, i) => i + 27).map(n => {
            const id = `ch-${n}`
            const active = id === currentId
            return (
              <li key={n}>
                <button
                  onClick={onClose}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left ${
                    active
                      ? 'bg-[rgba(255,180,0,0.18)] text-amber'
                      : 'text-neutral-200 hover:bg-white/5'
                  }`}
                >
                  <span className="text-[14px]">Chapter {n}</span>
                  <span className="text-[11px] text-neutral-500">27:00</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* --- icons --- */
function ChevronDown() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function CastIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  )
}
function ChaptersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h10M4 18h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function Back30() {
  return (
    <>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5V2L8 5l4 3V6a6 6 0 1 1-6 6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute text-[9px] font-bold">30</span>
    </>
  )
}
function PlayIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
      <path d="M1 1l12 7-12 7V1z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
      <rect x="1" y="1" width="3" height="12" rx="1" />
      <rect x="8" y="1" width="3" height="12" rx="1" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 12 14" fill="none">
      <rect x="2" y="6" width="8" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6V4a2 2 0 1 1 4 0v2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
function ScrollUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 10V2M3 4.5L6 1.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function SeekIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(255,180,0,0.25)]">
      <svg width="7" height="8" viewBox="0 0 7 8" fill="currentColor">
        <path d="M0 0l7 4-7 4V0z" />
      </svg>
    </span>
  )
}
function BackArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 5L3 12l7 7M4 12h16a3 3 0 0 1 0 6h-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
