import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getAllByRole("button", { name: "Agenda" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Agenda" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Eventos" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Usuarios" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Perfil" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Nova data" }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Nova data" })[0]);
    expect(screen.getByRole("heading", { name: "Nova data" })).toBeInTheDocument();
    expect(screen.getByLabelText("Titulo")).toBeInTheDocument();
    expect(screen.getByLabelText("Disciplina")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo")).toBeInTheDocument();
    expect(screen.getByLabelText("Data e hora")).toBeInTheDocument();
    expect(screen.getByLabelText("Descricao")).toBeInTheDocument();
    expect(screen.getByLabelText("Local")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar data" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Calendario academico" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Perfil" })[0]);
    expect(screen.getByText("Google Calendar conectado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Conectar Google Calendar" })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: "Eventos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Usuarios" })).not.toBeInTheDocument();
  });
});

