// src/app/(public)/head.tsx
import React from 'react';
import Script from 'next/script';
import { faqJsonLd, orgAndProductJsonLd } from '@/seo/schema';

export default function Head() {
  return (
    <>
      <title>RankPilot – NeuroSEO™ Growth Platform</title>
      <meta name="description" content="Unified AI platform for technical SEO audits, content intelligence, competitor tracking, and growth automation." />
      <link rel="canonical" href="https://rankpilot-h3jpc.web.app/" />
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="RankPilot – NeuroSEO™ Growth Platform" />
      <meta property="og:description" content="Unified AI platform for technical SEO audits, content intelligence, competitor tracking, and growth automation." />
      <meta property="og:url" content="https://rankpilot-h3jpc.web.app/" />
      <meta property="og:image" content="https://rankpilot-h3jpc.web.app/og-image.png" />
      <meta property="og:site_name" content="RankPilot" />
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="RankPilot – NeuroSEO™ Growth Platform" />
      <meta name="twitter:description" content="Unified AI platform for technical SEO audits, content intelligence, competitor tracking, and growth automation." />
      <meta name="twitter:image" content="https://rankpilot-h3jpc.web.app/og-image.png" />
      <meta name="twitter:site" content="@rankpilot" />
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Script
        id="org-product-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgAndProductJsonLd) }}
      />
    </>
  );
}
