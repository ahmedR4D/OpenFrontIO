import {
  getRealmDifficulty,
  getRealmMode,
  REALM_DIFFICULTIES,
  REALM_MODES,
} from "@openfront/engine-api/game/RealmModes";
import { GameMapType } from "@openfront/engine-api/game/Maps.gen";
import { describe, expect, it } from "vitest";

describe("realm mode definitions", () => {
  it("keeps Classic on the original World 4000 map", () => {
    expect(getRealmMode("classic").map).toEqual({
      kind: "stock",
      map: GameMapType.World4000,
    });
  });

  it("reserves independent generated worlds for Murim and Fantasy", () => {
    expect(getRealmMode("murim").map).toEqual({
      kind: "generated",
      worldId: "murim-world",
    });
    expect(getRealmMode("fantasy").map).toEqual({
      kind: "generated",
      worldId: "fantasy-world",
    });
  });

  it("defines the requested player-to-bot power ratios", () => {
    expect(REALM_DIFFICULTIES.easy.playerToBotPowerRatio).toBe(3);
    expect(REALM_DIFFICULTIES.normal.playerToBotPowerRatio).toBe(1.5);
    expect(REALM_DIFFICULTIES.hard.playerToBotPowerRatio).toBe(1);
    expect(REALM_DIFFICULTIES.expert.playerToBotPowerRatio).toBeCloseTo(2 / 3);
    expect(REALM_DIFFICULTIES.impossible.playerToBotPowerRatio).toBe(0.5);
  });

  it("has unique mode and difficulty IDs", () => {
    expect(Object.keys(REALM_MODES)).toEqual(["classic", "murim", "fantasy"]);
    expect(getRealmDifficulty("impossible").botIntelligence).toBeGreaterThan(
      getRealmDifficulty("expert").botIntelligence,
    );
  });
});
