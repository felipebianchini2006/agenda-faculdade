require "../spec_helper"

describe AgendaFaculdade::Application::CalendarPayloadBuilder do
  builder = AgendaFaculdade::Application::CalendarPayloadBuilder.new

  it "builds Google Calendar payloads with required reminders" do
    starts_at = Time.utc(2026, 6, 10, 13, 0, 0)
    event = AgendaFaculdade::Domain::AcademicEvent.create(
      id: "event-1",
      title: "Prova P1",
      kind: AgendaFaculdade::Domain::AcademicEventKind::Exam,
      subject: "Calculo",
      starts_at: starts_at,
      ends_at: starts_at + 1.hour,
      description: "Capitulos 1 a 4",
      location: "Sala 12",
      created_by: "user-1"
    )

    payload = builder.build(event)

    payload["summary"].should eq("[Calculo] Prova P1")
    payload["location"].should eq("Sala 12")
    payload["description"].should eq("Prova\n\nCapitulos 1 a 4")
    payload["start"]["dateTime"].should eq("2026-06-10T13:00:00Z")
    payload["start"]["timeZone"].should eq("America/Sao_Paulo")
    payload["end"]["dateTime"].should eq("2026-06-10T14:00:00Z")
    payload["end"]["timeZone"].should eq("America/Sao_Paulo")
    payload["reminders"]["useDefault"].should eq(false)
    payload["reminders"]["overrides"].as_a.should eq([
      {"method" => "email", "minutes" => 10080},
      {"method" => "email", "minutes" => 1440},
      {"method" => "popup", "minutes" => 1440},
    ])
  end

  it "labels assignment descriptions separately from exam descriptions" do
    starts_at = Time.utc(2026, 6, 12, 23, 0, 0)
    event = AgendaFaculdade::Domain::AcademicEvent.create(
      id: "event-2",
      title: "Relatorio final",
      kind: AgendaFaculdade::Domain::AcademicEventKind::Assignment,
      subject: "Fisica Experimental",
      starts_at: starts_at,
      ends_at: starts_at + 30.minutes,
      description: "Enviar PDF no portal do aluno",
      location: nil,
      created_by: "user-1"
    )

    payload = builder.build(event)

    payload["summary"].should eq("[Fisica Experimental] Relatorio final")
    payload["location"].raw.should be_nil
    payload["description"].should eq("Trabalho\n\nEnviar PDF no portal do aluno")
    payload["start"]["dateTime"].should eq("2026-06-12T23:00:00Z")
    payload["end"]["dateTime"].should eq("2026-06-12T23:30:00Z")
  end

  it "omits blank optional details without producing extra spacing" do
    starts_at = Time.utc(2026, 7, 1, 8, 30, 0)
    event = AgendaFaculdade::Domain::AcademicEvent.create(
      id: "event-3",
      title: "Segunda chamada",
      kind: AgendaFaculdade::Domain::AcademicEventKind::Exam,
      subject: "Estrutura de Dados",
      starts_at: starts_at,
      ends_at: starts_at + 2.hours,
      description: nil,
      location: nil,
      created_by: "user-2"
    )

    payload = builder.build(event)

    payload["summary"].should eq("[Estrutura de Dados] Segunda chamada")
    payload["description"].should eq("Prova")
    payload["location"].raw.should be_nil
    payload["reminders"]["overrides"].as_a.map(&.["minutes"]).should eq([10080, 1440, 1440])
  end

  it "keeps the reminder methods explicit so Google does not use calendar defaults" do
    starts_at = Time.utc(2026, 8, 20, 10, 0, 0)
    event = AgendaFaculdade::Domain::AcademicEvent.create(
      id: "event-4",
      title: "Apresentacao",
      kind: AgendaFaculdade::Domain::AcademicEventKind::Assignment,
      subject: "Projeto Integrador",
      starts_at: starts_at,
      ends_at: starts_at + 1.hour,
      description: "Banca final",
      location: "Auditorio",
      created_by: "admin-1"
    )

    payload = builder.build(event)
    reminders = payload["reminders"]["overrides"].as_a

    payload["reminders"]["useDefault"].should eq(false)
    reminders.map(&.["method"].as_s).should eq(["email", "email", "popup"])
    reminders.map(&.["minutes"].as_i).should eq([7 * 24 * 60, 24 * 60, 24 * 60])
  end
end

