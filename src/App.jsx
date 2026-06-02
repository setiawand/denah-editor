import Toolbar from './components/Toolbar';
import Editor2D from './components/Editor2D';
import View3D from './components/View3D';
import PropertiesPanel from './components/PropertiesPanel';
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
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-mark">⬡</span>
          <span className="logo-text">Denah<span className="logo-accent">Editor</span></span>
        </div>
        <Toolbar />
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Left sidebar: room types */}
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
            {[['V','Pilih'],['R','Ruangan'],['D','Pintu'],['W','Jendela'],['E','Hapus'],['Del','Hapus sel.'],['Esc','Batal']].map(([k,v])=>(
              <div key={k} className="shortcut-row">
                <kbd>{k}</kbd><span>{v}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Canvas area */}
        <main className="canvas-wrap">
          {view === '2d' ? <Editor2D /> : <View3D />}
        </main>

        {/* Right: Properties */}
        <aside className="props-sidebar">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}
