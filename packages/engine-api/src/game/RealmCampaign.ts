import type { TileRef } from "./GameMap";
import type { RealmModeId } from "./RealmModes";

/** Minimal live ownership view exposed by the OpenFront player model. */
export interface RealmTerritorySource {
  numTilesOwned(): number;
}

/** Minimal live player surface needed to adapt OpenFront territory ownership. */
export interface RealmPlayerTerritoryView {
  numTilesOwned(): number;
  tiles(): { has(tile: TileRef): boolean };
}

/** Ownership lookup needed when placing or producing map structures. */
export interface RealmBuildTerritorySource {
  ownsTile(tile: TileRef): boolean;
}

/**
 * Adapts an actual OpenFront Player to the campaign's read-only territory API.
 * Player.tiles() is the authoritative ownership set maintained by the engine.
 */
export function createRealmTerritoryAccess(
  player: RealmPlayerTerritoryView,
): RealmTerritorySource & RealmBuildTerritorySource {
  return {
    numTilesOwned: () => player.numTilesOwned(),
    ownsTile: (tile) => player.tiles().has(tile),
  };
}

export type RealmResource =
  | "food"
  | "wood"
  | "stone"
  | "iron"
  | "gold"
  | "qi"
  | "spiritHerbs"
  | "mana";

export interface RealmResourceStock {
  food: number;
  wood: number;
  stone: number;
  iron: number;
  gold: number;
  qi: number;
  spiritHerbs: number;
  mana: number;
}

export interface RealmPopulation {
  total: number;
  employed: number;
  unemployed: number;
  soldiers: number;
  monthlyGrowth: number;
}

export interface RealmDomesticPolicy {
  taxRate: number;
  foodRation: number;
  conscriptionRate: number;
  publicWorks: number;
}

export interface RealmStabilityInputs {
  satisfaction: number;
  foodCoverage: number;
  taxRate: number;
  warExhaustion: number;
  unemploymentRate: number;
  legitimacy: number;
}

export interface RealmStability {
  score: number;
  revoltRisk: number;
  causes: string[];
}

export type RealmEventKind =
  | "spirit-herb-discovery"
  | "cultivation-breakthrough"
  | "sect-dispute"
  | "monster-migration"
  | "arcane-anomaly"
  | "food-shortage"
  | "popular-unrest"
  | "frontier-discovery";

export interface RealmEvent {
  id: string;
  kind: RealmEventKind;
  title: string;
  description: string;
  /** The cause is retained so the player can understand and address the event. */
  cause: string;
  /** Stable identifiers for available responses; interpreted by the campaign layer. */
  choices: readonly string[];
  createdAtTurn: number;
}

export interface RealmFaction {
  id: string;
  name: string;
  influence: number;
  loyalty: number;
  /** Optional relationship to a player-controlled or AI-controlled territory owner. */
  leaderId?: string;
}

export type RealmBuildingType =
  | "farm"
  | "lumberMill"
  | "quarry"
  | "ironMine"
  | "spiritGarden"
  | "manaSanctum";

export interface RealmBuilding {
  id: string;
  type: RealmBuildingType;
  level: number;
  /** OpenFront map tile occupied by this structure; absent only on legacy records. */
  tileRef?: TileRef;
}

export interface RealmCampaignState {
  mode: RealmModeId;
  /** Last synchronized count of tiles owned in the real OpenFront map. */
  territoryTiles: number;
  buildings: RealmBuilding[];
  turn: number;
  resources: RealmResourceStock;
  population: RealmPopulation;
  policy: RealmDomesticPolicy;
  satisfaction: number;
  legitimacy: number;
  warExhaustion: number;
  stability: RealmStability;
  factions: RealmFaction[];
  activeEvents: RealmEvent[];
}

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/**
 * Computes a transparent stability estimate from actionable domestic causes.
 * All inputs are normalized to 0..1; taxRate is the share of income collected.
 */
export function calculateRealmStability(
  input: RealmStabilityInputs,
): RealmStability {
  const satisfaction = clamp01(input.satisfaction);
  const foodCoverage = clamp01(input.foodCoverage);
  const taxRate = clamp01(input.taxRate);
  const warExhaustion = clamp01(input.warExhaustion);
  const unemploymentRate = clamp01(input.unemploymentRate);
  const legitimacy = clamp01(input.legitimacy);

  const causes: string[] = [];
  if (foodCoverage < 0.8) causes.push("food-shortage");
  if (taxRate > 0.45) causes.push("excessive-taxation");
  if (warExhaustion > 0.6) causes.push("war-exhaustion");
  if (unemploymentRate > 0.2) causes.push("unemployment");
  if (satisfaction < 0.45) causes.push("low-satisfaction");
  if (legitimacy < 0.35) causes.push("weak-legitimacy");

  const score = Math.round(
    100 *
      clamp01(
        0.3 * satisfaction +
          0.2 * foodCoverage +
          0.15 * (1 - taxRate) +
          0.15 * (1 - warExhaustion) +
          0.1 * (1 - unemploymentRate) +
          0.1 * legitimacy,
      ),
  );
  const revoltRisk = Math.round(
    100 *
      clamp01(
        0.55 * (1 - score / 100) +
          0.25 * Math.max(0, 0.8 - foodCoverage) +
          0.2 * Math.max(0, taxRate - 0.35),
      ),
  );

  return { score, revoltRisk, causes };
}

export function createRealmCampaignState(
  mode: RealmModeId,
): RealmCampaignState {
  const stability = calculateRealmStability({
    satisfaction: 0.75,
    foodCoverage: 1,
    taxRate: 0.2,
    warExhaustion: 0,
    unemploymentRate: 0.05,
    legitimacy: 0.7,
  });

  return {
    mode,
    territoryTiles: 0,
    buildings: [],
    turn: 0,
    resources: {
      food: 100,
      wood: 50,
      stone: 30,
      iron: 20,
      gold: 100,
      qi: mode === "murim" ? 10 : 0,
      spiritHerbs: 0,
      mana: mode === "fantasy" ? 10 : 0,
    },
    population: {
      total: 1000,
      employed: 650,
      unemployed: 100,
      soldiers: 250,
      monthlyGrowth: 0.01,
    },
    policy: {
      taxRate: 0.2,
      foodRation: 1,
      conscriptionRate: 0.1,
      publicWorks: 0,
    },
    satisfaction: 0.75,
    legitimacy: 0.7,
    warExhaustion: 0,
    stability,
    factions: [],
    activeEvents: [],
  };
}

export interface RealmTurnReport {
  turn: number;
  foodConsumed: number;
  foodCoverage: number;
  taxIncome: number;
  populationChange: number;
  stability: RealmStability;
}

/**
 * Advances one abstract domestic-management turn.
 * Rates are normalized to 0..1; one turn represents one campaign month.
 * This is a standalone campaign simulation layer and is not yet wired to the
 * real-time OpenFront tick or territory production.
 */
export function advanceRealmCampaignTurn(
  state: RealmCampaignState,
  territory?: RealmBuildTerritorySource,
): {
  state: RealmCampaignState;
  report: RealmTurnReport;
} {
  const next: RealmCampaignState = {
    ...state,
    resources: { ...state.resources },
    population: { ...state.population },
    policy: { ...state.policy },
    factions: state.factions.map((faction) => ({ ...faction })),
    activeEvents: [...state.activeEvents],
  };

  const population = Math.max(0, next.population.total);
  const ration = Math.max(0, Math.min(2, next.policy.foodRation));
  const foodConsumed = Math.ceil((population / 100) * 0.8 * ration);
  const availableFood = Math.max(0, next.resources.food);
  const foodCoverage =
    foodConsumed === 0 ? 1 : Math.min(1, availableFood / foodConsumed);
  const actualFoodConsumed = Math.min(availableFood, foodConsumed);
  next.resources.food = Math.max(0, availableFood - actualFoodConsumed);

  // Map-backed structures must be checked against live ownership every turn.
  // Without a live territory source, only legacy location-free structures are
  // eligible; map-backed structures never produce from stale ownership data.
  const production =
    territory === undefined
      ? produceRealmResources(
          next.buildings.filter((building) => building.tileRef === undefined),
          next.mode,
        )
      : produceRealmResourcesOnOwnedTiles(
          next.buildings,
          next.mode,
          territory,
        );
  for (const [resource, amount] of Object.entries(production) as [
    keyof RealmResourceStock,
    number,
  ][]) {
    next.resources[resource] += amount;
  }

  const taxRate = clamp01(next.policy.taxRate);
  const taxIncome = Math.floor(
    Math.max(0, next.population.employed) * 0.02 * taxRate,
  );
  next.resources.gold += taxIncome;

  const unemploymentRate =
    population === 0 ? 0 : clamp01(next.population.unemployed / population);
  const foodPenalty = foodCoverage < 1 ? (1 - foodCoverage) * 0.2 : 0;
  const taxPenalty = Math.max(0, taxRate - 0.25) * 0.12;
  const satisfaction = clamp01(
    next.satisfaction + 0.015 - foodPenalty - taxPenalty,
  );
  const populationChange =
    foodCoverage < 0.5
      ? -Math.ceil(population * 0.005)
      : Math.floor(population * Math.max(0, next.population.monthlyGrowth));
  next.population.total = Math.max(0, population + populationChange);

  const stability = calculateRealmStability({
    satisfaction,
    foodCoverage,
    taxRate,
    warExhaustion: next.warExhaustion,
    unemploymentRate,
    legitimacy: next.legitimacy,
  });
  next.satisfaction = satisfaction;
  next.stability = stability;
  next.turn += 1;

  return {
    state: next,
    report: {
      turn: next.turn,
      foodConsumed: actualFoodConsumed,
      foodCoverage,
      taxIncome,
      populationChange,
      stability,
    },
  };
}

/**
 * Synchronize campaign territory with the live OpenFront player model.
 * This deliberately reads the engine-owned tile count instead of maintaining
 * a second, approximate territory grid inside the campaign simulation.
 */
export function syncRealmTerritory(
  state: RealmCampaignState,
  player: RealmTerritorySource,
): RealmCampaignState {
  return {
    ...state,
    territoryTiles: Math.max(0, Math.floor(player.numTilesOwned())),
  };
}

/** Apply a domestic policy change without mutating the original campaign. */
export function updateRealmDomesticPolicy(
  state: RealmCampaignState,
  policy: Partial<RealmDomesticPolicy>,
): RealmCampaignState {
  return {
    ...state,
    policy: {
      taxRate:
        policy.taxRate === undefined
          ? state.policy.taxRate
          : clamp01(policy.taxRate),
      foodRation:
        policy.foodRation === undefined
          ? state.policy.foodRation
          : Math.max(0, Math.min(2, policy.foodRation)),
      conscriptionRate:
        policy.conscriptionRate === undefined
          ? state.policy.conscriptionRate
          : clamp01(policy.conscriptionRate),
      publicWorks:
        policy.publicWorks === undefined
          ? state.policy.publicWorks
          : Math.max(0, Math.min(1, policy.publicWorks)),
    },
  };
}

export interface RealmBuildingCost {
  food: number;
  wood: number;
  stone: number;
  iron: number;
  gold: number;
}

const REALM_BUILDING_RULES: Record<
  RealmBuildingType,
  {
    cost: RealmBuildingCost;
    produces: Partial<RealmResourceStock>;
    modes: RealmModeId[];
  }
> = {
  farm: {
    cost: { food: 0, wood: 15, stone: 5, iron: 0, gold: 10 },
    produces: { food: 30 },
    modes: ["classic", "murim", "fantasy"],
  },
  lumberMill: {
    cost: { food: 0, wood: 10, stone: 5, iron: 0, gold: 15 },
    produces: { wood: 18 },
    modes: ["classic", "murim", "fantasy"],
  },
  quarry: {
    cost: { food: 0, wood: 10, stone: 10, iron: 0, gold: 20 },
    produces: { stone: 12 },
    modes: ["classic", "murim", "fantasy"],
  },
  ironMine: {
    cost: { food: 0, wood: 15, stone: 10, iron: 0, gold: 25 },
    produces: { iron: 8 },
    modes: ["classic", "murim", "fantasy"],
  },
  spiritGarden: {
    cost: { food: 0, wood: 20, stone: 10, iron: 5, gold: 30 },
    produces: { qi: 5, spiritHerbs: 2 },
    modes: ["murim"],
  },
  manaSanctum: {
    cost: { food: 0, wood: 20, stone: 15, iron: 5, gold: 35 },
    produces: { mana: 6 },
    modes: ["fantasy"],
  },
};

export function getRealmBuildingCost(
  type: RealmBuildingType,
): RealmBuildingCost {
  return { ...REALM_BUILDING_RULES[type].cost };
}

/** Build one economic structure if its mode and resource costs permit it. */
export function buildRealmStructure(
  state: RealmCampaignState,
  type: RealmBuildingType,
): RealmCampaignState | null {
  const rule = REALM_BUILDING_RULES[type];
  if (!rule.modes.includes(state.mode)) return null;
  const cost = rule.cost;
  if (
    state.resources.food < cost.food ||
    state.resources.wood < cost.wood ||
    state.resources.stone < cost.stone ||
    state.resources.iron < cost.iron ||
    state.resources.gold < cost.gold
  ) {
    return null;
  }
  const nextId = `${type}-${state.turn}-${state.buildings.length + 1}`;
  return {
    ...state,
    resources: {
      ...state.resources,
      food: state.resources.food - cost.food,
      wood: state.resources.wood - cost.wood,
      stone: state.resources.stone - cost.stone,
      iron: state.resources.iron - cost.iron,
      gold: state.resources.gold - cost.gold,
    },
    buildings: [...state.buildings, { id: nextId, type, level: 1 }],
  };
}

/**
 * Build a structure on a specific OpenFront tile.
 * The tile must still belong to the player and may host only one structure.
 */
export function buildRealmStructureAt(
  state: RealmCampaignState,
  type: RealmBuildingType,
  tile: TileRef,
  territory: RealmBuildTerritorySource,
): RealmCampaignState | null {
  if (!territory.ownsTile(tile)) return null;
  if (state.buildings.some((building) => building.tileRef === tile)) {
    return null;
  }

  const built = buildRealmStructure(state, type);
  if (built === null) return null;

  const building = built.buildings[built.buildings.length - 1];
  return {
    ...built,
    buildings: [
      ...built.buildings.slice(0, -1),
      { ...building, tileRef: tile },
    ],
  };
}

/**
 * Upgrade an existing structure. Each level costs more than the previous one;
 * level 10 is the campaign cap. The input state is never mutated.
 */
export function upgradeRealmStructure(
  state: RealmCampaignState,
  buildingId: string,
): RealmCampaignState | null {
  const index = state.buildings.findIndex(
    (building) => building.id === buildingId,
  );
  if (index < 0) return null;
  const building = state.buildings[index];
  const rule = REALM_BUILDING_RULES[building.type];
  if (!rule.modes.includes(state.mode) || building.level >= 10) return null;

  const nextLevel = building.level + 1;
  const multiplier = building.level;
  const cost: RealmBuildingCost = {
    food: rule.cost.food * multiplier,
    wood: rule.cost.wood * multiplier,
    stone: rule.cost.stone * multiplier,
    iron: rule.cost.iron * multiplier,
    gold: rule.cost.gold * multiplier,
  };
  if (
    state.resources.food < cost.food ||
    state.resources.wood < cost.wood ||
    state.resources.stone < cost.stone ||
    state.resources.iron < cost.iron ||
    state.resources.gold < cost.gold
  ) {
    return null;
  }

  const buildings = state.buildings.map((item, itemIndex) =>
    itemIndex === index ? { ...item, level: nextLevel } : item,
  );
  return {
    ...state,
    resources: {
      ...state.resources,
      food: state.resources.food - cost.food,
      wood: state.resources.wood - cost.wood,
      stone: state.resources.stone - cost.stone,
      iron: state.resources.iron - cost.iron,
      gold: state.resources.gold - cost.gold,
    },
    buildings,
  };
}

/** Adds deterministic per-turn output from owned campaign structures. */
export function produceRealmResources(
  buildings: readonly RealmBuilding[],
  mode: RealmModeId,
): Partial<RealmResourceStock> {
  const output: Partial<RealmResourceStock> = {};
  for (const building of buildings) {
    const rule = REALM_BUILDING_RULES[building.type];
    if (!rule.modes.includes(mode)) continue;
    const multiplier = Math.max(1, Math.min(10, Math.floor(building.level)));
    for (const [resource, amount] of Object.entries(rule.produces) as [
      keyof RealmResourceStock,
      number,
    ][]) {
      output[resource] = (output[resource] ?? 0) + amount * multiplier;
    }
  }
  return output;
}

/**
 * Produces only from structures whose map tiles are still owned by the player.
 * Captured or lost structures stop contributing immediately.
 */
export function produceRealmResourcesOnOwnedTiles(
  buildings: readonly RealmBuilding[],
  mode: RealmModeId,
  territory: RealmBuildTerritorySource,
): Partial<RealmResourceStock> {
  return produceRealmResources(
    buildings.filter(
      (building) =>
        building.tileRef !== undefined && territory.ownsTile(building.tileRef),
    ),
    mode,
  );
}
