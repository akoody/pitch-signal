import { describe, expect, it } from "vitest";
import { normalizeTeamStatistics } from "./normalize.js";

describe("normalizeTeamStatistics", () => {
  it("maps provider labels and keeps missing values explicit", () => {
    const result = normalizeTeamStatistics({
      team: { id: 42, name: "Example FC" },
      statistics: [
        { type: "Corner Kicks", value: 7 },
        { type: "Fouls", value: 11 },
        { type: "Yellow Cards", value: 3 },
        { type: "Red Cards", value: 1 },
        { type: "Shots on Goal", value: 6 }
      ]
    });
    expect(result).toEqual({
      corners: 7,
      fouls: 11,
      yellowCards: 3,
      redCards: 1,
      shotsOnTarget: 6,
      shotsOffTarget: null,
      totalShots: null,
      goalKicks: null,
      offsides: null,
      possession: null,
      firstHalfGoals: null,
      secondHalfGoals: null
    });
  });
});
