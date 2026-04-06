import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DiagramPresetManager } from "@/components/diagram-preset-manager"
import { DictionaryProvider } from "@/hooks/use-dictionary"
import type { DiagramPreset } from "@/lib/diagram-presets"
import en from "@/lib/i18n/dictionaries/en.json"

const PRESETS: DiagramPreset[] = [
    {
        id: "builtin-general-architecture",
        title: "General Architecture",
        description: "Balanced software architecture diagrams for broad usage.",
        instructions:
            "Create a clear architecture diagram with obvious boundaries.",
        source: "built-in",
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
    },
    {
        id: "custom-domain-style",
        title: "Domain Style",
        description: "Custom domain-oriented constraints.",
        instructions: "Group services by domain and keep arrows directional.",
        source: "custom",
        enabled: true,
        createdAt: 1,
        updatedAt: 2,
    },
]

const DETAILS_TITLE = "Template details"

function renderManager() {
    return render(
        <DictionaryProvider dictionary={en}>
            <DiagramPresetManager
                open
                onOpenChange={vi.fn()}
                presets={PRESETS}
                onCreatePreset={vi.fn()}
                onUpdatePreset={vi.fn()}
                onDeletePreset={vi.fn()}
            />
        </DictionaryProvider>,
    )
}

describe("DiagramPresetManager", () => {
    it("does not expose preset switching controls inside the settings manager", () => {
        renderManager()

        expect(
            screen.queryByRole("button", {
                name: en.diagramPresets.usePreset,
            }),
        ).toBeNull()
        expect(
            screen.queryByRole("button", {
                name: en.diagramPresets.clearSelection,
            }),
        ).toBeNull()
        expect(screen.queryByText(en.diagramPresets.active)).toBeNull()
    })

    it("shows read-only details in the side panel and opens a separate dialog for new templates", async () => {
        const user = userEvent.setup()

        renderManager()

        expect(
            screen.getByRole("heading", {
                name: DETAILS_TITLE,
            }),
        ).not.toBeNull()
        expect(screen.queryByLabelText(en.diagramPresets.title)).toBeNull()

        await user.click(
            screen.getByRole("button", { name: en.diagramPresets.create }),
        )

        const editorDialog = screen.getByRole("dialog", {
            name: en.diagramPresets.create,
        })

        expect(
            within(editorDialog).getByLabelText(en.diagramPresets.title),
        ).not.toBeNull()
        expect(
            screen.getAllByRole("heading", {
                name: DETAILS_TITLE,
                hidden: true,
            }).length,
        ).toBeGreaterThan(0)
    })

    it("keeps the editor dialog constrained and scrollable when the form is tall", async () => {
        const user = userEvent.setup()

        renderManager()

        await user.click(
            screen.getByRole("button", { name: en.diagramPresets.create }),
        )

        const editorDialog = screen.getByRole("dialog", {
            name: en.diagramPresets.create,
        })
        const editorBody = within(editorDialog).getByTestId(
            "diagram-preset-editor-body",
        )

        expect(editorDialog.className).toContain("max-h-[90vh]")
        expect(editorDialog.className).toContain("overflow-hidden")
        expect(editorBody.className).toContain("overflow-y-auto")
        expect(editorBody.className).toContain("min-h-0")
    })
})
