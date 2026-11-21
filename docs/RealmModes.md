# Realm modes foundation

This fork keeps OpenFront's deterministic tile simulation as the shared strategic
core. Realm modes select content and campaign systems; they do not replace the
terrain grid, tile ownership, front calculation, combat, or transport-ship rules.

## Modes

- **Classic** uses the stock `GameMapType.World4000` map and the original
  OpenFront-style territorial rules.
- **Murim** reserves a generated world for qi, cultivation, spirit herbs, sects,
  enlightenment, population, and a deeper realm economy.
- **Fantasy** reserves a generated world for magic, monsters, kingdoms,
  population, and a deeper realm economy.

The two generated-world IDs are content integration points, not existing map
assets. Their map manifests and binary terrain files still need to be authored
and registered before those modes can be launched.

## Difficulty contract

The player-to-bot power ratio is explicit and testable:

| Difficulty | Player / bot power |
| --- | ---: |
| Easy | 3.0 |
| Normal | 1.5 |
| Hard | 1.0 |
| Expert | 0.667 |
| Impossible | 0.5 |

Bot starting power must be rolled independently per bot within the selected
mode's configured bounds. Difficulty also controls planning quality; it must
not silently alter map terrain or tile ownership semantics.

## Implementation sequence

1. Preserve and expose the original OpenFront tile/map/spawn/combat/naval
   simulation for Classic.
2. Add a mode-aware campaign layer and wire mode selection into single-player
   game creation.
3. Implement a true tile-based free-placement spawn flow on the existing
   `GameMap`, followed by incremental tile ownership expansion.
4. Add Murim and Fantasy world manifests and binary terrain through the
   repository's Go map-generator pipeline. Do not approximate these with
   hexagons or country polygons.
5. Add campaign-only population, economy, stability, revolt, cultivation,
   magic, and event systems behind mode-specific interfaces.
6. Add AI strategy profiles and automated tests for every mode and difficulty.

## Licensing boundary

Keep the upstream AGPL-3.0 source notices intact. Open assets under
`/resources` are CC BY-SA 4.0 and require attribution. Do not copy or depend on
`/proprietary` or externally hosted proprietary assets as part of this fork.


## Runtime wiring status

The five campaign difficulty profiles in `RealmModes.ts` are currently
configuration metadata and are not yet mapped into OpenFront's live bot
spawning, troop, or AI decision systems. The upstream engine currently exposes
four built-in difficulty values, so the requested five-level campaign scale
needs an explicit end-to-end mapping before it can affect gameplay. Do not
present the ratios as active gameplay modifiers until that integration and its
simulation tests are complete.

## Current UI integration

The single-player setup now shows a campaign-world picker. Classic is the only
launchable choice and defaults to the stock `World4000` map. Murim and Fantasy
are deliberately disabled in the picker until their generated terrain assets
and map-generator registrations exist. Selecting a placeholder must never
silently start a different campaign.
