'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Bell, User } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/mahbers', label: 'Mahbers', icon: Users },
    { href: '/notifications', label: 'Alerts', icon: Bell },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="md:hidden flex border-t border-border-glass bg-background-dark/80 backdrop-blur-md px-2 pb-safe pt-1 z-50">
      <div className="flex justify-around w-full">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));

          return (
            <Link 
              key={link.href}
              href={link.href} 
              className={cn(
                "p-2 flex flex-col items-center flex-1 transition-colors relative",
                isActive ? "text-gold" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gold rounded-full shadow-[0_0_8px_rgba(238,189,43,0.8)]" />
              )}
              <Icon className={cn("w-6 h-6 mb-1", isActive ? "text-gold" : "")} />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
