// Centralized JSON-LD schema objects for public marketing pages.
// Separated from page module to avoid additional named exports on Next.js Page files.

export const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'Do I need a credit card to start?',
            acceptedAnswer: { '@type': 'Answer', text: 'No. Spin up a workspace free—upgrade only when you’re ready to unlock automation & advanced engines.' }
        },
        {
            '@type': 'Question',
            name: 'What search surfaces are supported?',
            acceptedAnswer: { '@type': 'Answer', text: 'Google core + SERP features today; Bing, AI overviews and additional generative surfaces in active development.' }
        },
        {
            '@type': 'Question',
            name: 'Can I cancel or downgrade?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. Self‑serve downgrade / cancellation at any time—no lock‑in, your data remains exportable.' }
        },
        {
            '@type': 'Question',
            name: 'How fast can we see impact?',
            acceptedAnswer: { '@type': 'Answer', text: 'Most teams surface high‑impact technical & content fixes inside the first 48 hours and deploy prioritized actions within the first week.' }
        }
    ]
};

export const orgAndProductJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            name: 'RankPilot',
            url: 'https://rankpilot-h3jpc.web.app/',
            logo: 'https://rankpilot-h3jpc.web.app/favicon-32x32.png',
            sameAs: [
                'https://twitter.com/rankpilot',
                'https://www.linkedin.com/company/rankpilot',
                'https://github.com/rankpilot'
            ]
        },
        {
            '@type': 'SoftwareApplication',
            name: 'RankPilot NeuroSEO Platform',
            operatingSystem: 'Web',
            applicationCategory: 'SEOApplication',
            offers: [
                { '@type': 'Offer', price: '19', priceCurrency: 'USD', name: 'Starter Plan', url: 'https://rankpilot-h3jpc.web.app/pricing?plan=starter' },
                { '@type': 'Offer', price: '49', priceCurrency: 'USD', name: 'Agency Plan', url: 'https://rankpilot-h3jpc.web.app/pricing?plan=agency' },
                { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Enterprise Plan', url: 'https://rankpilot-h3jpc.web.app/pricing?plan=enterprise', availability: 'https://schema.org/PreOrder' }
            ]
        }
    ]
};
