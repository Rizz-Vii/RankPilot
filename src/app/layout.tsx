import { ClientLayout } from "@/components/client-layout";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { PWAInit } from "@/components/system/PWAInit";
import { AuthProvider } from "@/context/AuthContext";
import "@/styles/globals.css";
import type { Metadata } from "next";
import { PT_Sans, Space_Grotesk } from "next/font/google";
import { cookies, headers as reqHeaders } from "next/headers";
import Script from "next/script";
import type React from "react";

export const metadata: Metadata = {
  title: "RankPilot - AI-Powered SEO Platform",
  description:
    "RankPilot is an AI-first SEO platform that provides comprehensive site audits, keyword intelligence, and competitor tracking to boost your search rankings.",
  keywords: [
    "SEO",
    "AI",
    "search engine optimization",
    "keyword research",
    "site audit",
    "competitor analysis",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "var(--color-primary-500)" },
    ],
  },
  manifest: "/manifest.json",
};

// Load fonts via next/font to avoid per-page loading warning
const ptSans = PT_Sans({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-pt-sans", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-space-grotesk", display: "swap" });

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    // Enable full-bleed layout on iOS Safari for safe-area env() support
    viewportFit: "cover" as const,
    // Ask browsers to resize content area when interactive widgets (e.g., keyboard) appear
    interactiveWidget: "resizes-content" as const,
    // Prefer dynamic themeColor to match light/dark; keep brand fallback
    themeColor: [
      // Use concrete colors (no CSS vars) for browser status bar compatibility
      { media: "(prefers-color-scheme: light)", color: "rgb(102,153,204)" },
      { media: "(prefers-color-scheme: dark)", color: "rgb(102,153,204)" },
    ],
  } as const;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SSR theme + language cookie extraction
  let themeClass = '';
  let bodyExtra = '';
  let ssrHighContrast = false;
  let ssrThemeMode: 'light' | 'dark' | 'high-contrast' | 'auto' | '' = '';
  let htmlLang = 'en';
  let htmlDir: 'ltr' | 'rtl' = 'ltr';
  try {
    const cookieStore = await cookies();
    const t = cookieStore?.get?.('rp_theme');
    if (t?.value) {
      const parsed = JSON.parse(decodeURIComponent(t.value));
      if (parsed?.theme) {
        ssrThemeMode = parsed.theme;
        themeClass = `theme-${parsed.theme}`;
      }
      if (parsed?.reducedMotion) bodyExtra += ' reduced-motion';
      if (parsed?.colorBlind) bodyExtra += ' colorblind-support';
      if (parsed?.highContrast && !themeClass.includes('high-contrast')) {
        ssrHighContrast = true;
        themeClass = 'theme-high-contrast';
      }
    }
    const l = cookieStore?.get?.('rp_lang');
    if (l?.value) {
      const lang = decodeURIComponent(l.value);
      if (/^[a-z]{2}$/i.test(lang)) {
        htmlLang = lang.toLowerCase();
        if (['ar', 'he'].includes(htmlLang)) htmlDir = 'rtl';
      }
    }
  } catch {
    /* ignore cookie/headers parsing errors during SSR */
  }
  // Default to primary/dark theme when no preference is set
  if (!themeClass) themeClass = 'theme-dark';
  if (!ssrThemeMode) ssrThemeMode = 'dark';

  // Build deterministic body class ordering once (base -> flags -> lang -> theme)
  const flags: string[] = [];
  if (bodyExtra.includes('reduced-motion')) flags.push('reduced-motion');
  if (bodyExtra.includes('colorblind-support')) flags.push('colorblind-support');
  const addDarkClass = (ssrThemeMode === 'dark' && !ssrHighContrast) || themeClass === 'theme-dark';
  const bodyClass = ['font-body', 'antialiased', 'h-full', ...flags, `lang-${htmlLang}`, themeClass || 'theme-dark', addDarkClass ? 'dark' : ''].filter(Boolean).join(' ');

  // Dynamically import dev-only AgentsToggle server-side to avoid synchronous require() usage
  let agentsToggleElement: React.ReactNode = null;
  if (process.env.NODE_ENV === 'development') {
    try {
      const mod = await import('@/components/dev/AgentsToggle');
      const AgentsToggleComp = (mod && mod.AgentsToggle) as React.ComponentType | undefined;
      if (AgentsToggleComp) {
        agentsToggleElement = <div suppressHydrationWarning><AgentsToggleComp /></div>;
      }
    } catch {
      /* ignore dev-only import failures */
    }
  }

  // Fetch CSP nonce from request headers (set in middleware) for inline scripts
  // Align with Next's standard header key to ensure consistency with CSP
  // Use nonce only in production to avoid hydration mismatches in dev tooling
  const hdrs = await reqHeaders();
  const headerNonce = hdrs.get('x-nextjs-csp-nonce') ?? hdrs.get('x-nonce') ?? hdrs.get('x-rp-csp-nonce') ?? undefined;
  const cspNonce = process.env.NODE_ENV === 'production' ? headerNonce : undefined;
  return (
    <html lang={htmlLang} dir={htmlDir} suppressHydrationWarning className={`h-full ${ptSans.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Head content only; font files handled by next/font */}
      </head>
      {/* Deterministic ordering: base -> flags -> lang -> theme */}
      <body suppressHydrationWarning className={bodyClass}>
        <Script
          id="no-flash"
          strategy="beforeInteractive"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{var DEV=location.hostname==='localhost';function log(){if(DEV){try{console.debug.apply(console,arguments);}catch{}}}var b=document.body,de=document.documentElement;function toTriplet(color){try{if(!color||typeof color!=='string')return '210 10% 50%';var m=color.match(/^hsla?\\(([^)]+)\\)$/i);if(m){var inner=m[1].replace(/\\\\/g,' ').trim();var p=inner.split(/[\\s,]+/).filter(Boolean);var h=parseFloat(p[0]);var s=parseFloat(p[1]);var l=parseFloat(p[2]);if(isFinite(h)&&isFinite(s)&&isFinite(l))return h+' '+s+'% '+l+'%';}
var m2=color.match(/^rgba?\\(([^)]+)\\)$/i);if(m2){var parts=m2[1].split(',').map(function(s){return parseFloat(s.trim());});if(parts.length>=3&&parts.slice(0,3).every(isFinite)){var r=parts[0]/255,g=parts[1]/255,bl=parts[2]/255;var max=Math.max(r,g,bl),min=Math.min(r,g,bl);var h2=0,s2=0,l2=(max+min)/2;if(max!==min){var d=max-min;s2=l2>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h2=(g-bl)/d+(g<bl?6:0);break;case g:h2=(bl-r)/d+2;break;default:h2=(r-g)/d+4;}h2*=60;}return h2+' '+(s2*100)+'% '+(l2*100)+'%';}}
var m3=color.match(/^#([0-9a-fA-F]{6})$/);if(m3){var hx=m3[1];var r2=parseInt(hx.slice(0,2),16)/255,g2=parseInt(hx.slice(2,4),16)/255,b2=parseInt(hx.slice(4,6),16)/255;var max2=Math.max(r2,g2,b2),min2=Math.min(r2,g2,b2);var h3=0,s3=0,l3=(max2+min2)/2;if(max2!==min2){var d2=max2-min2;s3=l3>0.5?d2/(2-max2-min2):d2/(max2+max2);switch(max2){case r2:h3=(g2-b2)/d2+(g2<b2?6:0);break;case g2:h3=(b2-r2)/d2+2;break;default:h3=(r2-g2)/d2+4;}h3*=60;}return h3+' '+(s3*100)+'% '+(l3*100)+'%';}
return '210 10% 50%';}catch{return '210 10% 50%';}}
function applyCustomColors(cc){try{if(!cc||typeof cc!=='object')return;var r=de; if(cc.primary&&typeof cc.primary==='string'){r.style.setProperty('--color-primary',cc.primary);r.style.setProperty('--primary',toTriplet(cc.primary));}if(cc.secondary&&typeof cc.secondary==='string'){r.style.setProperty('--color-secondary',cc.secondary);r.style.setProperty('--secondary',toTriplet(cc.secondary));}if(cc.accent&&typeof cc.accent==='string'){r.style.setProperty('--color-accent',cc.accent);r.style.setProperty('--accent',toTriplet(cc.accent));}}catch{}}
function rebuild(data){if(!b||!de)return;var lang=de.lang||'en';var desired=(data&&(data.highContrast?'high-contrast':data.theme))||'dark';var flags=[];if(data&&data.reducedMotion)flags.push('reduced-motion');if(data&&data.colorBlind)flags.push('colorblind-support');var darkOn=(desired==='dark'&&!((data&&data.highContrast)));var cls=['font-body','antialiased','h-full'].concat(flags,'lang-'+lang,'theme-'+desired,(darkOn?'dark':''));var next=cls.filter(Boolean).join(' ');if(b.className!==next){b.className=next;log('body class sync:',next);} if(data&&data.customColors){applyCustomColors(data.customColors);} }function read(){var data=null;/* cookie */var cm=document.cookie.match(/(?:^|; )rp_theme=([^;]+)/);if(cm){try{data=JSON.parse(decodeURIComponent(cm[1]));}catch(e){log('cookie parse fail',e);} }if(!data||!data.customColors){try{var ls=localStorage.getItem('rankpilot-theme-preferences');if(ls){var p=JSON.parse(ls);var autoMode=p.mode==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p.mode;data=Object.assign({},data||{}, {theme:(p.highContrast?'high-contrast':autoMode), reducedMotion:p.reducedMotion, colorBlind:p.colorBlindnessSupport, highContrast:p.highContrast, customColors:p.customColors});}else{data=Object.assign({},{theme:'dark'});} }catch(e){log('ls parse fail',e); data=Object.assign({},{theme:'dark'});} }/* language cookie */var lcMatch=document.cookie.match(/(?:^|; )rp_lang=([^;]+)/);if(lcMatch){var lc=decodeURIComponent(lcMatch[1]).toLowerCase();if(/^[a-z]{2}$/.test(lc)){if(!de.lang||de.lang!==lc)de.lang=lc;var rtl=['ar','he'];de.dir=rtl.includes(lc)?'rtl':'ltr';}}return data;}function apply(){var d=read();rebuild(d);}apply();}catch(e){}})();`
          }}
        />
        {/* Centralized PWA initializer: unregister SWs when PWA is disabled */}
        <PWAInit />
        <AuthProvider>
          <ClientLayout>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            {/* Dev-only Agents feature toggle */}
            {agentsToggleElement}
            {/* DevListenerBadge temporarily disabled in server layout (dynamic ssr:false not allowed). Reintroduce inside a client component if needed. */}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
