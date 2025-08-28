"use client";
import { ChartContainer } from '@/components/ui/chart';
import dynamic from 'next/dynamic';
import { useFinanceContext } from './finance-context';

// Defer heavy Recharts components to client-only dynamic imports
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const LabelList = dynamic(() => import('recharts').then(m => m.LabelList), { ssr: false });

export default function InvoiceAging(){
  const { data } = useFinanceContext();
  const aging = data?.aging || [];
  return (
  <div className="rounded-xl border p-4 bg-gradient-to-br from-surface-background to-muted-background/30 h-[260px] flex flex-col">
  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Invoice Aging</h3>
      <div className="flex-1">
        <ChartContainer config={{}} className="h-full w-full">
          <BarChart data={aging} margin={{ top:4,right:8,left:0,bottom:4 }}>
            <XAxis dataKey="bucket" tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} />
            <Tooltip wrapperClassName="!text-xs" contentStyle={{ fontSize:12 }} />
            <Bar dataKey="amount" fill="hsl(var(--primary-background)/0.3)">
              <LabelList dataKey="count" position="top" className="text-xs text-primary-foreground" />
              {aging.map((a,i)=>(<Cell key={a.bucket} fill={`hsl(var(--primary-background)/${0.25 + (0.5*(i/Math.max(1,aging.length-1)))})`} />))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
  <p className="mt-1 text-xs text-muted-foreground">Amount by days past due; labels show invoice count.</p>
    </div>
  );
}
