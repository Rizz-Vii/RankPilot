"use client";
import React from 'react';
import { useFinanceContext } from './finance-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props { open:boolean; onOpenChange:(o:boolean)=>void; }
export function OnTimeBreakdownModal({ open, onOpenChange }: Props){
  const { data } = useFinanceContext();
  interface Invoice { id:string; status:string; planTier?:string; paidAt?: { toDate?:()=>Date }; dueAt?: { toDate?:()=>Date } }
  const invoices: Invoice[] = Array.isArray(data?.invoices) ? (data!.invoices as Invoice[]) : [];
  const paid = invoices.filter(i=> i.status==='paid');
  const groups = paid.map(p=> ({
    id: p.id,
    tier: p.planTier||'-',
  onTime: (()=> { const paidAt=p.paidAt?.toDate ? p.paidAt.toDate(): undefined; const due=p.dueAt?.toDate ? p.dueAt.toDate(): undefined; if(!paidAt||!due) return false; return paidAt.getTime() <= due.getTime(); })()
  }));
  const onTime = groups.filter(g=> g.onTime).length;
  const pct = paid.length? (onTime/paid.length*100):0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>On-Time Payment Breakdown</DialogTitle>
          <DialogDescription>{pct.toFixed(1)}% of {paid.length} paid invoices were on time.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 max-h-[340px] overflow-auto pr-1 text-xs">
          {groups.map(g=> (
            <li key={g.id} className="flex items-center justify-between border-b last:border-none py-1">
              <span className="font-medium">{g.tier}</span>
              <span
                className={g.onTime
                  ? 'text-success-foreground' // semantic class for success
                  : 'text-warning-foreground' // semantic class for warning
                }
                style={{ color: g.onTime ? 'var(--success-foreground, var(--primary))' : 'var(--warning-foreground, var(--secondary))' }}
              >
                {g.onTime ? 'On-Time' : 'Late'}
              </span>
            </li>
          ))}
          {!groups.length && <li className="text-muted-foreground text-center py-4">No paid invoices</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
