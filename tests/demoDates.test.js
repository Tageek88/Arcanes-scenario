import { describe, it, expect } from "vitest";
import demo from "@/data/demoCampaign.json";
import { withRelativeSessionDates } from "@/lib/meta/demoDates";

describe("campagne d'exemple : dates des séances", () => {
  const now = new Date(2030, 0, 15, 12, 0, 0); // 15 janvier 2030, bien après les dates du fichier

  it("la séance jouée est dans le passé, la planifiée dans le futur", () => {
    const sessions = withRelativeSessionDates(demo.GameSession, now);
    const played = sessions.find((session) => session.status === "jouee");
    const planned = sessions.find((session) => session.status === "planifiee");
    expect(played.date).toBe("2030-01-01");
    expect(planned.date).toBe("2030-01-25");
  });

  it("ne change rien d'autre que la date et ne modifie pas le fichier d'origine", () => {
    const before = JSON.stringify(demo.GameSession);
    const sessions = withRelativeSessionDates(demo.GameSession, now);
    expect(JSON.stringify(demo.GameSession)).toBe(before);
    sessions.forEach((session, index) => {
      expect({ ...session, date: "" }).toEqual({ ...demo.GameSession[index], date: "" });
    });
  });
});
