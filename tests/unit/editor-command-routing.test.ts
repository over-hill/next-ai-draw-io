import { afterEach, describe, expect, it, vi } from "vitest"
import {
    executeEditorCommand,
    isEditorCommand,
} from "@/lib/editor-command-routing"

describe("editor-command-routing", () => {
    afterEach(() => {
        document.body.innerHTML = ""
    })

    it("recognizes only undo and redo as supported editor commands", () => {
        expect(isEditorCommand("undo")).toBe(true)
        expect(isEditorCommand("redo")).toBe(true)
        expect(isEditorCommand("copy")).toBe(false)
        expect(isEditorCommand(null)).toBe(false)
    })

    it("routes undo to the host document when a text input is focused", () => {
        const textarea = document.createElement("textarea")
        document.body.appendChild(textarea)
        textarea.focus()

        const execCommand = vi.fn(() => true)
        Object.defineProperty(document, "execCommand", {
            configurable: true,
            value: execCommand,
        })

        const iframe = document.createElement("iframe")
        Object.defineProperty(iframe, "contentWindow", {
            configurable: true,
            value: {
                ui: {
                    actions: {
                        get: vi.fn(),
                    },
                },
            },
        })

        expect(executeEditorCommand("undo", { document, iframe })).toBe(true)
        expect(execCommand).toHaveBeenCalledWith("undo")
        expect(
            iframe.contentWindow?.ui?.actions?.get as ReturnType<typeof vi.fn>,
        ).not.toHaveBeenCalled()
    })

    it("routes redo to draw.io when no host editor is focused", () => {
        const action = vi.fn()
        const iframe = document.createElement("iframe")
        Object.defineProperty(iframe, "contentWindow", {
            configurable: true,
            value: {
                ui: {
                    actions: {
                        get: vi.fn(() => ({
                            funct: action,
                        })),
                    },
                },
            },
        })

        expect(executeEditorCommand("redo", { document, iframe })).toBe(true)
        expect(action).toHaveBeenCalledTimes(1)
    })

    it("falls back to the draw.io undo manager when action lookup is unavailable", () => {
        const undo = vi.fn()
        const iframe = document.createElement("iframe")
        Object.defineProperty(iframe, "contentWindow", {
            configurable: true,
            value: {
                editorUi: {
                    editor: {
                        graph: {
                            getModel: () => ({
                                undoManager: {
                                    undo,
                                },
                            }),
                        },
                    },
                },
            },
        })

        expect(executeEditorCommand("undo", { document, iframe })).toBe(true)
        expect(undo).toHaveBeenCalledTimes(1)
    })
})
