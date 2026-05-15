"use client";

import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  GraduationCap,
  HelpCircle,
  Link2,
  LogOut,
  Mail,
  MapPin,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
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

type ActiveView = "agenda" | "events" | "users" | "profile";
type EventFilter = "all" | "exam" | "assignment";

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
  const [activeView, setActiveView] = useState<ActiveView>("agenda");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [userQuery, setUserQuery] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [panel, setPanel] = useState<"event" | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyEventForm);

  const isAdmin = me.role === "admin";
  const activeEvents = useMemo(() => sortEvents(events.filter((event) => event.status === "active")), [events]);
  const baseMonth = useMemo(() => startOfMonth(activeEvents[0]?.startsAt ? new Date(activeEvents[0].startsAt) : new Date()), [activeEvents]);
  const visibleMonth = useMemo(() => addMonths(baseMonth, monthOffset), [baseMonth, monthOffset]);
  const monthLabel = capitalize(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(visibleMonth));
  const days = useMemo(() => buildMonthCalendar({ visibleMonth, events: activeEvents }), [visibleMonth, activeEvents]);
  const monthEvents = useMemo(
    () => activeEvents.filter((event) => isSameVisibleMonth(event.startsAt, visibleMonth)),
    [activeEvents, visibleMonth],
  );
  const subjects = useMemo(() => Array.from(new Set(activeEvents.map((event) => event.subject))).sort(), [activeEvents]);
  const filteredEvents = useMemo(
    () =>
      activeEvents.filter((event) => {
        const kindMatches = eventFilter === "all" || event.kind === eventFilter;
        const subjectMatches = subjectFilter === "all" || event.subject === subjectFilter;
        return kindMatches && subjectMatches;
      }),
    [activeEvents, eventFilter, subjectFilter],
  );
  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query));
  }, [users, userQuery]);

  const navItems = [
    { view: "agenda" as const, label: "Agenda", icon: CalendarDays },
    ...(isAdmin ? [{ view: "events" as const, label: "Eventos", icon: CalendarPlus }] : []),
    ...(isAdmin ? [{ view: "users" as const, label: "Usuarios", displayLabel: "Usuários", icon: Users }] : []),
    { view: "profile" as const, label: "Perfil", icon: UserRound },
  ];

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaveEvent?.(form);
    setForm(emptyEventForm);
    setPanel(null);
  }

  function openCreateEvent() {
    setForm(emptyEventForm);
    setPanel("event");
  }

  function editEvent(event: AcademicEvent) {
    if (!isAdmin) {
      return;
    }

    setActiveView("events");
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

  async function removeEvent(eventId: string) {
    await onDeleteEvent?.(eventId);
    setPanel(null);
    setForm(emptyEventForm);
  }

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <button className="brand-lockup" type="button" onClick={() => setActiveView("agenda")} aria-label="Abrir agenda">
          <Image src="/icons/icon-192.png" alt="" className="brand-icon" width={40} height={40} priority />
          <span>Agenda Faculdade</span>
        </button>

        <nav className="desktop-tabs" aria-label="Navegacao principal">
          {navItems.map((item) => (
            <NavButton
              key={item.view}
              icon={item.icon}
              label={item.label}
              displayLabel={item.displayLabel}
              active={activeView === item.view}
              onClick={() => setActiveView(item.view)}
            />
          ))}
        </nav>

        <div className="account-actions">
          <button className="avatar-button" type="button" onClick={() => setActiveView("profile")} aria-label="Perfil">
            <Avatar user={me} />
          </button>
          <button className="icon-command" type="button" onClick={() => void onLogout?.()} aria-label="Sair">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <section className="app-canvas">
        {activeView === "agenda" && (
          <AgendaView
            days={days}
            isAdmin={isAdmin}
            monthEvents={monthEvents}
            monthLabel={monthLabel}
            onCreateEvent={openCreateEvent}
            onEditEvent={editEvent}
            onNextMonth={() => setMonthOffset((value) => value + 1)}
            onPreviousMonth={() => setMonthOffset((value) => value - 1)}
          />
        )}

        {activeView === "events" && isAdmin && (
          <EventsAdminView
            eventFilter={eventFilter}
            events={filteredEvents}
            onDeleteEvent={removeEvent}
            onEditEvent={editEvent}
            onFilterChange={setEventFilter}
            onCreateEvent={openCreateEvent}
            onSubjectFilterChange={setSubjectFilter}
            subjectFilter={subjectFilter}
            subjects={subjects}
            totalEvents={activeEvents.length}
            syncedEvents={me.calendarConnected ? activeEvents.length : 0}
          />
        )}

        {activeView === "users" && isAdmin && (
          <UsersAdminView
            onCreateTestMember={onCreateTestMember}
            onUpdateUser={onUpdateUser}
            query={userQuery}
            setQuery={setUserQuery}
            users={filteredUsers}
          />
        )}

        {activeView === "profile" && <ProfileView me={me} onConnectCalendar={onConnectCalendar} onLogout={onLogout} />}
      </section>

      {isAdmin && activeView === "agenda" && (
        <button className="mobile-fab" type="button" onClick={openCreateEvent} aria-label="Nova data">
          <Plus size={28} />
        </button>
      )}

      <nav className="bottom-nav" aria-label="Navegacao inferior">
        {navItems.map((item) => (
          <NavButton
            key={item.view}
            icon={item.icon}
            label={item.label}
            displayLabel={item.displayLabel}
            active={activeView === item.view}
            onClick={() => setActiveView(item.view)}
          />
        ))}
      </nav>

      {panel === "event" && (
        <section className="editor-backdrop" aria-label={form.id ? "Editar data" : "Nova data"}>
          <div className="editor-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Evento acadêmico</p>
                <h2>{form.id ? "Editar data" : "Nova data"}</h2>
              </div>
              <button className="icon-command" type="button" onClick={() => setPanel(null)} aria-label="Fechar formulario">
                <X size={18} />
              </button>
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
              <div className="form-actions">
                {form.id && (
                  <button className="danger ghost" type="button" onClick={() => form.id && void removeEvent(form.id)}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                )}
                <button className="primary-action" type="submit">
                  <Save size={16} />
                  Salvar data
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}

function AgendaView({
  days,
  isAdmin,
  monthEvents,
  monthLabel,
  onCreateEvent,
  onEditEvent,
  onNextMonth,
  onPreviousMonth,
}: {
  days: ReturnType<typeof buildMonthCalendar>;
  isAdmin: boolean;
  monthEvents: AcademicEvent[];
  monthLabel: string;
  onCreateEvent: () => void;
  onEditEvent: (event: AcademicEvent) => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
}) {
  return (
    <div className="agenda-layout">
      <section className="calendar-panel" aria-label="Calendario academico">
        <div className="view-heading">
          <div>
            <p className="section-kicker">Calendário mensal</p>
            <h1>Agenda Faculdade</h1>
            <span>{monthLabel}</span>
          </div>
          <div className="heading-actions">
            {isAdmin && (
              <button className="primary-action desktop-create" type="button" onClick={onCreateEvent}>
                <Plus size={18} />
                Nova data
              </button>
            )}
            <div className="month-controls">
              <button type="button" aria-label="Mes anterior" onClick={onPreviousMonth}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" aria-label="Proximo mes" onClick={onNextMonth}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="week-labels" aria-hidden="true">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="month-grid">
          {days.map((day) => (
            <article className={`${day.inVisibleMonth ? "day-cell" : "day-cell muted"} ${day.events.length > 0 ? "has-events" : ""}`} key={day.isoDate}>
              <time dateTime={day.isoDate}>{day.date.getUTCDate()}</time>
              <div className="day-events">
                {day.events.map((event) => (
                  <button className={`event-chip ${event.kind}`} key={event.id} type="button" onClick={() => onEditEvent(event)}>
                    <span>{formatEventBadge(event.kind)}</span>
                    <strong>{event.title}</strong>
                    <small>{event.subject}</small>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mobile-event-list">
          <div className="section-row">
            <h2>Próximos eventos</h2>
            <span>{monthEvents.length} no mês</span>
          </div>
          {monthEvents.length === 0 && <EmptyState title="Nada cadastrado neste mês" text="Quando um admin criar uma prova ou trabalho, ele aparece aqui." />}
          {monthEvents.map((event) => (
            <EventCard event={event} isAdmin={isAdmin} key={event.id} onDeleteEvent={undefined} onEditEvent={onEditEvent} compact />
          ))}
        </div>
      </section>

      <aside className="agenda-rail">
        <div className="rail-card">
          <p className="section-kicker">Resumo</p>
          <strong>{monthEvents.length}</strong>
          <span>datas acadêmicas neste mês</span>
        </div>
        <section className="rail-card">
          <div className="section-row">
            <h2>Próximas datas</h2>
          </div>
          {monthEvents.length === 0 && <span className="muted-text">Nenhuma prova ou trabalho cadastrado.</span>}
          {monthEvents.slice(0, 4).map((event) => (
            <button className="upcoming-item" key={event.id} type="button" onClick={() => onEditEvent(event)}>
              <EventKindPill kind={event.kind} />
              <strong>{event.title}</strong>
              <small>{event.subject}</small>
              <span>{formatDate(event.startsAt)}</span>
            </button>
          ))}
        </section>
      </aside>
    </div>
  );
}

function EventsAdminView({
  eventFilter,
  events,
  onCreateEvent,
  onDeleteEvent,
  onEditEvent,
  onFilterChange,
  onSubjectFilterChange,
  subjectFilter,
  subjects,
  syncedEvents,
  totalEvents,
}: {
  eventFilter: EventFilter;
  events: AcademicEvent[];
  onCreateEvent: () => void;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onEditEvent: (event: AcademicEvent) => void;
  onFilterChange: (filter: EventFilter) => void;
  onSubjectFilterChange: (subject: string) => void;
  subjectFilter: string;
  subjects: string[];
  syncedEvents: number;
  totalEvents: number;
}) {
  return (
    <section className="management-view">
      <div className="view-heading compact">
        <div>
          <p className="section-kicker">Administração</p>
          <h1>Gestão de Eventos</h1>
        </div>
      </div>

      <div className="summary-card">
        <div>
          <strong>{totalEvents}</strong>
          <span>Eventos ativos</span>
        </div>
        <div>
          <strong>{syncedEvents}</strong>
          <span>Sincronizados</span>
        </div>
      </div>

      <button className="primary-action full-width" type="button" onClick={onCreateEvent}>
        <Plus size={18} />
        Nova data
      </button>

      <section className="filter-panel">
        <h2>Filtros rápidos</h2>
        <div className="filter-row">
          <FilterButton active={eventFilter === "all"} onClick={() => onFilterChange("all")}>
            Todos
          </FilterButton>
          <FilterButton active={eventFilter === "exam"} onClick={() => onFilterChange("exam")}>
            Provas
          </FilterButton>
          <FilterButton active={eventFilter === "assignment"} onClick={() => onFilterChange("assignment")}>
            Trabalhos
          </FilterButton>
          <select aria-label="Filtrar por disciplina" value={subjectFilter} onChange={(event) => onSubjectFilterChange(event.target.value)}>
            <option value="all">Disciplina</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="event-list">
        <div className="section-row">
          <h2>Eventos futuros</h2>
          <span>{events.length} encontrados</span>
        </div>
        {events.length === 0 && <EmptyState title="Nenhum evento encontrado" text="Altere os filtros ou crie uma nova data acadêmica." />}
        {events.map((event) => (
          <EventCard event={event} isAdmin key={event.id} onDeleteEvent={onDeleteEvent} onEditEvent={onEditEvent} />
        ))}
      </section>
    </section>
  );
}

function UsersAdminView({
  onCreateTestMember,
  onUpdateUser,
  query,
  setQuery,
  users,
}: {
  onCreateTestMember?: () => Promise<void> | void;
  onUpdateUser?: (userId: string, patch: Pick<ManagedUser, "role" | "status">) => Promise<void> | void;
  query: string;
  setQuery: (query: string) => void;
  users: ManagedUser[];
}) {
  return (
    <section className="management-view wide">
      <div className="view-heading compact">
        <div>
          <p className="section-kicker">Administração</p>
          <h1>Gestão de Usuários</h1>
        </div>
      </div>

      <div className="search-field">
        <Search size={18} />
        <input placeholder="Buscar por nome ou email..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      {onCreateTestMember && (
        <button className="secondary-action" type="button" onClick={() => void onCreateTestMember()}>
          <Plus size={18} />
          Criar membro teste
        </button>
      )}

      <section className="user-grid">
        {users.length === 0 && <EmptyState title="Nenhum usuário encontrado" text="Tente outro termo de busca." />}
        {users.map((user) => (
          <article className={`user-card ${user.status === "disabled" ? "disabled" : ""}`} key={user.id}>
            <div className={`user-strip ${user.role}`} />
            <div className="user-main">
              <Avatar user={user} />
              <div>
                <h2>{user.name}</h2>
                <span>{user.email}</span>
              </div>
            </div>
            <div className="user-controls">
              <label>
                <span>Permissão</span>
                <select
                  aria-label={`Permissao de ${user.email}`}
                  value={user.role}
                  onChange={(event) => void onUpdateUser?.(user.id, { role: event.target.value as ManagedUser["role"], status: user.status })}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Membro</option>
                </select>
              </label>
              <button
                className={`status-toggle ${user.status}`}
                type="button"
                onClick={() =>
                  void onUpdateUser?.(user.id, {
                    role: user.role,
                    status: user.status === "active" ? "disabled" : "active",
                  })
                }
                aria-label={`${user.status === "active" ? "Desativar" : "Ativar"} ${user.email}`}
              >
                <span>{user.status === "active" ? "Ativo" : "Inativo"}</span>
                <i />
              </button>
            </div>
            <div className={`role-pill ${user.role}`}>
              {user.role === "admin" ? <ShieldCheck size={15} /> : <UserRound size={15} />}
              {user.role === "admin" ? "Admin" : "Membro"}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

function ProfileView({
  me,
  onConnectCalendar,
  onLogout,
}: {
  me: CurrentUser;
  onConnectCalendar?: () => Promise<void> | void;
  onLogout?: () => Promise<void> | void;
}) {
  return (
    <section className="profile-view">
      <div className="profile-header">
        <Avatar user={me} large />
        <div>
          <h1>{me.name}</h1>
          <p>{me.email}</p>
          <span className="active-badge">
            <Check size={14} />
            Aluno ativo
          </span>
        </div>
      </div>

      <section className="sync-card">
        <div className="section-row">
          <h2>Sincronização</h2>
        </div>
        <div className="sync-content">
          <div className="sync-icon">
            <CalendarDays size={28} />
          </div>
          <div>
            <h3>Google Calendar</h3>
            <span className={`connection-dot ${me.calendarConnected ? "connected" : ""}`}>
              <i />
              {me.calendarConnected ? "Google Calendar conectado" : "Não conectado"}
            </span>
          </div>
        </div>
        <p>Sincronize automaticamente provas e entregas de trabalhos com sua agenda pessoal.</p>
        {!me.calendarConnected && (
          <button className="secondary-action full-width" type="button" onClick={() => void onConnectCalendar?.()}>
            <Link2 size={18} />
            Conectar Google Calendar
          </button>
        )}
      </section>

      <section className="reminder-card">
        <h2>Configurações de Lembretes</h2>
        <ReminderRow checked icon={Mail} label="7 dias antes (Email)" />
        <ReminderRow checked icon={Mail} label="1 dia antes (Email)" />
        <ReminderRow checked icon={BellRing} label="1 dia antes (Notificação)" />
      </section>

      <section className="system-actions">
        <button type="button">
          <HelpCircle size={18} />
          Central de Ajuda
        </button>
        <button className="danger ghost" type="button" onClick={() => void onLogout?.()} aria-label="Sair da Conta">
          <LogOut size={18} />
          Sair da Conta
        </button>
      </section>
    </section>
  );
}

function EventCard({
  compact = false,
  event,
  isAdmin,
  onDeleteEvent,
  onEditEvent,
}: {
  compact?: boolean;
  event: AcademicEvent;
  isAdmin: boolean;
  onDeleteEvent?: (eventId: string) => Promise<void> | void;
  onEditEvent: (event: AcademicEvent) => void;
}) {
  return (
    <article className={`event-card ${event.kind} ${compact ? "compact" : ""}`}>
      <div className="event-strip" />
      <div className="event-body">
        <div className="event-title-row">
          <div>
            <EventKindPill kind={event.kind} />
            <h3>{event.title}</h3>
            <p>{event.subject}</p>
          </div>
          {isAdmin && (
            <div className="event-actions">
              <button type="button" onClick={() => onEditEvent(event)} aria-label={`Editar ${event.title}`}>
                <Edit3 size={18} />
              </button>
              {onDeleteEvent && (
                <button className="danger-icon" type="button" onClick={() => void onDeleteEvent(event.id)} aria-label={`Excluir ${event.title}`}>
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="event-meta">
          <span>
            <CalendarDays size={14} />
            {formatDate(event.startsAt)}
          </span>
          <span>
            <Clock3 size={14} />
            {formatTimeRange(event)}
          </span>
          {event.location && (
            <span>
              <MapPin size={14} />
              {event.location}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function EventKindPill({ kind }: { kind: AcademicEvent["kind"] }) {
  return <span className={`kind-pill ${kind}`}>{formatEventBadge(kind)}</span>;
}

function ReminderRow({ checked, icon: Icon, label }: { checked: boolean; icon: typeof Mail; label: string }) {
  return (
    <label className="reminder-row">
      <span>
        <Icon size={18} />
        {label}
      </span>
      <input checked={checked} readOnly type="checkbox" />
    </label>
  );
}

function EmptyState({ text, title }: { text: string; title: string }) {
  return (
    <div className="empty-state">
      <GraduationCap size={24} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button className={`filter-chip ${active ? "active" : ""}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function NavButton({
  active,
  displayLabel,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  displayLabel?: string;
  icon: typeof CalendarDays;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} type="button" onClick={onClick} aria-label={label}>
      <Icon size={22} />
      <span>{displayLabel || label}</span>
    </button>
  );
}

function Avatar({ large = false, user }: { large?: boolean; user: Pick<CurrentUser, "name" | "email" | "avatarUrl"> }) {
  const initials = getInitials(user.name || user.email);

  return (
    <span
      className={`avatar ${large ? "large" : ""} ${user.avatarUrl ? "has-image" : ""}`}
      style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}
    >
      {!user.avatarUrl && <span>{initials}</span>}
    </span>
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

function sortEvents(nextEvents: AcademicEvent[]) {
  return [...nextEvents].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function isSameVisibleMonth(value: string, visibleMonth: Date) {
  const date = new Date(value);
  return date.getUTCFullYear() === visibleMonth.getUTCFullYear() && date.getUTCMonth() === visibleMonth.getUTCMonth();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value)).replace(".", "");
}

function formatTimeRange(event: AcademicEvent) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${formatter.format(new Date(event.startsAt))} - ${formatter.format(new Date(event.endsAt))}`;
}

function getInitials(value: string) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
