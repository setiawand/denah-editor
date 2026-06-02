# Copy-Paste & Undo-Redo — Design Spec

**Date:** 2026-06-02
**Status:** Approved

---

## Scope

Add copy-paste and undo/redo capabilities to Denah Editor. All element types (rooms, doors, windows) are supported. History depth: 20 steps.

---

## Approach: Snapshot History

Store full snapshots of `{ rooms, doors, wins }` in a history array inside Zustand. Each mutating action pushes a snapshot before applying the change. Undo/redo moves a pointer through the array. Clipboard holds a deep copy of the selected element(s).

Chosen over command pattern and Immer patches for simplicity — data size is small, 20-level depth keeps memory usage negligible.

---

## State Changes (`useStore.js`)

Add to store:

```js
history:    []   // array of { rooms, doors, wins } snapshots
historyIdx: -1   // current position in history (-1 = initial/empty)
clipboard:  null // { rooms?, door?, win? } — deep copy of copied element
```

### `pushHistory()`
Called internally before every mutating action:
- Slices history to `historyIdx + 1` (discards any redo branch)
- Appends current `{ rooms, doors, wins }` snapshot
- Caps array to 20 entries (drop oldest)
- Increments `historyIdx`

### `undo()`
- If `historyIdx <= 0`: no-op
- Decrement `historyIdx`, restore snapshot at new index

### `redo()`
- If `historyIdx >= history.length - 1`: no-op
- Increment `historyIdx`, restore snapshot at new index

### `copyEl()`
- Reads `selId` from state
- Finds element in rooms/doors/wins
- Deep-copies it into `clipboard`
- Does NOT push history (non-mutating)

### `pasteEl()`
- If `clipboard` is null: no-op
- Creates new element from clipboard with `+40px` offset on x and y
- Calls the appropriate `addRoom`/`addDoor`/`addWin` (which push history)

### Mutating actions that push history
`addRoom`, `updRoom`, `addDoor`, `updDoor`, `addWin`, `updWin`, `delById`, `clearAll`

---

## Keyboard Shortcuts (`Editor2D.jsx`)

Added to existing `keydown` handler:

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + Z` | `undo()` |
| `Ctrl/Cmd + Shift + Z` | `redo()` |
| `Ctrl/Cmd + C` | `copyEl()` |
| `Ctrl/Cmd + V` | `pasteEl()` |

Guard: skip if event target is INPUT/SELECT/TEXTAREA (already exists).

---

## Toolbar UI (`Toolbar.jsx`)

Add 4 buttons in a new group between existing tools and the separator:

| Button | Icon | Disabled when |
|---|---|---|
| Undo | `↩` | `historyIdx <= 0` |
| Redo | `↪` | `historyIdx >= history.length - 1` |
| Copy | `⧉` | `selId === null` |
| Paste | `⊕` | `clipboard === null` |

---

## Files Changed

- `src/store/useStore.js` — add history/clipboard state and actions
- `src/components/Editor2D.jsx` — add keyboard shortcuts
- `src/components/Toolbar.jsx` — add 4 toolbar buttons
