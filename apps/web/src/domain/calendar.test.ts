import { describe, expect, it } from "vitest";
import { buildMonthCalendar, formatEventBadge } from "./calendar";

describe("calendar domain helpers", () => {
  it("builds a stable month grid with events on their days", () => {
    const days = buildMonthCalendar({
      visibleMonth: new Date("2026-06-01T12:00:00.000Z"),
      events: [
        {
          id: "event-1",
          title: "Prova P1",
          kind: "exam",
          subject: "Calculo",
          startsAt: "2026-06-10T13:00:00.000Z",
          endsAt: "2026-06-10T14:00:00.000Z",
          description: "Capitulos 1 a 4",
          location: "Sala 12",
          status: "active",
        },
      ],
    });

    expect(days).toHaveLength(42);
    expect(days.find((day) => day.isoDate === "2026-06-10")?.events).toHaveLength(1);
  });

  it("formats exam and assignment badges for scanning", () => {
    expect(formatEventBadge("exam")).toBe("Prova");
    expect(formatEventBadge("assignment")).toBe("Trabalho");
  });
});

