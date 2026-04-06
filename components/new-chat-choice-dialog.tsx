"use client"

import { Upload } from "lucide-react"
import { type ChangeEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useDictionary } from "@/hooks/use-dictionary"

interface NewChatChoiceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onStartBlank: () => void | Promise<void>
    onImport: (file: File) => void | Promise<void>
    disabled?: boolean
}

export function NewChatChoiceDialog({
    open,
    onOpenChange,
    onStartBlank,
    onImport,
    disabled = false,
}: NewChatChoiceDialogProps) {
    const dict = useDictionary()
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [isImporting, setIsImporting] = useState(false)

    const isBusy = disabled || isImporting

    const handleImportClick = () => {
        if (isBusy) {
            return
        }

        fileInputRef.current?.click()
    }

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ""

        if (!file) {
            return
        }

        try {
            setIsImporting(true)
            await onImport(file)
        } finally {
            setIsImporting(false)
        }
    }

    const handleStartBlank = async () => {
        if (isBusy) {
            return
        }

        await onStartBlank()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-md"
                data-testid="new-chat-choice-dialog"
            >
                <DialogHeader>
                    <DialogTitle>{dict.dialogs.newChatChoiceTitle}</DialogTitle>
                    <DialogDescription>
                        {dict.dialogs.newChatChoiceDescription}
                    </DialogDescription>
                </DialogHeader>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".drawio,.xml,.svg"
                    className="sr-only"
                    data-testid="new-chat-choice-file-input"
                    onChange={handleFileChange}
                />

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isBusy}
                        data-testid="new-chat-choice-cancel"
                    >
                        {dict.common.cancel}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleImportClick}
                        disabled={isBusy}
                        data-testid="new-chat-choice-import"
                    >
                        <Upload className="h-4 w-4" />
                        {dict.dialogs.newChatChoiceImport}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleStartBlank}
                        disabled={isBusy}
                        data-testid="new-chat-choice-start-blank"
                    >
                        {dict.dialogs.newChatChoiceBlank}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
