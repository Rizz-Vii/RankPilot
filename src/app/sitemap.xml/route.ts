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

export async function GET() {
  const publicPaths = [
    "/",
    "/features",
    "/pricing",
    "/seo-audit",
    "/keyword-tool",
    "/content-analyzer",
    "/competitors",
    "/serp-view",
    "/link-view",
    "/content-brief",
    "/finance/accounting",
    "/neuroseo",
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

  const body = generateSiteMap(publicPaths);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-control": "public, s-maxage=86400, stale-while-revalidate",
    },
  });
}
