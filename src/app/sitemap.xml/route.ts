// src/app/sitemap.xml/route.ts

// IMPORTANT: Replace this with your actual production domain
const URL = "https://rankpilot.ai"; // Use your production domain

function generateSiteMap(paths: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     ${paths
      .map((path) => {
        return `
           <url>
               <loc>${`${URL}${path}`}</loc>
               <lastmod>${new Date().toISOString()}</lastmod>
               <changefreq>weekly</changefreq>
               <priority>0.8</priority>
           </url>
         `;
      })
      .join("")}
   </urlset>
 `;
}

export const dynamic = 'force-static';
export const revalidate = 86400; // 24h

export async function GET() {
  const publicPaths = [
    "/",
    "/features",
    "/pricing",
    // Public marketing pages only; app pages require auth and are excluded
    "/privacy",
    "/guides/broken-links",
    "/guides/xml-sitemap",
    "/guides/web-scraping",
    "/guides/learn-seo",
    "/blog/enterprise-seo-audit",
    "/blog/ai-seo-tools",
    "/blog/seo-metrics",
    "/blog/competitor-analysis",
  ];

  try {
    const body = generateSiteMap(publicPaths);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-control": "public, s-maxage=86400, stale-while-revalidate",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`<!-- sitemap error: ${msg} -->`, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  }
}
