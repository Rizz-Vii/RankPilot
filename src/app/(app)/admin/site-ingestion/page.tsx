"use client";
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';

export default function SiteIngestionAdminPage() {
  const { profile } = useAuth();
  const [baseUrl, setBaseUrl] = useState('');
  const [maxPages, setMaxPages] = useState(8);
  const [status, setStatus] = useState('Idle');
  const [result, setResult] = useState<any>(null);
  const isAdmin = profile?.subscriptionTier === 'admin';

  async function runIngestion() {
    if (!isAdmin || !baseUrl) return;
    setStatus('Running');
    try {
      const idToken = await (auth.currentUser as any)?.getIdToken?.();
      const res = await fetch('/api/admin/site/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ baseUrl, maxPages }) });
      const json = await res.json();
      setResult(json);
      setStatus(res.ok ? 'Completed' : 'Failed');
    } catch (e: any) {
      setStatus('Error');
    }
  }

  if (!isAdmin) return <div className="p-6 text-sm">Admin only.</div>;
  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Site Ingestion Admin</h1>
      <div className="space-y-2">
        <input className="w-full border rounded px-2 py-1 text-sm" placeholder="https://example.com" value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Max Pages</label>
          <input type="number" className="w-24 border rounded px-2 py-1 text-sm" value={maxPages} onChange={e=>setMaxPages(parseInt(e.target.value)||1)} />
        </div>
        <button onClick={runIngestion} disabled={!baseUrl || status==='Running'} className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50">Ingest</button>
        <div className="text-xs text-gray-600">Status: {status}</div>
      </div>
      {result && (
        <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
