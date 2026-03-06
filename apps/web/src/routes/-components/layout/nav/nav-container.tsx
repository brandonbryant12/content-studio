import type { ReactNode } from 'react';

export default function NavContainer({
  children,
}: Readonly<{
  children?: ReactNode;
}>) {
  return (
    <header className="header">
      <nav aria-label="Main navigation" className="header-content">
        {children}
      </nav>
    </header>
  );
}
