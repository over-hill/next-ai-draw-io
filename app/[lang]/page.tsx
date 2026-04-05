"use client"
import { usePathname, useRouter } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { DrawIoEmbed } from "react-drawio"
import type { ImperativePanelHandle } from "react-resizable-panels"
import ChatPanel from "@/components/chat-panel"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useDiagram } from "@/contexts/diagram-context"
import { getAssetUrl } from "@/lib/base-path"
import { i18n, type Locale } from "@/lib/i18n/config"
import { isIndexedDBUsable } from "@/lib/session-storage"

const DRAWIO_SELECTION_MESSAGE_SOURCE = "next-ai-drawio-selection-context"

type DrawioBridgeWindow = Window & {
    __NEXT_AI_DRAWIO_SELECTION_BRIDGE__?: boolean
}

function getDrawioIframe() {
    return document.querySelector(
        "iframe.diagrams-iframe",
    ) as HTMLIFrameElement | null
}

function toAbsoluteDrawioUrl(baseUrl: string, origin: string) {
    try {
        return new URL(baseUrl, origin).toString()
    } catch {
        return baseUrl
    }
}

function getSameOriginDrawioBaseUrl(origin: string) {
    return toAbsoluteDrawioUrl(getAssetUrl("/drawio/index.html"), origin)
}

function buildSelectionBridgeScript(messageSource: string) {
    return `
;(() => {
    if (window.__NEXT_AI_DRAWIO_SELECTION_BRIDGE__) {
        return
    }

    window.__NEXT_AI_DRAWIO_SELECTION_BRIDGE__ = true

    const MESSAGE_SOURCE = ${JSON.stringify(messageSource)}
    const MAX_SELECTED_CELLS = 10
    const MAX_CONTEXT_LENGTH = 6000

    const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim()

    const encodeCell = (cell) => {
        try {
            if (!cell || typeof window.mxCodec !== "function" || !window.mxUtils) {
                return ""
            }

            const codec = new window.mxCodec(window.mxUtils.createXmlDocument())
            const node = codec.encode(cell)
            return node ? normalize(window.mxUtils.getXml(node)) : ""
        } catch {
            return ""
        }
    }

    const buildSelectionContext = (graph) => {
        try {
            if (!graph || typeof graph.getSelectionCells !== "function") {
                return ""
            }

            const cells = (graph.getSelectionCells() || []).slice(0, MAX_SELECTED_CELLS)
            if (!cells.length) {
                return ""
            }

            const lines = ["Selected draw.io cells:", "count=" + cells.length]

            cells.forEach((cell, index) => {
                const geometry =
                    typeof cell.getGeometry === "function"
                        ? cell.getGeometry()
                        : cell.geometry
                const parent =
                    typeof cell.getParent === "function" ? cell.getParent() : cell.parent
                const source =
                    typeof cell.getSource === "function" ? cell.getSource() : cell.source
                const target =
                    typeof cell.getTarget === "function" ? cell.getTarget() : cell.target
                const value =
                    typeof cell.getValue === "function" ? cell.getValue() : cell.value

                lines.push("")
                lines.push("cell " + (index + 1) + ":")
                if (cell.id != null) {
                    lines.push("id=" + cell.id)
                }
                lines.push(cell.edge ? "type=edge" : "type=vertex")

                const normalizedValue = normalize(value)
                if (normalizedValue) {
                    lines.push("value=" + normalizedValue)
                }

                if (parent && parent.id != null) {
                    lines.push("parent=" + parent.id)
                }
                if (source && source.id != null) {
                    lines.push("source=" + source.id)
                }
                if (target && target.id != null) {
                    lines.push("target=" + target.id)
                }

                if (geometry) {
                    if (geometry.x != null) {
                        lines.push("x=" + geometry.x)
                    }
                    if (geometry.y != null) {
                        lines.push("y=" + geometry.y)
                    }
                    if (geometry.width != null) {
                        lines.push("width=" + geometry.width)
                    }
                    if (geometry.height != null) {
                        lines.push("height=" + geometry.height)
                    }
                }

                const style = normalize(cell.style)
                if (style) {
                    lines.push("style=" + style)
                }

                const xml = encodeCell(cell)
                if (xml) {
                    lines.push("xml=" + xml)
                }
            })

            return lines.join("\\n").slice(0, MAX_CONTEXT_LENGTH)
        } catch {
            return ""
        }
    }

    const postSelection = (graph) => {
        try {
            window.parent.postMessage(
                {
                    source: MESSAGE_SOURCE,
                    selectionContext: buildSelectionContext(graph),
                },
                "*",
            )
        } catch {
            // Ignore parent messaging failures.
        }
    }

    const attachGraph = (graph) => {
        if (!graph || graph.__NEXT_AI_SELECTION_BRIDGE_ATTACHED__) {
            return false
        }

        graph.__NEXT_AI_SELECTION_BRIDGE_ATTACHED__ = true

        try {
            const selectionModel =
                typeof graph.getSelectionModel === "function"
                    ? graph.getSelectionModel()
                    : null

            if (
                selectionModel &&
                typeof selectionModel.addListener === "function" &&
                window.mxEvent
            ) {
                selectionModel.addListener(window.mxEvent.CHANGE, () => {
                    postSelection(graph)
                })
            }
        } catch {
            // Ignore listener registration failures and still emit once below.
        }

        window.setTimeout(() => postSelection(graph), 0)
        return true
    }

    const tryAttachKnownGraph = () => {
        const candidates = [
            window.ui?.editor?.graph,
            window.editorUi?.editor?.graph,
            window.editor?.graph,
        ]

        return candidates.some((graph) => attachGraph(graph))
    }

    if (
        window.mxGraphSelectionModel &&
        !window.mxGraphSelectionModel.prototype.__NEXT_AI_SELECTION_BRIDGE_WRAPPED__
    ) {
        const originalChangeSelection =
            window.mxGraphSelectionModel.prototype.changeSelection

        window.mxGraphSelectionModel.prototype.changeSelection = function () {
            const result = originalChangeSelection.apply(this, arguments)

            if (this.graph) {
                attachGraph(this.graph)
                postSelection(this.graph)
            }

            return result
        }

        window.mxGraphSelectionModel.prototype.__NEXT_AI_SELECTION_BRIDGE_WRAPPED__ = true
    }

    let attempts = 0
    const timer = window.setInterval(() => {
        attempts += 1

        if (tryAttachKnownGraph() || attempts >= 40) {
            window.clearInterval(timer)
        }
    }, 250)
})()
`
}

export default function Home() {
    const {
        drawioRef,
        handleDiagramExport,
        handleDiagramAutoSave,
        onDrawioLoad,
        resetDrawioReady,
        setAutoSelectionContext,
    } = useDiagram()
    const router = useRouter()
    const pathname = usePathname()
    // Extract current language from pathname (e.g., "/zh/about" → "zh")
    const currentLang = (pathname.split("/")[1] || i18n.defaultLocale) as Locale
    const [isMobile, setIsMobile] = useState(false)
    const [isChatVisible, setIsChatVisible] = useState(true)
    const [drawioUi, setDrawioUi] = useState<"min" | "sketch">("min")
    const [darkMode, setDarkMode] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isDrawioReady, setIsDrawioReady] = useState(false)
    const [isElectron, setIsElectron] = useState(false)
    const [canPersist, setCanPersist] = useState(false)
    const [canPersistChecked, setCanPersistChecked] = useState(false)
    const [drawioBaseUrl, setDrawioBaseUrl] = useState(
        process.env.NEXT_PUBLIC_DRAWIO_BASE_URL || "https://embed.diagrams.net",
    )

    const chatPanelRef = useRef<ImperativePanelHandle>(null)
    const isMobileRef = useRef(false)

    // Load preferences from localStorage after mount
    useEffect(() => {
        // Restore saved locale and redirect if needed
        const savedLocale = localStorage.getItem("next-ai-draw-io-locale")
        if (savedLocale && i18n.locales.includes(savedLocale as Locale)) {
            const pathParts = pathname.split("/").filter(Boolean)
            const currentLocale = pathParts[0]
            if (currentLocale !== savedLocale) {
                pathParts[0] = savedLocale
                router.replace(`/${pathParts.join("/")}`)
                return // Wait for redirect
            }
        }

        const savedUi = localStorage.getItem("drawio-theme")
        if (savedUi === "min" || savedUi === "sketch") {
            setDrawioUi(savedUi)
        }

        const savedDarkMode = localStorage.getItem("next-ai-draw-io-dark-mode")
        if (savedDarkMode !== null) {
            const isDark = savedDarkMode === "true"
            setDarkMode(isDark)
            document.documentElement.classList.toggle("dark", isDark)
        } else {
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)",
            ).matches
            setDarkMode(prefersDark)
            document.documentElement.classList.toggle("dark", prefersDark)
        }

        const electronDetected = !!(
            window as unknown as { electronAPI?: unknown }
        ).electronAPI

        if (process.env.NEXT_PUBLIC_DRAWIO_BASE_URL) {
            setDrawioBaseUrl(
                toAbsoluteDrawioUrl(
                    process.env.NEXT_PUBLIC_DRAWIO_BASE_URL,
                    window.location.origin,
                ),
            )
        } else {
            // Serve draw.io from the same origin so selection context can be
            // read from the iframe in normal browser mode.
            setDrawioBaseUrl(getSameOriginDrawioBaseUrl(window.location.origin))
        }

        if (electronDetected) {
            setIsElectron(true)
        }

        void (async () => {
            const usable = await isIndexedDBUsable()
            setCanPersist(usable)
            setCanPersistChecked(true)
        })()
        setIsLoaded(true)
    }, [pathname, router])

    const handleDrawioLoad = useCallback(() => {
        setIsDrawioReady(true)
        setAutoSelectionContext("")
        onDrawioLoad()
    }, [onDrawioLoad, setAutoSelectionContext])

    const handleDrawioAutoSave = useCallback(
        (data: { xml?: string }) => {
            handleDiagramAutoSave(data)
            // Only suppress modified state when persistence is available
            if (canPersist) {
                drawioRef.current?.status({ message: "", modified: false })
            }
        },
        [canPersist, drawioRef, handleDiagramAutoSave],
    )

    const handleDarkModeChange = () => {
        const newValue = !darkMode
        setDarkMode(newValue)
        localStorage.setItem("next-ai-draw-io-dark-mode", String(newValue))
        document.documentElement.classList.toggle("dark", newValue)
        setIsDrawioReady(false)
        resetDrawioReady()
    }

    const handleDrawioUiChange = () => {
        const newUi = drawioUi === "min" ? "sketch" : "min"
        localStorage.setItem("drawio-theme", newUi)
        setDrawioUi(newUi)
        setIsDrawioReady(false)
        resetDrawioReady()
    }

    // Check mobile - reset draw.io before crossing breakpoint
    const isInitialRenderRef = useRef(true)
    useEffect(() => {
        const checkMobile = () => {
            const newIsMobile = window.innerWidth < 768
            if (
                !isInitialRenderRef.current &&
                newIsMobile !== isMobileRef.current
            ) {
                setIsDrawioReady(false)
                resetDrawioReady()
            }
            isMobileRef.current = newIsMobile
            isInitialRenderRef.current = false
            setIsMobile(newIsMobile)
        }

        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [resetDrawioReady])

    const toggleChatPanel = () => {
        const panel = chatPanelRef.current
        if (panel) {
            if (panel.isCollapsed()) {
                panel.expand()
                setIsChatVisible(true)
            } else {
                panel.collapse()
                setIsChatVisible(false)
            }
        }
    }

    // Keyboard shortcut for toggling chat panel
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "b") {
                event.preventDefault()
                toggleChatPanel()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    useEffect(() => {
        const handleSelectionMessage = (event: MessageEvent) => {
            const iframe = getDrawioIframe()
            if (!iframe || event.source !== iframe.contentWindow) {
                return
            }

            const data = event.data
            if (
                !data ||
                typeof data !== "object" ||
                !("source" in data) ||
                data.source !== DRAWIO_SELECTION_MESSAGE_SOURCE
            ) {
                return
            }

            setAutoSelectionContext(
                "selectionContext" in data &&
                    typeof data.selectionContext === "string"
                    ? data.selectionContext
                    : "",
            )
        }

        window.addEventListener("message", handleSelectionMessage)
        return () =>
            window.removeEventListener("message", handleSelectionMessage)
    }, [setAutoSelectionContext])

    useEffect(() => {
        if (!isDrawioReady) {
            return
        }

        let attempts = 0
        const tryInstallBridge = () => {
            attempts += 1

            const iframe = getDrawioIframe()
            if (!iframe) {
                return false
            }

            try {
                const iframeWindow =
                    iframe.contentWindow as DrawioBridgeWindow | null
                const iframeDocument = iframeWindow?.document
                if (!iframeWindow || !iframeDocument) {
                    return false
                }

                if (iframeWindow.__NEXT_AI_DRAWIO_SELECTION_BRIDGE__) {
                    return true
                }

                const script = iframeDocument.createElement("script")
                script.textContent = buildSelectionBridgeScript(
                    DRAWIO_SELECTION_MESSAGE_SOURCE,
                )
                ;(
                    iframeDocument.head || iframeDocument.documentElement
                ).appendChild(script)
                script.remove()
                return true
            } catch {
                return false
            }
        }

        if (tryInstallBridge()) {
            return
        }

        const timer = window.setInterval(() => {
            if (tryInstallBridge() || attempts >= 12) {
                window.clearInterval(timer)
            }
        }, 250)

        return () => window.clearInterval(timer)
    }, [drawioBaseUrl, isDrawioReady])

    return (
        <div className="h-screen bg-background relative overflow-hidden">
            <ResizablePanelGroup
                id="main-panel-group"
                direction={isMobile ? "vertical" : "horizontal"}
                className="h-full"
            >
                <ResizablePanel
                    id="drawio-panel"
                    defaultSize={isMobile ? 50 : 67}
                    minSize={20}
                >
                    <div
                        className={`h-full relative ${
                            isMobile ? "p-1" : "p-2"
                        }`}
                    >
                        <div className="h-full rounded-xl overflow-hidden shadow-soft-lg border border-border/30 relative">
                            {isLoaded && canPersistChecked && (
                                <div
                                    className={`h-full w-full ${isDrawioReady ? "" : "invisible absolute inset-0"}`}
                                >
                                    <DrawIoEmbed
                                        key={`${drawioUi}-${darkMode}-${currentLang}-${isElectron}`}
                                        ref={drawioRef}
                                        autosave
                                        onAutoSave={handleDrawioAutoSave}
                                        onExport={handleDiagramExport}
                                        onLoad={handleDrawioLoad}
                                        baseUrl={drawioBaseUrl}
                                        configuration={
                                            canPersist
                                                ? { confirmExit: false }
                                                : undefined
                                        }
                                        urlParameters={{
                                            ui: drawioUi,
                                            spin: false,
                                            libraries: false,
                                            // Disable modified tracking only when persistence is available
                                            ...(canPersist && {
                                                modified: false,
                                                keepmodified: false,
                                            }),
                                            saveAndExit: false,
                                            noSaveBtn: true,
                                            noExitBtn: true,
                                            dark: darkMode,
                                            lang: currentLang,
                                            // Enable offline mode in Electron to disable external service calls
                                            ...(isElectron && {
                                                offline: true,
                                            }),
                                        }}
                                    />
                                </div>
                            )}
                            {(!isLoaded || !isDrawioReady) && (
                                <div className="h-full w-full bg-background flex items-center justify-center">
                                    <span className="text-muted-foreground">
                                        Draw.io panel is loading...
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Chat Panel */}
                <ResizablePanel
                    key={isMobile ? "mobile" : "desktop"}
                    id="chat-panel"
                    ref={chatPanelRef}
                    defaultSize={isMobile ? 50 : 33}
                    minSize={isMobile ? 20 : 15}
                    maxSize={isMobile ? 80 : 50}
                    collapsible={!isMobile}
                    collapsedSize={isMobile ? 0 : 3}
                    onCollapse={() => setIsChatVisible(false)}
                    onExpand={() => setIsChatVisible(true)}
                >
                    <div className={`h-full ${isMobile ? "p-1" : "py-2 pr-2"}`}>
                        <Suspense
                            fallback={
                                <div className="h-full bg-card rounded-xl border border-border/30 flex items-center justify-center text-muted-foreground">
                                    Loading chat...
                                </div>
                            }
                        >
                            <ChatPanel
                                isVisible={isChatVisible}
                                onToggleVisibility={toggleChatPanel}
                                drawioUi={drawioUi}
                                onToggleDrawioUi={handleDrawioUiChange}
                                darkMode={darkMode}
                                onToggleDarkMode={handleDarkModeChange}
                                isMobile={isMobile}
                            />
                        </Suspense>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
