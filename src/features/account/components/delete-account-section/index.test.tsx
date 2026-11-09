/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { DeleteAccountSection } from "./index"

vi.mock("@/features/account/account-actions", () => ({
  deleteAccountAction: vi.fn(async () => undefined),
}))

afterEach(cleanup)

describe("DeleteAccountSection", () => {
  it("shows the removed/kept disclosure only inside the confirmation", async () => {
    render(<DeleteAccountSection />)

    expect(screen.queryByText("¿Borrar la cuenta para siempre?")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Quiero borrar mi cuenta" }))

    const dialog = screen.getByRole("alertdialog")

    expect(dialog).toBeTruthy()
    expect(dialog.textContent).toContain("Las pesadas que registraste sobre otras personas siguen")
    expect(dialog.textContent).toContain("no hay vuelta atrás")
    expect(within(dialog).getByRole("button", { name: "Mejor no" })).toBeTruthy()
  })

  it("can cancel and lose nothing", async () => {
    render(<DeleteAccountSection />)

    await userEvent.click(screen.getByRole("button", { name: "Quiero borrar mi cuenta" }))
    await userEvent.click(screen.getByRole("button", { name: "Mejor no" }))

    const { deleteAccountAction } = await import("@/features/account/account-actions")

    expect(deleteAccountAction).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})
