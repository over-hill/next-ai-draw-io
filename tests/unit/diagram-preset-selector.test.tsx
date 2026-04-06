import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DiagramPresetSelector } from "@/components/diagram-preset-selector"
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

function renderSelector(
    overrides: Partial<ComponentProps<typeof DiagramPresetSelector>> = {},
) {
    const onSelect = vi.fn()

    render(
        <DictionaryProvider dictionary={en}>
            <DiagramPresetSelector
                presets={PRESETS}
                selectedPresetId={PRESETS[0].id}
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

describe("DiagramPresetSelector", () => {
    it("opens a top-level popover panel and selects a preset on click", async () => {
        const user = userEvent.setup()
        const { onSelect } = renderSelector()

        await user.click(screen.getByTestId("diagram-preset-trigger"))
        await user.click(
            screen.getByTestId(`diagram-preset-option-${PRESETS[1].id}`),
        )

        expect(onSelect).toHaveBeenCalledWith(PRESETS[1].id)
    })

    it("clears the current preset from the compact chip", async () => {
        const user = userEvent.setup()
        const { onSelect } = renderSelector()

        await user.click(screen.getByTestId("diagram-preset-clear"))

        expect(onSelect).toHaveBeenCalledWith(null)
    })

    it("supports choosing the no-template option from the popover", async () => {
        const user = userEvent.setup()
        const { onSelect } = renderSelector()

        await user.click(screen.getByTestId("diagram-preset-trigger"))
        await user.click(screen.getByTestId("diagram-preset-option-none"))

        expect(onSelect).toHaveBeenCalledWith(null)
    })
})
