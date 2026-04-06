# New Chat Choice Modal Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright regression tests that cover the new chat choice dialog so blank chats reset the conversation and cancel leaves it intact.

**Architecture:** New scenarios live inside the existing `history-restore` spec and reuse the shared SSE mock + helper utilities. Each test freshly routes `**/api/chat`, opens the dialog via `[data-testid="new-chat-button"]`, then asserts the dialog state plus the next chat state.

**Tech Stack:** Playwright + TypeScript 5 fixtures/helpers, the shared `tests/e2e/lib/fixtures.ts`, and `createMockSSEResponse` helper.

---

### Task 1: Add the new chat choice modal tests

**Files:**
- Modify `tests/e2e/history-restore.spec.ts` in the “History and Session Restore” describe block, near the existing “new chat button clears conversation” test.

- [ ] **Step 1: Add the start-blank test**

```ts
test("new chat choice start blank clears conversation", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: createMockSSEResponse(
                SINGLE_BOX_XML,
                "Created your test diagram.",
            ),
        })
    })

    await page.goto("/", { waitUntil: "networkidle" })
    await getIframe(page).waitFor({ state: "visible", timeout: 30000 })

    await test.step("create a conversation", async () => {
        await sendMessage(page, "Create a test diagram")
        await waitForText(page, "Created your test diagram.")
    })

    const newChatButton = page.locator('[data-testid="new-chat-button"]')
    const dialog = page.locator('[data-testid="new-chat-choice-dialog"]')
    const startBlank = page.locator(
        '[data-testid="new-chat-choice-start-blank"]',
    )

    await test.step("open the new chat choice dialog", async () => {
        await expect(newChatButton).toBeVisible({ timeout: 5000 })
        await newChatButton.click()
        await expect(dialog).toBeVisible({ timeout: 5000 })
    })

    await test.step("start blank and verify conversation reset", async () => {
        await startBlank.click()
        await expect(dialog).not.toBeVisible({ timeout: 5000 })
        await expect(
            page.locator('text="Created your test diagram."'),
        ).not.toBeVisible({ timeout: 5000 })
    })
})
```

- [ ] **Step 2: Add the cancel test**

```ts
test("new chat choice cancel preserves conversation", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: createMockSSEResponse(
                SINGLE_BOX_XML,
                "Created your test diagram.",
            ),
        })
    })

    await page.goto("/", { waitUntil: "networkidle" })
    await getIframe(page).waitFor({ state: "visible", timeout: 30000 })

    await test.step("create a conversation", async () => {
        await sendMessage(page, "Create a test diagram")
        await waitForText(page, "Created your test diagram.")
    })

    const newChatButton = page.locator('[data-testid="new-chat-button"]')
    const dialog = page.locator('[data-testid="new-chat-choice-dialog"]')
    const cancel = page.locator(
        '[data-testid="new-chat-choice-cancel"]',
    )

    await test.step("open and cancel the dialog", async () => {
        await expect(newChatButton).toBeVisible({ timeout: 5000 })
        await newChatButton.click()
        await expect(dialog).toBeVisible({ timeout: 5000 })
        await cancel.click()
    })

    await test.step("verify conversation still contains the diagram response", async () => {
        await expect(dialog).not.toBeVisible({ timeout: 5000 })
        await expect(
            page.locator('text="Created your test diagram."'),
        ).toBeVisible({ timeout: 5000 })
    })
})
```

- [ ] **Step 3: Run the new tests**

```bash
npx playwright test tests/e2e/history-restore.spec.ts --grep "new chat choice"
```

Expected: the two new tests pass alongside the existing suite; Playwright should report `2 passed` for those tests.

Plan complete and saved to `docs/superpowers/plans/2026-04-05-new-chat-choice-modal-test-plan.md`. Two execution options:

1. Subagent-Driven (recommended) — dispatch a subagent per task and use `superpowers:subagent-driven-development`.
2. Inline Execution — continue in this session using `superpowers:executing-plans`.

Which approach would you like me to take? If I don’t hear otherwise, I’ll proceed inline with `superpowers:executing-plans`.
