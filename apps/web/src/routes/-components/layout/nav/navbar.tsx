import { Link } from '@tanstack/react-router';
import type { AuthSession } from '@/clients/authClient';
import { APP_NAME } from '@/constants';
import NavContainer from '@/routes/-components/layout/nav/nav-container';

function WaveformIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect
        className="waveform-bar"
        x="3"
        y="10.5"
        width="2"
        height="3"
        rx="1"
      />
      <rect className="waveform-bar" x="7" y="7" width="2" height="10" rx="1" />
      <rect
        className="waveform-bar"
        x="11"
        y="4"
        width="2"
        height="16"
        rx="1"
      />
      <rect
        className="waveform-bar"
        x="15"
        y="7"
        width="2"
        height="10"
        rx="1"
      />
      <rect
        className="waveform-bar"
        x="19"
        y="10.5"
        width="2"
        height="3"
        rx="1"
      />
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
