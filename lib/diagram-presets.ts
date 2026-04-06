import { nanoid } from "nanoid"
import { STORAGE_KEYS } from "@/lib/storage"

export type DiagramPresetSource = "built-in" | "custom"

export interface DiagramPreset {
    id: string
    title: string
    description?: string
    instructions: string
    source: DiagramPresetSource
    enabled: boolean
    createdAt: number
    updatedAt: number
}

export interface DiagramPresetInput {
    title: string
    description?: string
    instructions: string
    enabled?: boolean
}

const BUILT_IN_DIAGRAM_PRESETS: DiagramPreset[] = [
    {
        id: "builtin-general-architecture",
        title: "General Architecture",
        description: "Balanced software architecture diagrams for broad usage.",
        instructions:
            "Create a clear architecture diagram with obvious boundaries, short labels, consistent spacing, and tidy orthogonal connectors. Prefer a left-to-right or top-to-bottom flow based on readability.",
        source: "built-in",
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
    },
    {
        id: "builtin-cloud-architecture",
        title: "Cloud Architecture",
        description:
            "Infrastructure-oriented architecture with clear service grouping.",
        instructions:
            "Emphasize system boundaries, managed services, data stores, queues, and ingress points. Group related cloud resources together and keep infrastructure naming concise and production-like.",
        source: "built-in",
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
    },
    {
        id: "builtin-executive-summary",
        title: "Executive Summary",
        description:
            "High-level diagrams for presentations and stakeholder reviews.",
        instructions:
            "Keep the diagram high-level and presentation-friendly. Limit detail, reduce node count, avoid implementation jargon, and favor a clean visual hierarchy over exhaustive completeness.",
        source: "built-in",
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
    },
]

function normalizePresetText(value: string | undefined): string | undefined {
    const normalized = value?.trim()
    return normalized ? normalized : undefined
}

function hasStorage() {
    return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

export function getBuiltInDiagramPresets(): DiagramPreset[] {
    return BUILT_IN_DIAGRAM_PRESETS.map((preset) => ({ ...preset }))
}

export function createCustomDiagramPreset(
    input: DiagramPresetInput,
    now = Date.now(),
): DiagramPreset {
    return {
        id: nanoid(),
        title: input.title.trim(),
        description: normalizePresetText(input.description),
        instructions: input.instructions.trim(),
        source: "custom",
        enabled: input.enabled ?? true,
        createdAt: now,
        updatedAt: now,
    }
}

export function updateCustomDiagramPreset(
    preset: DiagramPreset,
    input: DiagramPresetInput,
    now = Date.now(),
): DiagramPreset {
    return {
        ...preset,
        title: input.title.trim(),
        description: normalizePresetText(input.description),
        instructions: input.instructions.trim(),
        enabled: input.enabled ?? preset.enabled,
        updatedAt: now,
    }
}

export function combineDiagramPresets(
    customPresets: DiagramPreset[],
): DiagramPreset[] {
    const normalizedCustomPresets = customPresets
        .filter((preset) => preset.source === "custom")
        .map((preset) => ({ ...preset }))
        .sort((a, b) => b.updatedAt - a.updatedAt)

    return [...getBuiltInDiagramPresets(), ...normalizedCustomPresets]
}

export function getEnabledDiagramPresets(
    presets: DiagramPreset[],
): DiagramPreset[] {
    return presets.filter((preset) => preset.enabled)
}

export function getSelectedDiagramPreset(
    presets: DiagramPreset[],
    selectedPresetId: string | null | undefined,
): DiagramPreset | null {
    if (!selectedPresetId) return null

    const preset = presets.find((item) => item.id === selectedPresetId)
    if (!preset?.enabled) {
        return null
    }

    return preset
}

export function buildDiagramPresetSystemSection(
    preset:
        | Pick<DiagramPreset, "title" | "description" | "instructions">
        | null
        | undefined,
): string {
    if (!preset) return ""

    const descriptionLine = preset.description
        ? `Description: ${preset.description}\n`
        : ""

    return `## Diagram generation preset
Title: ${preset.title}
${descriptionLine}Treat the following as generation constraints for this request. Apply them to diagram structure, labeling, and visual emphasis without mentioning the preset unless the user explicitly asks.

"""text
${preset.instructions}
"""`.trim()
}

export function readCustomDiagramPresets(): DiagramPreset[] {
    if (!hasStorage()) return []

    try {
        const raw = localStorage.getItem(STORAGE_KEYS.diagramPresets)
        if (!raw) return []

        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []

        return parsed.filter((preset): preset is DiagramPreset => {
            return (
                preset &&
                typeof preset === "object" &&
                typeof preset.id === "string" &&
                typeof preset.title === "string" &&
                typeof preset.instructions === "string" &&
                preset.source === "custom" &&
                typeof preset.enabled === "boolean" &&
                typeof preset.createdAt === "number" &&
                typeof preset.updatedAt === "number"
            )
        })
    } catch {
        return []
    }
}

export function writeCustomDiagramPresets(presets: DiagramPreset[]) {
    if (!hasStorage()) return

    const customPresets = presets.filter((preset) => preset.source === "custom")
    localStorage.setItem(
        STORAGE_KEYS.diagramPresets,
        JSON.stringify(customPresets),
    )
}

export function readSelectedDiagramPresetId(): string | null {
    if (!hasStorage()) return null
    return localStorage.getItem(STORAGE_KEYS.selectedDiagramPresetId)
}

export function writeSelectedDiagramPresetId(
    selectedPresetId: string | null | undefined,
) {
    if (!hasStorage()) return

    if (!selectedPresetId) {
        localStorage.removeItem(STORAGE_KEYS.selectedDiagramPresetId)
        return
    }

    localStorage.setItem(STORAGE_KEYS.selectedDiagramPresetId, selectedPresetId)
}
