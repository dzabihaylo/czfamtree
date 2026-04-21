// ============================================================
// PERSON NODE
// ============================================================

function PersonNode({ person, rootId, people, selected, onSelect, onStartDrag, onOpenRadial, onDoubleClick, showPhoto, showYears, showRelation }) {
  const { NODE_W, initials, relationLabel } = window.FamilyModel;
  const rel = showRelation ? relationLabel(person, rootId, people) : '';

  const avatarClass = `avatar-gen-${Math.abs(person.name.charCodeAt(0) + (person.name.charCodeAt(1) || 0)) % 5}`;

  return (
    <div
      className={`node ${selected ? 'selected' : ''} ${person.isMe ? 'is-me' : ''}`}
      style={{ left: person.x, top: person.y, width: NODE_W }}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        onSelect(person.id);
        onStartDrag(e, person.id);
      }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(person.id); }}
    >
      {showPhoto && (
        <div className={`node-photo ${avatarClass}`}>
          <span className="node-photo-initials" style={{color: 'oklch(1 0 0 / 0.85)'}}>
            {initials(person.name)}
          </span>
          {/* subtle diagonal stripe placeholder hint */}
          <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08, mixBlendMode: 'multiply'}} viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id={`stripe-${person.id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="2" height="6" fill="black"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill={`url(#stripe-${person.id})`}/>
          </svg>
        </div>
      )}
      <div className="node-body">
        {rel && <div className="node-relation">{rel}</div>}
        <div className="node-name">{person.name}</div>
        {showYears && (
          <div className="node-years">
            {person.birthYear || '—'} &ndash; {person.deathYear || (person.birthYear ? '' : '—')}
          </div>
        )}
      </div>

      {selected && (
        <button
          className="node-add-btn"
          onClick={(e) => { e.stopPropagation(); onOpenRadial(person.id); }}
          style={{
            position: 'absolute',
            bottom: -14, left: '50%',
            transform: 'translateX(-50%)',
            width: 28, height: 28,
            background: 'var(--accent)',
            color: 'white',
            border: '1px solid var(--accent)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '2px 2px 0 var(--ink)',
            zIndex: 3,
          }}
          title="Add relative"
        >
          <window.Icons.Plus size={14}/>
        </button>
      )}
    </div>
  );
}

// ============================================================
// RADIAL ADD MENU
// ============================================================
function RadialMenu({ anchor, onPick, onClose }) {
  const items = [
    { key: 'parent', label: 'Parent', sym: '↑', angle: -90 },
    { key: 'spouse', label: 'Spouse', sym: '↔', angle: 0 },
    { key: 'child', label: 'Child', sym: '↓', angle: 90 },
    { key: 'sibling', label: 'Sibling', sym: '←', angle: 180 },
  ];
  const R = 90;

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e) => {
      if (!e.target.closest('.radial')) onClose();
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => window.addEventListener('mousedown', onClick), 10);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  return (
    <div className="radial open" style={{ left: anchor.x, top: anchor.y }}>
      {items.map((it, i) => {
        const rad = it.angle * Math.PI / 180;
        const dx = Math.cos(rad) * R;
        const dy = Math.sin(rad) * R;
        return (
          <button
            key={it.key}
            className="radial-btn"
            style={{
              left: dx, top: dy,
              transitionDelay: `${i * 30}ms`,
              transform: 'translate(-50%, -50%) scale(1)',
            }}
            onClick={(e) => { e.stopPropagation(); onPick(it.key); }}
          >
            <span className="radial-btn-icon">{it.sym}</span>
            <span className="radial-btn-label">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// SIDE PANEL - PERSON DETAILS
// ============================================================
function SidePanel({ person, people, onUpdate, onClose, onDelete, onSetRoot, lastSavedAt }) {
  if (!person) return null;
  const upd = (patch) => onUpdate(person.id, patch);
  const [justSaved, setJustSaved] = React.useState(false);
  React.useEffect(() => {
    if (!lastSavedAt) return;
    setJustSaved(true);
    const t = setTimeout(() => setJustSaved(false), 1400);
    return () => clearTimeout(t);
  }, [lastSavedAt]);

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <div>
          <div className="side-panel-title" style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span>Person · {person.id.slice(0,6)}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 6px',
              background: justSaved ? 'oklch(0.92 0.08 150)' : 'var(--bg-soft)',
              border: '1px solid ' + (justSaved ? 'var(--success)' : 'var(--rule)'),
              color: justSaved ? 'var(--success)' : 'var(--ink-3)',
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em',
              transition: 'all 0.2s ease',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: justSaved ? 'var(--success)' : 'var(--ink-3)',
              }}/>
              {justSaved ? 'Saved' : 'Auto-saves'}
            </span>
          </div>
          <div style={{fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 4}}>
            {person.name || 'Unnamed'}
          </div>
        </div>
        <button className="btn btn-icon btn-ghost" onClick={onClose}><window.Icons.X/></button>
      </div>

      <div className="side-panel-content">
        <div className="side-panel-section">
          <label className="field-label">Full name</label>
          <input className="field-input" value={person.name} onChange={e => upd({name: e.target.value})}/>
        </div>

        <div className="side-panel-section" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 24, borderTop: '1px solid var(--rule-soft)'}}>
          <div>
            <label className="field-label">Born</label>
            <input className="field-input mono" placeholder="YYYY" value={person.birthYear || ''} onChange={e => upd({birthYear: e.target.value ? parseInt(e.target.value) : null})}/>
          </div>
          <div>
            <label className="field-label">Died</label>
            <input className="field-input mono" placeholder="YYYY" value={person.deathYear || ''} onChange={e => upd({deathYear: e.target.value ? parseInt(e.target.value) : null})}/>
          </div>
        </div>

        <div className="side-panel-section">
          <label className="field-label">Gender</label>
          <div style={{display: 'flex', gap: 6}}>
            {[['m','Male'],['f','Female'],['x','Other']].map(([v,l]) => (
              <button
                key={v}
                className="btn btn-sm"
                style={person.gender === v ? {background:'var(--ink)', color:'var(--bg)', borderColor:'var(--ink)'} : {}}
                onClick={() => upd({gender: v})}
              >{l}</button>
            ))}
          </div>
        </div>

        <div className="side-panel-section">
          <label className="field-label">Location</label>
          <input className="field-input" placeholder="e.g. Vancouver, BC" value={person.location || ''} onChange={e => upd({location: e.target.value})}/>
        </div>

        <div className="side-panel-section">
          <label className="field-label">Notes</label>
          <textarea
            className="field-input"
            rows={4}
            style={{resize: 'vertical', fontFamily: 'inherit'}}
            placeholder="Stories, memories, a short bio…"
            value={person.notes || ''}
            onChange={e => upd({notes: e.target.value})}
          />
        </div>

        <div className="side-panel-section">
          <label className="field-label">Relations</label>
          <div style={{fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6, fontFamily: 'var(--mono)'}}>
            <div>Parents: {(person.parentIds || []).map(id => people.find(p => p.id === id)?.name).filter(Boolean).join(', ') || '—'}</div>
            <div>Spouses: {(person.spouseIds || []).map(id => people.find(p => p.id === id)?.name).filter(Boolean).join(', ') || '—'}</div>
            <div>Children: {people.filter(p => p.parentIds?.includes(person.id)).map(p => p.name).join(', ') || '—'}</div>
          </div>
        </div>

        <div className="side-panel-section" style={{display: 'flex', gap: 8}}>
          <button className="btn btn-sm" onClick={() => onSetRoot(person.id)}>
            <window.Icons.User size={13}/> Center on this person
          </button>
          {!person.isMe && (
            <button className="btn btn-sm" style={{color: 'var(--danger)', borderColor: 'var(--rule)'}} onClick={() => onDelete(person.id)}>
              <window.Icons.Trash size={13}/> Remove
            </button>
          )}
        </div>

        <div style={{
          padding: '12px 0', marginTop: 12,
          borderTop: '1px solid var(--rule-soft)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em'}}>
            Changes save automatically
          </div>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            <window.Icons.Check size={13}/> Done
          </button>
        </div>
      </div>
    </div>
  );
}

window.FamilyUI = { PersonNode, RadialMenu, SidePanel };
