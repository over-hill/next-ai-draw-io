import pako from "pako"
import { describe, expect, it } from "vitest"
import { parseDiagramImportContent } from "@/lib/diagram-import"

const SIMPLE_GRAPH_MODEL = `
<mxGraphModel>
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
  </root>
</mxGraphModel>
`.trim()

function encodeDiagramSvgContent(xml: string) {
    const urlEncoded = encodeURIComponent(xml)
    const compressed = pako.deflateRaw(urlEncoded)
    const base64Diagram = Buffer.from(compressed).toString("base64")
    const mxfile = `<mxfile><diagram name="Page-1" id="page-1">${base64Diagram}</diagram></mxfile>`

    return mxfile
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
}

function createEditableSvg(xml: string) {
    return `<svg xmlns="http://www.w3.org/2000/svg" content="${encodeDiagramSvgContent(
        xml,
    )}"></svg>`
}

describe("parseDiagramImportContent", () => {
    it("returns mxfile content unchanged for drawio files", () => {
        const mxfile = `<mxfile><diagram name="Page-1" id="page-1">${SIMPLE_GRAPH_MODEL}</diagram></mxfile>`

        const result = parseDiagramImportContent("example.drawio", mxfile)

        expect(result).toBe(mxfile)
    })

    it("wraps bare mxGraphModel xml into a single-page mxfile", () => {
        const result = parseDiagramImportContent(
            "example.xml",
            SIMPLE_GRAPH_MODEL,
        )

        expect(result).toContain("<mxfile>")
        expect(result).toContain('name="Page-1"')
        expect(result).toContain(SIMPLE_GRAPH_MODEL)
    })

    it("extracts diagram xml from raw editable svg files", () => {
        const result = parseDiagramImportContent(
            "example.drawio.svg",
            createEditableSvg(SIMPLE_GRAPH_MODEL),
        )

        expect(result).toContain("<mxfile>")
        expect(result).toContain(SIMPLE_GRAPH_MODEL)
    })

    it("extracts diagram xml from base64 svg data urls", () => {
        const svg = createEditableSvg(SIMPLE_GRAPH_MODEL)
        const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`

        const result = parseDiagramImportContent("example.drawio.svg", dataUrl)

        expect(result).toContain("<mxfile>")
        expect(result).toContain(SIMPLE_GRAPH_MODEL)
    })

    it("rejects unsupported file extensions", () => {
        expect(() =>
            parseDiagramImportContent("example.svg", "<svg></svg>"),
        ).toThrow("Unsupported diagram file type")
    })
})
