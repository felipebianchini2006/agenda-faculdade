module AgendaFaculdade
  module Application
    class CalendarPayloadBuilder
      TIME_ZONE = "America/Sao_Paulo"

      def build(event : Domain::AcademicEvent) : Hash(String, JSON::Any)
        JSON.parse({
          "summary" => "[#{event.subject}] #{event.title}",
          "location" => event.location,
          "description" => description_for(event),
          "start" => {
            "dateTime" => event.starts_at.to_rfc3339,
            "timeZone" => TIME_ZONE,
          },
          "end" => {
            "dateTime" => event.ends_at.to_rfc3339,
            "timeZone" => TIME_ZONE,
          },
          "reminders" => {
            "useDefault" => false,
            "overrides" => [
              {"method" => "email", "minutes" => 7 * 24 * 60},
              {"method" => "email", "minutes" => 24 * 60},
              {"method" => "popup", "minutes" => 24 * 60},
            ],
          },
        }.to_json).as_h
      end

      private def description_for(event : Domain::AcademicEvent) : String
        label = event.exam? ? "Prova" : "Trabalho"
        details = [label, event.description].compact
        details.join("\n\n")
      end
    end
  end
end

