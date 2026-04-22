---
status: partial
phase: 02-canvas-nodes-edit
source: [02-VERIFICATION.md]
started: 2026-04-22T06:55:00Z
updated: 2026-04-22T06:55:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Canvas pan/zoom feel (SC1)
expected: Pan is smooth on empty-canvas drag; Cmd+scroll / trackpad pinch zoom anchors under cursor (not viewport center); clamps cleanly at 0.25 and 4.
result: [pending]

### 2. Visual pixel-parity against handoff (SC5 / DESIGN-01 / NODE-01 / NODE-04)
expected: PersonNode default / hover / selected / dragging / is_me states match styles.css rulesets within 1-2px; no OKLCH color drift; fonts render with ss01/cv11 features.
result: [pending]

### 3. Save pill trust contract (SC4 / SAVE-02)
expected: With Slow 3G throttling, pill goes idle → saving on debounce fire; stays saving until HTTP 200; flips saved (green) only after response; returns to idle after 1.4s. Never shows saved before the HTTP response.
result: [pending]

### 4. Save failure + Retry flow (ERR-01)
expected: Offline edit → red pill + SaveErrorToast bottom-center with "Couldn't save changes for {name}" + Retry; auto-dismiss after 4.4s or user-dismiss; Retry sends the failed patch and pill turns green on 2xx.
result: [pending]

### 5. Drag persistence end-to-end (NODE-06, SC3)
expected: Drag seed YOU node to new coordinates; reload; node renders at new position (movePerson committed to DB).
result: [pending]

### 6. RLS + tree_id WHERE defense cross-user (T-02-02)
expected: User A attempting to mutate User B's personId fails (RLS + .eq('tree_id', treeId) both block write); error surfaces; no data leak.
result: [pending]

### 7. Panel keyboard flow (SEL-03, PANEL-01)
expected: Double-click opens panel; Enter on selected node opens panel; Esc closes panel; X closes; Done closes. Esc inside an input does NOT close panel.
result: [pending]

### 8. window.confirm Remove flow (PANEL-07, PANEL-08, T-02-14)
expected: Non-is_me selection shows Remove → confirm → OK → person deleted, panel closes. is_me seed node does NOT render the Remove button.
result: [pending]

### 9. Edge rendering under zoom (EDGE-05, EDGE-06)
expected: Stroke stays visually constant (2px spouse, 1.5px parent) at all zoom levels 0.25–4. ~60fps during drag at ~200 nodes.
result: [pending]

### 10. Visual state transitions on PersonNode
expected: Hover lifts shadow; click shows selection border + "+" button; mousedown-drag 5px switches to dragging shadow; release without crossing threshold stays as pure click selection; YOU ribbon only on is_me.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
