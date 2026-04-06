import { act, render, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { describe, expect, it, vi } from "vitest"
import { DiagramProvider, useDiagram } from "@/contexts/diagram-context"

const { toastError, toastSuccess } = vi.hoisted(() => ({
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
}))

vi.mock("sonner", () => ({
    toast: {
        error: toastError,
        success: toastSuccess,
    },
}))

const PAGE_ONE_XML = `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="First page" vertex="1" parent="1"><mxGeometry x="40" y="40" width="160" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`

const PAGE_TWO_XML = `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="First page" vertex="1" parent="1"><mxGeometry x="40" y="40" width="160" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram><diagram name="Page-2" id="page-2"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="3" value="Second page" vertex="1" parent="1"><mxGeometry x="40" y="40" width="160" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`

const REAL_PAGE_ONE_XML = PAGE_ONE_XML.replace(
    "First page",
    `First page ${"x".repeat(240)}`,
)

const REAL_PAGE_ONE_UPDATED_XML = PAGE_ONE_XML.replace(
    "First page",
    `Updated page ${"y".repeat(240)}`,
)

function DiagramContextProbe({
    onChange,
}: {
    onChange: (context: ReturnType<typeof useDiagram>) => void
}) {
    const context = useDiagram()

    useEffect(() => {
        onChange(context)
    }, [context, onChange])

    return null
}

describe("DiagramProvider", () => {
    it("keeps the current single-page XML when autosave reports a later page", async () => {
        let latestContext: ReturnType<typeof useDiagram> | null = null

        render(
            <DiagramProvider>
                <DiagramContextProbe
                    onChange={(context) => {
                        latestContext = context
                    }}
                />
            </DiagramProvider>,
        )

        await waitFor(() => expect(latestContext).not.toBeNull())

        act(() => {
            latestContext?.onDrawioLoad()
            latestContext?.loadDiagram(PAGE_ONE_XML, true)
        })

        await waitFor(() => expect(latestContext?.chartXML).toBe(PAGE_ONE_XML))

        act(() => {
            latestContext?.handleDiagramAutoSave({
                xml: PAGE_TWO_XML,
                currentPage: 1,
            })
        })

        await waitFor(() => expect(latestContext?.chartXML).toBe(PAGE_ONE_XML))
        expect(toastError).toHaveBeenCalledTimes(1)
    })

    it("does not reload draw.io when autosave updates the current page XML", async () => {
        let latestContext: ReturnType<typeof useDiagram> | null = null
        const load = vi.fn()

        render(
            <DiagramProvider>
                <DiagramContextProbe
                    onChange={(context) => {
                        latestContext = context
                    }}
                />
            </DiagramProvider>,
        )

        await waitFor(() => expect(latestContext).not.toBeNull())

        act(() => {
            if (latestContext) {
                latestContext.drawioRef.current = {
                    load,
                } as unknown as typeof latestContext.drawioRef.current
                latestContext.onDrawioLoad()
            }
        })

        act(() => {
            latestContext?.handleDiagramAutoSave({
                xml: REAL_PAGE_ONE_XML,
                currentPage: 0,
            })
        })

        await waitFor(() =>
            expect(latestContext?.chartXML).toBe(REAL_PAGE_ONE_XML),
        )
        expect(load).not.toHaveBeenCalled()
    })

    it("does not reload the same XML after loadDiagram already sent it to draw.io", async () => {
        let latestContext: ReturnType<typeof useDiagram> | null = null
        const load = vi.fn()

        render(
            <DiagramProvider>
                <DiagramContextProbe
                    onChange={(context) => {
                        latestContext = context
                    }}
                />
            </DiagramProvider>,
        )

        await waitFor(() => expect(latestContext).not.toBeNull())

        act(() => {
            if (latestContext) {
                latestContext.drawioRef.current = {
                    load,
                } as unknown as typeof latestContext.drawioRef.current
                latestContext.onDrawioLoad()
                latestContext.loadDiagram(REAL_PAGE_ONE_XML, true)
            }
        })

        await waitFor(() =>
            expect(latestContext?.chartXML).toBe(REAL_PAGE_ONE_XML),
        )
        expect(load).toHaveBeenCalledTimes(1)
        expect(load).toHaveBeenLastCalledWith({ xml: REAL_PAGE_ONE_XML })
    })

    it("does not clear the undo stack by reloading after autosave updates a real diagram", async () => {
        let latestContext: ReturnType<typeof useDiagram> | null = null
        const load = vi.fn()

        render(
            <DiagramProvider>
                <DiagramContextProbe
                    onChange={(context) => {
                        latestContext = context
                    }}
                />
            </DiagramProvider>,
        )

        await waitFor(() => expect(latestContext).not.toBeNull())

        act(() => {
            if (latestContext) {
                latestContext.drawioRef.current = {
                    load,
                } as unknown as typeof latestContext.drawioRef.current
                latestContext.onDrawioLoad()
                latestContext.loadDiagram(REAL_PAGE_ONE_XML, true)
            }
        })

        await waitFor(() =>
            expect(latestContext?.chartXML).toBe(REAL_PAGE_ONE_XML),
        )

        act(() => {
            latestContext?.handleDiagramAutoSave({
                xml: REAL_PAGE_ONE_UPDATED_XML,
                currentPage: 0,
            })
        })

        await waitFor(() =>
            expect(latestContext?.chartXML).toBe(REAL_PAGE_ONE_UPDATED_XML),
        )
        expect(load).toHaveBeenCalledTimes(1)
    })
})
