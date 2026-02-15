import { Link } from '@tanstack/react-router';
import type { AuthSession } from '@/clients/authClient';
import { APP_NAME } from '@/constants';
import NavContainer from '@/routes/-components/layout/nav/nav-container';

function WaveformIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="4" y1="12" x2="4" y2="12" />
      <line x1="8" y1="8" x2="8" y2="16" />
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="16" y1="8" x2="16" y2="16" />
      <line x1="20" y1="12" x2="20" y2="12" />
    </svg>
  );
}

export function Navbar({ session }: Readonly<{ session: AuthSession }>) {
  return (
    <NavContainer>
      <Link to={session?.user ? '/dashboard' : '/'} className="logo">
        <div className="logo-icon">
          <WaveformIcon className="w-4 h-4 text-background" />
        </div>
        <span className="logo-text">{APP_NAME}</span>
      </Link>
      {!session?.user && (
        <div className="flex items-center gap-1">
          <Link to="/login" className="nav-link">
            Log in
          </Link>
          <Link to="/register" className="nav-link-primary">
            Sign up
          </Link>
        </div>
      )}
    </NavContainer>
  );
}
