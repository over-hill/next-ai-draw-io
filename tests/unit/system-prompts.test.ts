import { describe, expect, it } from "vitest"
import { DEFAULT_SYSTEM_PROMPT, getSystemPrompt } from "@/lib/system-prompts"

describe("system prompts", () => {
    it("requires a short visible reply before any diagram tool call", () => {
        expect(DEFAULT_SYSTEM_PROMPT).toContain(
            "Before calling display_diagram or edit_diagram, you MUST first send one short natural-language sentence to the user.",
        )
    })

    it("keeps the pre-tool reply rule in the resolved prompt", () => {
        expect(getSystemPrompt("gpt-4o")).toContain(
            "Do not wait for the XML to be complete before sending that sentence.",
        )
    })
})
