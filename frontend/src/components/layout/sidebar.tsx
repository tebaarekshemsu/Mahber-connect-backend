'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui-store';
import { 
  LayoutDashboard, 
  Users, 
  Compass, 
  Bell, 
  Settings, 
  User, 
  MessageSquare,
  Calendar,
  Wallet,
  Activity,
  PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const pathname = usePathname();
  const { activeMahberId } = useUIStore();

  const isGlobalRoute = !pathname.includes('/mahbers/') || pathname === '/mahbers/create' || pathname === '/mahbers/discover';

  const globalLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/mahbers', label: 'My Mahbers', icon: Users },
    { href: '/mahbers/discover', label: 'Discover', icon: Compass },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ];

  const mahberLinks = activeMahberId ? [
    { href: `/mahbers/${activeMahberId}`, label: 'Overview', icon: LayoutDashboard },
    { href: `/mahbers/${activeMahberId}/members`, label: 'Members', icon: Users },
    { href: `/mahbers/${activeMahberId}/events`, label: 'Events', icon: Calendar },
    { href: `/mahbers/${activeMahberId}/payments`, label: 'Finances', icon: Wallet },
    { href: `/mahbers/${activeMahberId}/chat`, label: 'Chat', icon: MessageSquare },
    { href: `/mahbers/${activeMahberId}/audit`, label: 'Audit Trail', icon: Activity },
    { href: `/mahbers/${activeMahberId}/settings`, label: 'Settings', icon: Settings },
  ] : [];

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border-glass bg-background-dark/50 backdrop-blur-md">
      <div className="p-6 border-b border-border-glass">
        <Link href="/dashboard" className="text-xl font-bold text-gold flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
            <span className="text-gold">M</span>
          </div>
          MahberConnect
        </Link>
      </div>

      <div className="p-4 border-b border-border-glass">
        <Button asChild variant="default" className="w-full justify-start gap-2">
          <Link href="/mahbers/create">
            <PlusCircle className="w-5 h-5" />
            Create Mahber
          </Link>
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          <p className="px-4 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            {isGlobalRoute ? 'Global Navigation' : 'Mahber Menu'}
          </p>
          
          {(isGlobalRoute ? globalLinks : mahberLinks).map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href) && isGlobalRoute);
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-input text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-surface-active text-gold shadow-[inset_2px_0_0_0_#EEBD2B]" 
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-gold" : "text-text-muted")} />
                {link.label}
              </Link>
            );
          })}
        </div>

        {!isGlobalRoute && (
          <div className="mt-8 px-3 space-y-1">
            <p className="px-4 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Back
            </p>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2 rounded-input text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
            >
              <LayoutDashboard className="w-5 h-5 text-text-muted" />
              Dashboard
            </Link>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border-glass">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-4 py-2 rounded-input text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          <User className="w-5 h-5 text-text-muted" />
          Profile
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2 rounded-input text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors mt-1"
        >
          <Settings className="w-5 h-5 text-text-muted" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
