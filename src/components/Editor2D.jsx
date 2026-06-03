import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore, activeFloor, GRID, SNAP, MIN_ROOM, DOOR_W, WIN_W, STAIR_W, ROOM_TYPES } from '../store/useStore';

const HANDLE = 8;

function wallSnap(mx, my, rooms, snapFn, threshold = 32) {
  let best = { x: snapFn(mx), y: snapFn(my), rotation: 0, d: threshold };
  rooms.forEach(r => {
    const checks = [
      { cond: mx>=r.x && mx<=r.x+r.width,  snapX: snapFn(mx), snapY: r.y,           rot: 0,   dy: Math.abs(my-r.y) },
      { cond: mx>=r.x && mx<=r.x+r.width,  snapX: snapFn(mx), snapY: r.y+r.height,  rot: 180, dy: Math.abs(my-(r.y+r.height)) },
      { cond: my>=r.y && my<=r.y+r.height, snapX: r.x,          snapY: snapFn(my),  rot: 270, dy: Math.abs(mx-r.x) },
      { cond: my>=r.y && my<=r.y+r.height, snapX: r.x+r.width,  snapY: snapFn(my),  rot: 90,  dy: Math.abs(mx-(r.x+r.width)) },
    ];
    checks.forEach(c => { if (c.cond && c.dy < best.d) best = { x:c.snapX, y:c.snapY, rotation:c.rot, d:c.dy }; });
  });
  return { x: best.x, y: best.y, rotation: best.rotation };
}

export default function Editor2D() {
  const svgRef     = useRef(null);
  const intRef     = useRef({ type:'idle' });
  const previewRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const rooms  = useStore(s => activeFloor(s)?.rooms  ?? []);
  const doors  = useStore(s => activeFloor(s)?.doors  ?? []);
  const wins   = useStore(s => activeFloor(s)?.wins   ?? []);
  const stairs = useStore(s => activeFloor(s)?.stairs ?? []);
  const selId  = useStore(s => s.selId);
  const tool   = useStore(s => s.tool);
  const roomType = useStore(s => s.roomType);

  const toSVG = useCallback(e => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  /* ─── Keyboard ───────────────────────────────────────────── */
  useEffect(() => {
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

      if (!meta) {
        const keys = { v:'select', r:'room', d:'door', w:'window', s:'stair', e:'eraser' };
        if (keys[e.key.toLowerCase()]) s.setTool(keys[e.key.toLowerCase()]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ─── MouseDown on background ────────────────────────────── */
  const onBgDown = useCallback(e => {
    e.preventDefault();
    const s = useStore.getState();
    const pt = toSVG(e);
    s.setSel(null);
    const afRooms = activeFloor(s)?.rooms ?? [];

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

  /* ─── MouseDown on elements ──────────────────────────────── */
  const onRoomDown = useCallback((e, id) => {
    e.stopPropagation();
    const s = useStore.getState();
    if (s.tool === 'eraser') { s.delById(id); return; }
    if (s.tool !== 'select') return;
    const pt = toSVG(e);
    const room = activeFloor(s)?.rooms.find(r => r.id === id);
    if (!room) return;
    s.setSel(id);
    intRef.current = { type:'moving', id, ox: pt.x-room.x, oy: pt.y-room.y };
  }, [toSVG]);

  const onDoorDown = useCallback((e, id) => {
    e.stopPropagation();
    const s = useStore.getState();
    if (s.tool === 'eraser') { s.delById(id); return; }
    if (s.tool !== 'select') return;
    const pt = toSVG(e);
    const door = activeFloor(s)?.doors.find(d => d.id === id);
    if (!door) return;
    s.setSel(id);
    intRef.current = { type:'moving-door', id, ox: pt.x-door.x, oy: pt.y-door.y };
  }, [toSVG]);

  const onWinDown = useCallback((e, id) => {
    e.stopPropagation();
    const s = useStore.getState();
    if (s.tool === 'eraser') { s.delById(id); return; }
    if (s.tool !== 'select') return;
    const pt = toSVG(e);
    const win = activeFloor(s)?.wins.find(w => w.id === id);
    if (!win) return;
    s.setSel(id);
    intRef.current = { type:'moving-win', id, ox: pt.x-win.x, oy: pt.y-win.y };
  }, [toSVG]);

  const onStairDown = useCallback((e, id) => {
    e.stopPropagation();
    const s = useStore.getState();
    if (s.tool === 'eraser') { s.delById(id); return; }
    if (s.tool !== 'select') return;
    const pt = toSVG(e);
    const stair = activeFloor(s)?.stairs?.find(st => st.id === id);
    if (!stair) return;
    s.setSel(id);
    intRef.current = { type:'moving-stair', id, ox: pt.x-stair.x, oy: pt.y-stair.y };
  }, [toSVG]);

  const onHandleDown = useCallback((e, id, handle) => {
    e.stopPropagation();
    const s = useStore.getState();
    const room = activeFloor(s)?.rooms.find(r => r.id === id);
    if (!room) return;
    const pt = toSVG(e);
    intRef.current = { type:'resizing', id, handle, sx:pt.x, sy:pt.y, orig:{...room} };
  }, [toSVG]);

  /* ─── MouseMove ──────────────────────────────────────────── */
  const onMove = useCallback(e => {
    const pt = toSVG(e);
    const it = intRef.current;
    const s = useStore.getState();

    if (it.type === 'drawing') {
      const cx = s.snapVal(pt.x), cy = s.snapVal(pt.y);
      const p = {
        x: Math.min(it.startX, cx), y: Math.min(it.startY, cy),
        width: Math.abs(cx-it.startX), height: Math.abs(cy-it.startY),
      };
      previewRef.current = p; setPreview({...p});
    } else if (it.type === 'moving') {
      s.updRoom(it.id, { x: s.snapVal(pt.x - it.ox), y: s.snapVal(pt.y - it.oy) });
    } else if (it.type === 'moving-door') {
      s.updDoor(it.id, { x: s.snapVal(pt.x - it.ox), y: s.snapVal(pt.y - it.oy) });
    } else if (it.type === 'moving-win') {
      s.updWin(it.id, { x: s.snapVal(pt.x - it.ox), y: s.snapVal(pt.y - it.oy) });
    } else if (it.type === 'moving-stair') {
      s.updStair(it.id, { x: s.snapVal(pt.x - it.ox), y: s.snapVal(pt.y - it.oy) });
    } else if (it.type === 'resizing') {
      const dx = pt.x - it.sx, dy = pt.y - it.sy;
      const o = it.orig, M = MIN_ROOM;
      if (it.handle === 'se') {
        s.updRoom(it.id, { width: s.snapVal(Math.max(M, o.width+dx)), height: s.snapVal(Math.max(M, o.height+dy)) });
      } else if (it.handle === 'sw') {
        const nw = s.snapVal(Math.max(M, o.width-dx));
        s.updRoom(it.id, { x: o.x+o.width-nw, width:nw, height: s.snapVal(Math.max(M, o.height+dy)) });
      } else if (it.handle === 'ne') {
        const nh = s.snapVal(Math.max(M, o.height-dy));
        s.updRoom(it.id, { y: o.y+o.height-nh, width: s.snapVal(Math.max(M, o.width+dx)), height:nh });
      } else if (it.handle === 'nw') {
        const nw = s.snapVal(Math.max(M, o.width-dx));
        const nh = s.snapVal(Math.max(M, o.height-dy));
        s.updRoom(it.id, { x: o.x+o.width-nw, y: o.y+o.height-nh, width:nw, height:nh });
      }
    }
  }, [toSVG]);

  /* ─── MouseUp ────────────────────────────────────────────── */
  const onUp = useCallback(() => {
    const it = intRef.current;
    if (it.type === 'drawing') {
      const p = previewRef.current;
      if (p && p.width >= MIN_ROOM && p.height >= MIN_ROOM) {
        const s = useStore.getState();
        const rt = ROOM_TYPES.find(t => t.id === s.roomType) || ROOM_TYPES[0];
        const af = activeFloor(s);
        const count = (af?.rooms ?? []).filter(r => r.type === s.roomType).length + 1;
        const name = count > 1 ? `${rt.name} ${count}` : rt.name;
        s.addRoom({ name, type: s.roomType, ...p });
      }
      previewRef.current = null; setPreview(null);
    } else if (['moving', 'moving-door', 'moving-win', 'moving-stair', 'resizing'].includes(it.type)) {
      useStore.getState().pushHistoryNow();
    }
    intRef.current = { type:'idle' };
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onMove, onUp]);

  const cursor = { select:'default', room:'crosshair', door:'cell', window:'cell', stair:'cell', eraser:'cell' }[tool] || 'default';

  return (
    <div style={{ width:'100%', height:'100%', overflow:'auto', background:'#F8FAFC', position:'relative' }}>
      <svg
        ref={svgRef}
        width={1400} height={1000}
        style={{ display:'block', cursor, userSelect:'none', minWidth:900, minHeight:700 }}
        onMouseDown={onBgDown}
      >
        <defs>
          <pattern id="sg" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
            <path d={`M ${SNAP} 0 L 0 0 0 ${SNAP}`} fill="none" stroke="#E2E8F0" strokeWidth={0.5}/>
          </pattern>
          <pattern id="gg" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <rect width={GRID} height={GRID} fill="url(#sg)"/>
            <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#CBD5E1" strokeWidth={1}/>
          </pattern>
          <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#94A3B8" floodOpacity="0.3"/>
          </filter>
        </defs>

        <rect width={1400} height={1000} fill="url(#gg)" onMouseDown={onBgDown} />

        {/* Rooms */}
        {rooms.map(room => {
          const rt = ROOM_TYPES.find(t=>t.id===room.type) || ROOM_TYPES[8];
          const sel = selId === room.id;
          return (
            <g key={room.id} style={{ cursor: tool==='eraser' ? 'cell' : tool==='select' ? 'move' : 'default' }}>
              {sel && <rect x={room.x-2} y={room.y-2} width={room.width+4} height={room.height+4}
                fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="7 3" opacity={0.6} rx={3} pointerEvents="none"/>}
              <rect x={room.x} y={room.y} width={room.width} height={room.height}
                fill={rt.c2d} stroke={sel ? '#3B82F6' : rt.b2d}
                strokeWidth={sel ? 2 : 1.5} rx={2} filter={sel ? 'url(#shadow)' : ''}
                onMouseDown={e => onRoomDown(e, room.id)}/>
              <text x={room.x+room.width/2} y={room.y+room.height/2-8}
                textAnchor="middle" fontSize={12} fontFamily='"Plus Jakarta Sans",sans-serif'
                fontWeight={600} fill={rt.b2d} pointerEvents="none">
                {room.name}
              </text>
              <text x={room.x+room.width/2} y={room.y+room.height/2+12}
                textAnchor="middle" fontSize={10} fontFamily='"JetBrains Mono",monospace'
                fill={rt.b2d} fillOpacity={0.6} pointerEvents="none">
                {(room.width/GRID).toFixed(1)}m × {(room.height/GRID).toFixed(1)}m
              </text>
              {sel && tool==='select' && [
                {h:'nw', cx:room.x,            cy:room.y,             cur:'nw-resize'},
                {h:'ne', cx:room.x+room.width,  cy:room.y,             cur:'ne-resize'},
                {h:'se', cx:room.x+room.width,  cy:room.y+room.height, cur:'se-resize'},
                {h:'sw', cx:room.x,            cy:room.y+room.height, cur:'sw-resize'},
              ].map(({h,cx,cy,cur}) => (
                <rect key={h} x={cx-HANDLE/2} y={cy-HANDLE/2} width={HANDLE} height={HANDLE}
                  fill="white" stroke="#3B82F6" strokeWidth={1.5} rx={1}
                  style={{ cursor:cur }} onMouseDown={e => onHandleDown(e, room.id, h)}/>
              ))}
            </g>
          );
        })}

        {/* Doors */}
        {doors.map(door => {
          const sel = selId === door.id;
          const DW = DOOR_W;
          return (
            <g key={door.id}
              transform={`translate(${door.x},${door.y}) rotate(${door.rotation})`}
              style={{ cursor: tool==='select' ? 'move' : tool==='eraser' ? 'cell' : 'default' }}
              onMouseDown={e => onDoorDown(e, door.id)}>
              <circle cx={0} cy={0} r={3.5} fill={sel ? '#3B82F6' : '#334155'}/>
              <line x1={0} y1={0} x2={DW} y2={0} stroke={sel ? '#3B82F6' : '#334155'} strokeWidth={2.5}/>
              <path d={`M ${DW} 0 A ${DW} ${DW} 0 0 1 0 ${DW}`}
                fill={sel ? 'rgba(59,130,246,0.12)' : 'rgba(148,163,184,0.15)'}
                stroke={sel ? '#3B82F6' : '#94A3B8'} strokeWidth={1.5} strokeDasharray="5 3"/>
            </g>
          );
        })}

        {/* Windows */}
        {wins.map(win => {
          const sel = selId === win.id;
          const WW = WIN_W;
          return (
            <g key={win.id}
              transform={`translate(${win.x},${win.y}) rotate(${win.rotation})`}
              style={{ cursor: tool==='select' ? 'move' : tool==='eraser' ? 'cell' : 'default' }}
              onMouseDown={e => onWinDown(e, win.id)}>
              <rect x={0} y={-6} width={WW} height={12}
                fill={sel ? 'rgba(186,230,253,0.8)' : 'rgba(186,230,253,0.6)'}
                stroke={sel ? '#3B82F6' : '#0EA5E9'} strokeWidth={2} rx={1}/>
              <line x1={WW/3} y1={-6} x2={WW/3} y2={6} stroke={sel ? '#3B82F6' : '#0EA5E9'} strokeWidth={1}/>
              <line x1={WW*2/3} y1={-6} x2={WW*2/3} y2={6} stroke={sel ? '#3B82F6' : '#0EA5E9'} strokeWidth={1}/>
            </g>
          );
        })}

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
                <line key={i} x1={SW*t} y1={0} x2={0} y2={SW*t}
                  stroke={sel ? '#3B82F6' : '#94A3B8'} strokeWidth={1}/>
              ))}
              <line x1={SW} y1={0} x2={0} y2={SW}
                stroke={sel ? '#3B82F6' : '#94A3B8'} strokeWidth={1}/>
              <text x={SW/2} y={SW/2+5} textAnchor="middle" fontSize={14}
                fill={sel ? '#3B82F6' : '#334155'} pointerEvents="none">
                {stair.direction === 'up' ? '↑' : '↓'}
              </text>
            </g>
          );
        })}

        {/* Drawing preview */}
        {preview && preview.width > 2 && preview.height > 2 && (
          <rect x={preview.x} y={preview.y} width={preview.width} height={preview.height}
            fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth={2} strokeDasharray="8 4" rx={2}/>
        )}

        {/* Compass rose */}
        <g transform="translate(1355,50)">
          <circle cx={0} cy={0} r={22} fill="rgba(255,255,255,0.92)" stroke="#CBD5E1" strokeWidth={1}/>
          <polygon points="0,-18 3.5,-9 0,-13 -3.5,-9" fill="#EF4444"/>
          <polygon points="0,18 3.5,9 0,13 -3.5,9" fill="#CBD5E1"/>
          <text x={0} y={-6} textAnchor="middle" fontSize={9} fontWeight={700} fontFamily="sans-serif" fill="#334155">U</text>
        </g>

        {/* Scale bar */}
        <g transform="translate(30,970)">
          <rect x={0} y={-7} width={40} height={7} fill="#3B82F6"/>
          <rect x={40} y={-7} width={40} height={7} fill="white" stroke="#3B82F6" strokeWidth={1}/>
          <text x={0}  y={-10} fontSize={9} fontFamily='"JetBrains Mono",monospace' fill="#64748B">0</text>
          <text x={37} y={-10} fontSize={9} fontFamily='"JetBrains Mono",monospace' fill="#64748B">1m</text>
          <text x={76} y={-10} fontSize={9} fontFamily='"JetBrains Mono",monospace' fill="#64748B">2m</text>
        </g>
      </svg>
    </div>
  );
}
