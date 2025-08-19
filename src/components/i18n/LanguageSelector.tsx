/**
 * Language Selector Component
 * Priority 3 Feature Implementation - DevReady Phase 3
 * 
 * Features:
 * - Multi-language support with visual selection
 * - RTL layout support
 * - Accessibility-compliant language switching
 */

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SupportedLanguage} from '@/lib/i18n/internationalization-system';
import { LANGUAGE_CONFIGS, useI18n } from '@/lib/i18n/internationalization-system';
import { useToast } from '@/hooks/use-toast';
import { Check, Globe } from 'lucide-react';

interface LanguageSelectorProps {
    variant?: 'button' | 'compact' | 'inline';
    showLabel?: boolean;
    className?: string;
}

export function LanguageSelector({
    variant = 'button',
    showLabel = true,
    className = ''
}: LanguageSelectorProps) {
    const { language, setLanguage, availableLanguages, translate } = useI18n();
    const [a11yMessage, setA11yMessage] = useState('');
    const { toast } = useToast();

    const handleLanguageChange = (newLanguage: SupportedLanguage) => {
        setLanguage(newLanguage);
        const msg = translate('feedback.language.changed');
        setA11yMessage(msg);
        toast({ title: msg });
    };

    const currentLanguageConfig = LANGUAGE_CONFIGS[language];

    if (variant === 'inline') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                {showLabel && (
                    <span className="text-sm text-muted-foreground">
                        {translate('settings.language')}:
                    </span>
                )}
                <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                    className="text-sm bg-transparent border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary font-body mobile-touch-target"
                    aria-label={translate('settings.selectLanguage')}
                >
                    {availableLanguages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.nativeName}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    if (variant === 'compact') {
    return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${className}`}
                        aria-label={translate('settings.selectLanguage')}
                    >
                        <Globe className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    {availableLanguages.map((lang) => (
                            <DropdownMenuItem
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className="flex items-center justify-between cursor-pointer font-body"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{lang.nativeName}</span>
                                <span className="text-xs text-muted-foreground">({lang.name})</span>
                            </div>
                            {language === lang.code && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
    <>
    <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={`flex items-center gap-2 ${className}`}
                    aria-label={translate('settings.selectLanguage')}
                >
                    <Globe className="h-4 w-4" />
                    {showLabel && (
                        <>
                            <span className="hidden sm:inline">
                                {currentLanguageConfig.nativeName}
                            </span>
                            <span className="sm:hidden">
                                {currentLanguageConfig.code.toUpperCase()}
                            </span>
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 border-b">
                    <h4 className="text-sm font-medium">{translate('settings.selectLanguage')}</h4>
                    <p className="text-xs text-muted-foreground">
                        {translate('settings.languageDescription')}
                    </p>
                </div>
                {availableLanguages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                                className="flex items-center justify-between cursor-pointer p-3 font-body"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{lang.nativeName}</span>
                            <span className="text-xs text-muted-foreground">{lang.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {lang.rtl && (
                                <span className="text-xs bg-secondary px-1 rounded">RTL</span>
                            )}
                            {language === lang.code && <Check className="h-4 w-4 text-primary" />}
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
    </DropdownMenu>
    <div role="status" aria-live="polite" className="sr-only">{a11yMessage}</div>
    </>
    );
}

// Language-specific region selector for currencies and date formats
export function RegionSelector() {
    const { language, config, formatCurrency, formatDate } = useI18n();

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-medium mb-2">Regional Format Preview</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Currency:</span>
                        <span>{formatCurrency(1234.56)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{formatDate(new Date())}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Numbers:</span>
                        <span>{new Intl.NumberFormat(language).format(1234567.89)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Direction:</span>
                        <span className="flex items-center gap-1">
                            {config.rtl ? 'Right-to-Left' : 'Left-to-Right'}
                            <span className={`text-xs ${config.rtl ? 'mr-2' : 'ml-2'}`}>
                                {config.rtl ? '←' : '→'}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
