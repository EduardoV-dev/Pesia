/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { RemoveProfileSection } from "./index"

vi.mock("@/features/profiles/server/remove-profile-actions", () => ({
  removeProfileAction: vi.fn(async () => ({})),
}))

afterEach(cleanup)

describe("RemoveProfileSection", () => {
  it("names the person and states the history stays, before any confirm control", async () => {
    render(<RemoveProfileSection profileId="p-mara" displayName="Mara" />)

    expect(screen.queryByRole("alertdialog")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Quitar perfil" }))

    const dialog = screen.getByRole("alertdialog")

    expect(dialog.textContent).toContain("¿Quitar a Mara?")
    expect(dialog.textContent).toContain("La historia que el grupo ya vio sigue estando ahí")
    expect(screen.getByRole("button", { name: "Quitar a Mara" })).toBeTruthy()
  })

  it("cancels without removing", async () => {
    render(<RemoveProfileSection profileId="p-mara" displayName="Mara" />)

    await userEvent.click(screen.getByRole("button", { name: "Quitar perfil" }))
    await userEvent.click(screen.getByRole("button", { name: "Mejor no" }))

    const { removeProfileAction } = await import("@/features/profiles/server/remove-profile-actions")

    expect(removeProfileAction).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})
