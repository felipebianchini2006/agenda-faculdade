"use client";

import { CalendarPlus, ChevronLeft, ChevronRight, LogOut, Save, Trash2, Users } from "lucide-react";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { AcademicEvent, buildMonthCalendar, formatEventBadge } from "@/domain/calendar";
import { CurrentUser, ManagedUser } from "@/domain/user";

type EventFormState = {
  id?: string;
  title: string;
  kind: "exam" | "assignment";
  subject: string;
  startsAt: string;
  description: string;
  location: string;
};

const emptyEventForm: EventFormState = {
  title: "",
  kind: "exam",
  subject: "",
  startsAt: "",
  description: "",
  location: "",
};

export function AgendaDashboard({
  me,
  events,
  users,
  onLogout,
  onConnectCalendar,
  onSaveEvent,
  onDeleteEvent,
  onCreateTestMember,
  onUpdateUser,
}: {
  me: CurrentUser;
  events: AcademicEvent[];
  users: ManagedUser[];
  onLogout?: () => Promise<void> | void;
  onConnectCalendar?: () => Promise<void> | void;
  onSaveEvent?: (event: EventFormState) => Promise<void> | void;
  onDeleteEvent?: (eventId: string) => Promise<void> | void;
  onCreateTestMember?: () => Promise<void> | void;
  onUpdateUser?: (userId: string, patch: Pick<ManagedUser, "role" | "status">) => Promise<void> | void;
}) {
  const baseMonth = useMemo(() => startOfMonth(events[0]?.startsAt ? new Date(events[0].startsAt) : new Date()), [events]);
  const [monthOffset, setMonthOffset] = useState(0);
  const visibleMonth = useMemo(() => addMonths(baseMonth, monthOffset), [baseMonth, monthOffset]);
  const [panel, setPanel] = useState<"event" | "users" | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyEventForm);
  const days = useMemo(() => buildMonthCalendar({ visibleMonth, events }), [visibleMonth, events]);
  const isAdmin = me.role === "admin";
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(visibleMonth);
  const upcoming = events.slice(0, 5);

  function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSaveEvent?.(form);
    setForm(emptyEventForm);
    setPanel(null);
  }

  function editEvent(event: AcademicEvent) {
    setPanel("event");
    setForm({
      id: event.id,
      title: event.title,
      kind: event.kind,
      subject: event.subject,
      startsAt: toDatetimeLocal(event.startsAt),
      description: event.description || "",
      location: event.location || "",
    });
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Image src="/icons/icon-192.png" alt="" className="brand-icon" width={56} height={56} priority />
          <div>
            <p className="eyebrow">Organizacao academica</p>
            <h1>Agenda Faculdade</h1>
          </div>
        </div>
        <div className="topbar-actions">
          {!me.calendarConnected && (
            <button type="button" onClick={() => void onConnectCalendar?.()}>
              Conectar Google Calendar
            </button>
          )}
          {me.calendarConnected && <span className="calendar-status">Google Calendar conectado</span>}
          <button type="button" onClick={() => void onLogout?.()}>
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div>
            <p className="sidebar-label">Conta</p>
            <strong>{me.name}</strong>
            <span>{me.email}</span>
          </div>
          {isAdmin && (
            <nav aria-label="Administracao">
              <button type="button" onClick={() => setPanel("event")}>
                <CalendarPlus size={18} />
                Nova data
              </button>
              <button type="button" onClick={() => setPanel("users")}>
                <Users size={18} />
                Usuarios
              </button>
            </nav>
          )}
          <div className="upcoming">
            <p className="sidebar-label">Proximas datas</p>
            {upcoming.length === 0 && <span>Nenhuma prova ou trabalho cadastrado.</span>}
            {upcoming.map((event) => (
              <button className="upcoming-item" key={event.id} type="button" onClick={() => isAdmin && editEvent(event)}>
                <span>{formatEventBadge(event.kind)}</span>
                <strong>{event.title}</strong>
                <small>{event.subject}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="calendar-panel" aria-label="Calendario academico">
          <div className="month-heading">
            <div>
              <p className="eyebrow">{monthLabel}</p>
              <h2>Provas e trabalhos</h2>
            </div>
            <div className="month-controls">
              <button type="button" aria-label="Mes anterior" onClick={() => setMonthOffset((value) => value - 1)}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" aria-label="Proximo mes" onClick={() => setMonthOffset((value) => value + 1)}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="week-labels" aria-hidden="true">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="month-grid">
            {days.map((day) => (
              <article className={`${day.inVisibleMonth ? "day-cell" : "day-cell muted"} ${day.events.length > 0 ? "has-events" : ""}`} key={day.isoDate}>
                <time dateTime={day.isoDate}>{day.date.getUTCDate()}</time>
                <div className="day-events">
                  {day.events.map((event) => (
                    <button className={`event-chip ${event.kind}`} key={event.id} type="button" onClick={() => isAdmin && editEvent(event)}>
                      <span>{formatEventBadge(event.kind)}</span>
                      <strong>{event.title}</strong>
                      <small>{event.subject}</small>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {panel === "event" && (
          <section className="admin-panel">
            <div className="panel-heading">
              <h2>{form.id ? "Editar data" : "Nova data"}</h2>
              {form.id && (
                <button className="danger" type="button" onClick={() => form.id && void onDeleteEvent?.(form.id)}>
                  <Trash2 size={16} />
                  Excluir
                </button>
              )}
            </div>
            <form className="event-form" onSubmit={submitEvent}>
              <label>
                Titulo
                <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>
              <label>
                Disciplina
                <input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
              </label>
              <label>
                Tipo
                <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as EventFormState["kind"] })}>
                  <option value="exam">Prova</option>
                  <option value="assignment">Trabalho</option>
                </select>
              </label>
              <label>
                Data e hora
                <input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
              </label>
              <label>
                Descricao
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
              <label>
                Local
                <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
              </label>
              <button className="primary" type="submit">
                <Save size={16} />
                Salvar data
              </button>
            </form>
          </section>
        )}

        {panel === "users" && (
          <section className="admin-panel">
            <h2>Usuarios</h2>
            {onCreateTestMember && (
              <button type="button" onClick={() => void onCreateTestMember()}>
                Criar membro teste
              </button>
            )}
            <div className="user-list">
              {users.map((user) => (
                <article className="user-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <select
                    aria-label={`Permissao de ${user.email}`}
                    value={user.role}
                    onChange={(event) => void onUpdateUser?.(user.id, { role: event.target.value as ManagedUser["role"], status: user.status })}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Membro</option>
                  </select>
                  <select
                    aria-label={`Status de ${user.email}`}
                    value={user.status}
                    onChange={(event) => void onUpdateUser?.(user.id, { role: user.role, status: event.target.value as ManagedUser["status"] })}
                  >
                    <option value="active">Ativo</option>
                    <option value="disabled">Desativado</option>
                  </select>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0));
}

function addMonths(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1, 12, 0, 0));
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
