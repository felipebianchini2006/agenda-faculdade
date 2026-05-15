import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgendaDashboard } from "./agenda-dashboard";

describe("AgendaDashboard", () => {
  it("renders admin controls for admins", () => {
    render(
      <AgendaDashboard
        me={{
          id: "user-1",
          email: "felipebianchini02@gmail.com",
          name: "Felipe",
          role: "admin",
          status: "active",
          calendarConnected: true,
        }}
        events={[]}
        users={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Agenda Faculdade" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova data" })).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
  });

  it("hides admin controls for members", () => {
    render(
      <AgendaDashboard
        me={{
          id: "user-2",
          email: "colega@example.com",
          name: "Colega",
          role: "member",
          status: "active",
          calendarConnected: true,
        }}
        events={[]}
        users={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Nova data" })).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
  });
});

