import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { cookies } from "next/headers";
import { ClientLayout } from "@/components/client-layout";
import type { Metadata } from "next";

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
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#6699CC" },
    ],
  },
  manifest: "/manifest.json",
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: "#6699CC",
  };
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
        if (['ar','he'].includes(htmlLang)) htmlDir = 'rtl';
      }
    }
  } catch {}
  // Default to primary/dark theme when no preference is set
  if (!themeClass) themeClass = 'theme-dark';
  if (!ssrThemeMode) ssrThemeMode = 'dark';

  // Build deterministic body class ordering once (base -> flags -> lang -> theme)
  const flags: string[] = [];
  if (bodyExtra.includes('reduced-motion')) flags.push('reduced-motion');
  if (bodyExtra.includes('colorblind-support')) flags.push('colorblind-support');
  const addDarkClass = (ssrThemeMode === 'dark' && !ssrHighContrast) || themeClass === 'theme-dark';
  const bodyClass = ['font-body','antialiased','h-full',...flags,`lang-${htmlLang}`,themeClass || 'theme-dark', addDarkClass ? 'dark' : ''].filter(Boolean).join(' ');

  return (
    <html lang={htmlLang} dir={htmlDir} suppressHydrationWarning className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
      </head>
  {/* Deterministic ordering: base -> flags -> lang -> theme */}
  <body suppressHydrationWarning className={bodyClass}>
        <script
          // Inline no-flash script: reconstructs class list deterministically (same ordering) before React hydrates
          dangerouslySetInnerHTML={{
    __html: `(()=>{try{var DEV=location.hostname==='localhost';function log(){if(DEV){try{console.debug.apply(console,arguments);}catch{}}}var b=document.body,de=document.documentElement;function rebuild(data){if(!b||!de)return;var lang=de.lang||'en';var desired=(data&&(data.highContrast?'high-contrast':data.theme))||'dark';var flags=[];if(data&&data.reducedMotion)flags.push('reduced-motion');if(data&&data.colorBlind)flags.push('colorblind-support');var darkOn=(desired==='dark'&&!((data&&data.highContrast)));var cls=['font-body','antialiased','h-full'].concat(flags,'lang-'+lang,'theme-'+desired,(darkOn?'dark':''));var next=cls.filter(Boolean).join(' ');if(b.className!==next){b.className=next;log('body class sync:',next);} }function read(){var data=null;/* cookie */var cm=document.cookie.match(/(?:^|; )rp_theme=([^;]+)/);if(cm){try{data=JSON.parse(decodeURIComponent(cm[1]));}catch(e){log('cookie parse fail',e);} }if(!data){try{var ls=localStorage.getItem('rankpilot-theme-preferences');if(ls){var p=JSON.parse(ls);var autoMode=p.mode==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p.mode;data={theme:p.highContrast?'high-contrast':autoMode,reducedMotion:p.reducedMotion,colorBlind:p.colorBlindnessSupport,highContrast:p.highContrast};}else{data={theme:'dark'};}}catch(e){log('ls parse fail',e);data={theme:'dark'};} }/* language cookie */var lcMatch=document.cookie.match(/(?:^|; )rp_lang=([^;]+)/);if(lcMatch){var lc=decodeURIComponent(lcMatch[1]).toLowerCase();if(/^[a-z]{2}$/.test(lc)){if(!de.lang||de.lang!==lc)de.lang=lc;var rtl=['ar','he'];de.dir=rtl.includes(lc)?'rtl':'ltr';}}return data;}function apply(){var d=read();rebuild(d);}apply();}catch(e){}})();`
          }}
        />
        <AuthProvider>
          <ClientLayout>
            {children}
            {/* DevListenerBadge temporarily disabled in server layout (dynamic ssr:false not allowed). Reintroduce inside a client component if needed. */}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
