import { Link } from '@tanstack/react-router';
import type { AuthSession } from '@/clients/authClient';
import { APP_NAME } from '@/constants';
import NavContainer from '@/routes/-components/layout/nav/nav-container';
import UserAvatar from '@/routes/-components/layout/nav/user-avatar';

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

export function Navbar({ session }: Readonly<{ session: AuthSession }>) {
  return (
    <NavContainer>
      <Link
        to={session?.user ? '/projects' : '/'}
        className="flex items-center gap-2.5 font-semibold text-base hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <MicIcon className="w-4 h-4 text-white" />
        </div>
        <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent font-bold tracking-tight">
          {APP_NAME}
        </span>
      </Link>
      {session?.user ? (
        <UserAvatar user={session.user} />
      ) : (
        <div className="flex gap-2">
          <Link
            to="/login"
            className="px-4 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-md shadow-violet-500/25"
          >
            Sign up
          </Link>
        </div>
      )}
    </NavContainer>
  );
}
