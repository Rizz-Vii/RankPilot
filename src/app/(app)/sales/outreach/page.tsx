import { FeatureGate } from '@/components/subscription/FeatureGate';
import { SalesOutreachClient } from './_client/SalesOutreachClient';

export const metadata = { title: 'Sales Outreach' };

export default function SalesOutreachPage() {
  return (
    <FeatureGate feature="sales_outreach" requiredTier="starter" showUpgrade>
      <div className="p-6"><SalesOutreachClient /></div>
    </FeatureGate>
  );
}
