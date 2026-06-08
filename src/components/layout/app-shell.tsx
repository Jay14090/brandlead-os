'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const defaultNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/search/new', label: 'New Search', icon: '🔍' },
  { href: '/leads', label: 'All Leads', icon: '👥' },
];

export default function AppShell({ children, role = 'user' }: { children: React.ReactNode, role?: string }) {
  const pathname = usePathname();

  let navItems = [];
  if (role === 'admin') {
    navItems = [
      { href: '/admin', label: 'Admin Panel', icon: '🛡️' },
      { href: '/settings', label: 'API Settings', icon: '⚙️' }
    ];
  } else {
    navItems = [...defaultNavItems];
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 700,
            }}>
              B
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
              BrandLead <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8125rem' }}>OS</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ padding: '0.75rem', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                  marginBottom: '0.25rem',
                }}
              >
                <span style={{ fontSize: '1.125rem' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          Verify leads manually before outreach. Respect anti-spam laws.
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        marginLeft: '240px',
        flex: 1,
        padding: '2rem',
        maxWidth: 'calc(100vw - 240px)',
      }}>
        {children}
      </main>
    </div>
  );
}
