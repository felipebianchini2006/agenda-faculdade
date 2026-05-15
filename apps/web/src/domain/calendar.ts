export type EventKind = "exam" | "assignment";
export type EventStatus = "active" | "deleted";

export type AcademicEvent = {
  id: string;
  title: string;
  kind: EventKind;
  subject: string;
  startsAt: string;
  endsAt: string;
  description?: string | null;
  location?: string | null;
  status: EventStatus;
};

export type CalendarDay = {
  date: Date;
  isoDate: string;
  inVisibleMonth: boolean;
  events: AcademicEvent[];
};

export function buildMonthCalendar({
  visibleMonth,
  events,
}: {
  visibleMonth: Date;
  events: AcademicEvent[];
}): CalendarDay[] {
  const year = visibleMonth.getUTCFullYear();
  const month = visibleMonth.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const gridStart = new Date(firstDay);
  gridStart.setUTCDate(firstDay.getUTCDate() - firstDay.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    const isoDate = date.toISOString().slice(0, 10);

    return {
      date,
      isoDate,
      inVisibleMonth: date.getUTCMonth() === month,
      events: events.filter((event) => event.startsAt.slice(0, 10) === isoDate),
    };
  });
}

export function formatEventBadge(kind: EventKind): string {
  return kind === "exam" ? "Prova" : "Trabalho";
}

