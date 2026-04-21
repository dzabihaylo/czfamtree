// ============================================================
// MAIN APP — Canvas, toolbar, pan/zoom, undo/redo
// ============================================================
const { PersonNode, RadialMenu, SidePanel } = window.FamilyUI;
const { ShareModal, SheetDrawer } = window.ShareUI;
const { SAMPLE_PEOPLE, uid, computeEdges, spousePath, parentPath, NODE_W, NODE_H } = window.FamilyModel;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showPhoto": true,
  "showYears": true,
  "showRelation": true,
  "density": "comfy",
  "nodeStyle": "card",
  "accentHue": 250
}/*EDITMODE-END*/;

function App() {
  // --- Auth ---
  const [user, setUser] = React.useState(null);

  // --- Core state ---
  const [people, setPeople] = React.useState(SAMPLE_PEOPLE);
  const [selectedId, setSelectedId] = React.useState(null);
  const [rootId, setRootId] = React.useState('p_dave');
  const [radial, setRadial] = React.useState(null); // {personId, x, y} in screen coords

  // --- Undo/redo ---
  const [history, setHistory] = React.useState([SAMPLE_PEOPLE]);
  const [hIndex, setHIndex] = React.useState(0);

  // --- Canvas transform ---
  const [transform, setTransform] = React.useState({ x: 400, y: 180, k: 1 });
  const [panning, setPanning] = React.useState(false);
  const panStart = React.useRef(null);
  const canvasRef = React.useRef(null);

  // --- Drag state ---
  const dragState = React.useRef(null);

  // --- UI state ---
  const [showShare, setShowShare] = React.useState(false);
  const [showSheet, setShowSheet] = React.useState(false);
  const [showTweaks, setShowTweaks] = React.useState(false);
  const [sidePanelOpen, setSidePanelOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [invites, setInvites] = React.useState([
    { email: 'katherine@example.com', role: 'editor', status: 'active', avatar: 'KC' },
    { email: 'grandma.chan@example.com', role: 'viewer', status: 'pending', avatar: 'MC' },
  ]);
  const [lastSavedAt, setLastSavedAt] = React.useState(null);

  // --- Toast helper ---
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 2200);
  };

  // --- Commit changes to history ---
  const commit = (nextPeople) => {
    setPeople(nextPeople);
    const newHistory = history.slice(0, hIndex + 1);
    newHistory.push(nextPeople);
    setHistory(newHistory);
    setHIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (hIndex === 0) return;
    setHIndex(hIndex - 1);
    setPeople(history[hIndex - 1]);
    showToast('Undo');
  };
  const redo = () => {
    if (hIndex >= history.length - 1) return;
    setHIndex(hIndex + 1);
    setPeople(history[hIndex + 1]);
    showToast('Redo');
  };

  // --- Keyboard shortcuts ---
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (e.key === 'Escape') { setSelectedId(null); setRadial(null); setSidePanelOpen(false); }
      else if (e.key === 'Enter' && selectedId) { setSidePanelOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hIndex, history, selectedId]);

  // --- Pan/zoom ---
  const onCanvasMouseDown = (e) => {
    if (e.target.closest('.node') || e.target.closest('.radial') || e.target.closest('.topbar') || e.target.closest('.toolbar')) return;
    setPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    setRadial(null);
    setSelectedId(null);
  };

  React.useEffect(() => {
    const onMove = (e) => {
      if (panning && panStart.current) {
        setTransform(t => ({
          ...t,
          x: panStart.current.tx + (e.clientX - panStart.current.x),
          y: panStart.current.ty + (e.clientY - panStart.current.y),
        }));
      } else if (dragState.current) {
        const { id, startX, startY, origX, origY } = dragState.current;
        const dx = (e.clientX - startX) / transform.k;
        const dy = (e.clientY - startY) / transform.k;
        setPeople(prev => prev.map(p => p.id === id ? { ...p, x: origX + dx, y: origY + dy } : p));
      }
    };
    const onUp = () => {
      if (dragState.current) {
        // commit the drag
        setPeople(prev => {
          commit(prev);
          return prev;
        });
        dragState.current = null;
      }
      setPanning(false);
      panStart.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [panning, transform.k, history, hIndex]);

  const onWheel = (e) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = -e.deltaY * 0.002;
      const newK = Math.max(0.3, Math.min(2.5, transform.k * (1 + delta)));
      const kRatio = newK / transform.k;
      setTransform({
        k: newK,
        x: mx - (mx - transform.x) * kRatio,
        y: my - (my - transform.y) * kRatio,
      });
    } else {
      setTransform(t => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
    }
  };

  const zoomBy = (factor) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const newK = Math.max(0.3, Math.min(2.5, transform.k * factor));
    const kRatio = newK / transform.k;
    setTransform({
      k: newK,
      x: mx - (mx - transform.x) * kRatio,
      y: my - (my - transform.y) * kRatio,
    });
  };

  const fitView = () => setTransform({ x: 400, y: 180, k: 1 });

  // --- Drag node ---
  const startDrag = (e, id) => {
    e.stopPropagation();
    const person = people.find(p => p.id === id);
    if (!person) return;
    dragState.current = {
      id, startX: e.clientX, startY: e.clientY,
      origX: person.x, origY: person.y,
    };
  };

  // --- Open radial at a node ---
  const openRadial = (personId) => {
    const p = people.find(pp => pp.id === personId);
    if (!p) return;
    // Anchor at node center, in canvas coords (radial sits inside canvas-inner)
    setRadial({
      personId,
      x: p.x + NODE_W / 2,
      y: p.y + NODE_H / 2,
    });
  };

  // --- Add relative ---
  const addRelative = (anchorId, kind) => {
    const anchor = people.find(p => p.id === anchorId);
    if (!anchor) return;

    const newId = uid();
    const newPerson = {
      id: newId,
      name: 'New Person',
      gender: 'x',
      birthYear: null, deathYear: null,
      spouseIds: [], parentIds: [], childIds: [],
      x: anchor.x, y: anchor.y,
    };

    let next = [...people];

    if (kind === 'spouse') {
      newPerson.x = anchor.x + NODE_W + 52;
      newPerson.y = anchor.y;
      newPerson.spouseIds = [anchor.id];
      next = next.map(p => p.id === anchor.id ? { ...p, spouseIds: [...(p.spouseIds || []), newId] } : p);
    } else if (kind === 'child') {
      newPerson.x = anchor.x;
      newPerson.y = anchor.y + NODE_H + 60;
      const parents = [anchor.id, ...(anchor.spouseIds || [])].slice(0, 2);
      newPerson.parentIds = parents;
      next = next.map(p =>
        parents.includes(p.id) ? { ...p, childIds: [...(p.childIds || []), newId] } : p
      );
    } else if (kind === 'parent') {
      newPerson.x = anchor.x - 110;
      newPerson.y = anchor.y - (NODE_H + 60);
      next = next.map(p => p.id === anchor.id ? { ...p, parentIds: [...(p.parentIds || []), newId] } : p);
      newPerson.childIds = [anchor.id];
    } else if (kind === 'sibling') {
      newPerson.x = anchor.x - NODE_W - 52;
      newPerson.y = anchor.y;
      newPerson.parentIds = [...(anchor.parentIds || [])];
      next = next.map(p =>
        (anchor.parentIds || []).includes(p.id) ? { ...p, childIds: [...(p.childIds || []), newId] } : p
      );
    }

    next.push(newPerson);
    // Simple collision nudge: push overlapping nodes aside on the same row
    const rowY = newPerson.y;
    const minGap = NODE_W + 32;
    const conflicts = next
      .filter(p => p.id !== newId && Math.abs(p.y - rowY) < 10 && Math.abs(p.x - newPerson.x) < minGap);
    if (conflicts.length) {
      // Shift new node left of anchor if there's room, else keep pushing right
      const occupied = next.filter(p => p.id !== newId && Math.abs(p.y - rowY) < 10).map(p => p.x);
      let tryX = newPerson.x;
      let step = minGap;
      let dir = kind === 'sibling' ? -1 : 1;
      while (occupied.some(ox => Math.abs(ox - tryX) < minGap)) {
        tryX += dir * step;
      }
      newPerson.x = tryX;
    }
    commit(next);
    setRadial(null);
    setSelectedId(newId);
    setSidePanelOpen(true);
    showToast(`Added ${kind}`);
  };

  const updatePerson = (id, patch) => {
    const next = people.map(p => p.id === id ? { ...p, ...patch } : p);
    commit(next);
    setLastSavedAt(Date.now());
  };

  const deletePerson = (id) => {
    const next = people
      .filter(p => p.id !== id)
      .map(p => ({
        ...p,
        parentIds: (p.parentIds || []).filter(pid => pid !== id),
        spouseIds: (p.spouseIds || []).filter(sid => sid !== id),
        childIds: (p.childIds || []).filter(cid => cid !== id),
      }));
    commit(next);
    setSelectedId(null);
    setSidePanelOpen(false);
    showToast('Person removed');
  };

  const importFromSheet = () => {
    // Add the sample ancestors
    const mira = { id: uid(), name: 'Mira Chan', gender: 'f', birthYear: 1953, deathYear: null, x: 400, y: -300, spouseIds: [], parentIds: [], childIds: ['p_kath'] };
    const henry = { id: uid(), name: 'Henry Chan', gender: 'm', birthYear: 1949, deathYear: 2019, x: 600, y: -300, spouseIds: [], parentIds: [], childIds: ['p_kath'] };
    const yuri = { id: uid(), name: 'Yuri Zabihaylo', gender: 'm', birthYear: 1955, deathYear: null, x: -400, y: -300, spouseIds: [], parentIds: [], childIds: ['p_dave'] };
    const anna = { id: uid(), name: 'Anna Zabihaylo', gender: 'f', birthYear: 1958, deathYear: null, x: -200, y: -300, spouseIds: [], parentIds: [], childIds: ['p_dave'] };
    mira.spouseIds = [henry.id]; henry.spouseIds = [mira.id];
    yuri.spouseIds = [anna.id]; anna.spouseIds = [yuri.id];

    const next = people.map(p => {
      if (p.id === 'p_dave') return { ...p, parentIds: [yuri.id, anna.id] };
      if (p.id === 'p_kath') return { ...p, parentIds: [henry.id, mira.id] };
      return p;
    }).concat([yuri, anna, henry, mira]);
    commit(next);
  };

  // --- Tweaks protocol ---
  React.useEffect(() => {
    const onMsg = (e) => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === '__activate_edit_mode') setShowTweaks(true);
      else if (msg.type === '__deactivate_edit_mode') setShowTweaks(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const setTweak = (key, val) => {
    const next = { ...tweaks, [key]: val };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
  };

  // --- Derived ---
  const selectedPerson = people.find(p => p.id === selectedId) || null;
  const edges = React.useMemo(() => computeEdges(people), [people]);

  // Compute SVG bbox
  const bbox = React.useMemo(() => {
    if (!people.length) return { minX: 0, minY: 0, w: 2000, h: 2000 };
    const xs = people.map(p => p.x);
    const ys = people.map(p => p.y);
    const minX = Math.min(...xs) - 400;
    const minY = Math.min(...ys) - 400;
    const maxX = Math.max(...xs) + NODE_W + 400;
    const maxY = Math.max(...ys) + NODE_H + 400;
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [people]);

  // --- RENDER LOGIN ---
  if (!user) {
    return <window.LoginScreen onSignIn={setUser}/>;
  }

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-brand-mark">CZ</div>
          <span>Family Tree</span>
        </div>
        <div className="topbar-title">
          <strong>Chan-Zabihaylo Family Tree</strong>
          <span style={{fontFamily: 'var(--mono)', fontSize: 11, marginLeft: 8, color: 'var(--ink-3)'}}>
            · {people.length} people
          </span>
        </div>

        <div className="topbar-spacer"/>

        {/* Presence */}
        <div className="presence" title="3 collaborators online">
          <div className="presence-avatar" style={{background: 'oklch(0.52 0.14 250)'}}>DZ</div>
          <div className="presence-avatar" style={{background: 'oklch(0.62 0.13 150)'}}>KC</div>
          <div className="presence-avatar" style={{background: 'oklch(0.72 0.14 75)'}}>MC</div>
        </div>

        <button className="btn btn-sm" onClick={() => setShowSheet(s => !s)}>
          <window.Icons.Sheet size={13}/> Sheet sync
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowShare(true)}>
          <window.Icons.Share size={13}/> Share
        </button>

        <div style={{width: 1, height: 24, background: 'var(--rule)'}}/>

        <div className="invite-avatar" title={user.email} style={{background: 'var(--ink)'}}>{user.avatar}</div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`canvas-wrap grid-bg ${panning ? 'panning' : ''}`}
        style={{top: 52}}
        onMouseDown={onCanvasMouseDown}
        onWheel={onWheel}
      >
        <div
          className="canvas-inner"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}
        >
          {/* Edges */}
          <svg
            className="edges"
            style={{ left: bbox.minX, top: bbox.minY }}
            width={bbox.w}
            height={bbox.h}
            viewBox={`${bbox.minX} ${bbox.minY} ${bbox.w} ${bbox.h}`}
          >
            {edges.map((e, i) => {
              const a = people.find(p => p.id === e.a);
              const b = people.find(p => p.id === e.b);
              if (!a || !b) return null;
              if (e.kind === 'spouse') {
                return <path key={i} className="edge spouse" d={spousePath(a, b)}/>;
              }
              return <path key={i} className="edge parent" d={parentPath(a, b)}/>;
            })}
          </svg>

          {/* Nodes */}
          {people.map(p => (
            <PersonNode
              key={p.id}
              person={p}
              rootId={rootId}
              people={people}
              selected={p.id === selectedId}
              onSelect={(id) => { setSelectedId(id); setRadial(null); }}
              onStartDrag={startDrag}
              onOpenRadial={openRadial}
              onDoubleClick={(id) => { setSelectedId(id); setSidePanelOpen(true); }}
              showPhoto={tweaks.showPhoto}
              showYears={tweaks.showYears}
              showRelation={tweaks.showRelation}
            />
          ))}

          {/* Radial */}
          {radial && (
            <RadialMenu
              anchor={{ x: radial.x, y: radial.y }}
              onPick={(kind) => addRelative(radial.personId, kind)}
              onClose={() => setRadial(null)}
            />
          )}
        </div>

        {/* Hints */}
        {people.length === 1 && (
          <div className="empty-state">
            <div className="empty-card">
              <div style={{fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8}}>Getting started</div>
              <div style={{fontSize: 15, fontWeight: 500, marginBottom: 8}}>Click your card to add relatives</div>
              <div style={{fontSize: 13, color: 'var(--ink-2)'}}>Or <button className="btn btn-sm" style={{display: 'inline-flex'}} onClick={() => setShowSheet(true)}>import from a sheet</button></div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar (bottom) */}
      <div className="toolbar">
        <button className="toolbar-btn" onClick={undo} disabled={hIndex === 0} title="Undo (⌘Z)">
          <window.Icons.Undo/>
        </button>
        <button className="toolbar-btn" onClick={redo} disabled={hIndex >= history.length - 1} title="Redo (⌘⇧Z)">
          <window.Icons.Redo/>
        </button>
        <div className="toolbar-divider"/>
        <button className="toolbar-btn" onClick={() => zoomBy(0.85)} title="Zoom out">
          <window.Icons.Minus/>
        </button>
        <div className="toolbar-zoom">{Math.round(transform.k * 100)}%</div>
        <button className="toolbar-btn" onClick={() => zoomBy(1.18)} title="Zoom in">
          <window.Icons.Plus/>
        </button>
        <button className="toolbar-btn" onClick={fitView} title="Fit to view">
          <window.Icons.Fit/>
        </button>
        <button className="toolbar-btn" onClick={() => {
          const laidOut = window.FamilyModel.layoutTree(people);
          commit(laidOut);
          showToast('Tidied layout');
        }} title="Tidy layout">
          <window.Icons.Sparkle/>
        </button>
        <div className="toolbar-divider"/>
        <button className="toolbar-btn" onClick={() => setSidePanelOpen(o => !o)} title="Details panel" disabled={!selectedId}>
          <window.Icons.User/>
        </button>
      </div>

      {/* Side panel */}
      {sidePanelOpen && selectedPerson && (
        <SidePanel
          person={selectedPerson}
          people={people}
          onUpdate={updatePerson}
          onClose={() => setSidePanelOpen(false)}
          onDelete={deletePerson}
          onSetRoot={(id) => { setRootId(id); showToast('Centered on ' + (people.find(p=>p.id===id)?.name || '')); }}
          lastSavedAt={lastSavedAt}
        />
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal
          onClose={() => setShowShare(false)}
          invites={invites}
          setInvites={setInvites}
          onToast={showToast}
        />
      )}

      {/* Sheet drawer */}
      <SheetDrawer
        open={showSheet}
        onClose={() => setShowSheet(false)}
        onImport={importFromSheet}
        onToast={showToast}
      />

      {/* Tweaks panel */}
      {showTweaks && (
        <div className="tweaks-panel">
          <div className="tweaks-header">
            <span>Tweaks</span>
            <span style={{color: 'var(--ink-3)'}}>v0.1</span>
          </div>
          <div className="tweaks-body">
            <div className="tweak-row">
              <span className="tweak-label">Photos</span>
              <div className="tweak-seg">
                <button className={tweaks.showPhoto ? 'on' : ''} onClick={() => setTweak('showPhoto', true)}>On</button>
                <button className={!tweaks.showPhoto ? 'on' : ''} onClick={() => setTweak('showPhoto', false)}>Off</button>
              </div>
            </div>
            <div className="tweak-row">
              <span className="tweak-label">Years</span>
              <div className="tweak-seg">
                <button className={tweaks.showYears ? 'on' : ''} onClick={() => setTweak('showYears', true)}>On</button>
                <button className={!tweaks.showYears ? 'on' : ''} onClick={() => setTweak('showYears', false)}>Off</button>
              </div>
            </div>
            <div className="tweak-row">
              <span className="tweak-label">Relation</span>
              <div className="tweak-seg">
                <button className={tweaks.showRelation ? 'on' : ''} onClick={() => setTweak('showRelation', true)}>On</button>
                <button className={!tweaks.showRelation ? 'on' : ''} onClick={() => setTweak('showRelation', false)}>Off</button>
              </div>
            </div>
            <div className="tweak-row">
              <span className="tweak-label">Accent</span>
              <div className="tweak-seg">
                {[250, 150, 25, 300].map(h => (
                  <button
                    key={h}
                    className={tweaks.accentHue === h ? 'on' : ''}
                    onClick={() => {
                      setTweak('accentHue', h);
                      document.documentElement.style.setProperty('--accent', `oklch(0.52 0.14 ${h})`);
                    }}
                    style={{padding: '4px 6px'}}
                  >
                    <span style={{display: 'inline-block', width: 10, height: 10, background: `oklch(0.52 0.14 ${h})`}}/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
