import { AcademicEvent } from "@/domain/calendar";
import { CurrentUser, ManagedUser } from "@/domain/user";

export type MeResponse = {
  user: CurrentUser;
  calendarConnected: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export function apiUrl(path: string) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  for (const [key, value] of Object.entries(testAuthHeaders())) {
    headers.set(key, value);
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error || response.statusText);
  }

  return response.json() as Promise<T>;
}

export async function getMe() {
  const payload = await apiFetch<MeResponse>("/api/me");
  return {
    ...payload.user,
    calendarConnected: payload.calendarConnected,
  };
}

export async function getEvents() {
  const payload = await apiFetch<{ events: AcademicEvent[] }>("/api/events");
  return payload.events;
}

export async function getUsers() {
  const payload = await apiFetch<{ users: ManagedUser[] }>("/api/admin/users");
  return payload.users;
}

export async function saveEvent(input: {
  id?: string;
  title: string;
  kind: "exam" | "assignment";
  subject: string;
  startsAt: string;
  description: string;
  location: string;
}) {
  const startsAt = new Date(input.startsAt).toISOString();
  const body = JSON.stringify({
    title: input.title,
    kind: input.kind,
    subject: input.subject,
    startsAt,
    endsAt: new Date(new Date(input.startsAt).getTime() + 60 * 60 * 1000).toISOString(),
    description: input.description || null,
    location: input.location || null,
  });
  const path = input.id ? `/api/admin/events/${input.id}` : "/api/admin/events";
  const method = input.id ? "PATCH" : "POST";
  const payload = await apiFetch<{ event: AcademicEvent }>(path, { method, body });
  return payload.event;
}

export async function deleteEvent(eventId: string) {
  await apiFetch<{ event: AcademicEvent }>(`/api/admin/events/${eventId}`, { method: "DELETE" });
}

export async function logout() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("agenda_test_email");
    window.localStorage.removeItem("agenda_test_name");
  }
  await apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function connectCalendar() {
  if (process.env.NEXT_PUBLIC_TEST_AUTH === "true") {
    await apiFetch<{ ok: boolean }>("/auth/test/connect-calendar", { method: "POST" });
    return;
  }

  window.location.href = apiUrl("/auth/google/calendar/start");
}

export async function disconnectCalendar() {
  await apiFetch<{ ok: boolean }>("/auth/google/calendar/disconnect", { method: "POST" });
}

export async function createTestMember() {
  const payload = await apiFetch<{ user: ManagedUser }>("/api/admin/users/test-member", { method: "POST" });
  return payload.user;
}

export async function updateUser(userId: string, patch: Pick<ManagedUser, "role" | "status">) {
  const payload = await apiFetch<{ user: ManagedUser }>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return payload.user;
}

export function loginHref(kind: "admin" | "member") {
  if (process.env.NEXT_PUBLIC_TEST_AUTH === "true") {
    return kind === "admin" ? "/?testUser=admin" : "/?testUser=member";
  }

  return apiUrl("/auth/google/start");
}

export function applyTestLoginFromUrl() {
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_TEST_AUTH !== "true") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const testUser = params.get("testUser");
  if (!testUser) {
    return;
  }

  if (testUser === "admin") {
    window.localStorage.setItem("agenda_test_email", "felipebianchini02@gmail.com");
    window.localStorage.setItem("agenda_test_name", "Felipe");
  }

  if (testUser === "member") {
    window.localStorage.setItem("agenda_test_email", "colega@example.com");
    window.localStorage.setItem("agenda_test_name", "Colega");
  }

  window.history.replaceState(null, "", "/");
}

export function setTestLogin(kind: "admin" | "member") {
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_TEST_AUTH !== "true") {
    return;
  }

  if (kind === "admin") {
    window.localStorage.setItem("agenda_test_email", "felipebianchini02@gmail.com");
    window.localStorage.setItem("agenda_test_name", "Felipe");
  } else {
    window.localStorage.setItem("agenda_test_email", "colega@example.com");
    window.localStorage.setItem("agenda_test_name", "Colega");
  }
}

function testAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_TEST_AUTH !== "true") {
    return {};
  }

  const email = window.localStorage.getItem("agenda_test_email");
  const name = window.localStorage.getItem("agenda_test_name");
  if (!email) {
    return {};
  }

  return {
    "X-Test-User-Email": email,
    "X-Test-User-Name": name || email,
  };
}
