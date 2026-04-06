import type {
    DisplayDiagramPreviewTaskInput,
    DisplayDiagramPreviewTaskResult,
    EditDiagramPreviewTaskInput,
} from "@/lib/diagram-preview-core"

export interface DisplayDiagramPreviewWorkerRequest {
    requestId: number
    type: "display-preview"
    payload: DisplayDiagramPreviewTaskInput
}

export interface EditDiagramPreviewWorkerRequest {
    requestId: number
    type: "edit-preview"
    payload: EditDiagramPreviewTaskInput
}

export type DiagramPreviewWorkerRequest =
    | DisplayDiagramPreviewWorkerRequest
    | EditDiagramPreviewWorkerRequest

export interface DiagramPreviewWorkerSuccessResponse {
    requestId: number
    ok: true
    result:
        | DisplayDiagramPreviewTaskResult
        | null
        | ReturnType<
              typeof import("@/lib/diagram-preview-core").processEditDiagramPreviewTask
          >
}

export interface DiagramPreviewWorkerErrorResponse {
    requestId: number
    ok: false
    error: string
}

export type DiagramPreviewWorkerResponse =
    | DiagramPreviewWorkerSuccessResponse
    | DiagramPreviewWorkerErrorResponse
