const { strict: assert } = require("assert");

describe("allowFinanceMocks()", () => {
  const MODULE = "../../..//src/lib/flags/finance.ts";

  function fresh() {
    delete require.cache[require.resolve(MODULE)];
    return require(MODULE);
  }

  it("enables in dev by default when env unset", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
    delete process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
    process.env.NODE_ENV = "development";
    const { allowFinanceMocks } = fresh();
    assert.equal(allowFinanceMocks(), true);
    process.env.NODE_ENV = prevEnv;
    if (prevFlag !== undefined)
      process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS = prevFlag;
    else delete process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
  });

  it("disables in production by default", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
    delete process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
    process.env.NODE_ENV = "production";
    const { allowFinanceMocks } = fresh();
    assert.equal(allowFinanceMocks(), false);
    process.env.NODE_ENV = prevEnv;
    if (prevFlag !== undefined)
      process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS = prevFlag;
    else delete process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
  });

  it("respects explicit env true/false", () => {
    const prev = process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
    process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS = "true";
    const { allowFinanceMocks: aTrue } = fresh();
    assert.equal(aTrue(), true);
    process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS = "false";
    const { allowFinanceMocks: aFalse } = fresh();
    assert.equal(aFalse(), false);
    if (prev !== undefined) process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS = prev;
    else delete process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
  });
});
