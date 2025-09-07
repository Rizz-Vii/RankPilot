const { expect } = require("chai");
require("ts-node").register({ transpileOnly: true });
const { colors } = require("../../../src/lib/design-system/colors");
const { typography } = require("../../../src/lib/design-system/typography");
const {
  sidebarStyles,
} = require("../../../src/lib/design-system/sidebar-styles");

// Regex for disallowed raw palette classes
const paletteRegex =
  /(red|green|blue|amber|yellow|purple|orange|emerald|rose|pink|indigo|sky|violet)-(50|100|200|300|400|500|600|700|800|900)/;

function scan(obj, path, hits) {
  if (typeof obj === "string") {
    if (paletteRegex.test(obj)) hits.push(`${path}: ${obj}`);
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => scan(v, `${path}[${i}]`, hits));
  } else if (obj && typeof obj === "object") {
    Object.entries(obj).forEach(([k, v]) => scan(v, `${path}.${k}`, hits));
  }
}

describe("Design System semantic color compliance", () => {
  it("exports contain no raw palette utility classes", () => {
    const hits = [];
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
