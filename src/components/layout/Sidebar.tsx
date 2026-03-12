import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

const navItems = [
  {
    label: 'Weekly Report',
    path: '/report',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: 'Macro Review',
    path: '/macros',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    children: [
      { label: 'Library', path: '/macros/library' },
      { label: 'Review', path: '/macros/review' },
      { label: 'Settings', path: '/macros/settings' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const isMacrosActive = location.pathname.startsWith('/macros');
  const { user, signOut } = useAuth();

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        background: '#253C32',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#02C874',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: '#253C32',
            }}
          >
            Z
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Zendesk OS</div>
            <div style={{ color: '#61716A', fontSize: 11 }}>SidelineSwap</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        {navItems.map((item) => {
          const isActive =
            item.path === '/macros'
              ? isMacrosActive
              : location.pathname === item.path;

          return (
            <div key={item.path} style={{ marginBottom: 4 }}>
              <NavLink
                to={item.children ? item.children[0].path : item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#fff' : '#61716A',
                  background: isActive ? 'rgba(2,200,116,0.1)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ color: isActive ? '#02C874' : '#61716A' }}>
                  {item.icon}
                </span>
                {item.label}
              </NavLink>

              {/* Sub-items */}
              {item.children && isMacrosActive && (
                <div style={{ marginLeft: 40, marginTop: 2 }}>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      style={{
                        display: 'block',
                        padding: '6px 12px',
                        borderRadius: 4,
                        textDecoration: 'none',
                        fontSize: 13,
                        color:
                          location.pathname === child.path
                            ? '#02C874'
                            : '#61716A',
                        fontWeight:
                          location.pathname === child.path ? 500 : 400,
                        transition: 'color 0.15s',
                      }}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User & Sign Out */}
      {user && (
        <div style={{ padding: '16px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 12, color: '#61716A', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
          <button
            onClick={signOut}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: '#61716A',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#61716A'; }}
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
