import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { playTick, playTimeUp, primeAudioFromUserGesture, unlockAudio } from './audio'
import './App.css'

const STAGES = [
  { id: 0, short: 'Money & Move', footer: '1-Money & Move' },
  { id: 1, short: 'Buy & Barter', footer: '2-Buy & Barter' },
  { id: 2, short: 'Cook & Counter', footer: '3-Cook & Counter' },
]

const BUY_SECONDS = 60
const URGENT_THRESHOLD = 10

const STAGE_GLYPHS: { emoji: string; label: string }[] = [
  { emoji: '🗺️', label: 'Money and move' },
  { emoji: '🤝', label: 'Buy and barter' },
  { emoji: '🍳', label: 'Cook and counter' },
]

function StageGlyph({ stageId, active }: { stageId: number; active: boolean }) {
  const g = STAGE_GLYPHS[stageId]
  return (
    <span
      className={`stage-tab__glyph${active ? ' stage-tab__glyph--active' : ''}`}
      data-stage={stageId}
      title={g.label}
      aria-hidden="true"
    >
      <span className="stage-tab__glyph-emoji">{g.emoji}</span>
    </span>
  )
}

function SkipNextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 18l8.5-6L6 6v12zm10 0V6h2v12h-2z" />
    </svg>
  )
}

export default function App() {
  const [screen, setScreen] = useState<'home' | 'game'>('home')
  const [day, setDay] = useState(1)
  const [stageIndex, setStageIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(BUY_SECONDS)
  const [paused, setPaused] = useState(false)
  const prevSeconds = useRef(secondsLeft)

  const isBarter = screen === 'game' && stageIndex === 1
  const urgent = isBarter && !paused && secondsLeft > 0 && secondsLeft <= URGENT_THRESHOLD

  useEffect(() => {
    if (!isBarter || paused || secondsLeft <= 0) return

    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 0) return 0
        return s - 1
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [isBarter, paused, screen, stageIndex])

  useEffect(() => {
    if (!isBarter) return
    const prev = prevSeconds.current
    if (paused) {
      prevSeconds.current = secondsLeft
      return
    }
    if (secondsLeft < prev && secondsLeft > 0 && secondsLeft <= URGENT_THRESHOLD) {
      void (async () => {
        await unlockAudio()
        playTick()
      })()
    }
    if (secondsLeft === 0 && prev === 1) {
      void (async () => {
        await unlockAudio()
        playTimeUp()
      })()
    }
    prevSeconds.current = secondsLeft
  }, [isBarter, paused, secondsLeft])

  const startGame = useCallback(async () => {
    primeAudioFromUserGesture()
    await unlockAudio()
    setDay(1)
    setStageIndex(0)
    setSecondsLeft(BUY_SECONDS)
    setPaused(false)
    setScreen('game')
  }, [])

  const nextStage = useCallback(async () => {
    primeAudioFromUserGesture()
    await unlockAudio()
    if (stageIndex === 0) {
      setStageIndex(1)
      setSecondsLeft(BUY_SECONDS)
      setPaused(false)
      return
    }
    if (stageIndex === 1) {
      setStageIndex(2)
      setPaused(false)
      return
    }
    setDay((d) => d + 1)
    setStageIndex(0)
    setPaused(false)
  }, [stageIndex])

  const resetGame = useCallback(() => {
    if (
      !window.confirm(
        'End this game and reset? Day, stage, and timer will go back to the start.',
      )
    ) {
      return
    }
    setScreen('home')
    setDay(1)
    setStageIndex(0)
    setSecondsLeft(BUY_SECONDS)
    setPaused(false)
  }, [])

  const togglePause = useCallback(() => {
    primeAudioFromUserGesture()
    void unlockAudio()
    setPaused((p) => !p)
  }, [])

  if (screen === 'home') {
    return (
      <div className="app">
        <div className="home">
          <div className="home__bg-art" aria-hidden="true" />
          <div className="home__logo-wrap">
            <span className="home__hat" aria-hidden="true">
              👨‍🍳
            </span>
            <h1 className="home__title">RIVAL RESTAURANTS</h1>
          </div>
          <button type="button" className="home__start" onClick={startGame}>
            START TIMER
          </button>
          <footer className="home__footer">
            <span className="home__publisher">Gap Closer Games</span>
          </footer>
        </div>
      </div>
    )
  }

  const stage = STAGES[stageIndex]

  let main: ReactNode
  if (stageIndex === 0) {
    main = (
      <>
        <h2 className="game__headline game__headline--green">Pick location</h2>
        <p className="game__sub game__sub--green">(not timed)</p>
      </>
    )
  } else if (stageIndex === 1) {
    main = (
      <div className="timer-block">
        <div
          className={`timer-block__value${urgent ? ' timer-block__value--urgent' : ''}`}
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Buy and barter time remaining: ${secondsLeft} seconds`}
        >
          {secondsLeft}
        </div>
        <div className="timer-block__controls">
          <button type="button" className="timer-block__pause" onClick={togglePause}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>
    )
  } else {
    main = (
      <>
        <h2 className="game__headline game__headline--gold">Who&apos;s cooking?</h2>
        <p className="game__sub game__sub--gold">(not timed)</p>
      </>
    )
  }

  return (
    <div className="app">
      <div className="game">
        <header className="game__top">
          <div className="game__top-left">
            <div className="game__day" aria-live="polite">
              Day {day}
            </div>
            <div className="game__stage-name">{stage.short}</div>
          </div>
          <button type="button" className="game__reset" onClick={resetGame}>
            New game
          </button>
        </header>

        <main className="game__main" aria-label={`Current stage: ${stage.short}`}>
          {main}
        </main>

        <footer className="footer">
          <div className="footer__stages">
            {STAGES.map((s, i) => {
              const active = i === stageIndex
              return (
                <div
                  key={s.id}
                  className={`stage-tab${active ? ' stage-tab--active' : ''}`}
                  aria-current={active ? 'step' : undefined}
                >
                  <StageGlyph stageId={i} active={active} />
                  <span className="stage-tab__label">{s.footer}</span>
                </div>
              )
            })}
          </div>
          <button type="button" className="footer__next" onClick={nextStage} aria-label="Next stage">
            <SkipNextIcon />
            <span className="sr-only">Next stage</span>
          </button>
        </footer>
      </div>
    </div>
  )
}
