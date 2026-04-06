# New Chat Choice Modal E2E Test Design

## Context
- The new “new chat” flow now pops a choice dialog that lets users import a diagram or start fresh before wiping the current conversation. We need regression coverage that (1) validates the dialog appears and (2) asserts the two primary outcomes (start blank clears chat, cancel preserves it) without touching production code outside the test suite.
- Existing e2e tests already cover history/restore flows in `tests/e2e/history-restore.spec.ts` using the shared fixtures/helpers (`sendMessage`, `waitForText`, `createMockSSEResponse`). The new behavior is tightly coupled with the existing “new chat” button, so the same spec can host the additional scenarios.

## Assumptions
- The modal exposes the following selectors we can rely on directly (data-testid values documented by the UI team): `new-chat-choice-dialog`, `new-chat-choice-start-blank`, `new-chat-choice-import`, `new-chat-choice-cancel`, and the existing launcher `new-chat-button`.
- We can reuse `SINGLE_BOX_XML` as the diagram payload for the mock SSE stream; the modal should trigger before any new request is sent, so no extra network mocking is required beyond what the spec already covers.

## Approach
- **Chosen path (extend `history-restore.spec.ts`):** add two focused tests at the end of the file so state setup/teardown reuse existing networking mocks and helper utilities. This keeps the regression story within the same ownership boundary and avoids duplicating setup logic.
- Alternative considered: create a dedicated `new-chat-choice.spec.ts` or shared helper, but each would either require duplicating setup or co-locating new helpers with uncertain future needs. The minimal change surface of adding tests in the existing spec is preferable for this regression.

## Test Scenarios
1. **“New chat” modal appears when the user clicks the button**
   - Use the existing SSE mock and `sendMessage` flow to ensure a conversation exists.
   - Click `[data-testid="new-chat-button"]` and assert `[data-testid="new-chat-choice-dialog"]` becomes visible.
   - Because the modal is the key outcome, keep assertions to data-testid visibility rather than language-specific copy.
2. **Selecting “Start blank” clears the conversation**
   - From the dialog state, click `[data-testid="new-chat-choice-start-blank"]`.
   - Wait for the dialog to close (expect the dialog locator to be hidden). Then assert the previously rendered message text (e.g., `Created your test diagram.`) is not visible anymore.
3. **Cancel keeps the conversation intact**
   - Reproduce the conversation again, open the dialog, click `[data-testid="new-chat-choice-cancel"]`.
   - Confirm the dialog disappears and the previous message remains visible, proving cancel is a no-op for conversation state.

Each test will wrap the key verification steps in `test.step` boundaries and rely on the existing `createMockSSEResponse` flow so the new dialog state is the only variable.

## Spec self-review
- No TODOs or placeholders remain in this document.
- All selectors and behaviors refer to concrete, documented data-testids.
- Scope remains limited to the modal interaction; there is no overlap with unrelated features.

Please review this spec; once it looks correct I’ll proceed with the implementation plan and follow-up tests.
