import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SessionHistoryPopover } from "@/components/session-history-popover"
import { DictionaryProvider } from "@/hooks/use-dictionary"
import en from "@/lib/i18n/dictionaries/en.json"

const SESSIONS = [
    {
        id: "session-1",
        title: "Payments architecture",
        updatedAt: Date.now(),
    },
    {
        id: "session-2",
        title: "Order workflow",
        updatedAt: Date.now() - 60_000,
    },
]

function renderPopover(
    overrides: Partial<ComponentProps<typeof SessionHistoryPopover>> = {},
) {
    const onSelect = vi.fn()

    render(
        <DictionaryProvider dictionary={en}>
            <SessionHistoryPopover
                sessions={SESSIONS}
                currentSessionId="session-1"
                onSelect={onSelect}
                {...overrides}
            />
        </DictionaryProvider>,
    )

    return { onSelect }
}

afterEach(() => {
    cleanup()
})

describe("SessionHistoryPopover", () => {
    it("shows an empty state when there are no sessions", async () => {
        const user = userEvent.setup()
        renderPopover({ sessions: [], currentSessionId: null })

        await user.click(screen.getByTestId("session-history-trigger"))

        expect(screen.getByText(en.sessionHistory.empty)).toBeTruthy()
        expect(screen.getByText(en.sessionHistory.emptyHint)).toBeTruthy()
    })

    it("calls onSelect when a session is clicked", async () => {
        const user = userEvent.setup()
        const { onSelect } = renderPopover()

        await user.click(screen.getByTestId("session-history-trigger"))
        await user.click(screen.getByTestId("session-history-item-session-2"))

        expect(onSelect).toHaveBeenCalledWith("session-2")
    })

    it("marks the current session as active", async () => {
        const user = userEvent.setup()
        renderPopover()

        await user.click(screen.getByTestId("session-history-trigger"))

        expect(
            screen.getByTestId("session-history-item-session-1").className,
        ).toContain("bg-accent")
    })
})
