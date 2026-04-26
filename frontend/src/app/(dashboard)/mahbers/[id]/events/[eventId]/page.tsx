'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Clock, Camera, CheckCircle, AlertCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { eventService } from '@/lib/api/service-factory';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCode } from '@/components/ui/qrcode';
import { Dialog } from '@/components/ui/dialog';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function EventDetailPage({ params }: { params: { id: string, eventId: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showQR, setShowQR] = useState(false);

  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: ['mahber-event', params.id, params.eventId],
    queryFn: () => eventService.getEventById(params.id, params.eventId)
  });

  const { data: qrCode, isLoading: isQRLoading } = useQuery({
    queryKey: ['event-qr', params.id, params.eventId],
    queryFn: () => eventService.getQRCode(params.id, params.eventId),
    enabled: showQR
  });

  // Since we don't have a direct "get event attendance" endpoint in the spec,
  // we will mock the count. In a real app, you'd fetch the attendance list.
  
  const checkInMutation = useMutation({
    mutationFn: () => eventService.checkIn(params.id, params.eventId, 'simulated-qr-token-123'),
    onSuccess: () => {
      toast.success('Successfully checked in!');
      // Invalidate queries if we were fetching attendance list
    },
    onError: () => toast.error('Failed to check in. Please try again.')
  });

  if (isEventLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Card className="h-48" />
        <Card className="h-64" />
      </div>
    );
  }

  if (!event) return <div>Event not found.</div>;

  const isPastEvent = new Date(event.start_time) <= new Date();

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </Button>

      <PageHeader 
        title={event.title} 
        description={event.description}
      >
        <div className="flex gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link href={`/mahbers/${params.id}/events/${params.eventId}/photos`}>
              <Camera className="w-4 h-4" />
              Photo Gallery
            </Link>
          </Button>
          {!isPastEvent && !event.is_cancelled && (
            <Button onClick={() => setShowQR(true)} className="gap-2">
              Generate QR
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-gold border-gold/30 bg-gold/5">
                {event.event_type.replace('_', ' ')}
              </Badge>
              {event.is_mandatory && <Badge variant="destructive">Mandatory</Badge>}
              {event.is_cancelled && <Badge variant="secondary">Cancelled</Badge>}
              {isPastEvent && !event.is_cancelled && <Badge variant="success">Completed</Badge>}
            </div>

            <div className="space-y-4 pt-4 border-t border-border-glass">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-active flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Date</h4>
                  <p className="text-text-secondary">
                    {new Date(event.start_time).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-active flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Time</h4>
                  <p className="text-text-secondary">
                    {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-active flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Location</h4>
                  <p className="text-text-secondary">{event.location}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">Member Check-in</CardTitle>
              <CheckCircle className="h-4 w-4 text-status-success" />
            </CardHeader>
            <CardContent>
              {!isPastEvent && !event.is_cancelled ? (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted">
                    Scan the event QR code to check in, or use the manual check-in below if you are at the venue.
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => checkInMutation.mutate()}
                    isLoading={checkInMutation.isPending}
                  >
                    Check In Now
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-status-warning text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Check-in is closed for this event.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gold/10 to-background-dark">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">Expected Attendance</CardTitle>
              <Users className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary">--</div>
              <p className="text-xs text-text-muted mt-1">Pending admin confirmation</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Modal for Admins */}
      <Dialog 
        isOpen={showQR} 
        onClose={() => setShowQR(false)}
        title="Event QR Code"
        description="Display this QR code for members to scan and check-in upon arrival."
      >
        <div className="flex flex-col items-center justify-center py-6 space-y-6">
          {isQRLoading ? (
            <Skeleton className="w-[232px] h-[232px] rounded-xl" />
          ) : qrCode?.qr_code ? (
            <QRCode dataUrl={qrCode.qr_code} size={200} />
          ) : (
            <div className="text-status-error">Failed to load QR Code</div>
          )}
          <p className="text-sm text-center text-text-secondary max-w-[250px]">
            Members can scan this using the MahberConnect app scanner.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
