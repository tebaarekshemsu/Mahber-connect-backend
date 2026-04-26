'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { ArrowLeft, Image as ImageIcon, Upload, X } from 'lucide-react';
import { eventService } from '@/lib/api/service-factory';
import { EventPhoto } from '@/lib/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

export default function EventPhotosPage({ params }: { params: { id: string, eventId: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: event } = useQuery({
    queryKey: ['mahber-event', params.id, params.eventId],
    queryFn: () => eventService.getEventById(params.id, params.eventId)
  });

  const { data: photosResponse, isLoading: isPhotosLoading } = useQuery({
    queryKey: ['event-photos', params.id, params.eventId],
    queryFn: () => eventService.getPhotos(params.id, params.eventId)
  });

  const uploadMutation = useMutation<EventPhoto, Error, void>({
    mutationFn: async () => {
      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      if (caption) formData.append('caption', caption);
      return eventService.uploadPhoto(params.id, params.eventId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-photos', params.id, params.eventId] });
      toast.success('Photo uploaded successfully!');
      setShowUpload(false);
      setCaption('');
      setSelectedFile(null);
    },
    onError: () => toast.error('Failed to upload photo')
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      uploadMutation.mutate();
    } else {
      // For mock purposes, if no file is selected but they click upload, we still trigger it
      // to test the flow with a placeholder image from the mock service
      uploadMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Event
      </Button>

      <PageHeader 
        title={`${event?.title || 'Event'} Photos`} 
        description="View and share memories from this event."
      >
        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Photo
        </Button>
      </PageHeader>

      {isPhotosLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : !photosResponse?.data || photosResponse.data.length === 0 ? (
        <div className="text-center py-16 glass rounded-card">
          <ImageIcon className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
          <p className="text-text-secondary text-lg">No photos have been uploaded yet.</p>
          <Button variant="link" onClick={() => setShowUpload(true)} className="mt-2 text-gold">
            Be the first to share a memory!
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {photosResponse.data.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group">
              <div className="aspect-square relative overflow-hidden bg-surface-active">
                <img 
                  src={photo.file_path} 
                  alt={photo.caption || 'Event photo'} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <p className="text-white text-sm font-medium line-clamp-2">{photo.caption}</p>
                  <p className="text-white/70 text-xs mt-1">By {photo.user?.name || 'Unknown'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog 
        isOpen={showUpload} 
        onClose={() => setShowUpload(false)}
        title="Upload Photo"
      >
        <div className="space-y-6">
          <div 
            className="border-2 border-dashed border-border-glass rounded-xl p-8 text-center hover:bg-surface-active/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              className="hidden" 
            />
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <ImageIcon className="w-8 h-8 text-gold mb-2" />
                <p className="text-sm font-medium text-text-primary">{selectedFile.name}</p>
                <p className="text-xs text-text-muted mt-1">Click to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-text-muted mb-2" />
                <p className="text-sm font-medium text-text-primary">Click to select a photo</p>
                <p className="text-xs text-text-muted mt-1">JPG, PNG, up to 5MB</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Caption (Optional)</label>
            <Input 
              placeholder="Write a short description..." 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-glass">
            <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button 
              onClick={handleUploadClick}
              isLoading={uploadMutation.isPending}
            >
              Upload
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
