import type { ReactNode } from 'react';

export default function NavContainer({
  children,
}: Readonly<{
  children?: ReactNode;
}>) {
  return (
    <header className="header">
      <div className="header-content">{children}</div>
    </header>
  );
}
