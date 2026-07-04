import { createFileRoute } from '@tanstack/react-router'
import { GameProvider, useGame } from '../components/game/GameProvider'
import PlayerSetup from '../components/game/PlayerSetup'
import PickingScreen from '../components/game/PickingScreen'
import RevealScreen from '../components/game/RevealScreen'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main>
      <GameProvider>
        <GamePhase />
      </GameProvider>
    </main>
  )
}

function GamePhase() {
  const { state } = useGame()
  // The picking screen owns the full viewport (fixed, keyboard-aware layout), so
  // it renders bare. Setup/reveal keep the padded, centered column.
  if (state.phase === 'picking') return <PickingScreen />
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-16">
      {state.phase === 'reveal' ? <RevealScreen /> : <PlayerSetup />}
    </div>
  )
}
