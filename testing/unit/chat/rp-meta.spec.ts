import { expect } from "chai";
import { extractRpMeta } from "@/lib/chat/rpMeta";

describe("rp_meta parser", () => {
  it("extracts and cleans rp_meta", () => {
    const text =
      'Answer text here.\n<rp_meta>{"intent":"performance","actions":["Check LCP","Improve CLS"],"priority":2}</rp_meta>';
    const { cleaned, meta } = extractRpMeta(text);
    expect(cleaned).to.equal("Answer text here.");
    expect(meta?.intent).to.equal("performance");
    expect(meta?.actions).to.deep.equal(["Check LCP", "Improve CLS"]);
    expect(meta?.priority).to.equal(2);
  });

  it("returns original text when no meta", () => {
    const t = "Just text.";
    const { cleaned, meta } = extractRpMeta(t);
    expect(cleaned).to.equal("Just text.");
    expect(meta).to.be.undefined;
  });
});
