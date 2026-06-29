import { createFileRoute } from '@tanstack/react-router'
import ThemeToggle from '../components/ThemeToggle'
import { GameProvider, useGame } from '../components/game/GameProvider'
import PlayerSetup from '../components/game/PlayerSetup'
import PickingScreen from '../components/game/PickingScreen'
import RevealScreen from '../components/game/RevealScreen'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <>
      <ThemeToggle />
      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-16">
        <GameProvider>
          <GamePhase />
        </GameProvider>
      </main>
    </>
  )
}

function GamePhase() {
  const { state } = useGame()
  switch (state.phase) {
    case 'picking':
      return <PickingScreen />
    case 'reveal':
      return <RevealScreen />
    case 'setup':
    default:
      return <PlayerSetup />
  }
}
