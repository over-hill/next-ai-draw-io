import { describe, expect, it } from "vitest"
import ja from "@/lib/i18n/dictionaries/ja.json"
import zh from "@/lib/i18n/dictionaries/zh.json"
import zhHant from "@/lib/i18n/dictionaries/zh-Hant.json"

describe("diagram preset i18n", () => {
    it("keeps non-English diagram preset labels from falling back to placeholder question marks", () => {
        const values = [
            zh.chat.diagramPreset,
            zh.chat.diagramPresetOptional,
            zh.settings.diagramPresets,
            zh.diagramPresets.managerTitle,
            zhHant.chat.diagramPreset,
            zhHant.chat.diagramPresetOptional,
            zhHant.settings.diagramPresets,
            zhHant.diagramPresets.managerTitle,
            ja.chat.diagramPreset,
            ja.chat.diagramPresetOptional,
            ja.settings.diagramPresets,
            ja.diagramPresets.managerTitle,
        ]

        values.forEach((value) => {
            expect(value).not.toMatch(/^\?+$/)
            expect(value).not.toContain("????")
        })
    })
})
