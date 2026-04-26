'use client';

import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Compass, Users } from 'lucide-react';
import { mahberService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

export default function DiscoverMahbersPage() {
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const { data: mahbers, isLoading, refetch } = useQuery({
    queryKey: ['public-mahbers'],
    queryFn: () => mahberService.getPublicMahbers()
  });

  const handleJoin = async (id: string) => {
    try {
      setJoiningId(id);
      await mahberService.joinMahber(id);
      toast.success('Join request sent successfully!');
      refetch(); // Refresh list to remove the joined one
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      toast.error(error.response?.data?.message || 'Failed to send join request.');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div>
      <PageHeader 
        title="Discover" 
        description="Find and join public communities."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48">
              <CardHeader className="gap-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : mahbers?.length === 0 ? (
        <div className="text-center py-20 glass rounded-card">
          <Compass className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Public Mahbers Found</h3>
          <p className="text-text-secondary">Check back later for new communities to join.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mahbers?.map((mahber) => (
            <Card key={mahber.id} className="hover:border-gold/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={mahber.type === 'EQUB' ? 'success' : mahber.type === 'IDDIR' ? 'warning' : 'default'}>
                    {mahber.type}
                  </Badge>
                  <div className="flex items-center text-text-secondary text-sm">
                    <Users className="w-4 h-4 mr-1" />
                    {mahber._count?.members || 0}
                  </div>
                </div>
                <CardTitle>{mahber.name}</CardTitle>
                <CardDescription>Created {new Date(mahber.created_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleJoin(mahber.id)}
                  isLoading={joiningId === mahber.id}
                >
                  Request to Join
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
