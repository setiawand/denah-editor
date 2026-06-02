import { useStore } from '../store/useStore';

const TOOLS = [
  { id:'select', icon:'↖', label:'Pilih',   shortcut:'V' },
  { id:'room',   icon:'⬜', label:'Ruangan', shortcut:'R' },
  { id:'door',   icon:'◫',  label:'Pintu',   shortcut:'D' },
  { id:'window', icon:'⊞',  label:'Jendela', shortcut:'W' },
  { id:'eraser', icon:'✕',  label:'Hapus',   shortcut:'E' },
];

export default function Toolbar() {
  const tool     = useStore(s => s.tool);
  const setTool  = useStore(s => s.setTool);
  const view     = useStore(s => s.view);
  const setView  = useStore(s => s.setView);
  const clearAll = useStore(s => s.clearAll);

  const exportSVG = () => {
    const svg = document.querySelector('svg');
    if (!svg) return;
    const src = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([src], { type:'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href:url, download:'denah-rumah.svg' });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="toolbar">
      {/* Tool buttons */}
      <div className="tb-group">
        {TOOLS.map(t => (
          <button key={t.id} title={`${t.label} (${t.shortcut})`}
            className={`tb-btn${tool===t.id ? ' active' : ''}`}
            onClick={() => setTool(t.id)}>
            <span className="tb-icon">{t.icon}</span>
            <span className="tb-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="tb-sep"/>

      {/* 2D / 3D toggle */}
      <div className="view-toggle">
        <button className={`vt-btn${view==='2d' ? ' active' : ''}`} onClick={() => setView('2d')}>2D</button>
        <button className={`vt-btn${view==='3d' ? ' active' : ''}`} onClick={() => setView('3d')}>3D</button>
      </div>

      <div className="tb-sep"/>

      {/* Actions */}
      <div className="tb-group" style={{ marginLeft:'auto' }}>
        <button className="tb-btn" onClick={exportSVG} title="Export sebagai SVG">
          <span className="tb-icon">↓</span>
          <span className="tb-label">Export SVG</span>
        </button>
        <button className="tb-btn danger" title="Hapus semua elemen"
          onClick={() => { if(confirm('Hapus semua ruangan dan elemen?')) clearAll(); }}>
          <span className="tb-icon">⊘</span>
          <span className="tb-label">Bersihkan</span>
        </button>
      </div>
    </div>
  );
}
