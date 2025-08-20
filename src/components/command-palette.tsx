"use client";
import { useEffect, useState } from 'react';
import { Command, Sun, Moon, Contrast, User, LogOut } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import GlobalSearch from '@/components/global-search';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { useTheme } from '@/lib/themes/theme-system';
import { useI18n } from '@/lib/i18n/internationalization-system';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function CommandPaletteButton() {
  const [open, setOpen] = useState(false);
  const { translate } = useI18n();
  const tr = (k: string, fb: string) => { const v = translate(k); return v === k ? fb : v; };
  // Hotkey Ctrl/Cmd + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <EnhancedButton variant="ghost" size="icon" aria-label={tr('commandPalette.open','Command palette')} onClick={() => setOpen(true)}>
            <Command className="h-5 w-5" />
          </EnhancedButton>
        </TooltipTrigger>
        <TooltipContent>{tr('commandPalette.shortcut','Ctrl/Cmd + K')}</TooltipContent>
      </Tooltip>
      {open && <CommandPalette onClose={() => setOpen(false)} />}
    </>
  );
}

interface CommandPaletteProps { onClose: () => void; }

function CommandPalette({ onClose }: CommandPaletteProps) {
  const { theme, setTheme, isDark } = useTheme();
  const { user } = useAuth();
  const { translate } = useI18n();
  const tr = (k: string, fb: string) => { const v = translate(k); return v === k ? fb : v; };
  const cycleTheme = () => {
    const order = ['light', 'dark', 'high-contrast', 'auto'] as const;
    type ThemeName = typeof order[number];
    const idx = order.indexOf(theme as ThemeName);
    const next = order[(idx + 1) % order.length] as ThemeName;
    setTheme(next as any);
    try {
      window.dispatchEvent(
        new CustomEvent('rp_theme_cycle', {
          detail: { from: theme, to: next, at: Date.now() },
        }),
      );
    } catch (err) {
      // ignore in environments that disallow CustomEvent dispatch
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between bg-muted/40">
          <h3 className="text-sm font-medium flex items-center gap-2"><Command className="h-4 w-4"/>{tr('commandPalette.title','Command Center')}</h3>
          <span className="text-xs text-muted-foreground">{tr('commandPalette.escHint','Esc to close')}</span>
        </div>
        <div className="p-4 space-y-6">
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('commandPalette.section.search','Search')}</h4>
            <GlobalSearch />
          </section>
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('commandPalette.section.interface','Interface')}</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <EnhancedButton size="sm" variant="outline" onClick={cycleTheme} aria-label="Cycle theme">
                {theme === 'high-contrast' ? <Contrast className="h-4 w-4"/> : isDark() ? <Moon className="h-4 w-4"/> : <Sun className="h-4 w-4"/>}
                <span className="ml-2 text-xs hidden sm:inline">{tr('commandPalette.theme.label','Theme')}: {theme}</span>
              </EnhancedButton>
              <LanguageSelector variant="button" />
            </div>
          </section>
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('commandPalette.section.account','Account')}</h4>
            <div className="flex items-center gap-2 flex-wrap">
              {user ? (
                <EnhancedButton size="sm" variant="secondary" onClick={() => { signOut(auth); onClose(); }}>
                  <LogOut className="h-4 w-4 mr-1"/> {tr('commandPalette.signOut','Sign Out')}
                </EnhancedButton>
              ) : (
                <EnhancedButton size="sm" variant="secondary" asChild>
                  <a href="/login"><User className="h-4 w-4 mr-1"/> {tr('commandPalette.login','Login')}</a>
                </EnhancedButton>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
