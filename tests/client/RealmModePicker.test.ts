import { GameMapType } from "@openfront/engine-api/game/Maps.gen";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/client/Cosmetics", () => ({
  getPlayerCosmetics: vi.fn(async () => ({})),
  prewarmCosmetics: vi.fn(async () => {}),
}));
vi.mock("../../src/client/CrazyGamesSDK", () => ({
  crazyGamesSDK: {
    isOnCrazyGames: vi.fn(() => false),
    requestMidgameAd: vi.fn(async () => {}),
  },
}));
vi.mock("../../src/client/TerrainMapFileLoader", () => ({
  terrainMapFileLoader: { getMapData: vi.fn() },
}));

import "../../src/client/SinglePlayerModal";

describe("single-player campaign world picker", () => {
  it("defaults to Classic on the original World4000 map", () => {
    const modal = document.createElement("single-player-modal") as any;
    expect(modal.selectedRealmMode).toBe("classic");
    expect(modal.selectedMap).toBe(GameMapType.World4000);
  });

  it("keeps unregistered generated worlds unavailable", () => {
    const modal = document.createElement("single-player-modal") as any;
    modal.handleRealmModeSelection("murim");
    expect(modal.selectedRealmMode).toBe("classic");
    expect(modal.selectedMap).toBe(GameMapType.World4000);
    modal.handleRealmModeSelection("fantasy");
    expect(modal.selectedRealmMode).toBe("classic");
    expect(modal.selectedMap).toBe(GameMapType.World4000);
  });

  it("selects Classic and restores World4000 after a map change", () => {
    const modal = document.createElement("single-player-modal") as any;
    modal.selectedMap = GameMapType.Africa;
    modal.handleRealmModeSelection("classic");
    expect(modal.selectedRealmMode).toBe("classic");
    expect(modal.selectedMap).toBe(GameMapType.World4000);
  });
});
