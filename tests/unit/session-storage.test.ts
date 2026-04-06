import { describe, expect, it } from "vitest"
import { sanitizeMessages } from "@/lib/session-storage"

describe("sanitizeMessages", () => {
    it("drops a trailing assistant message that was still streaming", () => {
        const sanitized = sanitizeMessages([
            {
                id: "user-1",
                role: "user",
                parts: [{ type: "text", text: "Draw a system diagram" }],
            },
            {
                id: "assistant-1",
                role: "assistant",
                parts: [
                    { type: "text", text: "Working on it", state: "streaming" },
                ],
            },
        ])

        expect(sanitized).toEqual([
            {
                id: "user-1",
                role: "user",
                parts: [{ type: "text", text: "Draw a system diagram" }],
            },
        ])
    })

    it("drops a trailing assistant message with an incomplete tool call", () => {
        const sanitized = sanitizeMessages([
            {
                id: "user-1",
                role: "user",
                parts: [{ type: "text", text: "Update the diagram" }],
            },
            {
                id: "assistant-1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-edit_diagram",
                        toolCallId: "tool-1",
                        state: "input-streaming",
                        input: { operations: [] },
                    },
                ],
            },
        ])

        expect(sanitized).toEqual([
            {
                id: "user-1",
                role: "user",
                parts: [{ type: "text", text: "Update the diagram" }],
            },
        ])
    })

    it("keeps completed assistant messages intact", () => {
        const sanitized = sanitizeMessages([
            {
                id: "user-1",
                role: "user",
                parts: [{ type: "text", text: "Summarize this diagram" }],
            },
            {
                id: "assistant-1",
                role: "assistant",
                parts: [
                    { type: "text", text: "Done.", state: "done" },
                    {
                        type: "tool-display_diagram",
                        toolCallId: "tool-1",
                        state: "output-available",
                        input: { xml: '<mxCell id="2" />' },
                        output: { success: true },
                    },
                ],
            },
        ])

        expect(sanitized).toEqual([
            {
                id: "user-1",
                role: "user",
                parts: [{ type: "text", text: "Summarize this diagram" }],
            },
            {
                id: "assistant-1",
                role: "assistant",
                parts: [
                    { type: "text", text: "Done.", state: "done" },
                    {
                        type: "tool-display_diagram",
                        toolCallId: "tool-1",
                        state: "output-available",
                        input: { xml: '<mxCell id="2" />' },
                        output: { success: true },
                    },
                ],
            },
        ])
    })
})
