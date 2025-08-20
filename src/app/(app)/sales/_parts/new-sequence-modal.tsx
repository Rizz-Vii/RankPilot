"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (seq: Record<string, unknown>) => void;
}

export function NewSequenceModal({ open, onOpenChange, onCreated }: Props): JSX.Element {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState<string>('');
  const [steps, setSteps] = useState<string>('Hi {{firstName}},\nQuick note about...');
  const [saving, setSaving] = useState<boolean>(false);

  async function save(): Promise<void> {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const seq = {
        name: name.trim(),
        steps,
        userId: user.uid,
        teamId: (user as { teamId?: string })?.teamId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'salesSequences'), seq);
      const full = { id: ref.id, ...seq };
      onCreated?.(full);
      toast({ title: 'Sequence created', description: name });
      setName('');
      setSteps('Hi {{firstName}},\nQuick note about...');
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        title: 'Failed',
        description: (e instanceof Error ? e.message : String(e)) || 'Could not save sequence',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Outreach Sequence</DialogTitle>
          <DialogDescription>Create a simple multi-step outreach sequence.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Sequence Name</label>
            <Input
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="Outbound - Q4 Test"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Steps (one per line)</label>
            <Textarea
              value={steps}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSteps(e.target.value)}
              rows={6}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Create Sequence'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
