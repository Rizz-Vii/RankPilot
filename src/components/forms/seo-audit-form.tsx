"use client";

import { useState } from 'react';
import type { AuditUrlInput } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SeoAuditFormProps {
    onSubmit: (values: AuditUrlInput) => Promise<void>;
    isLoading: boolean;
}

export default function SeoAuditForm({ onSubmit, isLoading }: SeoAuditFormProps) {
    const [url, setUrl] = useState('');
    const [checkMobile, setCheckMobile] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const validate = (value: string) => {
        try {
            const u = new URL(value);
            return !!u.protocol && !!u.host;
        } catch { return false; }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!validate(url)) {
            const msg = 'Enter a valid URL (https://example.com)';
            setError(msg);
            toast.error('Invalid URL', { description: msg });
            return;
        }
        try {
            const payload: AuditUrlInput = { url, checkMobile, analysisDepth: 'standard' } as AuditUrlInput;
            await onSubmit(payload);
            toast.success('Audit requested', { description: url });
        } catch (e: unknown) {
            let msg = 'Failed to start audit';
            if (typeof e === 'object' && e && 'message' in e && typeof (e as any).message === 'string') {
                msg = (e as any).message;
            }
            setError(msg);
            toast.error('Audit failed', { description: msg });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div>
                <Label htmlFor="audit-url">Website URL</Label>
                <Input
                    id="audit-url"
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    aria-invalid={!!error}
                />
                {error && <p className="text-xs text-red-500 mt-1" role="alert">{error}</p>}
            </div>
            <div className="flex items-center gap-2">
                <input id="check-mobile" type="checkbox" checked={checkMobile} onChange={(e) => setCheckMobile(e.target.checked)} />
                <Label htmlFor="check-mobile">Include mobile checks</Label>
            </div>
            <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Analyzing…' : 'Run SEO Audit'}
            </Button>
        </form>
    );
}
