// ============================================================
// SHARE MODAL
// ============================================================
function ShareModal({ onClose, invites, setInvites, onToast }) {
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('editor');
  const [linkAccess, setLinkAccess] = React.useState('restricted');

  const addInvite = () => {
    if (!email.trim() || !email.includes('@')) return;
    setInvites([...invites, {
      email: email.trim(),
      role,
      status: 'pending',
      avatar: email.trim().slice(0, 2).toUpperCase(),
    }]);
    setEmail('');
    onToast('Invitation sent to ' + email.trim());
  };

  const updateRole = (i, newRole) => {
    const next = [...invites];
    next[i] = { ...next[i], role: newRole };
    setInvites(next);
  };

  const removeInvite = (i) => {
    setInvites(invites.filter((_, idx) => idx !== i));
  };

  const copyLink = () => {
    onToast('Link copied to clipboard');
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{width: 520}}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Share this tree</div>
            <div className="modal-sub">“Chan-Zabihaylo Family Tree”</div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><window.Icons.X/></button>
        </div>

        <div className="modal-body">
          {/* Invite row */}
          <div style={{display: 'flex', gap: 8, marginBottom: 20}}>
            <input
              className="field-input"
              placeholder="Add people by email…"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInvite()}
              style={{flex: 1}}
            />
            <select className="role-select" value={role} onChange={e => setRole(e.target.value)} style={{fontSize: 12}}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={addInvite}>Invite</button>
          </div>

          {/* People with access */}
          <div style={{marginBottom: 20}}>
            <div className="field-label">People with access</div>
            <div className="invite-row">
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <div className="invite-avatar" style={{background: 'oklch(0.52 0.14 250)'}}>DZ</div>
                <div>
                  <div style={{fontSize: 13, fontWeight: 500}}>Dave Zabihaylo (you)</div>
                  <div style={{fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)'}}>dave@example.com</div>
                </div>
              </div>
              <div style={{fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em'}}>Owner</div>
            </div>
            {invites.map((inv, i) => (
              <div key={i} className="invite-row">
                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                  <div className="invite-avatar">{inv.avatar}</div>
                  <div>
                    <div style={{fontSize: 13, fontWeight: 500}}>{inv.email}</div>
                    <div style={{fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)'}}>
                      {inv.status === 'pending' ? 'Invitation pending' : 'Active'}
                    </div>
                  </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                  <select className="role-select" value={inv.role} onChange={e => updateRole(i, e.target.value)}>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => removeInvite(i)} title="Remove">
                    <window.Icons.X size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Link access */}
          <div style={{paddingTop: 16, borderTop: '1px solid var(--rule)'}}>
            <div className="field-label">General access</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0'}}>
              <div style={{
                width: 32, height: 32, border: '1px solid var(--rule)',
                display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
              }}>
                <window.Icons.Link size={14}/>
              </div>
              <div style={{flex: 1}}>
                <select className="role-select" value={linkAccess} onChange={e => setLinkAccess(e.target.value)} style={{border: 'none', padding: 0, fontSize: 13, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--sans)', fontWeight: 500}}>
                  <option value="restricted">Restricted</option>
                  <option value="link-view">Anyone with link can view</option>
                  <option value="link-edit">Anyone with link can edit</option>
                </select>
                <div style={{fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', marginTop: 2}}>
                  {linkAccess === 'restricted'
                    ? 'Only invited people can open this tree'
                    : linkAccess === 'link-view'
                    ? 'Anyone on the internet can view'
                    : 'Anyone with the link can edit — be careful'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={copyLink}>
            <window.Icons.Copy size={13}/> Copy link
          </button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHEET SYNC DRAWER
// ============================================================
function SheetDrawer({ open, onClose, onImport, onToast }) {
  const [tab, setTab] = React.useState('link');
  const [url, setUrl] = React.useState('');
  const [syncing, setSyncing] = React.useState(false);
  const [connected, setConnected] = React.useState(false);

  const connect = () => {
    if (!url.includes('docs.google.com')) {
      onToast('Paste a valid Google Sheets URL');
      return;
    }
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setConnected(true);
      onToast('Connected · 12 rows detected');
    }, 1100);
  };

  const importNow = () => {
    onImport();
    onToast('Imported 4 new people from sheet');
    onClose();
  };

  const sample = [
    { name: 'Dave Zabihaylo', born: 1981, died: '', rel: 'self', parent1: '', parent2: '', spouse: 'Katherine Chan', status: 'existing' },
    { name: 'Katherine Chan', born: 1981, died: '', rel: 'spouse', parent1: '', parent2: '', spouse: 'Dave Zabihaylo', status: 'existing' },
    { name: 'Olivia Chan-Zabihaylo', born: 2012, died: '', rel: 'child', parent1: 'Dave Zabihaylo', parent2: 'Katherine Chan', spouse: '', status: 'existing' },
    { name: 'Mira Chan', born: 1953, died: '', rel: 'parent', parent1: '', parent2: '', spouse: 'Henry Chan', status: 'new' },
    { name: 'Henry Chan', born: 1949, died: 2019, rel: 'parent', parent1: '', parent2: '', spouse: 'Mira Chan', status: 'new' },
    { name: 'Yuri Zabihaylo', born: 1955, died: '', rel: 'parent', parent1: '', parent2: '', spouse: 'Anna Zabihaylo', status: 'new' },
    { name: 'Anna Zabihaylo', born: 1958, died: '', rel: 'parent', parent1: '', parent2: '', spouse: 'Yuri Zabihaylo', status: 'new' },
  ];

  return (
    <div className={`drawer ${open ? '' : 'closed'}`}>
      <div className="drawer-side">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)'}}>Data source</div>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><window.Icons.X size={13}/></button>
        </div>

        <div style={{display: 'flex', border: '1px solid var(--rule)'}}>
          {['link', 'upload'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px 10px',
                fontFamily: 'var(--mono)', fontSize: 10,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                background: tab === t ? 'var(--ink)' : 'var(--bg-card)',
                color: tab === t ? 'var(--bg)' : 'var(--ink-2)',
                borderRight: t === 'link' ? '1px solid var(--rule)' : 'none',
              }}
            >
              {t === 'link' ? 'Google Sheet' : 'CSV upload'}
            </button>
          ))}
        </div>

        {tab === 'link' ? (
          <>
            <div>
              <label className="field-label">Sheet URL</label>
              <input
                className="field-input mono"
                style={{fontSize: 11}}
                placeholder="https://docs.google.com/spreadsheets/…"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
            {!connected ? (
              <button className="btn btn-primary btn-sm" onClick={connect} disabled={syncing}>
                {syncing ? 'Connecting…' : <>Connect <window.Icons.Link size={12}/></>}
              </button>
            ) : (
              <>
                <div style={{
                  padding: 10, border: '1px solid var(--rule)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12,
                }}>
                  <span style={{width: 8, height: 8, background: 'var(--success)', borderRadius: '50%'}}/>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 500}}>Connected</div>
                    <div style={{fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)'}}>Auto-sync every 30s</div>
                  </div>
                </div>
                <button className="btn btn-accent btn-sm" onClick={importNow}>
                  <window.Icons.Download size={12}/> Import 4 new
                </button>
              </>
            )}
            <div style={{marginTop: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.5}}>
              <div style={{marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em'}}>Template</div>
              Columns: name, born, died, relation, parent_1, parent_2, spouse, location, notes
              <a href="#" style={{color: 'var(--accent)', display: 'block', marginTop: 6}}>Copy template ↗</a>
            </div>
          </>
        ) : (
          <>
            <div style={{
              border: '1px dashed var(--rule)',
              padding: 24, textAlign: 'center',
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <window.Icons.Upload size={24}/>
              <div style={{fontSize: 12}}>Drop CSV here</div>
              <div style={{fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)'}}>or click to browse</div>
            </div>
          </>
        )}
      </div>

      <div className="drawer-main">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
          <div>
            <div style={{fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)'}}>Preview · family_tree.csv</div>
            <div style={{fontSize: 14, fontWeight: 600, marginTop: 2}}>7 rows · 4 new, 3 matched</div>
          </div>
          <div style={{display: 'flex', gap: 12, fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em'}}>
            <span style={{display: 'flex', alignItems: 'center', gap: 6}}>
              <span style={{width: 10, height: 10, background: 'oklch(0.97 0.05 150)', border: '1px solid var(--rule)'}}/> New
            </span>
            <span style={{display: 'flex', alignItems: 'center', gap: 6}}>
              <span style={{width: 10, height: 10, background: 'oklch(1 0 0)', border: '1px solid var(--rule)'}}/> Matched
            </span>
          </div>
        </div>

        <table className="sheet-table">
          <thead>
            <tr>
              <th>Name</th><th>Born</th><th>Died</th><th>Relation</th><th>Parent 1</th><th>Parent 2</th><th>Spouse</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((row, i) => (
              <tr key={i} className={row.status === 'new' ? 'new' : ''}>
                <td style={{fontWeight: 500}}>{row.name}</td>
                <td>{row.born}</td>
                <td>{row.died || '—'}</td>
                <td>{row.rel}</td>
                <td>{row.parent1 || '—'}</td>
                <td>{row.parent2 || '—'}</td>
                <td>{row.spouse || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.ShareUI = { ShareModal, SheetDrawer };
