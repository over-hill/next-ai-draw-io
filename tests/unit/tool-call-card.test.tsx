import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ToolCallCard } from "@/components/chat/ToolCallCard"
import type { ToolPartLike } from "@/components/chat/types"

const { codeBlockSpy } = vi.hoisted(() => ({
    codeBlockSpy: vi.fn(({ code }: { code: string }) => (
        <div data-testid="code-block" data-code-length={code.length} />
    )),
}))

vi.mock("@/components/code-block", () => ({
    CodeBlock: codeBlockSpy,
}))

const dict = {
    tools: { complete: "Complete" },
    chat: {
        copied: "Copied",
        failedToCopy: "Failed to copy",
        copyResponse: "Copy response",
    },
}

function renderToolCallCard(part: ToolPartLike) {
    const setExpandedTools = vi.fn()
    const onCopy = vi.fn()

    render(
        <ToolCallCard
            part={part}
            expandedTools={{}}
            setExpandedTools={setExpandedTools}
            onCopy={onCopy}
            copiedToolCallId={null}
            copyFailedToolCallId={null}
            dict={dict}
        />,
    )

    return { setExpandedTools, onCopy }
}

afterEach(() => {
    cleanup()
    codeBlockSpy.mockClear()
})

describe("ToolCallCard", () => {
    it("does not syntax-highlight large XML while tool input is still streaming", () => {
        renderToolCallCard({
            type: "tool-display_diagram",
            toolCallId: "streaming-xml",
            state: "input-streaming",
            input: {
                xml: `<mxCell id="node-1" value="API"/>`.repeat(200),
            },
        })

        expect(screen.queryByTestId("code-block")).toBeNull()
        expect(codeBlockSpy).not.toHaveBeenCalled()
    })

    it("keeps completed tool input collapsed by default", () => {
        renderToolCallCard({
            type: "tool-display_diagram",
            toolCallId: "completed-xml",
            state: "output-available",
            input: {
                xml: `<mxCell id="node-1" value="API"/>`,
            },
            output: "Successfully displayed the diagram.",
        })

        expect(screen.queryByTestId("code-block")).toBeNull()
        expect(codeBlockSpy).not.toHaveBeenCalled()
    })

    it("renders the XML code block when a completed tool card is expanded", () => {
        render(
            <ToolCallCard
                part={{
                    type: "tool-display_diagram",
                    toolCallId: "expanded-completed-xml",
                    state: "output-available",
                    input: {
                        xml: `<mxCell id="node-1" value="API"/>`,
                    },
                    output: "Successfully displayed the diagram.",
                }}
                expandedTools={{ "expanded-completed-xml": true }}
                setExpandedTools={vi.fn()}
                onCopy={vi.fn()}
                copiedToolCallId={null}
                copyFailedToolCallId={null}
                dict={dict}
            />,
        )

        expect(screen.getByTestId("code-block")).not.toBeNull()
        expect(codeBlockSpy).toHaveBeenCalledTimes(1)
    })
})
