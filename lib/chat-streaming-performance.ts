import type { UIMessage } from "ai"

export const CHAT_STREAM_THROTTLE_MS = 80

type ChatStatus = "streaming" | "submitted" | "idle" | "error" | "ready"
type MessageRole = "user" | "assistant" | "system"
type TextPartState = "streaming" | "done" | undefined
type DiagramToolName = "display_diagram" | "edit_diagram"

interface StreamingTextRenderOptions {
    status: ChatStatus
    messageRole: MessageRole
    partState: TextPartState
    isLastAssistantMessage: boolean
}

interface StreamingDiagramPreviewOptions {
    toolName: DiagramToolName
    xmlLength?: number
    operationCount?: number
}

interface StreamingDiagramPreviewPolicy {
    shouldPreview: boolean
    debounceMs: number
}

interface PendingAssistantPlaceholderOptions {
    status: ChatStatus
    messages: UIMessage[]
}

const FAST_PREVIEW_DEBOUNCE_MS = 180
const SLOW_PREVIEW_DEBOUNCE_MS = 420
const LARGE_DISPLAY_XML_THRESHOLD = 16_000
const MEDIUM_DISPLAY_XML_THRESHOLD = 8_000
const LARGE_EDIT_OPERATION_THRESHOLD = 30
const MEDIUM_EDIT_OPERATION_THRESHOLD = 12

function hasRenderableAssistantParts(message: UIMessage | undefined): boolean {
    if (!message || message.role !== "assistant" || !message.parts?.length) {
        return false
    }

    return message.parts.some((part) => {
        if (part.type === "text") {
            return typeof part.text === "string" && part.text.length > 0
        }

        if (part.type === "reasoning") {
            return typeof part.text === "string" && part.text.length > 0
        }

        if (part.type === "file") {
            return true
        }

        return part.type?.startsWith("tool-") ?? false
    })
}

export function shouldShowPendingAssistantPlaceholder({
    status,
    messages,
}: PendingAssistantPlaceholderOptions): boolean {
    if (status !== "submitted" && status !== "streaming") {
        return false
    }

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) {
        return false
    }

    if (lastMessage.role === "user") {
        return true
    }

    return !hasRenderableAssistantParts(lastMessage)
}

export function shouldRenderStreamingTextAsMarkdown({
    status,
    messageRole,
    partState,
    isLastAssistantMessage,
}: StreamingTextRenderOptions): boolean {
    if (messageRole !== "assistant") {
        return true
    }

    if (!isLastAssistantMessage) {
        return true
    }

    return !(status === "streaming" && partState === "streaming")
}

export function getStreamingDiagramPreviewPolicy({
    toolName,
    xmlLength = 0,
    operationCount = 0,
}: StreamingDiagramPreviewOptions): StreamingDiagramPreviewPolicy {
    if (toolName === "display_diagram") {
        if (xmlLength >= LARGE_DISPLAY_XML_THRESHOLD) {
            return { shouldPreview: false, debounceMs: 0 }
        }

        if (xmlLength >= MEDIUM_DISPLAY_XML_THRESHOLD) {
            return { shouldPreview: true, debounceMs: SLOW_PREVIEW_DEBOUNCE_MS }
        }

        return { shouldPreview: true, debounceMs: FAST_PREVIEW_DEBOUNCE_MS }
    }

    if (operationCount >= LARGE_EDIT_OPERATION_THRESHOLD) {
        return { shouldPreview: false, debounceMs: 0 }
    }

    if (operationCount >= MEDIUM_EDIT_OPERATION_THRESHOLD) {
        return { shouldPreview: true, debounceMs: SLOW_PREVIEW_DEBOUNCE_MS }
    }

    return { shouldPreview: true, debounceMs: FAST_PREVIEW_DEBOUNCE_MS }
}
