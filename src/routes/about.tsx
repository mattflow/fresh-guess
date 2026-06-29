import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: HowToPlay,
})

function HowToPlay() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">How to play</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Closest to 160 wins.
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          Fresh Guess is a pass-and-play party game for one phone. Each player tries to choose 3
          movies whose Rotten Tomatoes Tomatometer (critics) scores add up as close to 160 as
          possible — without ever seeing the scores while picking.
        </p>

        <ol className="mt-6 flex max-w-3xl list-decimal flex-col gap-3 pl-5 text-[var(--sea-ink-soft)]">
          <li>
            <strong className="text-[var(--sea-ink)]">Register players.</strong> Add everyone
            playing on this device (2 or more).
          </li>
          <li>
            <strong className="text-[var(--sea-ink)]">Take turns.</strong> On your turn, search
            and select 3 movies. Scores stay hidden — guess with your gut.
          </li>
          <li>
            <strong className="text-[var(--sea-ink)]">Pass the phone.</strong> Lock in your picks
            and hand the phone to the next player.
          </li>
          <li>
            <strong className="text-[var(--sea-ink)]">Reveal.</strong> After everyone's gone, all
            scores appear. The player whose total is closest to 160 wins — ties share the win.
          </li>
        </ol>

        <div className="mt-7">
          <Link
            to="/play"
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-6 py-3 text-base font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            Start a game →
          </Link>
        </div>
      </section>
    </main>
  )
}
