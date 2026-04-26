'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PlusCircle, Users } from 'lucide-react';
import { mahberService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyMahbersPage() {
  const { data: memberships, isLoading } = useQuery({
    queryKey: ['my-mahbers'],
    queryFn: () => mahberService.getMyMahbers()
  });

  return (
    <div>
      <PageHeader 
        title="My Mahbers" 
        description="Communities you are a member of."
      >
        <Button asChild>
          <Link href="/mahbers/create" className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Create New
          </Link>
        </Button>
      </PageHeader>

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
      ) : memberships?.length === 0 ? (
        <div className="text-center py-20 glass rounded-card">
          <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Mahbers Yet</h3>
          <p className="text-text-secondary mb-6">You haven&apos;t joined any communities.</p>
          <div className="flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link href="/mahbers/discover">Discover Mahbers</Link>
            </Button>
            <Button asChild>
              <Link href="/mahbers/create">Create One</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberships?.map((membership) => {
            const mahber = membership.mahber;
            if (!mahber) return null;
            
            return (
              <Card key={membership.id} className="hover:border-gold/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={mahber.type === 'EQUB' ? 'success' : mahber.type === 'IDDIR' ? 'warning' : 'default'}>
                      {mahber.type}
                    </Badge>
                    <Badge variant={membership.role === 'ADMIN' ? 'destructive' : 'outline'}>
                      {membership.role}
                    </Badge>
                  </div>
                  <CardTitle>{mahber.name}</CardTitle>
                  <CardDescription>{mahber._count?.members || 0} Members</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild className="w-full" variant="secondary">
                    <Link href={`/mahbers/${mahber.id}`}>View Dashboard</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
