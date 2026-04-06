import { beforeEach, describe, expect, it } from "vitest"
import {
    buildDiagramPresetSystemSection,
    combineDiagramPresets,
    createCustomDiagramPreset,
    type DiagramPreset,
    getEnabledDiagramPresets,
    getSelectedDiagramPreset,
    readCustomDiagramPresets,
    readSelectedDiagramPresetId,
    updateCustomDiagramPreset,
    writeCustomDiagramPresets,
    writeSelectedDiagramPresetId,
} from "@/lib/diagram-presets"

function makeCustomPreset(
    overrides: Partial<DiagramPreset> & Pick<DiagramPreset, "id">,
): DiagramPreset {
    const { id, ...restOverrides } = overrides

    return {
        id,
        title: "Custom Preset",
        description: "Custom description",
        instructions: "Use a clean architecture layout.",
        source: "custom",
        enabled: true,
        createdAt: 100,
        updatedAt: 100,
        ...restOverrides,
    }
}

describe("diagram presets", () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it("creates a trimmed custom preset with metadata", () => {
        const preset = createCustomDiagramPreset(
            {
                title: "  AWS Architecture  ",
                description: "  Use AWS icons  ",
                instructions: "  Keep left-to-right flow.  ",
            },
            123,
        )

        expect(preset.title).toBe("AWS Architecture")
        expect(preset.description).toBe("Use AWS icons")
        expect(preset.instructions).toBe("Keep left-to-right flow.")
        expect(preset.source).toBe("custom")
        expect(preset.enabled).toBe(true)
        expect(preset.createdAt).toBe(123)
        expect(preset.updatedAt).toBe(123)
    })

    it("updates a custom preset while preserving identity and creation time", () => {
        const preset = makeCustomPreset({
            id: "custom-1",
            createdAt: 10,
            updatedAt: 20,
        })

        const updated = updateCustomDiagramPreset(
            preset,
            {
                title: "Revised",
                description: "Updated description",
                instructions: "Prefer grouped boundaries.",
                enabled: false,
            },
            99,
        )

        expect(updated.id).toBe("custom-1")
        expect(updated.createdAt).toBe(10)
        expect(updated.updatedAt).toBe(99)
        expect(updated.enabled).toBe(false)
        expect(updated.title).toBe("Revised")
    })

    it("combines built-in and custom presets", () => {
        const presets = combineDiagramPresets([
            makeCustomPreset({ id: "custom-1", updatedAt: 50 }),
            makeCustomPreset({ id: "custom-2", updatedAt: 100 }),
        ])

        expect(presets.some((preset) => preset.source === "built-in")).toBe(
            true,
        )
        expect(presets.find((preset) => preset.id === "custom-2")).toBeTruthy()
        expect(presets.find((preset) => preset.id === "custom-1")).toBeTruthy()
    })

    it("filters enabled presets and ignores disabled selection", () => {
        const enabled = makeCustomPreset({ id: "enabled-1", enabled: true })
        const disabled = makeCustomPreset({ id: "disabled-1", enabled: false })
        const presets = combineDiagramPresets([enabled, disabled])

        expect(
            getEnabledDiagramPresets(presets).some(
                (preset) => preset.id === "enabled-1",
            ),
        ).toBe(true)
        expect(
            getEnabledDiagramPresets(presets).some(
                (preset) => preset.id === "disabled-1",
            ),
        ).toBe(false)
        expect(getSelectedDiagramPreset(presets, "disabled-1")).toBeNull()
        expect(getSelectedDiagramPreset(presets, "enabled-1")?.id).toBe(
            "enabled-1",
        )
    })

    it("builds a prompt section for an active preset", () => {
        const section = buildDiagramPresetSystemSection(
            makeCustomPreset({
                id: "custom-1",
                title: "Executive Architecture",
                description: "High-level summary diagrams",
                instructions: "Limit to six nodes and muted colors.",
            }),
        )

        expect(section).toContain("Diagram generation preset")
        expect(section).toContain("Executive Architecture")
        expect(section).toContain("Limit to six nodes and muted colors.")
    })

    it("persists custom presets and selected ids in localStorage", () => {
        const customPresets = [
            makeCustomPreset({ id: "custom-1" }),
            makeCustomPreset({ id: "custom-2", enabled: false }),
        ]

        writeCustomDiagramPresets(customPresets)
        writeSelectedDiagramPresetId("custom-1")

        expect(readCustomDiagramPresets()).toEqual(customPresets)
        expect(readSelectedDiagramPresetId()).toBe("custom-1")
    })
})
