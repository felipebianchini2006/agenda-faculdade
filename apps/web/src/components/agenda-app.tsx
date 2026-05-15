"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AcademicEvent } from "@/domain/calendar";
import { CurrentUser, ManagedUser } from "@/domain/user";
import { AgendaDashboard } from "@/components/agenda-dashboard";
import {
  connectCalendar,
  createTestMember,
  deleteEvent,
  disconnectCalendar,
  getEvents,
  getMe,
  getUsers,
  loginHref,
  logout,
  saveEvent,
  updateUser,
  applyTestLoginFromUrl,
  setTestLogin,
} from "@/lib/api";

export function AgendaApp() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [nextMe, nextEvents] = await Promise.all([getMe(), getEvents()]);
      setMe(nextMe);
      setEvents(nextEvents);
      if (nextMe.role === "admin") {
        setUsers(await getUsers());
      } else {
        setUsers([]);
      }
    } catch {
      setMe(null);
      setEvents([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    applyTestLoginFromUrl();
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(id);
  }, [refresh]);

  if (loading) {
    return (
      <main className="login-screen" role="status" aria-live="polite" aria-busy="true">
        <Loader2 className="spin" size={28} />
        <span>Carregando agenda...</span>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <Image src="/icons/icon-192.png" alt="" width={72} height={72} priority />
          <p className="eyebrow">Agenda Faculdade</p>
          <h1>Suas provas e trabalhos em um calendario simples.</h1>
          <p>Entre com sua conta Google para sincronizar as datas no seu proprio Google Calendar.</p>
          <div className="login-disclosure">
            <p>
              O app usa o Google Calendar apenas para criar, atualizar e remover eventos academicos que aparecem na sua agenda. Nao vendemos dados e nao lemos
              eventos pessoais para exibicao no app.
            </p>
            <nav aria-label="Informacoes legais">
              <a href="/sobre">Sobre</a>
              <a href="/privacidade">Privacidade</a>
              <a href="/termos">Termos</a>
            </nav>
          </div>
          <div className="login-actions">
            <a
              href={loginHref("admin")}
              onClick={(event) => {
                if (process.env.NEXT_PUBLIC_TEST_AUTH === "true") {
                  event.preventDefault();
                  setTestLogin("admin");
                  void refresh();
                }
              }}
            >
              Entrar com Google
            </a>
            {process.env.NEXT_PUBLIC_TEST_AUTH === "true" && (
              <a
                href={loginHref("member")}
                onClick={(event) => {
                  event.preventDefault();
                  setTestLogin("member");
                  void refresh();
                }}
              >
                Entrar como membro
              </a>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      {error && (
        <div className="toast" role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      <AgendaDashboard
        me={me}
        events={events}
        users={users}
        onLogout={async () => {
          await logout();
          setMe(null);
        }}
        onConnectCalendar={async () => {
          await connectCalendar();
          await refresh();
        }}
        onDisconnectCalendar={async () => {
          await disconnectCalendar();
          await refresh();
        }}
        onSaveEvent={async (input) => {
          try {
            await saveEvent(input);
            await refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar data");
          }
        }}
        onDeleteEvent={async (eventId) => {
          await deleteEvent(eventId);
          await refresh();
        }}
        onCreateTestMember={
          process.env.NEXT_PUBLIC_TEST_AUTH === "true"
            ? async () => {
                await createTestMember();
                await refresh();
              }
            : undefined
        }
        onUpdateUser={async (userId, patch) => {
          await updateUser(userId, patch);
          await refresh();
        }}
      />
    </>
  );
}
