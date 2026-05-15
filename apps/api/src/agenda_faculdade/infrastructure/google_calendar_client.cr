require "http/client"
require "json"
require "uri"

module AgendaFaculdade
  module Infrastructure
    abstract class CalendarClient
      abstract def insert(user_id : String, connection : CalendarConnection, event : Domain::AcademicEvent, payload : JSON::Any) : String
      abstract def update(user_id : String, connection : CalendarConnection, event : Domain::AcademicEvent, google_event_id : String, payload : JSON::Any) : String
      abstract def delete(user_id : String, connection : CalendarConnection, event : Domain::AcademicEvent, google_event_id : String) : Nil
    end

    class FakeCalendarClient < CalendarClient
      def initialize(@store : PostgresStore)
      end

      def insert(user_id : String, connection : CalendarConnection, event : Domain::AcademicEvent, payload : JSON::Any) : String
        google_event_id = "fake_#{event.id}_#{user_id}"
        @store.record_fake_calendar_request(user_id, event.id, "insert", google_event_id, payload)
        google_event_id
      end

      def update(user_id : String, connection : CalendarConnection, event : Domain::AcademicEvent, google_event_id : String, payload : JSON::Any) : String
        @store.record_fake_calendar_request(user_id, event.id, "update", google_event_id, payload)
        google_event_id
      end

      def delete(user_id : String, connection : CalendarConnection, event : Domain::AcademicEvent, google_event_id : String) : Nil
        @store.record_fake_calendar_request(user_id, event.id, "delete", google_event_id, nil)
      end
    end

    class GoogleCalendarClient < CalendarClient
      def initialize(@config : Config, @oauth : GoogleOAuthClient, @cipher : TokenCipher)
      end

      def insert(user_id : String, connection : CalendarConnection, event : Domain::AcademicEvent, payload : JSON::Any) : String
        response = HTTP::Client.post(events_url, auth_headers(connection), payload.to_json)
        raise "Calendar insert failed: #{response.status_code} #{response.body}" unless response.success?

        JSON.parse(response.body)["id"].as_s
      end

      def update(user_id : String, connection : CalendarConnection, event : Domain::AcademicEvent, google_event_id : String, payload : JSON::Any) : String
        response = HTTP::Client.put("#{events_url}/#{URI.encode_path_segment(google_event_id)}", auth_headers(connection), payload.to_json)
        raise "Calendar update failed: #{response.status_code} #{response.body}" unless response.success?

        JSON.parse(response.body)["id"].as_s
      end

      def delete(user_id : String, connection : CalendarConnection, event : Domain::AcademicEvent, google_event_id : String) : Nil
        response = HTTP::Client.delete("#{events_url}/#{URI.encode_path_segment(google_event_id)}", auth_headers(connection))
        raise "Calendar delete failed: #{response.status_code} #{response.body}" unless response.success? || response.status_code == 410 || response.status_code == 404
      end

      private def events_url : String
        "#{@config.google_calendar_api_base_url}/calendars/primary/events"
      end

      private def auth_headers(connection : CalendarConnection) : HTTP::Headers
        refresh_token = @cipher.decrypt(connection.encrypted_refresh_token)
        token = @oauth.refresh_access_token(refresh_token)
        HTTP::Headers{
          "Authorization" => "Bearer #{token.access_token}",
          "Content-Type" => "application/json",
        }
      end
    end
  end
end

