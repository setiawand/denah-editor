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
    const floors = updFloor(s.floors, s.activeFloorId, { rooms:[], doors:[], wins:[], stairs:[] });
    return { floors, selId: null, ...pushSnap(s, floors) };
  }),
}));

export const useStore = (selector) => useZustandStore(store, selector);
useStore.getState = store.getState;
useStore.setState = store.setState;
useStore.subscribe = store.subscribe;

export default useStore;
