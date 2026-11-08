/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"

import type { AssembleGroupBoardReturn, BoardMemberCard } from "@/features/board/board-payload"
import { BoardPage } from "./index"

afterEach(cleanup)

const publishAction = () => Promise.resolve()

const fullCard = {
  kind: "full",
  profileId: "p-nina",
  displayName: "Nina",
  avatarEmoji: null,
  isViewer: true,
  rankingOptOut: false,
  latestWeightKg: 70.2,
  unit: "kg",
  sparkline: null,
  direction: "toward",
  progress: { percentage: 60, distanceToBandKg: null },
  awardTypes: ["best_streak"],
  isDue: true,
  latestNote: null,
} satisfies BoardMemberCard

const latestOnlyCard = {
  kind: "latestOnly",
  profileId: "p-beto",
  displayName: "Beto",
  avatarEmoji: null,
  isViewer: false,
  rankingOptOut: false,
  latestWeightKg: null,
  unit: "kg",
  isDue: false,
  latestNote: null,
} satisfies BoardMemberCard

const dependentCard = {
  kind: "dependent",
  profileId: "p-depu",
  displayName: "Depu",
  avatarEmoji: "🐣",
  isViewer: false,
  latestWeightKg: 55.5,
  unit: "kg",
  direction: "stable",
  latestNote: null,
} satisfies BoardMemberCard

const nameOnlyCard = {
  kind: "nameOnly",
  profileId: "p-sofi",
  displayName: "Sofía",
  avatarEmoji: null,
  isViewer: false,
  rankingOptOut: false,
  unit: "kg",
  isDue: false,
  latestNote: null,
} satisfies BoardMemberCard

const boardPayloadFor = (members: readonly BoardMemberCard[]) =>
  ({
    group: { id: "g1", name: "Familia López" },
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    members,
    consistencyStrip: [{ profileId: "p-nina", awardTypes: ["best_streak"] }],
    viewerReveal: { claimId: "c1", isPublic: false },
  }) satisfies AssembleGroupBoardReturn

describe("BoardPage rendering", () => {
  it("renders the private member as a placeholder with no name and no number", () => {
    render(
      <BoardPage board={boardPayloadFor([fullCard, { kind: "private" }])} publishAction={publishAction} />,
    )

    const placeholder = screen.getByRole("article", { name: "Privado" })

    expect(within(placeholder).queryByText(/kg/)).toBeNull()
    expect(placeholder.textContent).not.toMatch(/\d/)
    expect(screen.queryByText("Zaira")).toBeNull()
  })

  it("renders a dependent card with direction and no progress bar", () => {
    render(<BoardPage board={boardPayloadFor([dependentCard])} publishAction={publishAction} />)

    const card = screen.getByRole("article", { name: "Depu" })

    expect(within(card).getByText("Estable")).toBeTruthy()
    expect(within(card).queryByText(/Avance/)).toBeNull()
    expect(within(card).queryByText(/% del camino|%\./)).toBeNull()
  })

  it("renders the name-only card with no weight at all", () => {
    render(<BoardPage board={boardPayloadFor([nameOnlyCard])} publishAction={publishAction} />)

    const card = screen.getByRole("article", { name: "Sofía" })

    expect(within(card).queryByText(/kg/)).toBeNull()
    expect(card.textContent).not.toMatch(/\d/)
  })

  it("never renders a body-size comparison in the consistency strip", () => {
    render(
      <BoardPage
        board={boardPayloadFor([fullCard, dependentCard, nameOnlyCard, latestOnlyCard])}
        publishAction={publishAction}
      />,
    )
    const strip = screen.getByRole("region", { name: "Quién se mantiene" })

    expect(within(strip).getByText("Nina")).toBeTruthy()
    expect(within(strip).getByText("Mejor racha")).toBeTruthy()
    expect(within(strip).queryByText(/kg|lb/)).toBeNull()
    expect(within(strip).queryByText(/% ?$|por ciento/)).toBeNull()
  })

  it("shows the viewer's own reveal with its publish control", () => {
    render(<BoardPage board={boardPayloadFor([fullCard])} publishAction={publishAction} />)

    expect(screen.getByText("Me moví más en el mes")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Publicar en el grupo" })).toBeTruthy()
  })

  it("shows the empty state for a group with no recorded weigh-ins", () => {
    render(<BoardPage board={boardPayloadFor([latestOnlyCard, nameOnlyCard])} publishAction={publishAction} />)

    expect(screen.getByText("Todavía no hay pesadas registradas")).toBeTruthy()
  })
})
