import { describe, expect, it } from "vitest";
import { kickoffCountdown, virtualOddLabel } from "../lib/virtual-soccer";

describe("virtual soccer display rules", () => {
  it("counts down to the actual feed kickoff rather than a fixed five-minute loop", () => {
    expect(kickoffCountdown("2026-11-06T16:10:00+03:00", Date.parse("2026-11-06T13:06:43Z"))).toBe("03:17");
    expect(kickoffCountdown("2026-11-06T16:10:00+03:00", Date.parse("2026-11-06T13:10:01Z"))).toBe("00:00");
  });
  it("labels outcome 28 as any other result despite the feed's duplicated score name", () => {
    expect(virtualOddLabel({ id: 28, odds_name: "2:0", odds_val: 4.35 })).toBe("Any other result");
    expect(virtualOddLabel({ id: 20, odds_name: "2:0", odds_val: 10 })).toBe("2:0");
  });
});