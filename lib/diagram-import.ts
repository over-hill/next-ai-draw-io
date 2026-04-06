import pako from "pako"

const DRAWIO_SVG_EXTENSION = ".drawio.svg"

function decodeBase64(base64: string) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }

    return bytes
}

function wrapWithMxfile(xml: string) {
    const trimmed = xml.trim()

    if (trimmed.includes("<mxfile")) {
        return trimmed
    }

    return `<mxfile><diagram name="Page-1" id="page-1">${trimmed}</diagram></mxfile>`
}

function decodeSvgDataUrl(content: string) {
    if (!content.startsWith("data:")) {
        return content
    }

    const [, payload = ""] = content.split(",", 2)
    const header = content.slice(0, content.indexOf(",")).toLowerCase()

    if (header.includes(";base64")) {
        return new TextDecoder("utf8").decode(decodeBase64(payload))
    }

    return decodeURIComponent(payload)
}

function decodeHtmlEntities(content: string) {
    const textarea = document.createElement("textarea")
    textarea.innerHTML = content
    return textarea.value
}

function extractXmlFromEditableSvg(content: string) {
    const svgText = decodeSvgDataUrl(content).trim()
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml")
    const svgElement = svgDoc.querySelector("svg")

    if (!svgElement) {
        throw new Error("Invalid editable SVG file.")
    }

    const embeddedContent = svgElement.getAttribute("content")

    if (!embeddedContent) {
        throw new Error("SVG file does not contain embedded draw.io content.")
    }

    const mxfileDoc = parser.parseFromString(
        decodeHtmlEntities(embeddedContent),
        "text/xml",
    )
    const diagramElement = mxfileDoc.querySelector("diagram")
    const compressedDiagram = diagramElement?.textContent?.trim()

    if (!compressedDiagram) {
        throw new Error("Embedded draw.io diagram data is missing.")
    }

    const compressedBytes = decodeBase64(compressedDiagram)
    const inflated = pako.inflateRaw(compressedBytes)
    const urlEncodedDiagram = new TextDecoder("utf8").decode(inflated)

    return decodeURIComponent(urlEncodedDiagram)
}

export function parseDiagramImportContent(fileName: string, content: string) {
    const normalizedName = fileName.trim().toLowerCase()
    const trimmedContent = content.trim()

    if (normalizedName.endsWith(DRAWIO_SVG_EXTENSION)) {
        return wrapWithMxfile(extractXmlFromEditableSvg(trimmedContent))
    }

    if (normalizedName.endsWith(".drawio") || normalizedName.endsWith(".xml")) {
        if (trimmedContent.includes("<mxfile")) {
            return trimmedContent
        }

        if (trimmedContent.includes("<mxGraphModel")) {
            return wrapWithMxfile(trimmedContent)
        }

        throw new Error(
            "Diagram XML is missing mxfile or mxGraphModel content.",
        )
    }

    throw new Error(`Unsupported diagram file type: ${fileName}`)
}
