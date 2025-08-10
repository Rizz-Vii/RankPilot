"use client";
import React from 'react';
import { useFinanceContext } from './finance-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props { open: boolean; onOpenChange: (open:boolean)=>void; filter: 'unpaid' | 'all'; }
export function InvoiceDetailModal({ open, onOpenChange, filter }: Props){
  const { data } = useFinanceContext();
  const rows = (data?.invoices||[]).filter(i => filter==='all' ? true : i.status !== 'paid');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{filter==='unpaid'? 'Outstanding Invoices':'All Recent Invoices'}</DialogTitle>
          <DialogDescription>{rows.length} invoice(s) listed.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[460px] pr-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="py-1 text-left">Period</th>
                <th className="py-1 text-left">Tier</th>
                <th className="py-1 text-right">Amount</th>
                <th className="py-1 text-center">Status</th>
                <th className="py-1 text-center">Issued</th>
                <th className="py-1 text-center">Paid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r.id||i} className="border-b last:border-none">
                  <td className="py-1 pr-2 font-medium">{r.period}</td>
                  <td className="py-1 text-left">{r.planTier||'-'}</td>
                  <td className="py-1 text-right tabular-nums">{(r.amount||0).toLocaleString()}</td>
                  <td className="py-1 text-center text-xs">{r.status}</td>
                  <td className="py-1 text-center text-xs">{r.issuedAt?.toDate?.()?.toISOString().slice(0,10)||'-'}</td>
                  <td className="py-1 text-center text-xs">{r.paidAt? r.paidAt.toDate().toISOString().slice(0,10): '-'}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">No invoices</td></tr>}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
