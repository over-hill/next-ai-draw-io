import { describe, expect, it } from "vitest"
import {
    getStreamingDiagramPreviewPolicy,
    shouldRenderStreamingTextAsMarkdown,
    shouldShowPendingAssistantPlaceholder,
} from "@/lib/chat-streaming-performance"

describe("chat streaming performance policy", () => {
    it("renders the active streaming assistant text as plain text", () => {
        expect(
            shouldRenderStreamingTextAsMarkdown({
                status: "streaming",
                messageRole: "assistant",
                partState: "streaming",
                isLastAssistantMessage: true,
            }),
        ).toBe(false)
    })

    it("keeps markdown rendering for completed assistant text", () => {
        expect(
            shouldRenderStreamingTextAsMarkdown({
                status: "ready",
                messageRole: "assistant",
                partState: "done",
                isLastAssistantMessage: true,
            }),
        ).toBe(true)
    })

    it("shows a local pending assistant placeholder while waiting for the first assistant part", () => {
        expect(
            shouldShowPendingAssistantPlaceholder({
                status: "submitted",
                messages: [
                    {
                        id: "user-1",
                        role: "user",
                        parts: [
                            { type: "text", text: "Draw a system diagram" },
                        ],
                    },
                ],
            }),
        ).toBe(true)
    })

    it("hides the pending assistant placeholder once the assistant has visible content", () => {
        expect(
            shouldShowPendingAssistantPlaceholder({
                status: "streaming",
                messages: [
                    {
                        id: "user-1",
                        role: "user",
                        parts: [
                            { type: "text", text: "Draw a system diagram" },
                        ],
                    },
                    {
                        id: "assistant-1",
                        role: "assistant",
                        parts: [
                            { type: "reasoning", text: "Planning layout..." },
                        ],
                    },
                ],
            }),
        ).toBe(false)
    })

    it("shows the placeholder when an assistant shell exists but still has no renderable parts", () => {
        expect(
            shouldShowPendingAssistantPlaceholder({
                status: "streaming",
                messages: [
                    {
                        id: "user-1",
                        role: "user",
                        parts: [
                            { type: "text", text: "Draw a system diagram" },
                        ],
                    },
                    {
                        id: "assistant-1",
                        role: "assistant",
                        parts: [],
                    },
                ],
            }),
        ).toBe(true)
    })

    it("skips intermediate display_diagram previews for large xml payloads", () => {
        expect(
            getStreamingDiagramPreviewPolicy({
                toolName: "display_diagram",
                xmlLength: 18_000,
            }),
        ).toEqual({
            shouldPreview: false,
            debounceMs: 0,
        })
    })

    it("keeps intermediate display_diagram previews for small xml payloads", () => {
        expect(
            getStreamingDiagramPreviewPolicy({
                toolName: "display_diagram",
                xmlLength: 2_000,
            }),
        ).toEqual({
            shouldPreview: true,
            debounceMs: 180,
        })
    })

    it("slows down edit_diagram previews for larger operation batches", () => {
        expect(
            getStreamingDiagramPreviewPolicy({
                toolName: "edit_diagram",
                operationCount: 18,
            }),
        ).toEqual({
            shouldPreview: true,
            debounceMs: 420,
        })
    })
})
