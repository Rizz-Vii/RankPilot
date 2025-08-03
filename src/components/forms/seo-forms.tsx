// Form Components for SEO Tools
// Generated: July 31, 2025

import React from 'react';
import type { AuditUrlInput, KeywordToolFormProps, SeoAuditFormProps } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// ============================================================================
// KEYWORD TOOL FORM
// ============================================================================

export function KeywordToolForm({ onSubmit, isLoading }: KeywordToolFormProps) {
    const [seed, setSeed] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ topic: seed, includeLongTailKeywords: true });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="seed">Seed Keyword</Label>
                <Input
                    id="seed"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Enter your seed keyword..."
                    required
                />
            </div>
            <Button type="submit" disabled={isLoading || !seed.trim()}>
                {isLoading ? 'Generating...' : 'Get Keyword Suggestions'}
            </Button>
        </form>
    );
}

// ============================================================================
// SEO AUDIT FORM
// ============================================================================

export function SeoAuditForm({ onSubmit, isLoading }: SeoAuditFormProps) {
    const [formData, setFormData] = React.useState<AuditUrlInput>({
        url: '',
        includeImages: true,
        checkMobile: true,
        analysisDepth: 'standard',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleInputChange = (field: keyof AuditUrlInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                    id="url"
                    value={formData.url}
                    onChange={handleInputChange('url')}
                    placeholder="https://example.com"
                    type="url"
                    required
                />
            </div>

            <div className="flex items-center space-x-2">
                <input
                    id="includeImages"
                    type="checkbox"
                    checked={formData.includeImages}
                    onChange={handleInputChange('includeImages')}
                />
                <Label htmlFor="includeImages">Include Image Analysis</Label>
            </div>

            <div className="flex items-center space-x-2">
                <input
                    id="checkMobile"
                    type="checkbox"
                    checked={formData.checkMobile}
                    onChange={handleInputChange('checkMobile')}
                />
                <Label htmlFor="checkMobile">Check Mobile Performance</Label>
            </div>

            <div className="space-y-2">
                <Label htmlFor="analysisDepth">Analysis Depth</Label>
                <select
                    id="analysisDepth"
                    value={formData.analysisDepth}
                    onChange={handleInputChange('analysisDepth')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="quick">Quick Scan</option>
                    <option value="standard">Standard Analysis</option>
                    <option value="comprehensive">Comprehensive Audit</option>
                </select>
            </div>

            <Button type="submit" disabled={isLoading || !formData.url.trim()}>
                {isLoading ? 'Running Audit...' : 'Start SEO Audit'}
            </Button>
        </form>
    );
}
