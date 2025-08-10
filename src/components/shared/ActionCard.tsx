"use client";
import React from 'react';
import { Button } from '@/components/ui/button';

export interface ActionCardProps {
  title: string;
  desc: string;
  action: () => void;
  label: string;
  disabled?: boolean;
  footer?: React.ReactNode;
  intent?: 'default'|'danger'|'success';
}

export function ActionCard({ title, desc, action, label, disabled, footer, intent='default' }: ActionCardProps){
  const intentClasses = intent==='danger'? 'border-destructive/50' : intent==='success'? 'border-green-500/40' : 'border';
  return (
    <div className={`rounded-xl p-4 bg-background/50 space-y-2 relative ${intentClasses}`}>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Button size="sm" variant="secondary" onClick={action} disabled={disabled}>{label}</Button>
      {footer}
    </div>
  );
}
