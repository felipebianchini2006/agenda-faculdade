import { expect, request, test } from "@playwright/test";

test("admin creates an event, sees it on desktop/mobile agenda, and member cannot edit", async ({ page }) => {
  const api = await request.newContext({ baseURL: "http://127.0.0.1:4000" });
  await api.post("/api/test/reset");

  await page.goto("/");
  await page.getByRole("link", { name: "Entrar como Felipe" }).click();

  await expect(page.getByRole("heading", { name: "Agenda Faculdade" })).toBeVisible();
  await page.getByRole("button", { name: "Conectar Google Calendar" }).click();
  await expect(page.getByText("Google Calendar conectado")).toBeVisible();

  await page.getByRole("button", { name: "Nova data" }).click();
  await page.getByLabel("Titulo").fill("Prova P1");
  await page.getByLabel("Disciplina").fill("Calculo");
  await page.getByLabel("Tipo").selectOption("exam");
  await page.getByLabel("Data e hora").fill("2026-06-10T13:00");
  await page.getByLabel("Descricao").fill("Capitulos 1 a 4");
  await page.getByLabel("Local").fill("Sala 12");
  await page.getByRole("button", { name: "Salvar data" }).click();

  const calendar = page.getByLabel("Calendario academico");
  await expect(calendar.getByText("Prova P1")).toBeVisible();
  await expect(calendar.getByText("Calculo")).toBeVisible();
  await expect
    .poll(async () => {
      const response = await api.get("/api/test/calendar-requests");
      const body = (await response.json()) as { requests: Array<{ action: string }> };
      return body.requests.map((entry) => entry.action);
    })
    .toContain("insert");

  await page.getByRole("button", { name: "Usuarios" }).click();
  await page.getByRole("button", { name: "Criar membro teste" }).click();
  await expect(page.getByText("colega@example.com")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByRole("link", { name: "Entrar como membro" }).click();

  await expect(page.getByLabel("Calendario academico").getByText("Prova P1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nova data" })).toHaveCount(0);
});
