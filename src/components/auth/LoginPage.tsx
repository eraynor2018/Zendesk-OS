import { useAuth } from '../../lib/auth';

export default function LoginPage() {
  const { signIn } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#253C32',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '48px 40px',
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#02C874',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 700,
            color: '#253C32',
            marginBottom: 16,
          }}
        >
          Z
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' }}>
          Zendesk OS
        </h1>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 32px' }}>
          Sign in with your SidelineSwap Google account
        </p>

        <button
          onClick={signIn}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 500,
            color: '#333',
            transition: 'background 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#f8f8f8')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>

        {error === 'unauthorized' && (
          <p style={{ fontSize: 13, color: '#e53e3e', marginTop: 16 }}>
            Only @sidelineswap.com accounts are allowed.
          </p>
        )}
        {error && error !== 'unauthorized' && (
          <p style={{ fontSize: 13, color: '#e53e3e', marginTop: 16 }}>
            Sign in failed. Please try again.
          </p>
        )}

        <p style={{ fontSize: 12, color: '#999', marginTop: 24 }}>
          Only @sidelineswap.com accounts are allowed.
        </p>
      </div>
    </div>
  );
}
