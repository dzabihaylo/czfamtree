// ============================================================
// LOGIN SCREEN
// ============================================================
const { Icons: LoginIcons = window.Icons } = {};

function LoginScreen({ onSignIn }) {
  const [loading, setLoading] = React.useState(false);

  const handleSignIn = () => {
    setLoading(true);
    setTimeout(() => onSignIn({
      name: 'Dave Zabihaylo',
      email: 'dave@example.com',
      avatar: 'DZ',
    }), 900);
  };

  return (
    <div className="login-stage">
      <div className="login-side">
        <div className="login-brand">
          <div className="login-brand-mark">CZ</div>
          <span>Family Tree</span>
        </div>

        <div>
          <h1 className="login-headline">Every name, a branch.<br/>Every branch, a story.</h1>
          <p className="login-sub">
            Build your family tree by clicking, dragging, and connecting &mdash; or sync it from a Google Sheet. Invite relatives to collaborate in real time.
          </p>

          <button className="google-btn" onClick={handleSignIn} disabled={loading}>
            {loading ? (
              <>
                <div style={{width:18,height:18,border:'2px solid var(--ink)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
                <span>Signing in&hellip;</span>
              </>
            ) : (
              <>
                <window.Icons.Google size={18}/>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div style={{marginTop: 28, display: 'flex', flexWrap: 'wrap', maxWidth: 420}}>
            <span className="feat-tag"><span className="feat-tag-dot"/>Click-to-add canvas</span>
            <span className="feat-tag"><span className="feat-tag-dot"/>Google Sheets sync</span>
            <span className="feat-tag"><span className="feat-tag-dot"/>Invite &amp; roles</span>
            <span className="feat-tag"><span className="feat-tag-dot"/>Real-time cursors</span>
          </div>
        </div>

        <div className="login-foot">
          <span>v0.1 · preview</span>
          <span>Private by default</span>
        </div>
      </div>

      <div className="login-art grid-bg">
        <div className="login-mini-tree">
          <svg viewBox="0 0 400 400" width="80%" style={{maxWidth: 460}}>
            <defs>
              <pattern id="dots" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.6" fill="oklch(0.62 0.006 80)"/>
              </pattern>
            </defs>

            {/* Edges */}
            <g stroke="oklch(0.18 0.008 80)" strokeWidth="1.5" fill="none">
              <path d="M 120 120 L 280 120"/>
              <path d="M 200 120 L 200 200 L 120 200 L 120 270"/>
              <path d="M 200 200 L 280 200 L 280 270"/>
            </g>
            <g stroke="oklch(0.52 0.14 250)" strokeWidth="2" fill="none">
              <path d="M 120 90 L 120 150" opacity="0"/>
            </g>

            {/* Top row: grandparents (stylized) */}
            <g>
              <rect x="60" y="60" width="120" height="60" fill="oklch(1 0 0)" stroke="oklch(0.18 0.008 80)" strokeWidth="1.5"/>
              <rect x="60" y="60" width="60" height="60" fill="url(#dots)"/>
              <text x="130" y="85" fontFamily="Inter" fontSize="11" fontWeight="600" fill="oklch(0.18 0.008 80)">Dave</text>
              <text x="130" y="100" fontFamily="JetBrains Mono" fontSize="9" fill="oklch(0.38 0.006 80)">1981 –</text>

              <rect x="220" y="60" width="120" height="60" fill="oklch(1 0 0)" stroke="oklch(0.18 0.008 80)" strokeWidth="1.5"/>
              <rect x="220" y="60" width="60" height="60" fill="url(#dots)"/>
              <text x="290" y="85" fontFamily="Inter" fontSize="11" fontWeight="600" fill="oklch(0.18 0.008 80)">Katherine</text>
              <text x="290" y="100" fontFamily="JetBrains Mono" fontSize="9" fill="oklch(0.38 0.006 80)">1981 –</text>
            </g>

            {/* Spouse connector (accent) */}
            <path d="M 180 90 L 220 90" stroke="oklch(0.52 0.14 250)" strokeWidth="2" fill="none"/>

            {/* Child */}
            <g>
              <rect x="140" y="270" width="120" height="60" fill="oklch(1 0 0)" stroke="oklch(0.18 0.008 80)" strokeWidth="2"/>
              <rect x="140" y="270" width="60" height="60" fill="url(#dots)"/>
              <text x="210" y="295" fontFamily="Inter" fontSize="11" fontWeight="600" fill="oklch(0.18 0.008 80)">Olivia</text>
              <text x="210" y="310" fontFamily="JetBrains Mono" fontSize="9" fill="oklch(0.38 0.006 80)">2012 –</text>
            </g>

            {/* Annotations */}
            <text x="60" y="40" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="1" fill="oklch(0.38 0.006 80)">GEN 01 · PARENTS</text>
            <text x="60" y="250" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="1" fill="oklch(0.38 0.006 80)">GEN 02 · CHILDREN</text>

            {/* Corner index */}
            <text x="370" y="390" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" fill="oklch(0.62 0.006 80)">fig. 01 — the Chan-Zabihaylo family</text>
          </svg>
        </div>

        {/* Small cursor indicator */}
        <div style={{
          position: 'absolute', top: 40, right: 40,
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--mono)', fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--ink-2)',
        }}>
          <span style={{width: 6, height: 6, background: 'oklch(0.62 0.13 150)', borderRadius: '50%'}}/>
          3 editors online
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

window.LoginScreen = LoginScreen;
