import type { DiagramOperation } from "@/components/chat/types"
import {
    applyDiagramOperations,
    convertToLegalXml,
    extractCompleteMxCells,
    replaceNodes,
} from "@/lib/utils"

const DEFAULT_BASE_XML =
    '<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>'

export interface DisplayDiagramPreviewTaskInput {
    xml: string
    baseXml?: string
}

export interface DisplayDiagramPreviewTaskResult {
    convertedXml: string
    replacedXml: string
}

export interface EditDiagramPreviewTaskInput {
    originalXml: string
    operations: DiagramOperation[]
}

export function processDisplayDiagramPreviewTask({
    xml,
    baseXml,
}: DisplayDiagramPreviewTaskInput): DisplayDiagramPreviewTaskResult | null {
    const completeCells = extractCompleteMxCells(xml)
    if (!completeCells) {
        return null
    }

    const convertedXml = convertToLegalXml(completeCells)
    const parser = new DOMParser()
    const testDoc = parser.parseFromString(
        `<root>${convertedXml}</root>`,
        "text/xml",
    )
    const parseError = testDoc.querySelector("parsererror")

    if (parseError) {
        return null
    }

    const replacedXml = replaceNodes(baseXml || DEFAULT_BASE_XML, convertedXml)

    return {
        convertedXml,
        replacedXml,
    }
}

export function processEditDiagramPreviewTask({
    originalXml,
    operations,
}: EditDiagramPreviewTaskInput): ReturnType<typeof applyDiagramOperations> {
    return applyDiagramOperations(originalXml, operations)
}
