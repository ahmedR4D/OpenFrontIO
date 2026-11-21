import type { RealmModeId } from "./RealmModes";

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

export interface RealmCampaignState {
  mode: RealmModeId;
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
): { state: RealmCampaignState; report: RealmTurnReport } {
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

  const taxRate = clamp01(next.policy.taxRate);
  const taxIncome = Math.floor(
    Math.max(0, next.population.employed) * 0.02 * taxRate,
  );
  next.resources.gold += taxIncome;

  const unemploymentRate =
    population === 0
      ? 0
      : clamp01(next.population.unemployed / population);
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
