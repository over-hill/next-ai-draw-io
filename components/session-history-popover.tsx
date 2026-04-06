"use client"

import { Check, History } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useDictionary } from "@/hooks/use-dictionary"
import { cn } from "@/lib/utils"

interface SessionHistoryItem {
    id: string
    title: string
    updatedAt: number
    thumbnailDataUrl?: string
}

interface SessionHistoryPopoverProps {
    sessions: SessionHistoryItem[]
    currentSessionId: string | null
    onSelect: (sessionId: string) => void
    disabled?: boolean
}

function formatSessionDate(timestamp: number, justNowLabel: string) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffMins < 1) return justNowLabel
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    })
}

export function SessionHistoryPopover({
    sessions,
    currentSessionId,
    onSelect,
    disabled = false,
}: SessionHistoryPopoverProps) {
    const dict = useDictionary()
    const [open, setOpen] = useState(false)

    const sortedSessions = useMemo(
        () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
        [sessions],
    )

    const handleSelect = (sessionId: string) => {
        onSelect(sessionId)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    className="hover:bg-accent"
                    data-testid="session-history-trigger"
                    aria-label={dict.sessionHistory.tooltip}
                >
                    <History className="h-5 w-5 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={8}
                className="w-[min(92vw,360px)] p-2"
            >
                {sortedSessions.length === 0 ? (
                    <div className="space-y-1 px-2 py-4 text-center">
                        <p className="text-sm font-medium">
                            {dict.sessionHistory.empty}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {dict.sessionHistory.emptyHint}
                        </p>
                    </div>
                ) : (
                    <div className="max-h-[min(60vh,420px)] space-y-1 overflow-y-auto">
                        {sortedSessions.map((session) => {
                            const isActive = currentSessionId === session.id

                            return (
                                <button
                                    key={session.id}
                                    type="button"
                                    data-testid={`session-history-item-${session.id}`}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent",
                                        isActive &&
                                            "bg-accent text-accent-foreground",
                                    )}
                                    onClick={() => handleSelect(session.id)}
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {session.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatSessionDate(
                                                session.updatedAt,
                                                dict.sessionHistory.justNow,
                                            )}
                                        </p>
                                    </div>
                                    {isActive ? (
                                        <Check className="h-4 w-4 shrink-0" />
                                    ) : null}
                                </button>
                            )
                        })}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
