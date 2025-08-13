# SVG Export: Embedding Custom Fonts

To ensure your exported SVG renders with your custom fonts outside the app (email, browsers without your CSS), you can embed `@font-face` rules directly into the SVG.

## Client-side export options

When calling the D3 visualization engine export, pass one or both of these options:

- includeStyles: true — inline computed styles into the SVG elements.
- embedFonts: an array of font definitions to embed as `@font-face`.
- fontFacesCSS: raw CSS string(s) with your own `@font-face` rules.

Example:

```ts
import { d3VisualizationEngine } from '@/lib/visualizations/d3-visualization-engine';

const { exportUrl } = await d3VisualizationEngine.exportChart('chart-1', {
  format: 'svg',
  includeStyles: true,
  embedFonts: [{
    family: 'Inter',
    src: 'data:font/woff2;base64,AAEAAA...'; // Recommend WOFF2 data URLs
    format: 'woff2',
    weight: 400,
    style: 'normal',
    display: 'swap'
  }]
} as any);
```

Alternatively, provide raw CSS:

```ts
fontFacesCSS: [
  "@font-face { font-family: 'Inter'; src: url('data:font/woff2;base64,AAEAAA...') format('woff2'); font-display: swap; }"
]
```

Notes

- Prefer WOFF2 data URLs for compatibility and size.
- If you use multiple weights/styles, include multiple @font-face blocks.
- includeStyles is recommended so text elements inherit your font-family inlined onto nodes.
- Server-side PNG/PDF generation rasterizes from SVG; embedded fonts help produce consistent output.

