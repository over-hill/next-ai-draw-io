/// <reference lib="webworker" />

import {
    processDisplayDiagramPreviewTask,
    processEditDiagramPreviewTask,
} from "@/lib/diagram-preview-core"
import type {
    DiagramPreviewWorkerRequest,
    DiagramPreviewWorkerResponse,
} from "@/lib/diagram-preview-worker-protocol"

const workerScope = self as DedicatedWorkerGlobalScope

workerScope.addEventListener(
    "message",
    (event: MessageEvent<DiagramPreviewWorkerRequest>) => {
        const request = event.data

        try {
            let response: DiagramPreviewWorkerResponse

            if (request.type === "display-preview") {
                response = {
                    requestId: request.requestId,
                    ok: true,
                    result: processDisplayDiagramPreviewTask(request.payload),
                }
            } else {
                response = {
                    requestId: request.requestId,
                    ok: true,
                    result: processEditDiagramPreviewTask(request.payload),
                }
            }

            workerScope.postMessage(response)
        } catch (error) {
            workerScope.postMessage({
                requestId: request.requestId,
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Diagram preview worker failed",
            } satisfies DiagramPreviewWorkerResponse)
        }
    },
)
