import { describe, expect, it } from "vitest";
import { MR_WHITE_VARIANTS, pickMrWhiteVariant } from "../../src/mrWhiteVariants";

describe("pickMrWhiteVariant", () => {
  it("returns the first variant when rng is 0", () => {
    expect(pickMrWhiteVariant(() => 0)).toEqual(MR_WHITE_VARIANTS[0]);
  });

  it("returns the last variant when rng is just below 1", () => {
    expect(pickMrWhiteVariant(() => 0.999999)).toEqual(MR_WHITE_VARIANTS[MR_WHITE_VARIANTS.length - 1]);
  });
});
