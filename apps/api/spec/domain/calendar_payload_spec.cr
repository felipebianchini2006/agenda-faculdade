require "../spec_helper"

describe AgendaFaculdade::Application::CalendarPayloadBuilder do
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

    payload = AgendaFaculdade::Application::CalendarPayloadBuilder.new.build(event)

    payload["summary"].should eq("[Calculo] Prova P1")
    payload["reminders"]["useDefault"].should eq(false)
    payload["reminders"]["overrides"].as_a.should eq([
      {"method" => "email", "minutes" => 10080},
      {"method" => "email", "minutes" => 1440},
      {"method" => "popup", "minutes" => 1440},
    ])
  end
end

