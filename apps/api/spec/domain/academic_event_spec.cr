require "../spec_helper"

describe AgendaFaculdade::Domain::AcademicEvent do
  it "creates a valid exam event" do
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

    event.title.should eq("Prova P1")
    event.exam?.should be_true
    event.active?.should be_true
  end

  it "rejects blank title" do
    expect_raises(AgendaFaculdade::Domain::ValidationError, "title is required") do
      AgendaFaculdade::Domain::AcademicEvent.create(
        id: "event-1",
        title: " ",
        kind: AgendaFaculdade::Domain::AcademicEventKind::Assignment,
        subject: "Fisica",
        starts_at: Time.utc(2026, 6, 10, 13, 0, 0),
        ends_at: Time.utc(2026, 6, 10, 14, 0, 0),
        description: nil,
        location: nil,
        created_by: "user-1"
      )
    end
  end

  it "rejects end time before start time" do
    expect_raises(AgendaFaculdade::Domain::ValidationError, "ends_at must be after starts_at") do
      AgendaFaculdade::Domain::AcademicEvent.create(
        id: "event-1",
        title: "Trabalho",
        kind: AgendaFaculdade::Domain::AcademicEventKind::Assignment,
        subject: "Fisica",
        starts_at: Time.utc(2026, 6, 10, 13, 0, 0),
        ends_at: Time.utc(2026, 6, 10, 12, 0, 0),
        description: nil,
        location: nil,
        created_by: "user-1"
      )
    end
  end
end

