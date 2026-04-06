import {
    type DisplayDiagramPreviewTaskInput,
    type DisplayDiagramPreviewTaskResult,
    type EditDiagramPreviewTaskInput,
    processDisplayDiagramPreviewTask,
    processEditDiagramPreviewTask,
} from "@/lib/diagram-preview-core"
import type {
    DiagramPreviewWorkerRequest,
    DiagramPreviewWorkerResponse,
} from "@/lib/diagram-preview-worker-protocol"

export type DiagramPreviewWorkerFactory = () => Worker

interface DiagramPreviewWorkerClientOptions {
    createWorker?: DiagramPreviewWorkerFactory
    processDisplayPreview?: typeof processDisplayDiagramPreviewTask
    processEditPreview?: typeof processEditDiagramPreviewTask
}

interface DiagramPreviewWorkerTaskMap {
    "display-preview": {
        payload: DisplayDiagramPreviewTaskInput
        result: DisplayDiagramPreviewTaskResult | null
    }
    "edit-preview": {
        payload: EditDiagramPreviewTaskInput
        result: ReturnType<typeof processEditDiagramPreviewTask>
    }
}

type PendingRequest = {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
}

function createDefaultWorker(): Worker {
    return new Worker(new URL("./diagram-preview.worker.ts", import.meta.url), {
        type: "module",
    })
}

class DiagramPreviewWorkerClient {
    private worker: Worker | null | undefined
    private requestId = 0
    private pending = new Map<number, PendingRequest>()
    private readonly createWorker: DiagramPreviewWorkerFactory
    private readonly processDisplayPreviewFallback: typeof processDisplayDiagramPreviewTask
    private readonly processEditPreviewFallback: typeof processEditDiagramPreviewTask

    constructor({
        createWorker = createDefaultWorker,
        processDisplayPreview = processDisplayDiagramPreviewTask,
        processEditPreview = processEditDiagramPreviewTask,
    }: DiagramPreviewWorkerClientOptions = {}) {
        this.createWorker = createWorker
        this.processDisplayPreviewFallback = processDisplayPreview
        this.processEditPreviewFallback = processEditPreview
    }

    processDisplayPreview(
        input: DisplayDiagramPreviewTaskInput,
    ): Promise<DisplayDiagramPreviewTaskResult | null> {
        return this.runTask(
            "display-preview",
            input,
            this.processDisplayPreviewFallback,
        )
    }

    processEditPreview(
        input: EditDiagramPreviewTaskInput,
    ): Promise<ReturnType<typeof processEditDiagramPreviewTask>> {
        return this.runTask(
            "edit-preview",
            input,
            this.processEditPreviewFallback,
        )
    }

    dispose() {
        if (!this.worker) {
            return
        }

        this.worker.removeEventListener("message", this.handleMessage)
        this.worker.removeEventListener("error", this.handleError)
        this.worker.terminate()
        this.worker = undefined

        for (const pending of this.pending.values()) {
            pending.reject(new Error("Diagram preview worker disposed"))
        }
        this.pending.clear()
    }

    private getWorker(): Worker | null {
        if (this.worker !== undefined) {
            return this.worker
        }

        try {
            this.worker = this.createWorker()
            this.worker.addEventListener("message", this.handleMessage)
            this.worker.addEventListener("error", this.handleError)
        } catch {
            this.worker = null
        }

        return this.worker
    }

    private readonly handleMessage = (
        event: MessageEvent<DiagramPreviewWorkerResponse>,
    ) => {
        const response = event.data
        const pending = this.pending.get(response.requestId)
        if (!pending) {
            return
        }

        this.pending.delete(response.requestId)

        if (response.ok) {
            pending.resolve(response.result)
            return
        }

        pending.reject(new Error(response.error))
    }

    private readonly handleError = () => {
        const error = new Error("Diagram preview worker failed")

        for (const pending of this.pending.values()) {
            pending.reject(error)
        }
        this.pending.clear()

        if (this.worker) {
            this.worker.removeEventListener("message", this.handleMessage)
            this.worker.removeEventListener("error", this.handleError)
            this.worker.terminate()
        }
        this.worker = null
    }

    private async runTask<TType extends keyof DiagramPreviewWorkerTaskMap>(
        type: TType,
        payload: DiagramPreviewWorkerTaskMap[TType]["payload"],
        fallback: (
            input: DiagramPreviewWorkerTaskMap[TType]["payload"],
        ) => DiagramPreviewWorkerTaskMap[TType]["result"],
    ): Promise<DiagramPreviewWorkerTaskMap[TType]["result"]> {
        const worker = this.getWorker()
        if (!worker) {
            return fallback(payload)
        }

        const requestId = ++this.requestId

        try {
            const result = await new Promise<
                DiagramPreviewWorkerTaskMap[TType]["result"]
            >((resolve, reject) => {
                this.pending.set(requestId, {
                    resolve: (value) =>
                        resolve(
                            value as DiagramPreviewWorkerTaskMap[TType]["result"],
                        ),
                    reject,
                })

                const request = {
                    requestId,
                    type,
                    payload,
                } as Extract<DiagramPreviewWorkerRequest, { type: TType }>

                worker.postMessage(request)
            })

            return result
        } catch {
            this.pending.delete(requestId)
            return fallback(payload)
        }
    }
}

export function createDiagramPreviewWorkerClient(
    options?: DiagramPreviewWorkerClientOptions,
) {
    return new DiagramPreviewWorkerClient(options)
}

let diagramPreviewWorkerClientSingleton: DiagramPreviewWorkerClient | null =
    null

export function getDiagramPreviewWorkerClient() {
    if (!diagramPreviewWorkerClientSingleton) {
        diagramPreviewWorkerClientSingleton = createDiagramPreviewWorkerClient()
    }

    return diagramPreviewWorkerClientSingleton
}
