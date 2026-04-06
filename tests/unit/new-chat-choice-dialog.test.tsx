import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NewChatChoiceDialog } from "@/components/new-chat-choice-dialog"
import { DictionaryProvider } from "@/hooks/use-dictionary"
import en from "@/lib/i18n/dictionaries/en.json"

function renderDialog(
    overrides: Partial<ComponentProps<typeof NewChatChoiceDialog>> = {},
) {
    const onOpenChange = vi.fn()
    const onStartBlank = vi.fn()
    const onImport = vi.fn().mockResolvedValue(undefined)

    render(
        <DictionaryProvider
            dictionary={{
                ...en,
                dialogs: {
                    ...en.dialogs,
                    newChatChoiceTitle: "Start a new chat",
                    newChatChoiceDescription:
                        "Import a saved diagram into a fresh chat or start blank.",
                    newChatChoiceImport: "Import diagram",
                    newChatChoiceBlank: "Start blank chat",
                },
            }}
        >
            <NewChatChoiceDialog
                open
                onOpenChange={onOpenChange}
                onStartBlank={onStartBlank}
                onImport={onImport}
                {...overrides}
            />
        </DictionaryProvider>,
    )

    return { onOpenChange, onStartBlank, onImport }
}

afterEach(() => {
    cleanup()
})

describe("NewChatChoiceDialog", () => {
    it("starts a blank chat when the primary action is clicked", async () => {
        const user = userEvent.setup()
        const { onStartBlank } = renderDialog()

        await user.click(screen.getByTestId("new-chat-choice-start-blank"))

        expect(onStartBlank).toHaveBeenCalledTimes(1)
    })

    it("passes the selected file to the import handler", async () => {
        const user = userEvent.setup()
        const file = new File(["<mxfile></mxfile>"], "example.drawio", {
            type: "application/xml",
        })
        const { onImport } = renderDialog()

        await user.upload(
            screen.getByTestId("new-chat-choice-file-input"),
            file,
        )

        expect(onImport).toHaveBeenCalledWith(file)
    })

    it("closes the dialog when cancel is clicked", async () => {
        const user = userEvent.setup()
        const { onOpenChange } = renderDialog()

        await user.click(screen.getByTestId("new-chat-choice-cancel"))

        expect(onOpenChange).toHaveBeenCalledWith(false)
    })
})
