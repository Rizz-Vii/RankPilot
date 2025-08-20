"use client";
import { useState, type ChangeEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';

interface SiteIngestionResult {
  baseUrl: string;
  pagesCrawled: number;
  errors?: Array<{ url?: string; message: string }>; // minimal shape
  durationMs?: number;
  startedAt?: string;
  finishedAt?: string;
  [key: string]: unknown; // allow extra diagnostic fields without casting elsewhere
}

export default function SiteIngestionAdminPage() {
  const { profile } = useAuth();
  const [baseUrl, setBaseUrl] = useState('');
  const [maxPages, setMaxPages] = useState(8);
  const [status, setStatus] = useState('Idle');
  const [result, setResult] = useState<SiteIngestionResult | null>(null);
  type ProfileWithTier = { subscriptionTier?: string } | null | undefined;
  const isAdmin = (profile as ProfileWithTier)?.subscriptionTier === 'admin';

  async function runIngestion() {
    if (!isAdmin || !baseUrl) return;
    setStatus('Running');
    try {
      const idToken = await auth.currentUser?.getIdToken?.();
      const res = await fetch('/api/admin/site/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken ?? ''}`,
        },
        body: JSON.stringify({ baseUrl, maxPages }),
      });
      const json = (await res.json()) as SiteIngestionResult;
      setResult(json);
      setStatus(res.ok ? 'Completed' : 'Failed');
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error(e);
      setStatus('Error');
    }
  }

  if (!isAdmin) return <div className="p-6 text-sm">Admin only.</div>;
  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Site Ingestion Admin</h1>
      <div className="space-y-2">
        <input className="w-full border rounded px-2 py-1 text-sm" placeholder="https://example.com" value={baseUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)} />
        <div className="flex items-center gap-2">
          <label htmlFor="max-pages" className="text-xs text-muted-foreground">Max Pages</label>
          <input id="max-pages" min={1} type="number" className="w-24 border rounded px-2 py-1 text-sm" value={maxPages} onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxPages(Math.max(1, parseInt(e.target.value, 10) || 1))} />
        </div>
  <button type="button" onClick={() => { void runIngestion(); }} disabled={!baseUrl || status === 'Running'} className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50">Ingest</button>
  <div className="text-xs text-muted-foreground">Status: {status}</div>
      </div>
      {result && (
  <pre className="text-xs bg-secondary text-secondary-foreground p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
