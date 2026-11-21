import { GameMapType } from "./Maps.gen";

/** The selectable campaign families layered over the OpenFront simulation. */
export type RealmModeId = "classic" | "murim" | "fantasy";

export type RealmMapSource =
  | { kind: "stock"; map: GameMapType }
  | { kind: "generated"; worldId: "murim-world" | "fantasy-world" };

export interface RealmModeDefinition {
  id: RealmModeId;
  title: string;
  description: string;
  map: RealmMapSource;
  systems: readonly string[];
}

export const REALM_MODES: Readonly<Record<RealmModeId, RealmModeDefinition>> = {
  classic: {
    id: "classic",
    title: "Classic",
    description: "OpenFront-style territorial strategy on the original World 4000 map.",
    map: { kind: "stock", map: GameMapType.World4000 },
    systems: ["territory", "combat", "naval-transport", "bots"],
  },
  murim: {
    id: "murim",
    title: "Murim",
    description: "A cultivation world of qi, sects, spirit herbs, breakthroughs, and rival schools.",
    map: { kind: "generated", worldId: "murim-world" },
    systems: [
      "territory",
      "combat",
      "naval-transport",
      "bots",
      "qi",
      "cultivation",
      "spirit-herbs",
      "sects",
      "enlightenment",
      "population",
      "realm-economy",
    ],
  },
  fantasy: {
    id: "fantasy",
    title: "Fantasy",
    description: "A world of kingdoms, magic, monsters, and competing powers.",
    map: { kind: "generated", worldId: "fantasy-world" },
    systems: [
      "territory",
      "combat",
      "naval-transport",
      "bots",
      "magic",
      "monsters",
      "kingdoms",
      "population",
      "realm-economy",
    ],
  },
} as const;

export type RealmDifficultyId = "easy" | "normal" | "hard" | "expert" | "impossible";

export interface RealmDifficultyProfile {
  id: RealmDifficultyId;
  /** Player starting/effective power divided by a bot's power. */
  playerToBotPowerRatio: number;
  /** Relative bot planning quality; higher values enable more strategic decisions. */
  botIntelligence: number;
}

export const REALM_DIFFICULTIES: Readonly<
  Record<RealmDifficultyId, RealmDifficultyProfile>
> = {
  easy: { id: "easy", playerToBotPowerRatio: 3, botIntelligence: 0.5 },
  normal: { id: "normal", playerToBotPowerRatio: 1.5, botIntelligence: 0.75 },
  hard: { id: "hard", playerToBotPowerRatio: 1, botIntelligence: 1 },
  expert: { id: "expert", playerToBotPowerRatio: 1 / 1.5, botIntelligence: 1.25 },
  impossible: { id: "impossible", playerToBotPowerRatio: 0.5, botIntelligence: 1.5 },
};

export function getRealmMode(id: RealmModeId): RealmModeDefinition {
  return REALM_MODES[id];
}

export function getRealmDifficulty(
  id: RealmDifficultyId,
): RealmDifficultyProfile {
  return REALM_DIFFICULTIES[id];
}
