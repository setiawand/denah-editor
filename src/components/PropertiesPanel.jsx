import { useStore, activeFloor, ROOM_TYPES, GRID } from '../store/useStore';

export default function PropertiesPanel() {
  const selId    = useStore(s => s.selId);
  const rooms    = useStore(s => activeFloor(s)?.rooms  ?? []);
  const doors    = useStore(s => activeFloor(s)?.doors  ?? []);
  const wins     = useStore(s => activeFloor(s)?.wins   ?? []);
  const stairs   = useStore(s => activeFloor(s)?.stairs ?? []);
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
