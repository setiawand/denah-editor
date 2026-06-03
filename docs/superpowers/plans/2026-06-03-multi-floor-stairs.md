# Multi-Floor & Stairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-floor support with tab-based navigation and a placeable stairs element to Denah Editor.

**Architecture:** Replace flat `rooms/doors/wins` state with a `floors` array where each floor owns its elements. An `activeFloorId` pointer determines which floor all mutations target. A new `FloorTabs` component renders above the canvas. Stairs are a new element type inside each floor.

**Tech Stack:** React 18, Zustand 5 (vanilla store via `createStore`), SVG canvas

---

## Files

| File | Change |
|---|---|
| `src/store/useStore.js` | Major refactor — floors array, activeFloorId, new floor/stair actions |
| `src/components/FloorTabs.jsx` | New — tab bar component |
| `src/components/Editor2D.jsx` | Floor-aware selectors, stair tool/render/interaction |
| `src/components/Toolbar.jsx` | Add Tangga tool |
| `src/components/PropertiesPanel.jsx` | Add stair properties panel |
| `src/App.jsx` | Insert FloorTabs between header and body |
| `src/index.css` | Floor tab styles |

---

### Task 1: Refactor store — floors array + new actions

**Files:**
- Modify: `src/store/useStore.js`

- [ ] **Step 1: Rewrite useStore.js**

Replace the entire file with:

```js
import { createStore } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';

export const GRID = 40;
export const SNAP = 20;
export const MIN_ROOM = 40;
export const DOOR_W = 40;
export const WIN_W = 60;
export const WALL_H = 2.8;
export const STAIR_W = 40;

export const ROOM_TYPES = [
  { id:'living',   name:'Ruang Tamu',   c2d:'#DBEAFE', b2d:'#2563EB', c3d:0x93C5FD },
  { id:'bedroom',  name:'Kamar Tidur',  c2d:'#FEF9C3', b2d:'#CA8A04', c3d:0xFDE047 },
  { id:'kitchen',  name:'Dapur',        c2d:'#DCFCE7', b2d:'#15803D', c3d:0x86EFAC },
  { id:'bathroom', name:'Kamar Mandi',  c2d:'#EDE9FE', b2d:'#6D28D9', c3d:0xC4B5FD },
  { id:'dining',   name:'Ruang Makan',  c2d:'#FCE7F3', b2d:'#9D174D', c3d:0xF9A8D4 },
  { id:'garage',   name:'Garasi',       c2d:'#F1F5F9', b2d:'#475569', c3d:0xCBD5E1 },
  { id:'porch',    name:'Teras',        c2d:'#FFF7ED', b2d:'#C2410C', c3d:0xFED7AA },
  { id:'study',    name:'Ruang Kerja',  c2d:'#F0FDF4', b2d:'#15803D', c3d:0xBBF7D0 },
  { id:'custom',   name:'Lainnya',      c2d:'#F5F5F5', b2d:'#525252', c3d:0xE5E7EB },
];

let _uid = 20;
const uid = p => `${p}_${++_uid}`;

export const activeFloor = s => s.floors.find(f => f.id === s.activeFloorId);

const updFloor = (floors, activeFloorId, patch) =>
  floors.map(f => f.id === activeFloorId ? { ...f, ...patch } : f);

const SAMPLE_ROOMS = [
  { id:'r1', name:'Ruang Tamu',  type:'living',   x:120, y:100, width:240, height:200 },
  { id:'r2', name:'Dapur',       type:'kitchen',  x:360, y:100, width:160, height:120 },
  { id:'r3', name:'Ruang Makan', type:'dining',   x:360, y:220, width:160, height:80  },
  { id:'r4', name:'Kamar Tidur', type:'bedroom',  x:120, y:300, width:200, height:200 },
  { id:'r5', name:'Kamar Mandi', type:'bathroom', x:320, y:300, width:120, height:120 },
  { id:'r6', name:'Teras',       type:'porch',    x:120, y:500, width:360, height:80  },
];

const SAMPLE_DOORS = [
  { id:'d1', x:200, y:300, rotation:0   },
  { id:'d2', x:380, y:300, rotation:0   },
  { id:'d3', x:120, y:420, rotation:270 },
];

const initialFloor = {
  id: 'floor_1', name: 'Lantai 1',
  rooms: SAMPLE_ROOMS, doors: SAMPLE_DOORS, wins: [], stairs: [],
};

const initialSnap = { floors: [initialFloor], activeFloorId: 'floor_1' };

const pushSnap = (s, newFloors, newActiveFloorId) => {
  const snap = {
    floors: newFloors ?? s.floors,
    activeFloorId: newActiveFloorId ?? s.activeFloorId,
  };
  const base = s.history.slice(0, s.historyIdx + 1);
  const next = [...base, snap].slice(-20);
  return { history: next, historyIdx: next.length - 1 };
};

export const store = createStore((set, get) => ({
  tool:          'select',
  roomType:      'living',
  view:          '2d',
  selId:         null,
  floors:        [initialFloor],
  activeFloorId: 'floor_1',
  history:       [initialSnap],
  historyIdx:    0,
  clipboard:     null,

  setTool:     t  => set({ tool: t }),
  setRoomType: rt => set({ roomType: rt }),
  setView:     v  => set({ view: v }),
  setSel:      id => set({ selId: id }),
  snapVal: v => Math.round(v / SNAP) * SNAP,

  // ── Floor management ────────────────────────────────
  addFloor: () => set(s => {
    const id = uid('floor');
    const name = `Lantai ${s.floors.length + 1}`;
    const floors = [...s.floors, { id, name, rooms: [], doors: [], wins: [], stairs: [] }];
    return { floors, activeFloorId: id, selId: null, ...pushSnap(s, floors, id) };
  }),

  setActiveFloor: id => set({ activeFloorId: id, selId: null }),

  renameFloor: (id, name) => set(s => ({
    floors: s.floors.map(f => f.id === id ? { ...f, name } : f),
  })),

  deleteFloor: id => set(s => {
    if (s.floors.length <= 1) return {};
    const floors = s.floors.filter(f => f.id !== id);
    const wasActive = s.activeFloorId === id;
    const activeFloorId = wasActive
      ? floors[Math.max(0, s.floors.findIndex(f => f.id === id) - 1)].id
      : s.activeFloorId;
    return { floors, activeFloorId, selId: null, ...pushSnap(s, floors, activeFloorId) };
  }),

  // ── History ─────────────────────────────────────────
  pushHistoryNow: () => set(s => pushSnap(s, s.floors, s.activeFloorId)),

  undo: () => set(s => {
    if (s.historyIdx <= 0) return {};
    const idx = s.historyIdx - 1;
    return { ...s.history[idx], historyIdx: idx, selId: null };
  }),

  redo: () => set(s => {
    if (s.historyIdx >= s.history.length - 1) return {};
    const idx = s.historyIdx + 1;
    return { ...s.history[idx], historyIdx: idx, selId: null };
  }),

  // ── Clipboard ───────────────────────────────────────
  copyEl: () => {
    const s = get();
    const af = activeFloor(s);
    if (!s.selId || !af) return;
    const room  = af.rooms.find(r => r.id === s.selId);
    const door  = af.doors.find(d => d.id === s.selId);
    const win   = af.wins.find(w => w.id === s.selId);
    const stair = af.stairs.find(st => st.id === s.selId);
    const el = room || door || win || stair;
    if (!el) return;
    const type = room ? 'room' : door ? 'door' : win ? 'win' : 'stair';
    set({ clipboard: { type, el: { ...el } } });
  },

  pasteEl: () => {
    const { clipboard, addRoom, addDoor, addWin, addStair } = get();
    if (!clipboard) return;
    const el = { ...clipboard.el, x: clipboard.el.x + 40, y: clipboard.el.y + 40 };
    delete el.id;
    if      (clipboard.type === 'room')  addRoom(el);
    else if (clipboard.type === 'door')  addDoor(el);
    else if (clipboard.type === 'win')   addWin(el);
    else                                 addStair(el);
  },

  // ── Rooms ───────────────────────────────────────────
  addRoom: r => set(s => {
    const id = uid('room');
    const rooms = [...activeFloor(s).rooms, { ...r, id }];
    const floors = updFloor(s.floors, s.activeFloorId, { rooms });
    return { floors, selId: id, ...pushSnap(s, floors) };
  }),
  updRoom: (id, u) => set(s => {
    const rooms = activeFloor(s).rooms.map(r => r.id === id ? { ...r, ...u } : r);
    return { floors: updFloor(s.floors, s.activeFloorId, { rooms }) };
  }),

  // ── Doors ───────────────────────────────────────────
  addDoor: d => set(s => {
    const id = uid('door');
    const doors = [...activeFloor(s).doors, { ...d, id }];
    const floors = updFloor(s.floors, s.activeFloorId, { doors });
    return { floors, selId: id, ...pushSnap(s, floors) };
  }),
  updDoor: (id, u) => set(s => {
    const doors = activeFloor(s).doors.map(d => d.id === id ? { ...d, ...u } : d);
    return { floors: updFloor(s.floors, s.activeFloorId, { doors }) };
  }),

  // ── Windows ─────────────────────────────────────────
  addWin: w => set(s => {
    const id = uid('win');
    const wins = [...activeFloor(s).wins, { ...w, id }];
    const floors = updFloor(s.floors, s.activeFloorId, { wins });
    return { floors, selId: id, ...pushSnap(s, floors) };
  }),
  updWin: (id, u) => set(s => {
    const wins = activeFloor(s).wins.map(w => w.id === id ? { ...w, ...u } : w);
    return { floors: updFloor(s.floors, s.activeFloorId, { wins }) };
  }),

  // ── Stairs ──────────────────────────────────────────
  addStair: st => set(s => {
    const id = uid('stair');
    const stairs = [...activeFloor(s).stairs, { direction: 'up', ...st, id }];
    const floors = updFloor(s.floors, s.activeFloorId, { stairs });
    return { floors, selId: id, ...pushSnap(s, floors) };
  }),
  updStair: (id, u) => set(s => {
    const stairs = activeFloor(s).stairs.map(st => st.id === id ? { ...st, ...u } : st);
    return { floors: updFloor(s.floors, s.activeFloorId, { stairs }) };
  }),

  // ── Delete ──────────────────────────────────────────
  delById: id => set(s => {
    const af = activeFloor(s);
    const rooms  = af.rooms.filter(r => r.id !== id);
    const doors  = af.doors.filter(d => d.id !== id);
    const wins   = af.wins.filter(w => w.id !== id);
    const stairs = af.stairs.filter(st => st.id !== id);
    const selId  = s.selId === id ? null : s.selId;
    const floors = updFloor(s.floors, s.activeFloorId, { rooms, doors, wins, stairs });
    return { floors, selId, ...pushSnap(s, floors) };
  }),
  delSel:   () => { const { selId, delById } = get(); if (selId) delById(selId); },
  clearAll: () => set(s => {
    const floors = updFloor(s.floors, s.activeFloorId, { rooms: [], doors: [], wins: [], stairs: [] });
    return { floors, selId: null, ...pushSnap(s, floors) };
  }),
}));

export const useStore = (selector) => useZustandStore(store, selector);
useStore.getState = store.getState;
useStore.setState = store.setState;
useStore.subscribe = store.subscribe;

export default useStore;
```

- [ ] **Step 2: Verify app still loads**

```bash
cd /Users/denisetiawan/work/denah-editor && npm run dev
```

Expected: Vite starts, browser shows app with sample rooms on Lantai 1 (no tabs yet — coming in Task 2).

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.js
git commit -m "refactor: replace flat rooms/doors/wins with floors array in store"
```

---

### Task 2: FloorTabs component + CSS + App.jsx

**Files:**
- Create: `src/components/FloorTabs.jsx`
- Modify: `src/index.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create FloorTabs.jsx**

```jsx
import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function FloorTabs() {
  const floors        = useStore(s => s.floors);
  const activeFloorId = useStore(s => s.activeFloorId);
  const addFloor      = useStore(s => s.addFloor);
  const setActiveFloor = useStore(s => s.setActiveFloor);
  const renameFloor   = useStore(s => s.renameFloor);
  const deleteFloor   = useStore(s => s.deleteFloor);

  const [editingId, setEditingId]     = useState(null);
  const [editingName, setEditingName] = useState('');

  const startRename = (floor, e) => {
    e.stopPropagation();
    setEditingId(floor.id);
    setEditingName(floor.name);
  };

  const commitRename = () => {
    if (editingName.trim()) renameFloor(editingId, editingName.trim());
    setEditingId(null);
  };

  return (
    <div className="floor-tabs">
      {floors.map(floor => (
        <div key={floor.id}
          className={`floor-tab${floor.id === activeFloorId ? ' active' : ''}`}
          onClick={() => setActiveFloor(floor.id)}
          onDoubleClick={e => startRename(floor, e)}>
          {editingId === floor.id ? (
            <input
              className="floor-tab-input"
              value={editingName}
              autoFocus
              onChange={e => setEditingName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="floor-tab-label">{floor.name}</span>
          )}
          {floors.length > 1 && (
            <button className="floor-tab-close"
              title="Hapus lantai"
              onClick={e => { e.stopPropagation(); deleteFloor(floor.id); }}>
              ×
            </button>
          )}
        </div>
      ))}
      <button className="floor-tab-add" onClick={addFloor} title="Tambah lantai">+</button>
    </div>
  );
}
```

- [ ] **Step 2: Add floor tab CSS to src/index.css**

Append at end of `src/index.css`:

```css
/* ── Floor tabs ───────────────────────────────── */
.floor-tabs {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 8px 16px 0;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.floor-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surf);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  color: var(--muted);
  font-size: 13px;
  user-select: none;
  transition: background 0.15s, color 0.15s;
}
.floor-tab:hover { background: var(--surf2); color: var(--text); }
.floor-tab.active {
  background: var(--surf2);
  color: var(--text);
  position: relative;
}
.floor-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  height: 1px;
  background: var(--surf2);
}

.floor-tab-label { font-weight: 500; }

.floor-tab-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--accent);
  color: var(--text);
  font-size: 13px;
  width: 80px;
  outline: none;
  padding: 0;
}

.floor-tab-close {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 0 2px;
}
.floor-tab-close:hover { color: var(--danger); }

.floor-tab-add {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 20px;
  padding: 2px 10px 8px;
  line-height: 1;
}
.floor-tab-add:hover { color: var(--accent2); }
```

- [ ] **Step 3: Insert FloorTabs in App.jsx**

In `src/App.jsx`, add the import and insert `<FloorTabs />` between `<header>` and `<div className="app-body">`:

```jsx
import Toolbar from './components/Toolbar';
import Editor2D from './components/Editor2D';
import View3D from './components/View3D';
import PropertiesPanel from './components/PropertiesPanel';
import FloorTabs from './components/FloorTabs';
import { useStore, ROOM_TYPES } from './store/useStore';

export default function App() {
  const view       = useStore(s => s.view);
  const roomType   = useStore(s => s.roomType);
  const setRoomType = useStore(s => s.setRoomType);
  const setTool    = useStore(s => s.setTool);

  const handleRoomTypeClick = (id) => {
    setRoomType(id);
    setTool('room');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-mark">⬡</span>
          <span className="logo-text">Denah<span className="logo-accent">Editor</span></span>
        </div>
        <Toolbar />
      </header>

      <FloorTabs />

      <div className="app-body">
        <aside className="sidebar">
          <div className="sb-section">
            <p className="sb-title">Tipe Ruangan</p>
            {ROOM_TYPES.map(rt => (
              <button key={rt.id}
                className={`rt-btn${roomType===rt.id ? ' active' : ''}`}
                style={{ '--rc': rt.c2d, '--rb': rt.b2d }}
                onClick={() => handleRoomTypeClick(rt.id)}>
                <span className="rt-dot" style={{ background: rt.b2d }}/>
                {rt.name}
              </button>
            ))}
          </div>
          <div className="sb-section sb-shortcuts">
            <p className="sb-title">Pintasan</p>
            {[['V','Pilih'],['R','Ruangan'],['D','Pintu'],['W','Jendela'],['S','Tangga'],['E','Hapus'],['Del','Hapus sel.'],['Esc','Batal']].map(([k,v])=>(
              <div key={k} className="shortcut-row">
                <kbd>{k}</kbd><span>{v}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="canvas-wrap">
          {view === '2d' ? <Editor2D /> : <View3D />}
        </main>

        <aside className="props-sidebar">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify tabs appear**

Open browser at `localhost:5173`. Expected: floor tab bar appears below the toolbar showing "Lantai 1". Click `+` → new tab "Lantai 2" appears and becomes active (canvas clears). Double-click tab label → inline rename input. Click `×` on Lantai 2 → tab removed, Lantai 1 becomes active.

- [ ] **Step 5: Commit**

```bash
git add src/components/FloorTabs.jsx src/index.css src/App.jsx
git commit -m "feat: add FloorTabs component with add/rename/delete"
```

---

### Task 3: Update Editor2D — floor-aware selectors + stair tool

**Files:**
- Modify: `src/components/Editor2D.jsx`

- [ ] **Step 1: Add activeFloor import and update selectors**

At top of `src/components/Editor2D.jsx`, update import:

```js
import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore, activeFloor, GRID, SNAP, MIN_ROOM, DOOR_W, WIN_W, STAIR_W, ROOM_TYPES } from '../store/useStore';
```

Replace the 6 selector lines (rooms/doors/wins/selId/tool/roomType):

```js
const rooms    = useStore(s => activeFloor(s)?.rooms  ?? []);
const doors    = useStore(s => activeFloor(s)?.doors  ?? []);
const wins     = useStore(s => activeFloor(s)?.wins   ?? []);
const stairs   = useStore(s => activeFloor(s)?.stairs ?? []);
const selId    = useStore(s => s.selId);
const tool     = useStore(s => s.tool);
const roomType = useStore(s => s.roomType);
```

- [ ] **Step 2: Add onStairDown handler**

After `onWinDown`, add:

```js
  const onStairDown = useCallback((e, id) => {
    e.stopPropagation();
    const s = useStore.getState();
    if (s.tool === 'eraser') { s.delById(id); return; }
    if (s.tool !== 'select') return;
    const pt = toSVG(e);
    const stair = activeFloor(s)?.stairs?.find(st => st.id === id);
    if (!stair) return;
    s.setSel(id);
    intRef.current = { type: 'moving-stair', id, ox: pt.x - stair.x, oy: pt.y - stair.y };
  }, [toSVG]);
```

- [ ] **Step 3: Update onBgDown to handle stair tool and use activeFloor for wallSnap**

Replace the `onBgDown` function:

```js
  const onBgDown = useCallback(e => {
    e.preventDefault();
    const s = useStore.getState();
    const pt = toSVG(e);
    s.setSel(null);
    const af = activeFloor(s);
    const afRooms = af?.rooms ?? [];

    if (s.tool === 'room') {
      const sx = s.snapVal(pt.x), sy = s.snapVal(pt.y);
      intRef.current = { type:'drawing', startX:sx, startY:sy };
      const p = { x:sx, y:sy, width:0, height:0 };
      previewRef.current = p; setPreview(p);
    } else if (s.tool === 'door') {
      const snap = wallSnap(pt.x, pt.y, afRooms, s.snapVal);
      s.addDoor({ x:snap.x, y:snap.y, rotation:snap.rotation });
    } else if (s.tool === 'window') {
      const snap = wallSnap(pt.x, pt.y, afRooms, s.snapVal);
      s.addWin({ x:snap.x, y:snap.y, rotation:snap.rotation });
    } else if (s.tool === 'stair') {
      const snap = wallSnap(pt.x, pt.y, afRooms, s.snapVal);
      s.addStair({ x:snap.x, y:snap.y, rotation:snap.rotation });
    }
  }, [toSVG]);
```

- [ ] **Step 4: Update onMove to handle moving-stair**

Inside the `onMove` callback, after the `moving-win` block, add:

```js
    } else if (it.type === 'moving-stair') {
      s.updStair(it.id, { x: s.snapVal(pt.x - it.ox), y: s.snapVal(pt.y - it.oy) });
```

- [ ] **Step 5: Update onUp to push history for moving-stair**

Change the condition in `onUp`:

```js
    } else if (['moving', 'moving-door', 'moving-win', 'moving-stair', 'resizing'].includes(it.type)) {
      useStore.getState().pushHistoryNow();
    }
```

- [ ] **Step 6: Add stair keyboard shortcut**

In the `onKey` handler, after the window shortcut line, add:

```js
      const keys = { v:'select', r:'room', d:'door', w:'window', s:'stair', e:'eraser' };
```

Replace the existing individual key checks for tool shortcuts. Find the section where shortcuts like `v`, `r`, `d`, `w`, `e` are handled (they may be in the keydown or in a separate useEffect). If shortcut keys aren't yet handled in `onKey`, add after the Escape block:

```js
      if (!meta) {
        const keys = { v:'select', r:'room', d:'door', w:'window', s:'stair', e:'eraser' };
        if (keys[e.key.toLowerCase()]) s.setTool(keys[e.key.toLowerCase()]);
      }
```

- [ ] **Step 7: Render stairs in SVG**

After the `{/* Windows */}` block and before `{/* Drawing preview */}`, add:

```jsx
        {/* Stairs */}
        {stairs.map(stair => {
          const sel = selId === stair.id;
          const SW = STAIR_W;
          return (
            <g key={stair.id}
              transform={`translate(${stair.x},${stair.y}) rotate(${stair.rotation}, ${SW/2}, ${SW/2})`}
              style={{ cursor: tool==='select' ? 'move' : tool==='eraser' ? 'cell' : 'default' }}
              onMouseDown={e => onStairDown(e, stair.id)}>
              <rect x={0} y={0} width={SW} height={SW}
                fill={sel ? 'rgba(59,130,246,0.1)' : 'rgba(203,213,225,0.25)'}
                stroke={sel ? '#3B82F6' : '#64748B'}
                strokeWidth={sel ? 2 : 1.5} rx={1}/>
              {[0.25, 0.5, 0.75].map((t, i) => (
                <line key={i}
                  x1={SW * t} y1={0} x2={0} y2={SW * t}
                  stroke={sel ? '#3B82F6' : '#94A3B8'} strokeWidth={1}/>
              ))}
              <line x1={SW} y1={0} x2={0} y2={SW}
                stroke={sel ? '#3B82F6' : '#94A3B8'} strokeWidth={1}/>
              <text x={SW/2} y={SW/2 + 5} textAnchor="middle" fontSize={14}
                fill={sel ? '#3B82F6' : '#334155'} pointerEvents="none">
                {stair.direction === 'up' ? '↑' : '↓'}
              </text>
            </g>
          );
        })}
```

- [ ] **Step 8: Verify**

Open browser. Check:
- Sample rooms still appear on Lantai 1
- Press `S` → cursor changes to cell (stair tool active)
- Click near a room wall → stair element appears (40×40 box with diagonal lines + ↑ arrow)
- Click stair with select tool → shows selection highlight
- Drag stair → moves with snap

- [ ] **Step 9: Commit**

```bash
git add src/components/Editor2D.jsx
git commit -m "feat: floor-aware selectors and stair tool in Editor2D"
```

---

### Task 4: Add Tangga tool to Toolbar

**Files:**
- Modify: `src/components/Toolbar.jsx`

- [ ] **Step 1: Add stair to TOOLS array**

In `src/components/Toolbar.jsx`, update the `TOOLS` array:

```js
const TOOLS = [
  { id:'select', icon:'↖', label:'Pilih',   shortcut:'V' },
  { id:'room',   icon:'⬜', label:'Ruangan', shortcut:'R' },
  { id:'door',   icon:'◫',  label:'Pintu',   shortcut:'D' },
  { id:'window', icon:'⊞',  label:'Jendela', shortcut:'W' },
  { id:'stair',  icon:'⊠',  label:'Tangga',  shortcut:'S' },
  { id:'eraser', icon:'✕',  label:'Hapus',   shortcut:'E' },
];
```

- [ ] **Step 2: Verify**

Open browser. Toolbar now shows "Tangga ⊠" button between Jendela and Hapus. Click it → tool becomes active (highlighted). Press `S` → same result.

- [ ] **Step 3: Commit**

```bash
git add src/components/Toolbar.jsx
git commit -m "feat: add Tangga tool to toolbar"
```

---

### Task 5: Add stair properties panel

**Files:**
- Modify: `src/components/PropertiesPanel.jsx`

- [ ] **Step 1: Update PropertiesPanel to use activeFloor and add stair panel**

Replace the entire `src/components/PropertiesPanel.jsx`:

```jsx
import { useStore, activeFloor, ROOM_TYPES, GRID } from '../store/useStore';

export default function PropertiesPanel() {
  const selId   = useStore(s => s.selId);
  const rooms   = useStore(s => activeFloor(s)?.rooms  ?? []);
  const doors   = useStore(s => activeFloor(s)?.doors  ?? []);
  const wins    = useStore(s => activeFloor(s)?.wins   ?? []);
  const stairs  = useStore(s => activeFloor(s)?.stairs ?? []);
  const updRoom  = useStore(s => s.updRoom);
  const updDoor  = useStore(s => s.updDoor);
  const updWin   = useStore(s => s.updWin);
  const updStair = useStore(s => s.updStair);
  const delById  = useStore(s => s.delById);

  if (!selId) {
    return (
      <div className="props">
        <div className="props-empty">
          <div className="props-empty-icon">◱</div>
          <p>Klik elemen untuk melihat properti</p>
        </div>
      </div>
    );
  }

  const room  = rooms.find(r => r.id === selId);
  const door  = doors.find(d => d.id === selId);
  const win   = wins.find(w => w.id === selId);
  const stair = stairs.find(st => st.id === selId);

  if (room) {
    const area = ((room.width * room.height) / (GRID * GRID)).toFixed(1);
    return (
      <div className="props">
        <div className="props-header">
          <span className="props-type-badge" style={{
            background: (ROOM_TYPES.find(t=>t.id===room.type)||ROOM_TYPES[8]).c2d,
            color: (ROOM_TYPES.find(t=>t.id===room.type)||ROOM_TYPES[8]).b2d,
          }}>Ruangan</span>
        </div>
        <label className="props-label">Nama Ruangan
          <input className="props-input" value={room.name}
            onChange={e => updRoom(room.id, { name: e.target.value })}/>
        </label>
        <label className="props-label">Tipe
          <select className="props-input" value={room.type}
            onChange={e => updRoom(room.id, { type: e.target.value })}>
            {ROOM_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <div className="props-dim-grid">
          <div className="props-dim-card">
            <span className="dim-value">{(room.width/GRID).toFixed(1)}</span>
            <span className="dim-unit">m lebar</span>
          </div>
          <div className="props-dim-card">
            <span className="dim-value">{(room.height/GRID).toFixed(1)}</span>
            <span className="dim-unit">m tinggi</span>
          </div>
          <div className="props-dim-card full">
            <span className="dim-value">{area}</span>
            <span className="dim-unit">m² luas</span>
          </div>
        </div>
        <button className="btn-delete" onClick={() => delById(room.id)}>Hapus Ruangan</button>
      </div>
    );
  }

  if (door) {
    return (
      <div className="props">
        <div className="props-header">
          <span className="props-type-badge" style={{ background:'#E0F2FE', color:'#0369A1' }}>Pintu</span>
        </div>
        <label className="props-label">Arah Bukaan
          <div className="rot-grid">
            {[{r:0,label:'Kanan'},{r:90,label:'Bawah'},{r:180,label:'Kiri'},{r:270,label:'Atas'}].map(({r,label}) => (
              <button key={r}
                className={`rot-btn${door.rotation===r ? ' active' : ''}`}
                onClick={() => updDoor(door.id, { rotation:r })}>
                {label}
              </button>
            ))}
          </div>
        </label>
        <div className="props-hint">Tip: klik & drag untuk pindahkan pintu</div>
        <button className="btn-delete" onClick={() => delById(door.id)}>Hapus Pintu</button>
      </div>
    );
  }

  if (win) {
    return (
      <div className="props">
        <div className="props-header">
          <span className="props-type-badge" style={{ background:'#E0F7FA', color:'#0097A7' }}>Jendela</span>
        </div>
        <label className="props-label">Orientasi
          <div className="rot-grid">
            {[{r:0,label:'Horizontal'},{r:90,label:'Vertikal'}].map(({r,label}) => (
              <button key={r}
                className={`rot-btn${win.rotation===r ? ' active' : ''}`}
                onClick={() => updWin(win.id, { rotation:r })}>
                {label}
              </button>
            ))}
          </div>
        </label>
        <div className="props-hint">Tip: klik & drag untuk pindahkan jendela</div>
        <button className="btn-delete" onClick={() => delById(win.id)}>Hapus Jendela</button>
      </div>
    );
  }

  if (stair) {
    return (
      <div className="props">
        <div className="props-header">
          <span className="props-type-badge" style={{ background:'#F0F9FF', color:'#0369A1' }}>Tangga</span>
        </div>
        <label className="props-label">Arah
          <div className="rot-grid">
            {[{d:'up',label:'Naik ↑'},{d:'down',label:'Turun ↓'}].map(({d,label}) => (
              <button key={d}
                className={`rot-btn${stair.direction===d ? ' active' : ''}`}
                onClick={() => updStair(stair.id, { direction:d })}>
                {label}
              </button>
            ))}
          </div>
        </label>
        <label className="props-label">Orientasi
          <div className="rot-grid">
            {[{r:0,label:'0°'},{r:90,label:'90°'},{r:180,label:'180°'},{r:270,label:'270°'}].map(({r,label}) => (
              <button key={r}
                className={`rot-btn${stair.rotation===r ? ' active' : ''}`}
                onClick={() => updStair(stair.id, { rotation:r })}>
                {label}
              </button>
            ))}
          </div>
        </label>
        <div className="props-hint">Tip: klik & drag untuk pindahkan tangga</div>
        <button className="btn-delete" onClick={() => delById(stair.id)}>Hapus Tangga</button>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Verify**

Open browser. Click a stair → Properties Panel shows "Tangga" badge with Arah (Naik/Turun) and Orientasi buttons. Click "Turun ↓" → arrow in canvas changes to ↓. Click an orientation → stair rotates.

- [ ] **Step 3: Commit**

```bash
git add src/components/PropertiesPanel.jsx
git commit -m "feat: add stair properties panel"
```
