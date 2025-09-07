# Visualizations exports guide

Two export paths exist, optimized for where the code runs.

## Client-side exports (browser)

Use `d3VisualizationEngine` and `ChartExportManager` from `./chart-export-manager` in React components and pages.

For server-side exports in API routes, import from `./server-exports` (which uses `./server-artifacts` under the hood) to avoid pulling client-only code into the server bundle.

- Formats: PNG, SVG, JSON, PDF, Excel (xlsx)
- Uses browser APIs (DOM, Blob, URL, localStorage)
- Best for user-initiated downloads and preview UX

Example (component):

```ts
import { d3VisualizationEngine } from "@/lib/visualizations/d3-visualization-engine";
import { ChartExportManager } from "@/lib/visualizations/chart-export-manager";

// Render chart
d3VisualizationEngine.createBarChart("container-id", config);

// Export SVG/PNG/PDF/Excel on the client
const mgr = new ChartExportManager();
const url = await mgr.exportChart("chart-id", {
  format: "pdf",
  title: "Report",
} as any);
```

Notes

- Client code expects `window` and may touch `localStorage` for history. This repo guards storage access; if you copy logic elsewhere, guard with `typeof window !== 'undefined'`.

## Server-side exports (Node / API routes)

Use helpers from `./server-exports` inside API routes, Cloud Functions, or other server contexts.

Exports

- `generateChartExport(chartData, format, config)` → signed URL (via Firebase Storage)
- `generateDashboardExport(dashboardData, format, config)` → signed URL
- `persistExportArtifact({ userId, kind, id, format, artifact, metadata })` → signed URL (save client-provided data URL/base64)
- `persistBufferToStorage({ userId, kind, id, ext, contentType, buffer, metadata })` → signed URL

These helpers:

- Produce Node Buffers with `generateServerArtifact` and upload to Firebase Storage
- Require Firebase Admin `adminStorage` to be initialized
- Are safe for Next.js App Router API routes (runtime: Node.js)

Example (API route snippet):

```ts
import {
  generateChartExport,
  persistExportArtifact,
} from "@/lib/visualizations/server-exports";

const exportUrl = artifact
  ? await persistExportArtifact({
      userId,
      kind: "chart",
      id: chartId,
      format,
      artifact,
      metadata: { chartType: cfg.type },
    })
  : await generateChartExport(
      { id: chartId, userId, config: cfg, data },
      format,
      { title: "My Chart" }
    );
```

### Quickstart (API Route)

```ts
// app/api/visualizations/export/route.ts
import { NextResponse } from "next/server";
import { generateChartExport } from "@/lib/visualizations/server-exports";
import { withProvenance } from "@/lib/middleware/provenance";

export async function POST(req: Request) {
  const { data, config, format, id, userId } = await req.json();
  const url = await generateChartExport({ id, userId, data, config }, format, {
    title: config?.title,
  });
  return NextResponse.json(withProvenance({ url }));
}
```

Security / provenance notes:

- Always validate `userId` against the session / auth context before generating or persisting exports.
- Wrap JSON responses with provenance helpers (`withProvenance` / `enforceProvenance`) for observability parity.
- Avoid sending raw base64 blobs back to the client—persist via `persistExportArtifact` and return a signed URL.

## Choosing the path

- User download or preview in UI → Client-side export
- Automated export, server-generated files, or persistence → Server-side helpers

## Provenance and API usage

- When returning JSON from API routes, wrap payloads with `enforceProvenance` and/or `withProvenance` as done in `src/app/api/visualizations/route.ts`.

## Troubleshooting

- "localStorage is not defined" → use server helpers (or guard client code with `typeof window !== 'undefined'`).
- Large images/PDFs → prefer server helpers to avoid memory spikes in the browser.
