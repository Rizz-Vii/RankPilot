import { expect } from "chai";
import { colors } from "../../../src/lib/design-system/colors";
import { sidebarStyles } from "../../../src/lib/design-system/sidebar-styles";
import { typography } from "../../../src/lib/design-system/typography";

// Simple guard to ensure no raw tailwind palette classes remain in core design-system exports
// (blue-500, green-600, red-500, amber-*, purple-500 etc.)
const paletteRegex =
  /(red|green|blue|amber|yellow|purple|orange|emerald|rose|pink|indigo|sky|violet)-(50|100|200|300|400|500|600|700|800|900)/;

function scan(obj: unknown, path: string, hits: string[]) {
  if (typeof obj === "string") {
    if (paletteRegex.test(obj)) hits.push(`${path}: ${obj}`);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => scan(v, `${path}[${i}]`, hits));
    return;
  }
  if (obj && typeof obj === "object") {
    Object.entries(obj as Record<string, unknown>).forEach(([k, v]) =>
      scan(v, `${path}.${k}`, hits)
    );
  }
}

describe("Design System semantic color compliance", () => {
  it("exports contain no raw palette utility classes", () => {
    const hits: string[] = [];
    scan(colors, "colors", hits);
    scan(typography, "typography", hits);
    scan(sidebarStyles, "sidebarStyles", hits);
    if (hits.length) {
      console.error(
        "Found raw palette classes in design-system exports:",
        hits
      );
    }
    expect(
      hits,
      "No raw palette classes should remain in design-system exports"
    ).to.have.length(0);
  });
});
