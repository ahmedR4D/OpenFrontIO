import {
  calculateRealmStability,
  createRealmCampaignState,
  syncRealmTerritory,
} from "@openfront/engine-api/game/RealmCampaign";
import { describe, expect, it } from "vitest";

describe("realm campaign foundations", () => {
  it("initializes Murim and Fantasy with their distinct special resource", () => {
    expect(createRealmCampaignState("murim").resources.qi).toBeGreaterThan(0);
    expect(createRealmCampaignState("murim").resources.mana).toBe(0);
    expect(createRealmCampaignState("fantasy").resources.mana).toBeGreaterThan(
      0,
    );
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

describe("realm campaign turn simulation", () => {
  it("consumes food, collects taxes, grows population, and advances one month", async () => {
    const { advanceRealmCampaignTurn } =
      await import("@openfront/engine-api/game/RealmCampaign");
    const initial = createRealmCampaignState("classic");
    const { state, report } = advanceRealmCampaignTurn(initial);

    expect(state.turn).toBe(1);
    expect(state.resources.food).toBeLessThan(initial.resources.food);
    expect(state.resources.gold).toBeGreaterThan(initial.resources.gold);
    expect(state.population.total).toBeGreaterThan(initial.population.total);
    expect(report.foodCoverage).toBe(1);
    expect(initial.turn).toBe(0);
  });

  it("causes shortages and population decline when food stores are empty", async () => {
    const { advanceRealmCampaignTurn } =
      await import("@openfront/engine-api/game/RealmCampaign");
    const initial = createRealmCampaignState("classic");
    initial.resources.food = 0;
    const { state, report } = advanceRealmCampaignTurn(initial);

    expect(report.foodCoverage).toBe(0);
    expect(state.population.total).toBeLessThan(initial.population.total);
    expect(state.stability.causes).toContain("food-shortage");
  });

  it("clamps domestic policy inputs and preserves the original state", async () => {
    const { updateRealmDomesticPolicy } =
      await import("@openfront/engine-api/game/RealmCampaign");
    const initial = createRealmCampaignState("murim");
    const updated = updateRealmDomesticPolicy(initial, {
      taxRate: 5,
      foodRation: -1,
      conscriptionRate: 0.4,
    });

    expect(updated.policy.taxRate).toBe(1);
    expect(updated.policy.foodRation).toBe(0);
    expect(updated.policy.conscriptionRate).toBe(0.4);
    expect(initial.policy.taxRate).toBe(0.2);
  });
});

describe("realm structure upgrades", () => {
  it("increases a building level and scales its production", async () => {
    const {
      advanceRealmCampaignTurn,
      buildRealmStructure,
      upgradeRealmStructure,
    } = await import("@openfront/engine-api/game/RealmCampaign");
    const initial = createRealmCampaignState("classic");
    const built = buildRealmStructure(initial, "farm")!;
    const upgraded = upgradeRealmStructure(built, built.buildings[0].id)!;

    expect(upgraded.buildings[0].level).toBe(2);
    expect(upgraded.resources.wood).toBe(built.resources.wood - 15);
    expect(initial.buildings).toHaveLength(0);

    const oneLevel = advanceRealmCampaignTurn(built).state.resources.food;
    const twoLevels = advanceRealmCampaignTurn(upgraded).state.resources.food;
    expect(twoLevels - oneLevel).toBe(30);
  });

  it("rejects missing, capped, or unaffordable upgrades without mutation", async () => {
    const { buildRealmStructure, upgradeRealmStructure } =
      await import("@openfront/engine-api/game/RealmCampaign");
    const initial = createRealmCampaignState("classic");
    expect(upgradeRealmStructure(initial, "missing")).toBeNull();

    const built = buildRealmStructure(initial, "farm")!;
    const poor = { ...built, resources: { ...built.resources, wood: 0 } };
    expect(upgradeRealmStructure(poor, built.buildings[0].id)).toBeNull();

    const capped = {
      ...built,
      buildings: [{ ...built.buildings[0], level: 10 }],
    };
    expect(upgradeRealmStructure(capped, built.buildings[0].id)).toBeNull();
    expect(built.buildings[0].level).toBe(1);
  });

  it("does not allow upgrading a structure that is invalid for the selected realm", async () => {
    const { upgradeRealmStructure } =
      await import("@openfront/engine-api/game/RealmCampaign");
    const state = createRealmCampaignState("classic");
    state.buildings = [{ id: "mana-1", type: "manaSanctum", level: 1 }];
    expect(upgradeRealmStructure(state, "mana-1")).toBeNull();
  });
});

describe("realm territory synchronization", () => {
  it("uses the live OpenFront player ownership count without mutating the campaign", () => {
    const initial = createRealmCampaignState("classic");
    const player = { numTilesOwned: () => 37 };
    const synchronized = syncRealmTerritory(initial, player);

    expect(synchronized.territoryTiles).toBe(37);
    expect(initial.territoryTiles).toBe(0);
  });

  it("normalizes invalid ownership counts to a non-negative integer", () => {
    const initial = createRealmCampaignState("classic");
    expect(syncRealmTerritory(initial, { numTilesOwned: () => -4.8 }).territoryTiles).toBe(0);
    expect(syncRealmTerritory(initial, { numTilesOwned: () => 12.9 }).territoryTiles).toBe(12);
  });
});
