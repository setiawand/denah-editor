import { createStore } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';

export const GRID = 40;
export const SNAP = 20;
export const MIN_ROOM = 40;
export const DOOR_W = 40;
export const WIN_W = 60;
export const WALL_H = 2.8;

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

export const store = createStore((set, get) => ({
  tool:       'select',
  roomType:   'living',
  view:       '2d',
  selId:      null,
  rooms:      SAMPLE_ROOMS,
  doors:      SAMPLE_DOORS,
  wins:       [],

  history:    [],
  historyIdx: -1,
  clipboard:  null,

  setTool:     t  => set({ tool: t }),
  setRoomType: rt => set({ roomType: rt }),
  setView:     v  => set({ view: v }),
  setSel:      id => set({ selId: id }),

  snapVal: v => Math.round(v / SNAP) * SNAP,

  pushHistory: () => set(s => {
    const snap = { rooms: s.rooms, doors: s.doors, wins: s.wins };
    const base = s.history.slice(0, s.historyIdx + 1);
    const next = [...base, snap].slice(-20);
    return { history: next, historyIdx: next.length - 1 };
  }),

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
}));

export const useStore = (selector) => useZustandStore(store, selector);
useStore.getState = store.getState;
useStore.setState = store.setState;
useStore.subscribe = store.subscribe;

export default useStore;
