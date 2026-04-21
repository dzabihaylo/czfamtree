// Minimal stroked icons, 16px default, currentColor
const Icon = ({ children, size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" {...props}>
    {children}
  </svg>
);

const Icons = {
  Plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  Minus: (p) => <Icon {...p}><path d="M5 12h14"/></Icon>,
  X: (p) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>,
  Undo: (p) => <Icon {...p}><path d="M3 9l5-5M3 9l5 5M3 9h11a6 6 0 0 1 0 12H9"/></Icon>,
  Redo: (p) => <Icon {...p}><path d="M21 9l-5-5M21 9l-5 5M21 9H10a6 6 0 0 0 0 12h5"/></Icon>,
  Share: (p) => <Icon {...p}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/></Icon>,
  Sheet: (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18"/><path d="M4 9h16M4 15h16M10 3v18M16 3v18"/></Icon>,
  User: (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></Icon>,
  Home: (p) => <Icon {...p}><path d="M3 11l9-7 9 7v10H3z"/></Icon>,
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/></Icon>,
  Grid: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Icon>,
  Fit: (p) => <Icon {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></Icon>,
  Settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M21 12h-3M6 12H3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7L5.6 5.6"/></Icon>,
  Check: (p) => <Icon {...p}><path d="M5 12l5 5L20 7"/></Icon>,
  Link: (p) => <Icon {...p}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></Icon>,
  Upload: (p) => <Icon {...p}><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></Icon>,
  Download: (p) => <Icon {...p}><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></Icon>,
  Refresh: (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></Icon>,
  Edit: (p) => <Icon {...p}><path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"/></Icon>,
  Trash: (p) => <Icon {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></Icon>,
  ChevronDown: (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  Dots: (p) => <Icon {...p}><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></Icon>,
  Copy: (p) => <Icon {...p}><rect x="8" y="8" width="12" height="12"/><path d="M16 4H4v12h4"/></Icon>,
  Sparkle: (p) => <Icon {...p}><path d="M12 3l1.5 5L18 9.5 13.5 11 12 16l-1.5-5L6 9.5 10.5 8z"/></Icon>,
  Google: ({size = 18}) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-7.9z"/>
      <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.2-1.9-6-4.4H2.3v2.8C4.2 20.7 7.8 23 12 23z"/>
      <path fill="#FBBC05" d="M6 14.2c-.2-.6-.3-1.3-.3-2.2s.1-1.6.3-2.2V7H2.3C1.5 8.5 1 10.2 1 12s.5 3.5 1.3 5l3.7-2.8z"/>
      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.8 1 4.2 3.3 2.3 7L6 9.8c.8-2.5 3.2-4.4 6-4.4z"/>
    </svg>
  ),
};

window.Icons = Icons;
