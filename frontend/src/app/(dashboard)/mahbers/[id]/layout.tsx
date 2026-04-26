'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/ui-store';

export default function MahberDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const setActiveMahber = useUIStore((state) => state.setActiveMahber);

  useEffect(() => {
    // When this layout mounts (user enters a Mahber's context), tell the store
    setActiveMahber(params.id);

    // When the user leaves this layout (navigates back to dashboard), clear the context
    return () => {
      setActiveMahber(null);
    };
  }, [params.id, setActiveMahber]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {children}
    </div>
  );
}
