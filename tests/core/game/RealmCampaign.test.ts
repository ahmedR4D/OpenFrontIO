import {
  calculateRealmStability,
  createRealmCampaignState,
} from "@openfront/engine-api/game/RealmCampaign";
import { describe, expect, it } from "vitest";

describe("realm campaign foundations", () => {
  it("initializes Murim and Fantasy with their distinct special resource", () => {
    expect(createRealmCampaignState("murim").resources.qi).toBeGreaterThan(0);
    expect(createRealmCampaignState("murim").resources.mana).toBe(0);
    expect(createRealmCampaignState("fantasy").resources.mana).toBeGreaterThan(0);
    expect(createRealmCampaignState("fantasy").resources.qi).toBe(0);
  });

  it("starts with a stable population and no revolt causes", () => {
    const state = createRealmCampaignState("classic");
    expect(state.stability.score).toBeGreaterThan(60);
    expect(state.stability.causes).toEqual([]);
  });

  it("reports actionable reasons when stability collapses", () => {
    const stability = calculateRealmStability({
      satisfaction: 0.1,
      foodCoverage: 0.2,
      taxRate: 0.8,
      warExhaustion: 0.9,
      unemploymentRate: 0.5,
      legitimacy: 0.1,
    });
    expect(stability.score).toBeLessThan(30);
    expect(stability.revoltRisk).toBeGreaterThan(60);
    expect(stability.causes).toEqual(
      expect.arrayContaining([
        "food-shortage",
        "excessive-taxation",
        "war-exhaustion",
        "unemployment",
        "low-satisfaction",
        "weak-legitimacy",
      ]),
    );
  });
});
