import { describe, expect, it } from "vitest"
import type { DiagramOperation } from "@/components/chat/types"
import {
    processDisplayDiagramPreviewTask,
    processEditDiagramPreviewTask,
} from "@/lib/diagram-preview-core"

const BASE_XML = `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Old" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`

describe("diagram preview core", () => {
    it("builds a display preview from complete streaming mxCell fragments", () => {
        const result = processDisplayDiagramPreviewTask({
            xml: `<mxCell id="2" value="Frontend" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell><mxCell id="3" value="Backend" vertex="1" parent="1"><mxGeometry x="220" y="40" width="120" height="60" as="geometry"/></mxCell><mxCell id="4" value="Truncated"`,
            baseXml: BASE_XML,
        })

        expect(result).not.toBeNull()
        expect(result?.convertedXml).toContain(
            '<mxCell id="2" value="Frontend"',
        )
        expect(result?.convertedXml).toContain('<mxCell id="3" value="Backend"')
        expect(result?.convertedXml).not.toContain("Truncated")
        expect(result?.replacedXml).toContain("Frontend")
        expect(result?.replacedXml).toContain("Backend")
    })

    it("returns null when there are no complete cells in the streaming fragment", () => {
        const result = processDisplayDiagramPreviewTask({
            xml: `<mxCell id="2" value="Half"`,
            baseXml: BASE_XML,
        })

        expect(result).toBeNull()
    })

    it("applies edit operations and returns updated xml", () => {
        const operations: DiagramOperation[] = [
            {
                operation: "update",
                cell_id: "2",
                new_xml: `<mxCell id="2" value="Updated" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell>`,
            },
        ]

        const result = processEditDiagramPreviewTask({
            originalXml: BASE_XML,
            operations,
        })

        expect(result.result).toContain('value="Updated"')
        expect(result.errors).toHaveLength(0)
    })
})
