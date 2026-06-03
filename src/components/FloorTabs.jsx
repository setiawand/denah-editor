import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function FloorTabs() {
  const floors         = useStore(s => s.floors);
  const activeFloorId  = useStore(s => s.activeFloorId);
  const addFloor       = useStore(s => s.addFloor);
  const setActiveFloor = useStore(s => s.setActiveFloor);
  const renameFloor    = useStore(s => s.renameFloor);
  const deleteFloor    = useStore(s => s.deleteFloor);

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
