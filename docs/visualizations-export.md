# Visualizations Export (Client → API)

Client flow to export charts/dashboards and persist artifacts to Storage via the `visualizations` API.

## Chart export (client)

Use the D3 engine to generate a data URL artifact (PNG/SVG/PDF/JSON) and POST it to the API.

```ts
import { exportChartClient } from '@/lib/visualizations/export-client';

await exportChartClient('chart_123', { format: 'png', title: 'My Chart' }, { openInNewTab: true });
```

Returns `{ exportUrl }` which is a 24h signed URL.

## Dashboard export (client)

```ts
import { exportDashboardClient } from '@/lib/visualizations/export-client';

await exportDashboardClient('dashboard_123', 'pdf', { title: 'My Dashboard' }, { openInNewTab: true });
```

To supply a pre-rendered artifact (e.g., combined PNG or PDF), pass `options.artifact` as a data URL or base64.

## API contract

POST /api/visualizations

Body for chart export:

- action: "export_chart"
- data: { chartId, format, config, artifact }

Body for dashboard export:

- action: "export_dashboard"
- data: { dashboardId, format, config, artifact? }

Both return: `{ success: true, exportUrl }`
