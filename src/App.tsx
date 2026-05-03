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

const STAGE_TAB_IMAGES = [
  { src: '/1-money-and-move.png', alt: 'Stage 1 - Money and move' },
  { src: '/2-buy-and-barter.png', alt: 'Stage 2 - Buy and barter' },
  { src: '/3-cook-and-counter.png', alt: 'Stage 3 - Cook and counter' },
]

function StageTab({
  stageId,
  active,
  stageLabel,
  onSelect,
}: {
  stageId: number
  active: boolean
  stageLabel: string
  onSelect: () => void
}) {
  const image = STAGE_TAB_IMAGES[stageId]
  const className =
    `stage-tab stage-tab--selectable stage-tab--style-${stageId}${active ? ' stage-tab--active' : ''}`
  const img = (
    <img className={`stage-tab__image stage-tab__image--${stageId}`} src={import.meta.env.BASE_URL + image.src} alt="" />
  )

  return (
    <button
      type="button"
      className={className}
      data-stage={stageId}
      aria-current={active ? 'step' : undefined}
      aria-label={active ? `${stageLabel}, current stage` : `Go to ${stageLabel}`}
      onClick={() => {
        if (!active) onSelect()
      }}
    >
      {img}
    </button>
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

  const goToStage = useCallback((targetIndex: number) => {
    if (targetIndex === stageIndex) return
    primeAudioFromUserGesture()
    void unlockAudio()
    setStageIndex(targetIndex)
    if (targetIndex === 1) {
      setSecondsLeft(BUY_SECONDS)
      prevSeconds.current = BUY_SECONDS
    }
    setPaused(false)
  }, [stageIndex])

  const restartBarterTimer = useCallback(() => {
    primeAudioFromUserGesture()
    void unlockAudio()
    setSecondsLeft(BUY_SECONDS)
    setPaused(false)
    prevSeconds.current = BUY_SECONDS
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
          <button type="button" className="timer-block__restart" onClick={restartBarterTimer}>
            Restart timer
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
                <StageTab
                  key={s.id}
                  stageId={i}
                  active={active}
                  stageLabel={s.short}
                  onSelect={() => goToStage(i)}
                />
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
