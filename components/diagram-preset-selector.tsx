"use client"

import { Check, LayoutTemplate, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useDictionary } from "@/hooks/use-dictionary"
import type { DiagramPreset } from "@/lib/diagram-presets"
import { cn } from "@/lib/utils"

interface DiagramPresetSelectorProps {
    presets: DiagramPreset[]
    selectedPresetId: string | null
    onSelect: (presetId: string | null) => void
    disabled?: boolean
}

const NONE_VALUE = "__none__"

function resolveInspectedPresetId(
    presets: DiagramPreset[],
    currentPresetId: string | null,
    selectedPresetId: string | null,
) {
    if (currentPresetId === NONE_VALUE) {
        return currentPresetId
    }

    if (
        currentPresetId &&
        presets.some((preset) => preset.id === currentPresetId)
    ) {
        return currentPresetId
    }

    if (
        selectedPresetId &&
        presets.some((preset) => preset.id === selectedPresetId)
    ) {
        return selectedPresetId
    }

    return presets[0]?.id ?? NONE_VALUE
}

export function DiagramPresetSelector({
    presets,
    selectedPresetId,
    onSelect,
    disabled = false,
}: DiagramPresetSelectorProps) {
    const dict = useDictionary()
    const [open, setOpen] = useState(false)
    const [inspectedPresetId, setInspectedPresetId] = useState<string | null>(
        () => resolveInspectedPresetId(presets, null, selectedPresetId),
    )

    const selectedPreset = useMemo(
        () => presets.find((preset) => preset.id === selectedPresetId) ?? null,
        [presets, selectedPresetId],
    )

    const inspectedPreset = useMemo(
        () => presets.find((preset) => preset.id === inspectedPresetId) ?? null,
        [inspectedPresetId, presets],
    )

    useEffect(() => {
        if (!open) return

        setInspectedPresetId((currentPresetId) =>
            resolveInspectedPresetId(
                presets,
                currentPresetId,
                selectedPresetId,
            ),
        )
    }, [open, presets, selectedPresetId])

    const handleSelect = (presetId: string | null) => {
        onSelect(presetId)
        setOpen(false)
    }

    return (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        data-testid="diagram-preset-trigger"
                        className="h-8 shrink-0 rounded-xl px-3 text-xs"
                        aria-label={dict.chat.diagramPreset}
                    >
                        <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
                        {dict.chat.diagramPreset}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    className="w-[min(92vw,620px)] overflow-hidden p-0"
                >
                    <div className="flex max-h-[min(72vh,520px)] flex-col md:grid md:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="overflow-y-auto border-b border-border/60 bg-muted/10 p-2 md:border-r md:border-b-0">
                            <button
                                type="button"
                                data-testid="diagram-preset-option-none"
                                className={cn(
                                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                                    !selectedPresetId &&
                                        "bg-accent text-accent-foreground",
                                )}
                                onMouseEnter={() =>
                                    setInspectedPresetId(NONE_VALUE)
                                }
                                onFocus={() => setInspectedPresetId(NONE_VALUE)}
                                onClick={() => handleSelect(null)}
                            >
                                <span>{dict.chat.diagramPresetNone}</span>
                                {!selectedPresetId ? (
                                    <Check className="h-4 w-4" />
                                ) : null}
                            </button>

                            <div className="mt-2 space-y-1">
                                {presets.map((preset) => {
                                    const isSelected =
                                        selectedPresetId === preset.id
                                    const isInspected =
                                        inspectedPresetId === preset.id

                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            data-testid={`diagram-preset-option-${preset.id}`}
                                            className={cn(
                                                "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent",
                                                isSelected &&
                                                    "bg-accent text-accent-foreground",
                                                isInspected &&
                                                    !isSelected &&
                                                    "bg-muted text-foreground",
                                            )}
                                            onMouseEnter={() =>
                                                setInspectedPresetId(preset.id)
                                            }
                                            onFocus={() =>
                                                setInspectedPresetId(preset.id)
                                            }
                                            onClick={() =>
                                                handleSelect(preset.id)
                                            }
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {preset.title}
                                                </p>
                                                {preset.description && (
                                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                        {preset.description}
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected ? (
                                                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                                            ) : null}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="min-h-0 overflow-y-auto p-4">
                            {inspectedPreset ? (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-sm font-semibold">
                                            {inspectedPreset.title}
                                        </h3>
                                        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {inspectedPreset.source ===
                                            "built-in"
                                                ? dict.diagramPresets.builtIn
                                                : dict.diagramPresets.custom}
                                        </span>
                                    </div>

                                    {inspectedPreset.description ? (
                                        <p className="text-sm text-muted-foreground">
                                            {inspectedPreset.description}
                                        </p>
                                    ) : null}

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            {dict.diagramPresets.instructions}
                                        </p>
                                        <div className="max-h-[260px] overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-3 text-sm leading-6 whitespace-pre-wrap">
                                            {inspectedPreset.instructions}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold">
                                        {dict.chat.diagramPresetNone}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {dict.chat.diagramPresetOptional}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {selectedPreset ? (
                <div className="inline-flex max-w-[min(56vw,280px)] items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs text-foreground">
                    <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{selectedPreset.title}</span>
                    <button
                        type="button"
                        data-testid="diagram-preset-clear"
                        aria-label={dict.diagramPresets.clearSelection}
                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                        onClick={() => onSelect(null)}
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : null}
        </div>
    )
}
