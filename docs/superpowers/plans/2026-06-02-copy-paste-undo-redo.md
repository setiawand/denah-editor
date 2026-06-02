# Copy-Paste & Undo-Redo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add undo/redo (20 levels) and copy/paste for all element types to Denah Editor.

**Architecture:** Snapshot-based history stored in Zustand — each mutating action pushes a `{ rooms, doors, wins }` snapshot before applying. Clipboard stores a deep copy of the selected element. Keyboard shortcuts in Editor2D, buttons in Toolbar.

**Tech Stack:** React 18, Zustand 5 (vanilla store), Vite

---

## Files

- Modify: `src/store/useStore.js` — add history/clipboard state + pushHistory/undo/redo/copyEl/pasteEl
- Modify: `src/components/Editor2D.jsx` — add Ctrl+Z/Y/C/V keyboard shortcuts
- Modify: `src/components/Toolbar.jsx` — add Undo/Redo/Copy/Paste buttons

---

### Task 1: Add history & clipboard state to store

**Files:**
- Modify: `src/store/useStore.js`

- [ ] **Step 1: Add state fields and pushHistory**

In `src/store/useStore.js`, add `history`, `historyIdx`, `clipboard` to initial state, and add `pushHistory` as an internal helper. Replace the `createStore((set, get) => ({` block opening so the initial state includes:

```js
export const store = createStore((set, get) => ({
  tool:       'select',
  roomType:   'living',
  view:       '2d',
  selId:      null,
  rooms:      SAMPLE_ROOMS,
  doors:      SAMPLE_DOORS,
  wins:       [],

  history:    [],   // array of { rooms, doors, wins } snapshots
  historyIdx: -1,   // pointer into history; -1 = no history yet
  clipboard:  null, // deep copy of last copied element

  setTool:     t  => set({ tool: t }),
  setRoomType: rt => set({ roomType: rt }),
  setView:     v  => set({ view: v }),
  setSel:      id => set({ selId: id }),

  snapVal: v => Math.round(v / SNAP) * SNAP,
```

- [ ] **Step 2: Add pushHistory action**

Inside the store, after `snapVal`, add:

```js
  pushHistory: () => set(s => {
    const snap = { rooms: s.rooms, doors: s.doors, wins: s.wins };
    const base = s.history.slice(0, s.historyIdx + 1);
    const next = [...base, snap].slice(-20);
    return { history: next, historyIdx: next.length - 1 };
  }),
```

- [ ] **Step 3: Add undo and redo actions**

After `pushHistory`, add:

```js
  undo: () => set(s => {
    if (s.historyIdx <= 0) return {};
    const idx = s.historyIdx - 1;
    const snap = s.history[idx];
    return { ...snap, historyIdx: idx, selId: null };
  }),

  redo: () => set(s => {
    if (s.historyIdx >= s.history.length - 1) return {};
    const idx = s.historyIdx + 1;
    const snap = s.history[idx];
    return { ...snap, historyIdx: idx, selId: null };
  }),
```

- [ ] **Step 4: Add copyEl and pasteEl actions**

After `redo`, add:

```js
  copyEl: () => {
    const { selId, rooms, doors, wins } = get();
    if (!selId) return;
    const room = rooms.find(r => r.id === selId);
    const door = doors.find(d => d.id === selId);
    const win  = wins.find(w => w.id === selId);
    const el = room || door || win;
    if (!el) return;
    const type = room ? 'room' : door ? 'door' : 'win';
    set({ clipboard: { type, el: { ...el } } });
  },

  pasteEl: () => {
    const { clipboard, addRoom, addDoor, addWin } = get();
    if (!clipboard) return;
    const el = { ...clipboard.el, x: clipboard.el.x + 40, y: clipboard.el.y + 40 };
    delete el.id;
    if (clipboard.type === 'room') addRoom(el);
    else if (clipboard.type === 'door') addDoor(el);
    else addWin(el);
  },
```

- [ ] **Step 5: Wire pushHistory into every mutating action**

Update the existing `addRoom`, `updRoom`, `addDoor`, `updDoor`, `addWin`, `updWin`, `delById`, `clearAll` to call `get().pushHistory()` before applying changes:

```js
  // Rooms
  addRoom: r => {
    get().pushHistory();
    const id = uid('room');
    set(s => ({ rooms: [...s.rooms, { ...r, id }], selId: id }));
  },
  updRoom: (id, u) => {
    get().pushHistory();
    set(s => ({ rooms: s.rooms.map(r => r.id === id ? { ...r, ...u } : r) }));
  },

  // Doors
  addDoor: d => {
    get().pushHistory();
    const id = uid('door');
    set(s => ({ doors: [...s.doors, { ...d, id }], selId: id }));
  },
  updDoor: (id, u) => {
    get().pushHistory();
    set(s => ({ doors: s.doors.map(d => d.id === id ? { ...d, ...u } : d) }));
  },

  // Windows
  addWin: w => {
    get().pushHistory();
    const id = uid('win');
    set(s => ({ wins: [...s.wins, { ...w, id }], selId: id }));
  },
  updWin: (id, u) => {
    get().pushHistory();
    set(s => ({ wins: s.wins.map(w => w.id === id ? { ...w, ...u } : w) }));
  },

  // Delete
  delById: id => {
    get().pushHistory();
    set(s => ({
      rooms: s.rooms.filter(r => r.id !== id),
      doors: s.doors.filter(d => d.id !== id),
      wins:  s.wins.filter(w => w.id !== id),
      selId: s.selId === id ? null : s.selId,
    }));
  },
  delSel: () => { const { selId, delById } = get(); if (selId) delById(selId); },
  clearAll: () => {
    get().pushHistory();
    set({ rooms: [], doors: [], wins: [], selId: null });
  },
```

- [ ] **Step 6: Verify store compiles**

```bash
cd /Users/denisetiawan/work/denah-editor && npm run dev
```

Expected: Vite starts without errors. Open browser, app loads normally.

- [ ] **Step 7: Commit**

```bash
git add src/store/useStore.js
git commit -m "feat: add undo/redo history and copy/paste state to store"
```

---

### Task 2: Keyboard shortcuts in Editor2D

**Files:**
- Modify: `src/components/Editor2D.jsx`

- [ ] **Step 1: Read current selector lines at top of Editor2D**

Current lines 27-32 in `src/components/Editor2D.jsx`:
```js
  const rooms    = useStore(s => s.rooms);
  const doors    = useStore(s => s.doors);
  const wins     = useStore(s => s.wins);
  const selId    = useStore(s => s.selId);
  const tool     = useStore(s => s.tool);
  const roomType = useStore(s => s.roomType);
```

- [ ] **Step 2: Add undo/redo/copy/paste shortcuts to existing keydown handler**

Find the existing `onKey` handler inside the `useEffect` (around line 37). Replace it with:

```js
    const onKey = e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const s = useStore.getState();
      const meta = e.ctrlKey || e.metaKey;

      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selId) {
        e.preventDefault(); s.delSel();
      }
      if (e.key === 'Escape') {
        s.setSel(null);
        intRef.current = { type: 'idle' };
        previewRef.current = null; setPreview(null);
      }
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); s.undo(); }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); s.redo(); }
      if (meta && e.key === 'c') { e.preventDefault(); s.copyEl(); }
      if (meta && e.key === 'v') { e.preventDefault(); s.pasteEl(); }
    };
```

- [ ] **Step 3: Verify shortcuts work**

Open browser at `localhost:5173`. Draw a room, then:
- Press `Ctrl+Z` (or `Cmd+Z` on Mac) → room disappears
- Press `Ctrl+Shift+Z` → room reappears
- Click a room, press `Ctrl+C` → no visible change (clipboard set internally)
- Press `Ctrl+V` → new room appears offset by 40px

- [ ] **Step 4: Commit**

```bash
git add src/components/Editor2D.jsx
git commit -m "feat: add Ctrl+Z/Y/C/V keyboard shortcuts"
```

---

### Task 3: Undo/Redo/Copy/Paste buttons in Toolbar

**Files:**
- Modify: `src/components/Toolbar.jsx`

- [ ] **Step 1: Add store selectors for history and clipboard state**

At the top of the `Toolbar` component, after the existing selectors, add:

```js
  const undo       = useStore(s => s.undo);
  const redo       = useStore(s => s.redo);
  const copyEl     = useStore(s => s.copyEl);
  const pasteEl    = useStore(s => s.pasteEl);
  const historyIdx = useStore(s => s.historyIdx);
  const historyLen = useStore(s => s.history.length);
  const clipboard  = useStore(s => s.clipboard);
  const selId      = useStore(s => s.selId);
```

- [ ] **Step 2: Add button group after existing tb-sep**

In the JSX, after the first `<div className="tb-sep"/>`, add a new button group:

```jsx
      {/* Undo / Redo / Copy / Paste */}
      <div className="tb-group">
        <button className="tb-btn" title="Undo (Ctrl+Z)"
          disabled={historyIdx <= 0} onClick={undo}>
          <span className="tb-icon">↩</span>
          <span className="tb-label">Undo</span>
        </button>
        <button className="tb-btn" title="Redo (Ctrl+Shift+Z)"
          disabled={historyIdx >= historyLen - 1} onClick={redo}>
          <span className="tb-icon">↪</span>
          <span className="tb-label">Redo</span>
        </button>
        <button className="tb-btn" title="Copy (Ctrl+C)"
          disabled={!selId} onClick={copyEl}>
          <span className="tb-icon">⧉</span>
          <span className="tb-label">Copy</span>
        </button>
        <button className="tb-btn" title="Paste (Ctrl+V)"
          disabled={!clipboard} onClick={pasteEl}>
          <span className="tb-icon">⊕</span>
          <span className="tb-label">Paste</span>
        </button>
      </div>

      <div className="tb-sep"/>
```

- [ ] **Step 3: Add disabled style to CSS**

In `src/index.css`, find the `.tb-btn` rule and add a disabled variant below it:

```css
.tb-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.tb-btn:disabled:hover { background: transparent; }
```

- [ ] **Step 4: Verify buttons**

Open browser. Check:
- Undo/Redo buttons are greyed out initially (no history)
- Draw a room → Undo button becomes active
- Click Undo button → room removed, Redo becomes active
- Select a room → Copy active, click Copy → Paste becomes active
- Click Paste → new room appears offset

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.jsx src/index.css
git commit -m "feat: add Undo/Redo/Copy/Paste toolbar buttons"
```
