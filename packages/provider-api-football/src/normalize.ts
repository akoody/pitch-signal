import type { TeamMatchStats } from "@pitch-signal/core";
import type { ApiTeamStatistics } from "./schemas.js";

const providerNames = {
  corners: "Corner Kicks",
  fouls: "Fouls",
  yellowCards: "Yellow Cards",
  redCards: "Red Cards",
  shotsOnTarget: "Shots on Goal",
  totalShots: "Total Shots"
} as const;

export const normalizeTeamStatistics = (input: ApiTeamStatistics): TeamMatchStats => {
  const byName = new Map(input.statistics.map((item) => [item.type, item.value]));
  return {
    corners: byName.get(providerNames.corners) ?? null,
    fouls: byName.get(providerNames.fouls) ?? null,
    yellowCards: byName.get(providerNames.yellowCards) ?? null,
    redCards: byName.get(providerNames.redCards) ?? null,
    shotsOnTarget: byName.get(providerNames.shotsOnTarget) ?? null,
    shotsOffTarget: null,
    totalShots: byName.get(providerNames.totalShots) ?? null,
    goalKicks: null,
    offsides: null,
    possession: null,
    firstHalfGoals: null,
    secondHalfGoals: null
  };
};
