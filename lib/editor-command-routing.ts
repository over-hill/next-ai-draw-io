export type EditorCommand = "undo" | "redo"

type DrawioAction = {
    funct?: () => void
}

type DrawioActions = {
    get?: (name: EditorCommand) => DrawioAction | null | undefined
}

type DrawioGraphModel = {
    undoManager?: {
        undo?: () => void
        redo?: () => void
    }
}

type DrawioGraph = {
    getModel?: () => DrawioGraphModel | null | undefined
    model?: DrawioGraphModel | null
}

type DrawioCommandWindow = Window & {
    ui?: {
        actions?: DrawioActions
        editor?: {
            graph?: DrawioGraph
        }
    }
    editorUi?: {
        actions?: DrawioActions
        editor?: {
            graph?: DrawioGraph
        }
    }
    editor?: {
        graph?: DrawioGraph
    }
}

interface ExecuteEditorCommandOptions {
    document: Document
    iframe?: HTMLIFrameElement | null
    activeElement?: Element | null
}

const TEXT_INPUT_TYPES = new Set([
    "",
    "email",
    "number",
    "password",
    "search",
    "tel",
    "text",
    "url",
])

export function isEditorCommand(value: unknown): value is EditorCommand {
    return value === "undo" || value === "redo"
}

function isHostEditableElement(element: Element | null | undefined): boolean {
    if (!(element instanceof HTMLElement)) {
        return false
    }

    if (element instanceof HTMLTextAreaElement) {
        return !element.disabled && !element.readOnly
    }

    if (element instanceof HTMLInputElement) {
        return (
            !element.disabled &&
            !element.readOnly &&
            TEXT_INPUT_TYPES.has(element.type)
        )
    }

    return element.isContentEditable
}

function executeHostDocumentCommand(
    targetDocument: Document,
    command: EditorCommand,
): boolean {
    if (typeof targetDocument.execCommand !== "function") {
        return false
    }

    return targetDocument.execCommand(command)
}

function getDrawioActions(
    targetWindow: DrawioCommandWindow,
): DrawioActions | null {
    return targetWindow.ui?.actions || targetWindow.editorUi?.actions || null
}

function getDrawioUndoManager(
    targetWindow: DrawioCommandWindow,
): DrawioGraphModel["undoManager"] | null {
    const graph =
        targetWindow.ui?.editor?.graph ||
        targetWindow.editorUi?.editor?.graph ||
        targetWindow.editor?.graph

    if (!graph) {
        return null
    }

    const model =
        typeof graph.getModel === "function" ? graph.getModel() : graph.model

    return model?.undoManager || null
}

function executeDrawioCommand(
    targetWindow: DrawioCommandWindow | null | undefined,
    command: EditorCommand,
): boolean {
    if (!targetWindow) {
        return false
    }

    const action = getDrawioActions(targetWindow)?.get?.(command)
    if (typeof action?.funct === "function") {
        action.funct()
        return true
    }

    const undoManager = getDrawioUndoManager(targetWindow)
    const fallback = command === "undo" ? undoManager?.undo : undoManager?.redo

    if (typeof fallback === "function") {
        fallback.call(undoManager)
        return true
    }

    return false
}

export function executeEditorCommand(
    command: unknown,
    { document, iframe, activeElement }: ExecuteEditorCommandOptions,
): boolean {
    if (!isEditorCommand(command)) {
        return false
    }

    const focusedElement = activeElement ?? document.activeElement
    if (isHostEditableElement(focusedElement)) {
        return executeHostDocumentCommand(document, command)
    }

    return executeDrawioCommand(
        iframe?.contentWindow as DrawioCommandWindow | null | undefined,
        command,
    )
}
