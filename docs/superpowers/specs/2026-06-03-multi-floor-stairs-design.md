# Multi-Floor & Stairs — Design Spec

**Date:** 2026-06-03
**Status:** Approved

---

## Scope

Add multi-floor support (tab-based navigation) and stairs as a placeable element to Denah Editor. Each floor is independent — no ghost/reference from other floors. Max floors: unlimited (practical limit via UI).

---

## Approach: Floors Array in Store

Replace top-level `rooms`, `doors`, `wins` with a `floors` array. Each floor owns its elements. An `activeFloorId` pointer tracks which floor is being edited. All existing mutations operate on the active floor.

---

## Data Structure

```js
floors: [
  {
    id:     'floor_1',
    name:   'Lantai 1',
    rooms:  [...],
    doors:  [...],
    wins:   [],
    stairs: [],
  }
],
activeFloorId: 'floor_1',
```

### Stair element shape

```js
{ id: string, x: number, y: number, rotation: number, direction: 'up' | 'down' }
```

`rotation` follows the same 0/90/180/270 convention as doors.

---

## Store Changes (`src/store/useStore.js`)

### Removed top-level state
`rooms`, `doors`, `wins` — moved inside each floor object.

### New/changed state
- `floors` — array of floor objects (initial: one floor with existing SAMPLE_ROOMS/SAMPLE_DOORS)
- `activeFloorId` — id of the active floor

### New helper (not an action, used internally)
`activeFloor(s)` — returns `s.floors.find(f => f.id === s.activeFloorId)`

### New actions
| Action | Description |
|---|---|
| `addFloor()` | Create new empty floor, name auto-incremented ("Lantai 2", etc.), set as active |
| `setActiveFloor(id)` | Switch active floor |
| `renameFloor(id, name)` | Update floor name |
| `deleteFloor(id)` | Remove floor; if it was active, activate the previous floor; no-op if only 1 floor |
| `addStair(s)` | Add stair to active floor |
| `updStair(id, u)` | Update stair on active floor |

### Adapted existing actions
`addRoom`, `updRoom`, `addDoor`, `updDoor`, `addWin`, `updWin`, `delById`, `delSel`, `copyEl`, `pasteEl` — all updated to read/write via `activeFloor`.

### History
`pushSnap` saves `{ floors, activeFloorId }` snapshot instead of `{ rooms, doors, wins }`.

---

## New Component: `FloorTabs.jsx`

Location: `src/components/FloorTabs.jsx`

Renders a tab bar between the header and the canvas area.

**Layout:**
```
[ Lantai 1 ×] [ Lantai 2 ×] [ + ]
```

**Interactions:**
- Click tab → `setActiveFloor(id)`
- Double-click tab label → inline rename (input field, blur/Enter confirms → `renameFloor`)
- Click `×` on tab → `deleteFloor(id)` (button hidden/disabled when only 1 floor)
- Click `+` button → `addFloor()`

**Selectors used:** `floors`, `activeFloorId`, `addFloor`, `setActiveFloor`, `renameFloor`, `deleteFloor`

---

## Toolbar Changes (`src/components/Toolbar.jsx`)

Add "Tangga" tool between Jendela and Hapus:

```js
{ id: 'stair', icon: '⊠', label: 'Tangga', shortcut: 'S' }
```

Keyboard shortcut `S` added to `Editor2D.jsx` keydown handler.

---

## Editor2D Changes (`src/components/Editor2D.jsx`)

### Selectors
Replace `rooms`, `doors`, `wins` selectors with floor-aware versions:
```js
const rooms  = useStore(s => activeFloor(s)?.rooms  ?? []);
const doors  = useStore(s => activeFloor(s)?.doors  ?? []);
const wins   = useStore(s => activeFloor(s)?.wins   ?? []);
const stairs = useStore(s => activeFloor(s)?.stairs ?? []);
```

### Stair placement
- Tool `stair`: click places stair using `wallSnap` (same as door/window)
- `onBgDown` handles `tool === 'stair'` → `addStair({ x, y, rotation })`
- `onStairDown` handles select/move/erase for stairs

### Stair visual (SVG)
```
Bounding box: 40×40px
- Outer rect: stroke border
- 4–5 diagonal lines across the box (stair steps symbol)
- Small arrow indicating direction (↑ naik, ↓ turun)
```

### Keyboard shortcut
Add `S` → `setTool('stair')` to existing keydown handler.

---

## PropertiesPanel Changes (`src/components/PropertiesPanel.jsx`)

Add stair panel (shown when selected element is a stair):

```
Badge: "Tangga"
Arah: [ Naik ↑ ] [ Turun ↓ ]   (toggle buttons → updStair)
Orientasi: [ 0° ] [ 90° ] [ 180° ] [ 270° ]
[Hapus Tangga]
```

---

## App Layout Change (`src/App.jsx`)

Insert `<FloorTabs />` between `<header>` and `<div className="app-body">`.

---

## CSS (`src/index.css`)

Add `.floor-tabs` styles: horizontal flex bar, tab active state, `+` button, inline rename input.

---

## Files Changed

| File | Change |
|---|---|
| `src/store/useStore.js` | Major refactor — floors array, new actions |
| `src/components/FloorTabs.jsx` | New component |
| `src/components/Editor2D.jsx` | Floor-aware selectors, stair tool, stair render |
| `src/components/Toolbar.jsx` | Add Tangga tool |
| `src/components/PropertiesPanel.jsx` | Add stair properties panel |
| `src/App.jsx` | Insert FloorTabs |
| `src/index.css` | Floor tab styles |
