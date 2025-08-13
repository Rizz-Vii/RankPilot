"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface Props { open: boolean; onOpenChange: (open: boolean)=>void; onCreated?: (deal: any)=>void; }

export function AddDealModal({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState('qualification');
  const [saving, setSaving] = useState(false);

  async function save() {
    if(!user) return;
    if(!name.trim()) { toast({ title:'Name required', variant:'destructive' }); return; }
    const amt = Number(amount)||0;
    setSaving(true);
    try {
      const period = new Date().toISOString().slice(0,7);
      const deal = { name: name.trim(), amount: amt, stage, status: 'Open', userId: user.uid, teamId: (user as any)?.teamId || null, period, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'salesDeals'), deal);
      const full = { id: ref.id, ...deal };
      onCreated?.(full);
      toast({ title:'Deal added', description: name });
      setName(''); setAmount(''); setStage('qualification');
      onOpenChange(false);
    } catch(e:any) {
      toast({ title:'Failed', description: e.message||'Could not add deal', variant:'destructive'});
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={o=> { if(!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Deal</DialogTitle>
          <DialogDescription>Create a new opportunity.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Name</label>
            <Input value={name} onChange={e=> setName(e.target.value)} placeholder="Opportunity name" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Amount</label>
            <Input value={amount} onChange={e=> setAmount(e.target.value)} placeholder="0" type="number" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Stage</label>
            <select value={stage} onChange={e=> setStage(e.target.value)} className="w-full rounded-md border bg-surface-background px-2 py-1 text-sm">
              <option value="qualification">Qualification</option>
              <option value="discovery">Discovery</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={()=> onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving? 'Saving...':'Save Deal'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
