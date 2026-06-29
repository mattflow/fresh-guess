import { createFileRoute } from '@tanstack/react-router'
import { GameProvider, useGame } from '../components/game/GameProvider'
import PlayerSetup from '../components/game/PlayerSetup'
import PickingScreen from '../components/game/PickingScreen'
import RevealScreen from '../components/game/RevealScreen'

export const Route = createFileRoute('/play')({ component: PlayPage })

function PlayPage() {
  return (
    <main className="page-wrap px-4 pb-16 pt-10">
      <GameProvider>
        <GamePhase />
      </GameProvider>
    </main>
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
