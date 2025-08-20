"use client";

import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type { AuditUrlInput } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SeoAuditFormProps {
    onSubmit: (values: AuditUrlInput) => Promise<void>;
    isLoading: boolean;
}

export default function SeoAuditForm({ onSubmit, isLoading }: SeoAuditFormProps): JSX.Element {
    const [url, setUrl] = useState('');
    const [checkMobile, setCheckMobile] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const validate = (value: string): boolean => {
        try {
            const u = new URL(value);
            return !!u.protocol && !!u.host;
        } catch {
            return false;
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
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
        } catch (err: unknown) {
            let msg = 'Failed to start audit';
            if (typeof err === 'object' && err && 'message' in err && typeof (err as any).message === 'string') {
                msg = (err as any).message;
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.currentTarget.value)}
                    required
                    aria-invalid={!!error}
                    aria-describedby={error ? 'audit-url-error' : undefined}
                />
                {error && (
                    <p id="audit-url-error" className="text-xs text-red-500 mt-1" role="alert">
                        {error}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2">
                <input
                    id="check-mobile"
                    type="checkbox"
                    checked={checkMobile}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCheckMobile(e.currentTarget.checked)}
                    aria-checked={checkMobile}
                />
                <Label htmlFor="check-mobile">Include mobile checks</Label>
            </div>
            <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Analyzing…' : 'Run SEO Audit'}
            </Button>
        </form>
    );
}
