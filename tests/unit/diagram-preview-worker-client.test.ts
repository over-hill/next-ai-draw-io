import { describe, expect, expectTypeOf, it, vi } from "vitest"
import type { DisplayDiagramPreviewTaskResult } from "@/lib/diagram-preview-core"
import {
    createDiagramPreviewWorkerClient,
    type DiagramPreviewWorkerFactory,
} from "@/lib/diagram-preview-worker-client"

describe("diagram preview worker client", () => {
    it("falls back to the sync display processor when worker creation fails", async () => {
        const processDisplayPreview = vi.fn().mockReturnValue({
            convertedXml: "<root />",
            replacedXml: "<mxfile />",
        })

        const client = createDiagramPreviewWorkerClient({
            createWorker: (() => {
                throw new Error("worker unsupported")
            }) as DiagramPreviewWorkerFactory,
            processDisplayPreview,
            processEditPreview: vi.fn(),
        })

        const result = await client.processDisplayPreview({
            xml: "<mxCell id='2'/>",
        })

        expect(processDisplayPreview).toHaveBeenCalled()
        expect(result).toEqual({
            convertedXml: "<root />",
            replacedXml: "<mxfile />",
        })
    })

    it("resolves display preview requests from worker responses", async () => {
        let messageHandler: ((event: MessageEvent) => void) | null = null

        const worker = {
            postMessage: vi.fn((message: { requestId: number }) => {
                messageHandler?.({
                    data: {
                        requestId: message.requestId,
                        ok: true,
                        result: {
                            convertedXml: "<root />",
                            replacedXml: "<mxfile />",
                        },
                    },
                } as MessageEvent)
            }),
            terminate: vi.fn(),
            addEventListener: vi.fn(
                (type: string, handler: (event: MessageEvent) => void) => {
                    if (type === "message") {
                        messageHandler = handler
                    }
                },
            ),
            removeEventListener: vi.fn(),
        } as unknown as Worker

        const client = createDiagramPreviewWorkerClient({
            createWorker: () => worker,
            processDisplayPreview: vi.fn(),
            processEditPreview: vi.fn(),
        })

        const result = await client.processDisplayPreview({
            xml: "<mxCell id='2'/>",
        })

        expect(worker.postMessage).toHaveBeenCalled()
        expect(result).toEqual({
            convertedXml: "<root />",
            replacedXml: "<mxfile />",
        })
    })

    it("preserves the display preview promise result type", () => {
        const client = createDiagramPreviewWorkerClient({
            createWorker: (() => {
                throw new Error("worker unsupported")
            }) as DiagramPreviewWorkerFactory,
            processDisplayPreview: vi.fn(),
            processEditPreview: vi.fn(),
        })

        expectTypeOf(
            client.processDisplayPreview({ xml: "<mxCell id='2'/>" }),
        ).toEqualTypeOf<Promise<DisplayDiagramPreviewTaskResult | null>>()
    })
})
