import { ExitIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { useTheme } from 'next-themes';
import { authClient } from '@/clients/authClient';

export default function UserAvatar({
  user,
  collapsed,
}: Readonly<{
  user: typeof authClient.$Infer.Session.user;
  collapsed?: boolean;
}>) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2.5 rounded-lg transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            collapsed ? 'justify-center p-1' : 'w-full px-2 py-1.5'
          }`}
          aria-label="User menu"
        >
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage referrerPolicy="no-referrer" src={user.image ?? ''} />
            <AvatarFallback className="text-xs">
              {(user.name?.split(' ')[0]?.[0] || '') +
                (user.name?.split(' ')[1]?.[0] || '')}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <span className="text-sm font-medium text-foreground truncate">
              {user.name}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={collapsed ? 'center' : 'end'}
        side={collapsed ? 'right' : 'top'}
        sideOffset={8}
        className="w-40"
      >
        <div className="flex flex-col p-2 max-w-full break-words whitespace-break-spaces">
          <span className="text-sm font-bold line-clamp-2">{user.name}</span>
          <span className="text-xs italic mt-1 line-clamp-2">{user.email}</span>
        </div>

        <hr className="mb-2" />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
          }}
        >
          {resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
          <span className="ml-[5px] capitalize">Theme</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await authClient.signOut();
          }}
          className="cursor-pointer"
        >
          <ExitIcon className="mr-[5px] w-5 ml-[0.5px]" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
