"use client"

import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useDictionary } from "@/hooks/use-dictionary"
import type { DiagramPreset, DiagramPresetInput } from "@/lib/diagram-presets"
import { cn } from "@/lib/utils"

interface DiagramPresetManagerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    presets: DiagramPreset[]
    onCreatePreset: (input: DiagramPresetInput) => void
    onUpdatePreset: (presetId: string, input: DiagramPresetInput) => void
    onDeletePreset: (presetId: string) => void
}

interface FormState {
    title: string
    description: string
    instructions: string
    enabled: boolean
}

type EditorMode = "create" | "edit" | null

const EMPTY_FORM: FormState = {
    title: "",
    description: "",
    instructions: "",
    enabled: true,
}

function buildFormState(preset: DiagramPreset): FormState {
    return {
        title: preset.title,
        description: preset.description ?? "",
        instructions: preset.instructions,
        enabled: preset.enabled,
    }
}

function resolveInspectedPresetId(
    presets: DiagramPreset[],
    currentPresetId: string | null,
) {
    if (
        currentPresetId &&
        presets.some((preset) => preset.id === currentPresetId)
    ) {
        return currentPresetId
    }

    return presets[0]?.id ?? null
}

interface DiagramPresetEditorDialogProps {
    open: boolean
    mode: Exclude<EditorMode, null>
    form: FormState
    error: string
    onOpenChange: (open: boolean) => void
    onFormChange: (updater: (current: FormState) => FormState) => void
    onSubmit: () => void
}

function DiagramPresetEditorDialog({
    open,
    mode,
    form,
    error,
    onOpenChange,
    onFormChange,
    onSubmit,
}: DiagramPresetEditorDialogProps) {
    const dict = useDictionary()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
                    <DialogTitle>
                        {mode === "create"
                            ? dict.diagramPresets.create
                            : dict.diagramPresets.edit}
                    </DialogTitle>
                    <DialogDescription>
                        {dict.diagramPresets.formDescription}
                    </DialogDescription>
                </DialogHeader>

                <div
                    data-testid="diagram-preset-editor-body"
                    className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="diagram-preset-title">
                            {dict.diagramPresets.title}
                        </Label>
                        <Input
                            id="diagram-preset-title"
                            value={form.title}
                            onChange={(event) =>
                                onFormChange((current) => ({
                                    ...current,
                                    title: event.target.value,
                                }))
                            }
                            maxLength={80}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="diagram-preset-description">
                            {dict.diagramPresets.description}
                        </Label>
                        <Input
                            id="diagram-preset-description"
                            value={form.description}
                            onChange={(event) =>
                                onFormChange((current) => ({
                                    ...current,
                                    description: event.target.value,
                                }))
                            }
                            maxLength={140}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="diagram-preset-instructions">
                            {dict.diagramPresets.instructions}
                        </Label>
                        <Textarea
                            id="diagram-preset-instructions"
                            value={form.instructions}
                            onChange={(event) =>
                                onFormChange((current) => ({
                                    ...current,
                                    instructions: event.target.value,
                                }))
                            }
                            className="min-h-[220px]"
                            maxLength={4000}
                        />
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Switch
                            checked={form.enabled}
                            onCheckedChange={(enabled) =>
                                onFormChange((current) => ({
                                    ...current,
                                    enabled,
                                }))
                            }
                        />
                        {dict.diagramPresets.enabled}
                    </label>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>

                <div className="shrink-0 border-t border-border/50 px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="rounded-xl"
                            onClick={() => onOpenChange(false)}
                        >
                            {dict.common.cancel}
                        </Button>
                        <Button
                            type="button"
                            className="rounded-xl"
                            onClick={onSubmit}
                        >
                            {dict.common.save}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function DiagramPresetManager({
    open,
    onOpenChange,
    presets,
    onCreatePreset,
    onUpdatePreset,
    onDeletePreset,
}: DiagramPresetManagerProps) {
    const dict = useDictionary()
    const [editorMode, setEditorMode] = useState<EditorMode>(null)
    const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
    const [inspectedPresetId, setInspectedPresetId] = useState<string | null>(
        () => resolveInspectedPresetId(presets, null),
    )
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [error, setError] = useState("")

    const customPresets = useMemo(
        () => presets.filter((preset) => preset.source === "custom"),
        [presets],
    )

    const inspectedPreset = useMemo(
        () => presets.find((preset) => preset.id === inspectedPresetId) ?? null,
        [inspectedPresetId, presets],
    )

    useEffect(() => {
        if (!open) {
            setEditorMode(null)
            setEditingPresetId(null)
            setForm(EMPTY_FORM)
            setError("")
            return
        }

        setInspectedPresetId((currentPresetId) =>
            resolveInspectedPresetId(presets, currentPresetId),
        )
    }, [open, presets])

    const openCreateDialog = () => {
        setEditorMode("create")
        setEditingPresetId(null)
        setForm(EMPTY_FORM)
        setError("")
    }

    const openEditDialog = (preset: DiagramPreset) => {
        if (preset.source !== "custom") return

        setEditorMode("edit")
        setEditingPresetId(preset.id)
        setInspectedPresetId(preset.id)
        setForm(buildFormState(preset))
        setError("")
    }

    const closeEditor = () => {
        setEditorMode(null)
        setEditingPresetId(null)
        setForm(EMPTY_FORM)
        setError("")
    }

    const handleSubmit = () => {
        if (!form.title.trim()) {
            setError(dict.diagramPresets.titleRequired)
            return
        }

        if (!form.instructions.trim()) {
            setError(dict.diagramPresets.instructionsRequired)
            return
        }

        const input: DiagramPresetInput = {
            title: form.title,
            description: form.description,
            instructions: form.instructions,
            enabled: form.enabled,
        }

        if (editorMode === "create") {
            onCreatePreset(input)
        } else if (editorMode === "edit" && editingPresetId) {
            onUpdatePreset(editingPresetId, input)
        }

        closeEditor()
    }

    const handleTogglePresetEnabled = (
        preset: DiagramPreset,
        enabled: boolean,
    ) => {
        onUpdatePreset(preset.id, {
            title: preset.title,
            description: preset.description,
            instructions: preset.instructions,
            enabled,
        })
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
                        <DialogTitle>
                            {dict.diagramPresets.managerTitle}
                        </DialogTitle>
                        <DialogDescription>
                            {dict.diagramPresets.managerDescription}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid min-h-0 flex-1 overflow-hidden gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                        <div className="border-r border-border/50 overflow-y-auto p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-medium">
                                        {dict.diagramPresets.available}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {
                                            dict.diagramPresets
                                                .availableDescription
                                        }
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="rounded-xl"
                                    onClick={openCreateDialog}
                                >
                                    <Plus className="mr-1 h-4 w-4" />
                                    {dict.diagramPresets.create}
                                </Button>
                            </div>

                            {presets.map((preset) => {
                                const isInspected =
                                    inspectedPresetId === preset.id
                                const isBuiltIn = preset.source === "built-in"

                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        className={cn(
                                            "w-full rounded-2xl border p-3 text-left transition-colors",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                                            isInspected
                                                ? "border-foreground/15 bg-muted/25"
                                                : "border-border/60 bg-background hover:bg-muted/15",
                                        )}
                                        onClick={() =>
                                            setInspectedPresetId(preset.id)
                                        }
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate text-sm font-medium">
                                                        {preset.title}
                                                    </p>
                                                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                        {isBuiltIn
                                                            ? dict
                                                                  .diagramPresets
                                                                  .builtIn
                                                            : dict
                                                                  .diagramPresets
                                                                  .custom}
                                                    </span>
                                                    {!preset.enabled && (
                                                        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                            {
                                                                dict
                                                                    .diagramPresets
                                                                    .disabled
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                                {preset.description && (
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {preset.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <p className="mt-3 line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                                            {preset.instructions}
                                        </p>
                                    </button>
                                )
                            })}

                            {customPresets.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                    {dict.diagramPresets.emptyCustom}
                                </div>
                            )}
                        </div>

                        <div className="overflow-y-auto p-4">
                            {inspectedPreset ? (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium">
                                            {dict.diagramPresets.detailsTitle}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {
                                                dict.diagramPresets
                                                    .detailsDescription
                                            }
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-semibold leading-none">
                                                    {inspectedPreset.title}
                                                </h3>
                                                <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    {inspectedPreset.source ===
                                                    "built-in"
                                                        ? dict.diagramPresets
                                                              .builtIn
                                                        : dict.diagramPresets
                                                              .custom}
                                                </span>
                                                <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    {inspectedPreset.enabled
                                                        ? dict.diagramPresets
                                                              .enabled
                                                        : dict.diagramPresets
                                                              .disabled}
                                                </span>
                                            </div>

                                            {inspectedPreset.description && (
                                                <p className="text-sm text-muted-foreground">
                                                    {
                                                        inspectedPreset.description
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {
                                                    dict.diagramPresets
                                                        .instructions
                                                }
                                            </p>
                                            <div className="max-h-[320px] overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-3 text-sm leading-6 text-foreground whitespace-pre-wrap">
                                                {inspectedPreset.instructions}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {inspectedPreset.source ===
                                            "built-in" ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    {
                                                        dict.diagramPresets
                                                            .builtInReadonly
                                                    }
                                                </span>
                                            ) : (
                                                <>
                                                    <label className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                                                        <Switch
                                                            checked={
                                                                inspectedPreset.enabled
                                                            }
                                                            onCheckedChange={(
                                                                enabled,
                                                            ) =>
                                                                handleTogglePresetEnabled(
                                                                    inspectedPreset,
                                                                    enabled,
                                                                )
                                                            }
                                                        />
                                                        {inspectedPreset.enabled
                                                            ? dict
                                                                  .diagramPresets
                                                                  .enabled
                                                            : dict
                                                                  .diagramPresets
                                                                  .disabled}
                                                    </label>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="rounded-xl"
                                                        onClick={() =>
                                                            openEditDialog(
                                                                inspectedPreset,
                                                            )
                                                        }
                                                    >
                                                        <Pencil className="mr-1 h-4 w-4" />
                                                        {
                                                            dict.diagramPresets
                                                                .edit
                                                        }
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                                                        aria-label={
                                                            dict.diagramPresets
                                                                .delete
                                                        }
                                                        onClick={() =>
                                                            onDeletePreset(
                                                                inspectedPreset.id,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                    {dict.diagramPresets.detailsEmpty}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {editorMode ? (
                <DiagramPresetEditorDialog
                    open
                    mode={editorMode}
                    form={form}
                    error={error}
                    onOpenChange={(nextOpen) => {
                        if (!nextOpen) {
                            closeEditor()
                        }
                    }}
                    onFormChange={setForm}
                    onSubmit={handleSubmit}
                />
            ) : null}
        </>
    )
}
