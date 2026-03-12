"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Placeholder data for modifiers and attachments
const MODIFIERS = [
  "Armored",
  "Berserker",
  "Phase Shift",
  "Magnetic",
  "Overcharge",
  "Growth Hormones",
  "Lightning",
  "Frozen",
  "Burning",
  "Poison"
]

const ATTACHMENTS = [
  "Shield",
  "Spikes",
  "Mirror Coat",
  "Energy Core",
  "Reflector",
  "Amplifier",
  "Silencer",
  "Booster",
  "Deflector",
  "Absorber"
]

const ARENA_MODIFIERS = [
  "Bumpers Active",
  "Double Time",
  "Gravity On",
  "Portal",
  "Turbulence",
  "Vortex",
  "Speed Boost",
  "Shrinking Arena"
]

const RANDOM_COLORS = [
  "text-purple-600",
  "text-green-600",
  "text-orange-600",
  "text-pink-600",
  "text-yellow-600",
  "text-indigo-600",
  "text-teal-600",
  "text-cyan-600"
]

function getRandomColor(): string {
  return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)]
}

type DeckChannel = "left" | "right"
type BobMode = "always" | "shuffle" | "off"

type DeckLayout = {
  channel: DeckChannel
  x: number
  y: number
  laneWidth: number
}

const INITIAL_DECK_LAYOUT: DeckLayout = {
  channel: "left",
  x: 70,
  y: 130,
  laneWidth: 360
}

const MONKEY_THINKING_IMAGE = "/monkey%20reactions/thinking_nobg/thinking.png"
const MONKEY_DEFAULT_IMAGE = "/monkey%20reactions/thinking_nobg/hm.png"
const MONKEY_SWEAR_IMAGE = "/monkey%20reactions/thinking_nobg/swear.png"
const MONKEY_IMAGE_POOL = [
  "/monkey%20reactions/thinking_nobg/ahaha.png",
  "/monkey%20reactions/thinking_nobg/cheeky.png",
  "/monkey%20reactions/thinking_nobg/idea.png",
  "/monkey%20reactions/thinking_nobg/money.png",
  "/monkey%20reactions/thinking_nobg/phone.png",
  "/monkey%20reactions/thinking_nobg/scared.png",
  MONKEY_SWEAR_IMAGE,
  MONKEY_THINKING_IMAGE,
  "/monkey%20reactions/thinking_nobg/thumbs.png"
]

const MONKEY_REACTION_OPTIONS = [
  { label: "Random", value: "random" },
  { label: "Off", value: "off" },
  { label: "Hide Monkey", value: "hide" },
  { label: "Mockery", value: "mockery" },
  { label: "Ahaha", value: "/monkey%20reactions/thinking_nobg/ahaha.png" },
  { label: "Cheeky", value: "/monkey%20reactions/thinking_nobg/cheeky.png" },
  { label: "Idea", value: "/monkey%20reactions/thinking_nobg/idea.png" },
  { label: "Money", value: "/monkey%20reactions/thinking_nobg/money.png" },
  { label: "Phone", value: "/monkey%20reactions/thinking_nobg/phone.png" },
  { label: "Scared", value: "/monkey%20reactions/thinking_nobg/scared.png" },
  { label: "Swear", value: "/monkey%20reactions/thinking_nobg/swear.png" },
  { label: "Thinking", value: MONKEY_THINKING_IMAGE },
  { label: "Thumbs", value: "/monkey%20reactions/thinking_nobg/thumbs.png" }
]

const BOB_SPEED_MIN = 0.05
const BOB_SPEED_MAX = 4

function bobControlToSpeed(controlValue: number): number {
  const normalized = Math.min(1, Math.max(0, controlValue / 100))
  // Quadratic curve gives finer precision at low speeds.
  return BOB_SPEED_MIN + (BOB_SPEED_MAX - BOB_SPEED_MIN) * normalized * normalized
}

function bobSpeedToControl(speed: number): number {
  const normalized = Math.min(1, Math.max(0, (speed - BOB_SPEED_MIN) / (BOB_SPEED_MAX - BOB_SPEED_MIN)))
  return Math.round(Math.sqrt(normalized) * 100)
}

interface CardData {
  type: "modifier" | "attachment" | "arena"
  blueLabel: string
  blueName: string
  blueNameColor: string
  redLabel: string
  redName: string
  redNameColor: string
  areaEffect?: string
  areaEffectColor?: string
  rarity: number
  id: string
}

function getRarityBgColor(rarity: number): string {
  switch (rarity) {
    case 5:
      return "bg-purple-300"
    case 4:
      return "bg-orange-300"
    case 3:
      return "bg-blue-300"
    case 2:
      return "bg-cyan-300"
    case 1:
    default:
      return "bg-gray-300"
  }
}

function getRarityTextColor(rarity: number): string {
  switch (rarity) {
    case 5:
      return "text-purple-600"
    case 4:
      return "text-orange-600"
    case 3:
      return "text-blue-600"
    case 2:
      return "text-cyan-600"
    case 1:
    default:
      return "text-gray-600"
  }
}

function getRarityLabel(rarity: number): string {
  const labels = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]
  return labels[rarity - 1] || "UNKNOWN"
}

function generateCard(type: "modifier" | "attachment" | "arena"): CardData {
  const rarity = Math.floor(Math.random() * 5) + 1

  if (type === "modifier") {
    const blue = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)]
    const red = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)]
    return {
      type,
      blueLabel: "BLUE GETS",
      blueName: blue.toUpperCase(),
      blueNameColor: getRandomColor(),
      redLabel: "RED GETS",
      redName: red.toUpperCase(),
      redNameColor: getRandomColor(),
      rarity,
      id: Math.random().toString()
    }
  } else if (type === "attachment") {
    const blue = ATTACHMENTS[Math.floor(Math.random() * ATTACHMENTS.length)]
    const red = ATTACHMENTS[Math.floor(Math.random() * ATTACHMENTS.length)]
    return {
      type,
      blueLabel: "BLUE GETS",
      blueName: blue.toUpperCase(),
      blueNameColor: getRandomColor(),
      redLabel: "RED GETS",
      redName: red.toUpperCase(),
      redNameColor: getRandomColor(),
      rarity,
      id: Math.random().toString()
    }
  } else {
    const arena = ARENA_MODIFIERS[Math.floor(Math.random() * ARENA_MODIFIERS.length)]
    return {
      type,
      areaEffect: arena.toUpperCase(),
      areaEffectColor: getRandomColor(),
      blueLabel: "",
      blueName: "",
      blueNameColor: "",
      redLabel: "",
      redName: "",
      redNameColor: "",
      rarity,
      id: Math.random().toString()
    }
  }
}

interface CardProps {
  card: CardData
  index: number
  animate: boolean
  reveal: boolean
  deckChannel: DeckChannel
  turnDurationMs: number
}

function DynamicCard({ card, index, animate, reveal, deckChannel, turnDurationMs }: CardProps) {
  const rarityBgColor = getRarityBgColor(card.rarity)
  const rarityTextColor = getRarityTextColor(card.rarity)
  const animationDelay = `${index * 0.15}s`
  const dealStartX = deckChannel === "left"
    ? -320 + index * 30
    : 320 - index * 30
  const dealStartY = -56
  const dealEndY = 48

  return (
    <div
      className="transition-all duration-500 [perspective:1200px]"
      style={{
        opacity: animate ? 1 : 0,
        transform: animate
          ? `translate3d(0px, ${dealEndY}px, 0px) scale(1)`
          : `translate3d(${dealStartX}px, ${dealStartY}px, 0px) scale(0.88)`,
        transitionDelay: animate ? animationDelay : "0s"
      }}
    >
      <div
        className="relative w-64 h-80 transition-transform [transform-style:preserve-3d]"
        style={{
          transitionDuration: `${turnDurationMs}ms`,
          transform: reveal ? "rotateY(180deg)" : "rotateY(0deg)"
        }}
      >
        <Card className="w-64 h-80 border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none absolute inset-0 [backface-visibility:hidden] bg-yellow-200">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-5xl font-black leading-none">🂠</p>
              <p className="text-xs font-black uppercase tracking-widest mt-4">Face Down</p>
            </div>
          </div>
        </Card>

        <Card className={`${rarityBgColor} w-64 h-80 flex flex-col border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] relative`}>
          {/* Top left - Card Type */}
          <div className="absolute top-2 left-2 text-black font-black uppercase text-xs tracking-widest">
            {card.type === "modifier" && "MODIFIER"}
            {card.type === "attachment" && "ATTACHMENT"}
            {card.type === "arena" && "ARENA"}
          </div>

          {/* Top right - Rarity */}
          <div className={`absolute top-2 right-2 text-black font-black uppercase text-xs tracking-widest ${rarityTextColor}`}>
            {getRarityLabel(card.rarity)}
          </div>

          {/* Main Content */}
          <div className="flex-1 px-4 py-4 flex flex-col justify-center gap-3">
            {card.type === "arena" ? (
              <div className="text-center">
                <p className="text-2xl font-black uppercase tracking-wide leading-tight">
                  <span className={card.areaEffectColor}>{card.areaEffect}</span>
                  <span className="text-black"> IS APPLIED</span>
                </p>
              </div>
            ) : (
              <>
                <div className="text-center border-b-4 border-black pb-3">
                  <div className="text-lg font-black uppercase tracking-tight leading-tight">
                    <span className="text-blue-600">BLUE</span>
                    <span className="text-black"> GETS </span>
                    <span className={card.blueNameColor}>{card.blueName}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black uppercase tracking-tight leading-tight">
                    <span className="text-red-600">RED</span>
                    <span className="text-black"> GETS </span>
                    <span className={card.redNameColor}>{card.redName}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
        </div>
    </div>
  )
}

export default function CardsTestPage() {
  const [cards, setCards] = useState<CardData[]>([])
  const [animate, setAnimate] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)
  const [isMonkeySettling, setIsMonkeySettling] = useState(false)
  const [isShuffleBobActive, setIsShuffleBobActive] = useState(false)
  const [showDeck, setShowDeck] = useState(true)
  const [revealedCount, setRevealedCount] = useState(0)
  const [deckLayout, setDeckLayout] = useState<DeckLayout>(INITIAL_DECK_LAYOUT)
  const [monkeyOffsetY, setMonkeyOffsetY] = useState(-190)
  const [monkeyImageSrc, setMonkeyImageSrc] = useState(MONKEY_DEFAULT_IMAGE)
  const [monkeyReactionSelection, setMonkeyReactionSelection] = useState("random")
  const [randomMovementEnabled, setRandomMovementEnabled] = useState(false)
  const [oscillationRange, setOscillationRange] = useState(10)
  const [bobMode, setBobMode] = useState<BobMode>("always")
  const [bobbingSpeed, setBobbingSpeed] = useState(0.6)
  const [cardTurnPaceMs, setCardTurnPaceMs] = useState(700)
  const [deckScale, setDeckScale] = useState(1)
  const [randomizeScaleEnabled, setRandomizeScaleEnabled] = useState(false)
  const [allowSwearRandom, setAllowSwearRandom] = useState(false)
  const timeoutIdsRef = useRef<number[]>([])

  const shouldBob = bobMode === "always" || (bobMode === "shuffle" && isShuffleBobActive)
  const shouldShowMonkeySprite = monkeyReactionSelection !== "hide"

  const clearScheduledTimeouts = () => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    timeoutIdsRef.current = []
  }

  const scheduleTimeout = (callback: () => void, delayMs: number) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId)
      callback()
    }, delayMs)

    timeoutIdsRef.current.push(timeoutId)
    return timeoutId
  }

  useEffect(() => {
    return () => {
      clearScheduledTimeouts()
    }
  }, [])

  const setDeckPosition = (partial: Partial<DeckLayout>) => {
    setDeckLayout((previous) => ({
      ...previous,
      ...partial
    }))
  }

  const getRandomDeckLayout = (current: DeckLayout, range: number): DeckLayout => {
    const maxX = Math.max(0, current.laneWidth - 180)
    const minY = -160
    const maxY = 300

    return {
      ...current,
      channel: Math.random() < 0.5 ? "left" : "right",
      x: Math.floor(Math.random() * (maxX + 1)),
      y: minY + Math.floor(Math.random() * (maxY - minY + 1))
    }
  }

  const pickRandomMonkeyImage = (): string => {
    const availableImages = allowSwearRandom
      ? MONKEY_IMAGE_POOL
      : MONKEY_IMAGE_POOL.filter((image) => image !== MONKEY_SWEAR_IMAGE)

    return availableImages[Math.floor(Math.random() * availableImages.length)]
  }

  const handleDrawCards = () => {
    const shuffleVisualMs = 1000
    const preDealStartDelayMs = 500
    const postBobPauseMs = 300
    const firstRevealDelayMs = 600
    const revealGapMs = cardTurnPaceMs
    const secondRevealDelayMs = firstRevealDelayMs + revealGapMs
    const thirdRevealDelayMs = firstRevealDelayMs + revealGapMs * 2
    const cardFlipDurationMs = cardTurnPaceMs
    const extraPostTurnsDelayMs = 1500
    const preDealRandomImageMs =
      preDealStartDelayMs +
      postBobPauseMs +
      thirdRevealDelayMs +
      cardFlipDurationMs +
      extraPostTurnsDelayMs

    clearScheduledTimeouts()

    setShowDeck(true)
    setIsShuffling(true)
    setIsMonkeySettling(false)
    setIsShuffleBobActive(bobMode === "shuffle")
    setAnimate(false)
    setRevealedCount(0)
    if (randomMovementEnabled) {
      setDeckLayout((current) => getRandomDeckLayout(current, oscillationRange))
    }
    if (randomizeScaleEnabled) {
      setDeckScale(Number((0.5 + Math.random() * 1.5).toFixed(2)))
    }

    const runPreDealMonkeyImagePhase = (onComplete: () => void) => {
      if (monkeyReactionSelection === "random") {
        setMonkeyImageSrc(pickRandomMonkeyImage())
      } else if (monkeyReactionSelection === "mockery") {
        const hm = MONKEY_DEFAULT_IMAGE
        const swear = "/monkey%20reactions/thinking_nobg/swear.png"
        const ahaha = "/monkey%20reactions/thinking_nobg/ahaha.png"

        setMonkeyImageSrc(hm)
        scheduleTimeout(() => setMonkeyImageSrc(swear), 500)
        scheduleTimeout(() => setMonkeyImageSrc(hm), 625)
        scheduleTimeout(() => setMonkeyImageSrc(ahaha), 1400)
        scheduleTimeout(() => setMonkeyImageSrc(hm), 4000)
      } else if (monkeyReactionSelection === "off") {
        setMonkeyImageSrc(MONKEY_DEFAULT_IMAGE)
      } else if (monkeyReactionSelection === "hide") {
        setMonkeyImageSrc(MONKEY_DEFAULT_IMAGE)
      } else {
        setMonkeyImageSrc(monkeyReactionSelection)
      }

      scheduleTimeout(() => {
        onComplete()
      }, preDealStartDelayMs)

      if (monkeyReactionSelection !== "mockery") {
        scheduleTimeout(() => {
          setMonkeyImageSrc(MONKEY_DEFAULT_IMAGE)
        }, preDealRandomImageMs)
      }
    }

    const beginDealSequence = () => {
      const newCards = [
        generateCard("modifier"),
        generateCard("attachment"),
        generateCard("arena")
      ]
      setCards(newCards)
      setAnimate(false)

      // First lay the cards out from the pile position.
      scheduleTimeout(() => setAnimate(true), 30)

      // Then flip cards one by one once the draw motion finishes.
      scheduleTimeout(() => setRevealedCount(1), firstRevealDelayMs)
      scheduleTimeout(() => setRevealedCount(2), secondRevealDelayMs)
      scheduleTimeout(() => setRevealedCount(3), thirdRevealDelayMs)
    }

    scheduleTimeout(() => {
      // Cards stop shuffling first.
      setIsShuffling(false)

      if (bobMode === "shuffle") {
        const bobCycleMs = Math.max(1, Math.round(bobbingSpeed * 1000))
        const timeToBaselineMs = (bobCycleMs - (shuffleVisualMs % bobCycleMs)) % bobCycleMs

        setIsMonkeySettling(true)
        scheduleTimeout(() => {
          // Freeze monkey at baseline before dealing.
          setIsShuffleBobActive(false)
          runPreDealMonkeyImagePhase(() => {
            scheduleTimeout(() => {
              setIsMonkeySettling(false)
              beginDealSequence()
            }, postBobPauseMs)
          })
        }, timeToBaselineMs)

        return
      }

      runPreDealMonkeyImagePhase(() => {
        scheduleTimeout(() => {
          beginDealSequence()
        }, postBobPauseMs)
      })
    }, shuffleVisualMs)
  }

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-white text-black font-sans p-8">
      <div className="w-full max-w-[1700px] flex flex-col items-center">
        <h1 className="text-6xl font-black mb-8 tracking-widest uppercase text-center border-b-8 border-black pb-4">
          Card Draw Test
        </h1>

        <div className="mb-12">
          <Button
            onClick={handleDrawCards}
            disabled={isShuffling || isMonkeySettling}
            className="text-2xl py-6 px-8 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest bg-yellow-300 text-black hover:bg-yellow-200 disabled:opacity-50"
          >
            Draw Cards
          </Button>
        </div>

        <Card className="w-full max-w-6xl border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-14 gap-4">
            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Channel
              <select
                className="border-4 border-black bg-white px-2 py-2 text-sm font-black"
                value={deckLayout.channel}
                onChange={(event) =>
                  setDeckPosition({ channel: event.target.value as DeckChannel })
                }
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              X ({deckLayout.x})
              <input
                type="range"
                min={0}
                max={Math.max(0, deckLayout.laneWidth - 180)}
                value={deckLayout.x}
                onChange={(event) =>
                  setDeckPosition({ x: Number(event.target.value) })
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Y ({deckLayout.y})
              <input
                type="range"
                min={-160}
                max={300}
                value={deckLayout.y}
                onChange={(event) =>
                  setDeckPosition({ y: Number(event.target.value) })
                }
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Lane Width ({deckLayout.laneWidth})
              <input
                type="range"
                min={260}
                max={400}
                step={10}
                value={deckLayout.laneWidth}
                onChange={(event) => {
                  const laneWidth = Number(event.target.value)
                  const clampedX = Math.min(deckLayout.x, Math.max(0, laneWidth - 180))
                  setDeckPosition({ laneWidth, x: clampedX })
                }}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Monkey Y ({monkeyOffsetY})
              <input
                type="range"
                min={-260}
                max={200}
                value={monkeyOffsetY}
                onChange={(event) => setMonkeyOffsetY(Number(event.target.value))}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Oscillation (+-) {oscillationRange}
              <input
                type="range"
                min={0}
                max={50}
                value={oscillationRange}
                onChange={(event) => setOscillationRange(Number(event.target.value))}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Random Movement
              <button
                type="button"
                onClick={() => setRandomMovementEnabled((enabled) => !enabled)}
                className={`border-4 border-black px-3 py-2 text-sm font-black uppercase ${randomMovementEnabled ? "bg-green-300" : "bg-gray-300"}`}
              >
                {randomMovementEnabled ? "On" : "Off"}
              </button>
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Monkey Reaction
              <select
                className="border-4 border-black bg-white px-2 py-2 text-sm font-black"
                value={monkeyReactionSelection}
                onChange={(event) => setMonkeyReactionSelection(event.target.value)}
              >
                {MONKEY_REACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Bob Mode
              <select
                className="border-4 border-black bg-white px-2 py-2 text-sm font-black"
                value={bobMode}
                onChange={(event) => setBobMode(event.target.value as BobMode)}
              >
                <option value="always">Always Bob</option>
                <option value="shuffle">Bob On Shuffle</option>
                <option value="off">Off</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Bob Speed ({bobbingSpeed.toFixed(2)}s)
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={bobSpeedToControl(bobbingSpeed)}
                onChange={(event) => setBobbingSpeed(bobControlToSpeed(Number(event.target.value)))}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Card Turn Pace ({(cardTurnPaceMs / 1000).toFixed(2)}s)
              <input
                type="range"
                min={100}
                max={1600}
                step={50}
                value={cardTurnPaceMs}
                onChange={(event) => setCardTurnPaceMs(Number(event.target.value))}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Deck + Monkey Scale ({deckScale.toFixed(2)}x)
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={deckScale}
                onChange={(event) => setDeckScale(Number(event.target.value))}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Randomize Scale
              <button
                type="button"
                onClick={() => setRandomizeScaleEnabled((enabled) => !enabled)}
                className={`border-4 border-black px-3 py-2 text-sm font-black uppercase ${randomizeScaleEnabled ? "bg-green-300" : "bg-gray-300"}`}
              >
                {randomizeScaleEnabled ? "On" : "Off"}
              </button>
            </label>

            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-widest">
              Allow Swear
              <button
                type="button"
                onClick={() => setAllowSwearRandom((enabled) => !enabled)}
                className={`border-4 border-black px-3 py-2 text-sm font-black uppercase ${allowSwearRandom ? "bg-green-300" : "bg-gray-300"}`}
              >
                {allowSwearRandom ? "On" : "Off"}
              </button>
            </label>
          </div>
        </Card>

        <div className="w-full h-[32rem] grid grid-cols-[minmax(280px,2fr)_minmax(0,980px)_minmax(280px,2fr)] gap-6 items-start">
          <div className="relative h-full overflow-visible">
            {deckLayout.channel === "left" && showDeck && (
              <div
                className={`absolute ${isShuffling ? "z-20" : "z-10"}`}
                style={{
                  right: deckLayout.x,
                  top: deckLayout.y,
                  transform: `scale(${deckScale})`,
                  transformOrigin: "top center"
                }}
              >
                {shouldShowMonkeySprite && (
                  <img
                    src={isShuffling || isMonkeySettling ? MONKEY_THINKING_IMAGE : monkeyImageSrc}
                    alt="Thinking monkey"
                    className="absolute w-[280px] h-[280px] object-contain pointer-events-none select-none transition-[top] duration-500 ease-out"
                    style={{
                      left: "50%",
                      top: monkeyOffsetY,
                      transform: shouldBob ? undefined : "translateX(-50%)",
                      ["--monkey-bob-range" as string]: `${oscillationRange}px`,
                      animation: shouldBob ? `monkeyBob ${bobbingSpeed}s ease-in-out infinite` : "none"
                    }}
                  />
                )}
                {isShuffling ? (
                  <div className="relative w-48 h-64 overflow-visible">
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200 animate-[shuffleA_900ms_ease-in-out_forwards]" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-blue-200 animate-[shuffleB_900ms_ease-in-out_forwards]" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-pink-200 animate-[shuffleC_900ms_ease-in-out_forwards]" />
                  </div>
                ) : (
                  <div className="relative w-48 h-64">
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200 -translate-x-3 -translate-y-1 -rotate-6" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-blue-200 translate-x-3 -translate-y-1 rotate-6" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-pink-200 translate-y-2" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative h-full">
            {!isShuffling && cards.length > 0 && (
              <div className="absolute inset-0 z-20 flex justify-center items-start gap-8">
                {cards.map((card, index) => (
                  <DynamicCard
                    key={card.id}
                    card={card}
                    index={index}
                    animate={animate}
                    reveal={index < revealedCount}
                    deckChannel={deckLayout.channel}
                    turnDurationMs={cardTurnPaceMs}
                  />
                ))}
              </div>
            )}

            {!isShuffling && cards.length === 0 && (
              <div className="text-center text-black py-12 font-black uppercase tracking-widest">
                <p>CLICK "DRAW CARDS" TO BEGIN</p>
              </div>
            )}
          </div>

          <div className="relative h-full overflow-visible">
            {deckLayout.channel === "right" && showDeck && (
              <div
                className={`absolute ${isShuffling ? "z-20" : "z-10"}`}
                style={{
                  left: deckLayout.x,
                  top: deckLayout.y,
                  transform: `scale(${deckScale})`,
                  transformOrigin: "top center"
                }}
              >
                {shouldShowMonkeySprite && (
                  <img
                    src={isShuffling || isMonkeySettling ? MONKEY_THINKING_IMAGE : monkeyImageSrc}
                    alt="Thinking monkey"
                    className="absolute w-[280px] h-[280px] object-contain pointer-events-none select-none transition-[top] duration-500 ease-out"
                    style={{
                      left: "50%",
                      top: monkeyOffsetY,
                      transform: shouldBob ? undefined : "translateX(-50%)",
                      ["--monkey-bob-range" as string]: `${oscillationRange}px`,
                      animation: shouldBob ? `monkeyBob ${bobbingSpeed}s ease-in-out infinite` : "none"
                    }}
                  />
                )}
                {isShuffling ? (
                  <div className="relative w-48 h-64 overflow-visible">
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200 animate-[shuffleA_900ms_ease-in-out_forwards]" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-blue-200 animate-[shuffleB_900ms_ease-in-out_forwards]" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-pink-200 animate-[shuffleC_900ms_ease-in-out_forwards]" />
                  </div>
                ) : (
                  <div className="relative w-48 h-64">
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200 -translate-x-3 -translate-y-1 -rotate-6" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-blue-200 translate-x-3 -translate-y-1 rotate-6" />
                    <div className="absolute inset-0 border-8 border-black rounded-none bg-pink-200 translate-y-2" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes monkeyBob {
            0% { transform: translateX(-50%) translateY(0px); }
            50% { transform: translateX(-50%) translateY(calc(var(--monkey-bob-range, 10px) * -1)); }
            100% { transform: translateX(-50%) translateY(0px); }
          }
          @keyframes shuffleA {
            0% { transform: translate(0, 0) rotate(0deg); z-index: 3; }
            30% { transform: translate(-120px, -12px) rotate(-12deg); z-index: 2; }
            65% { transform: translate(90px, 8px) rotate(9deg); z-index: 1; }
            100% { transform: translate(-12px, -4px) rotate(-6deg); z-index: 1; }
          }
          @keyframes shuffleB {
            0% { transform: translate(0, 0) rotate(0deg); z-index: 2; }
            35% { transform: translate(110px, -10px) rotate(11deg); z-index: 3; }
            70% { transform: translate(-95px, 6px) rotate(-8deg); z-index: 2; }
            100% { transform: translate(12px, -4px) rotate(6deg); z-index: 2; }
          }
          @keyframes shuffleC {
            0% { transform: translate(0, 0) rotate(0deg); z-index: 1; }
            25% { transform: translate(0, -75px) rotate(4deg); z-index: 4; }
            60% { transform: translate(0, 65px) rotate(-4deg); z-index: 2; }
            100% { transform: translate(0, 8px) rotate(0deg); z-index: 4; }
          }
        `}</style>
      </div>
    </div>
  )
}
