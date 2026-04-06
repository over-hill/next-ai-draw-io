import { describe, expect, it, vi } from "vitest"
import {
    getDiagramXmlFromExportPayload,
    resolveDiagramXmlForRequest,
} from "@/lib/utils"

describe("diagram IO fast path", () => {
    it("reuses current diagram xml without calling the export fallback", async () => {
        const exportFallback = vi
            .fn()
            .mockResolvedValue("<mxfile>slow</mxfile>")

        const result = await resolveDiagramXmlForRequest({
            currentXml: "<mxfile>fast</mxfile>",
            exportDiagramXml: exportFallback,
        })

        expect(result).toBe("<mxfile>fast</mxfile>")
        expect(exportFallback).not.toHaveBeenCalled()
    })

    it("falls back to exporting only when current diagram xml is unavailable", async () => {
        const exportFallback = vi
            .fn()
            .mockResolvedValue("<mxfile>slow</mxfile>")

        const result = await resolveDiagramXmlForRequest({
            currentXml: "   ",
            exportDiagramXml: exportFallback,
        })

        expect(result).toBe("<mxfile>slow</mxfile>")
        expect(exportFallback).toHaveBeenCalledTimes(1)
    })

    it("prefers direct xml from export payloads over expensive svg extraction", () => {
        const extractDiagramXml = vi.fn(() => "<mxfile>decoded</mxfile>")

        const result = getDiagramXmlFromExportPayload(
            {
                xml: "<mxfile>direct</mxfile>",
                data: "data:image/svg+xml;base64,heavy",
            },
            extractDiagramXml,
        )

        expect(result).toBe("<mxfile>direct</mxfile>")
        expect(extractDiagramXml).not.toHaveBeenCalled()
    })

    it("extracts xml from svg payload only when direct xml is missing", () => {
        const extractDiagramXml = vi.fn(() => "<mxfile>decoded</mxfile>")

        const result = getDiagramXmlFromExportPayload(
            {
                data: "data:image/svg+xml;base64,heavy",
            },
            extractDiagramXml,
        )

        expect(result).toBe("<mxfile>decoded</mxfile>")
        expect(extractDiagramXml).toHaveBeenCalledWith(
            "data:image/svg+xml;base64,heavy",
        )
    })
})
