'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { NotificationCenter } from '@/components/notifications/notification-center';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/tasks?view=calendar', label: 'Calendar' },
  { href: '/ai', label: 'AI Tutor' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/profile', label: 'Profile' },
  { href: '/settings', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">
      <aside className="border-r bg-muted/30">
        <div className="px-4 py-4 font-semibold">
          <Link href="/dashboard">Study Teddy</Link>
        </div>
        <nav className="px-2 py-2 space-y-1">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== '/tasks?view=calendar' && pathname?.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`block rounded-md px-3 py-2 text-sm ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {l.label}
              </Link>
            );
          })}
          <button onClick={logout} className="mt-2 block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted">Sign out</button>
        </nav>
      </aside>
      <main className="min-h-screen">
        <header className="border-b">
          <div className="container mx-auto px-4 py-3 flex items-center justify-end gap-4">
            <NotificationCenter />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}