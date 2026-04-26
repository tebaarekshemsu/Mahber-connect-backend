'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Calendar, MapPin, Clock, Plus } from 'lucide-react';
import { eventService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function EventsPage({ params }: { params: { id: string } }) {
  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['mahber-events', params.id],
    queryFn: () => eventService.getEvents(params.id)
  });

  const events = eventsResponse?.data || [];
  const upcomingEvents = events.filter(e => new Date(e.start_time) > new Date());
  const pastEvents = events.filter(e => new Date(e.start_time) <= new Date());

  const EventCard = ({ event }: { event: any }) => (
    <Card className={`hover:bg-surface-hover/50 transition-colors ${event.is_cancelled ? 'opacity-50' : ''}`}>
      <CardContent className="p-0">
        <Link href={`/mahbers/${params.id}/events/${event.id}`} className="block p-5">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-gold border-gold/30 bg-gold/5">
                    {event.event_type.replace('_', ' ')}
                  </Badge>
                  {event.is_mandatory && <Badge variant="destructive">Mandatory</Badge>}
                  {event.is_cancelled && <Badge variant="secondary">Cancelled</Badge>}
                </div>
                <h3 className="text-xl font-bold text-text-primary group-hover:text-gold transition-colors">
                  {event.title}
                </h3>
              </div>
              
              <div className="space-y-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(event.start_time).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </div>
              </div>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Events" 
        description="Manage and track attendance for meetings, ceremonies, and gatherings."
      >
        <Button asChild className="gap-2">
          <Link href={`/mahbers/${params.id}/events/create`}>
            <Plus className="w-4 h-4" />
            Create Event
          </Link>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 glass rounded-card">
          <p className="text-text-secondary">No events have been created yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcomingEvents.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary border-b border-border-glass pb-2">Upcoming Events</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {upcomingEvents.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            </section>
          )}

          {pastEvents.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text-secondary border-b border-border-glass pb-2">Past Events</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pastEvents.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
