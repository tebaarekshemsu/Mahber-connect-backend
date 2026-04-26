'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores/ui-store';

export function TopBar() {
  const pathname = usePathname();
  const { toggleSidebar } = useUIStore();

  // Basic breadcrumb logic
  const segments = pathname.split('/').filter(Boolean);
  const title = segments.length > 0 
    ? segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1).replace(/-/g, ' ')
    : 'Dashboard';

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between p-4 border-b border-border-glass bg-background-dark/80 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle (if we decide to implement mobile slide-over sidebar) */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
          <Menu className="w-5 h-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
        
        {/* Mobile Title */}
        <h1 className="md:hidden text-lg font-bold text-text-primary capitalize truncate max-w-[150px]">
          {title}
        </h1>

        {/* Desktop Breadcrumbs/Search */}
        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-9 pr-4 py-2 h-10 w-64 bg-surface border border-border-glass rounded-input text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative text-text-secondary hover:text-gold">
          <Bell className="w-5 h-5" />
          {/* Notification Badge */}
          <span className="absolute top-2 right-2 w-2 h-2 bg-status-error rounded-full animate-pulse" />
        </Button>
        
        <Link href="/profile" className="ml-2">
          <Avatar className="h-9 w-9 cursor-pointer border-gold/50 hover:border-gold transition-colors">
            <AvatarImage src="" alt="User" />
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
