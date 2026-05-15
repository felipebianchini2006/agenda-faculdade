require "db"
require "digest/sha256"
require "json"
require "pg"
require "./id_generator"

module AgendaFaculdade
  module Infrastructure
    class CalendarConnection
      getter user_id, encrypted_refresh_token, scopes, token_expires_at, status

      def initialize(
        @user_id : String,
        @encrypted_refresh_token : String,
        @scopes : String,
        @token_expires_at : Time?,
        @status : String
      )
      end
    end

    class SyncJob
      getter id, user_id, academic_event_id, action

      def initialize(@id : String, @user_id : String, @academic_event_id : String, @action : String)
      end
    end

    class SyncRecord
      getter user_id, academic_event_id, google_event_id, status

      def initialize(@user_id : String, @academic_event_id : String, @google_event_id : String?, @status : String)
      end
    end

    class PostgresStore
      @db : DB::Database

      getter db

      def initialize(database_url : String)
        @db = DB.open(database_url)
      end

      def migrate! : Nil
        Dir.glob("db/migrations/*.sql").sort.each do |path|
          File.read(path).split(";").each do |statement|
            sql = statement.strip
            @db.exec(sql) unless sql.empty?
          end
        end
      end

      def close : Nil
        @db.close
      end

      def upsert_user_from_google(google_sub : String, email : String, name : String, avatar_url : String?, admin_email : String) : Domain::User
        existing = find_user_by_google_sub(google_sub) || find_user_by_email(email)
        if existing
          @db.exec(
            "UPDATE users SET email = $1, name = $2, avatar_url = $3, updated_at = NOW() WHERE id = $4",
            email.downcase.strip,
            name.strip.empty? ? email.downcase.strip : name.strip,
            avatar_url,
            existing.id
          )
          return find_user_by_id(existing.id).not_nil!
        end

        user = Domain::User.bootstrap(
          id: IdGenerator.generate("usr"),
          email: email,
          name: name,
          google_sub: google_sub,
          admin_email: admin_email,
          avatar_url: avatar_url
        )

        begin
          @db.exec(
            "INSERT INTO users (id, email, google_sub, name, avatar_url, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            user.id,
            user.email,
            user.google_sub,
            user.name,
            user.avatar_url,
            user.role.to_db,
            user.status.to_db
          )
        rescue ex
          raced_user = find_user_by_google_sub(google_sub) || find_user_by_email(email)
          raise ex unless raced_user

          @db.exec(
            "UPDATE users SET email = $1, name = $2, avatar_url = $3, updated_at = NOW() WHERE id = $4",
            user.email,
            user.name,
            user.avatar_url,
            raced_user.id
          )
          return find_user_by_id(raced_user.id).not_nil!
        end
        user
      end

      def find_user_by_id(id : String) : Domain::User?
        @db.query_one?(
          "SELECT id, email, google_sub, name, avatar_url, role, status FROM users WHERE id = $1",
          id,
          as: {String, String, String, String, String?, String, String}
        ).try { |row| user_from_row(row) }
      end

      def find_user_by_email(email : String) : Domain::User?
        @db.query_one?(
          "SELECT id, email, google_sub, name, avatar_url, role, status FROM users WHERE email = $1",
          email.downcase.strip,
          as: {String, String, String, String, String?, String, String}
        ).try { |row| user_from_row(row) }
      end

      def find_user_by_google_sub(google_sub : String) : Domain::User?
        @db.query_one?(
          "SELECT id, email, google_sub, name, avatar_url, role, status FROM users WHERE google_sub = $1",
          google_sub,
          as: {String, String, String, String, String?, String, String}
        ).try { |row| user_from_row(row) }
      end

      def list_users : Array(Domain::User)
        users = [] of Domain::User
        @db.query("SELECT id, email, google_sub, name, avatar_url, role, status FROM users ORDER BY created_at ASC") do |rs|
          rs.each { users << read_user(rs) }
        end
        users
      end

      def update_user(id : String, role : Domain::UserRole, status : Domain::UserStatus) : Domain::User?
        @db.exec("UPDATE users SET role = $1, status = $2, updated_at = NOW() WHERE id = $3", role.to_db, status.to_db, id)
        find_user_by_id(id)
      end

      def create_session(user_id : String, expires_at : Time) : String
        token = Random::Secure.urlsafe_base64(48)
        @db.exec(
          "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
          IdGenerator.generate("ses"),
          user_id,
          Digest::SHA256.hexdigest(token),
          expires_at
        )
        token
      end

      def find_user_by_session_token(token : String) : Domain::User?
        @db.query_one?(
          "SELECT u.id, u.email, u.google_sub, u.name, u.avatar_url, u.role, u.status FROM users u INNER JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > NOW()",
          Digest::SHA256.hexdigest(token),
          as: {String, String, String, String, String?, String, String}
        ).try { |row| user_from_row(row) }
      end

      def delete_session(token : String) : Nil
        @db.exec("DELETE FROM sessions WHERE token_hash = $1", Digest::SHA256.hexdigest(token))
      end

      def upsert_calendar_connection(user_id : String, encrypted_refresh_token : String, scopes : String, token_expires_at : Time?) : Nil
        @db.exec(
          "INSERT INTO google_calendar_connections (user_id, encrypted_refresh_token, scopes, token_expires_at, status) VALUES ($1, $2, $3, $4, 'active') ON CONFLICT (user_id) DO UPDATE SET encrypted_refresh_token = EXCLUDED.encrypted_refresh_token, scopes = EXCLUDED.scopes, token_expires_at = EXCLUDED.token_expires_at, status = 'active', updated_at = NOW()",
          user_id,
          encrypted_refresh_token,
          scopes,
          token_expires_at
        )
      end

      def calendar_connected?(user_id : String) : Bool
        @db.query_one("SELECT COUNT(*) FROM google_calendar_connections WHERE user_id = $1 AND status = 'active'", user_id, as: Int64) > 0
      end

      def delete_calendar_connection(user_id : String) : Nil
        @db.exec("DELETE FROM google_calendar_connections WHERE user_id = $1", user_id)
      end

      def find_calendar_connection(user_id : String) : CalendarConnection?
        @db.query_one?(
          "SELECT user_id, encrypted_refresh_token, scopes, token_expires_at, status FROM google_calendar_connections WHERE user_id = $1 AND status = 'active'",
          user_id,
          as: {String, String, String, Time?, String}
        ).try do |row|
          CalendarConnection.new(row[0], row[1], row[2], row[3], row[4])
        end
      end

      def list_events(include_deleted : Bool = false) : Array(Domain::AcademicEvent)
        events = [] of Domain::AcademicEvent
        sql = include_deleted ? "SELECT id, title, kind, subject, starts_at, ends_at, description, location, status, created_by FROM academic_events ORDER BY starts_at ASC" : "SELECT id, title, kind, subject, starts_at, ends_at, description, location, status, created_by FROM academic_events WHERE status = 'active' ORDER BY starts_at ASC"
        @db.query(sql) do |rs|
          rs.each { events << read_event(rs) }
        end
        events
      end

      def find_event(id : String) : Domain::AcademicEvent?
        @db.query_one?(
          "SELECT id, title, kind, subject, starts_at, ends_at, description, location, status, created_by FROM academic_events WHERE id = $1",
          id,
          as: {String, String, String, String, Time, Time, String?, String?, String, String}
        ).try { |row| event_from_row(row) }
      end

      def create_event(event : Domain::AcademicEvent) : Domain::AcademicEvent
        @db.exec(
          "INSERT INTO academic_events (id, title, kind, subject, starts_at, ends_at, description, location, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
          event.id,
          event.title,
          event.kind.to_db,
          event.subject,
          event.starts_at,
          event.ends_at,
          event.description,
          event.location,
          event.status.to_db,
          event.created_by
        )
        event
      end

      def update_event(event : Domain::AcademicEvent) : Domain::AcademicEvent
        @db.exec(
          "UPDATE academic_events SET title = $1, kind = $2, subject = $3, starts_at = $4, ends_at = $5, description = $6, location = $7, status = $8, updated_at = NOW() WHERE id = $9",
          event.title,
          event.kind.to_db,
          event.subject,
          event.starts_at,
          event.ends_at,
          event.description,
          event.location,
          event.status.to_db,
          event.id
        )
        event
      end

      def enqueue_sync_for_event(event_id : String, action : String) : Nil
        @db.query("SELECT user_id FROM google_calendar_connections WHERE status = 'active'") do |rs|
          rs.each do
            user_id = rs.read(String)
            enqueue_sync(user_id, event_id, action)
          end
        end
      end

      def enqueue_all_events_for_user(user_id : String) : Nil
        @db.query("SELECT id FROM academic_events WHERE status = 'active'") do |rs|
          rs.each do
            enqueue_sync(user_id, rs.read(String), "upsert")
          end
        end
      end

      def enqueue_sync(user_id : String, event_id : String, action : String) : Nil
        @db.exec(
          "INSERT INTO calendar_event_syncs (user_id, academic_event_id, status) VALUES ($1, $2, 'pending') ON CONFLICT (user_id, academic_event_id) DO UPDATE SET status = 'pending', updated_at = NOW()",
          user_id,
          event_id
        )
        @db.exec(
          "INSERT INTO sync_jobs (id, user_id, academic_event_id, action, status) VALUES ($1, $2, $3, $4, 'pending')",
          IdGenerator.generate("job"),
          user_id,
          event_id,
          action
        )
      end

      def pending_sync_jobs(limit : Int32) : Array(SyncJob)
        jobs = [] of SyncJob
        @db.query(
          "SELECT id, user_id, academic_event_id, action FROM sync_jobs WHERE status = 'pending' AND available_at <= NOW() ORDER BY created_at ASC LIMIT $1",
          limit
        ) do |rs|
          rs.each do
            jobs << SyncJob.new(rs.read(String), rs.read(String), rs.read(String), rs.read(String))
          end
        end
        jobs
      end

      def mark_job_processing(job_id : String) : Nil
        @db.exec("UPDATE sync_jobs SET status = 'processing', attempts = attempts + 1, updated_at = NOW() WHERE id = $1", job_id)
      end

      def mark_job_done(job_id : String) : Nil
        @db.exec("UPDATE sync_jobs SET status = 'done', updated_at = NOW() WHERE id = $1", job_id)
      end

      def mark_job_failed(job_id : String, error : String) : Nil
        @db.exec(
          "UPDATE sync_jobs SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END, last_error = $1, available_at = NOW() + INTERVAL '30 seconds', updated_at = NOW() WHERE id = $2",
          error[0, Math.min(error.size, 500)],
          job_id
        )
      end

      def find_sync_record(user_id : String, event_id : String) : SyncRecord?
        @db.query_one?(
          "SELECT user_id, academic_event_id, google_event_id, status FROM calendar_event_syncs WHERE user_id = $1 AND academic_event_id = $2",
          user_id,
          event_id,
          as: {String, String, String?, String}
        ).try { |row| SyncRecord.new(row[0], row[1], row[2], row[3]) }
      end

      def mark_sync_success(user_id : String, event_id : String, google_event_id : String?, status : String = "synced") : Nil
        @db.exec(
          "INSERT INTO calendar_event_syncs (user_id, academic_event_id, google_event_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, academic_event_id) DO UPDATE SET google_event_id = COALESCE(EXCLUDED.google_event_id, calendar_event_syncs.google_event_id), status = EXCLUDED.status, last_error = NULL, updated_at = NOW()",
          user_id,
          event_id,
          google_event_id,
          status
        )
      end

      def mark_sync_failure(user_id : String, event_id : String, error : String) : Nil
        @db.exec(
          "INSERT INTO calendar_event_syncs (user_id, academic_event_id, status, retry_count, last_error) VALUES ($1, $2, 'failed', 1, $3) ON CONFLICT (user_id, academic_event_id) DO UPDATE SET status = 'failed', retry_count = calendar_event_syncs.retry_count + 1, last_error = EXCLUDED.last_error, updated_at = NOW()",
          user_id,
          event_id,
          error[0, Math.min(error.size, 500)]
        )
      end

      def record_fake_calendar_request(user_id : String, event_id : String, action : String, google_event_id : String?, payload : JSON::Any?) : Nil
        @db.exec(
          "INSERT INTO fake_calendar_requests (id, user_id, academic_event_id, action, google_event_id, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
          IdGenerator.generate("fake"),
          user_id,
          event_id,
          action,
          google_event_id,
          payload.try(&.to_json)
        )
      end

      def list_fake_calendar_requests : Array(Hash(String, JSON::Any))
        requests = [] of Hash(String, JSON::Any)
        @db.query("SELECT user_id, academic_event_id, action, google_event_id, payload::text, created_at FROM fake_calendar_requests ORDER BY created_at ASC") do |rs|
          rs.each do
            requests << JSON.parse({
              "userId" => rs.read(String),
              "academicEventId" => rs.read(String),
              "action" => rs.read(String),
              "googleEventId" => rs.read(String?),
              "payload" => JSON.parse(rs.read(String?) || "null"),
              "createdAt" => rs.read(Time).to_rfc3339,
            }.to_json).as_h
          end
        end
        requests
      end

      def reset_test_data! : Nil
        @db.exec("TRUNCATE fake_calendar_requests, sync_jobs, calendar_event_syncs, academic_events, google_calendar_connections, sessions, users RESTART IDENTITY CASCADE")
      end

      private def read_user(rs) : Domain::User
        Domain::User.new(
          id: rs.read(String),
          email: rs.read(String),
          google_sub: rs.read(String),
          name: rs.read(String),
          avatar_url: rs.read(String?),
          role: Domain::UserRole.from_db(rs.read(String)),
          status: Domain::UserStatus.from_db(rs.read(String))
        )
      end

      private def user_from_row(row) : Domain::User
        Domain::User.new(
          id: row[0],
          email: row[1],
          google_sub: row[2],
          name: row[3],
          avatar_url: row[4],
          role: Domain::UserRole.from_db(row[5]),
          status: Domain::UserStatus.from_db(row[6])
        )
      end

      private def read_event(rs) : Domain::AcademicEvent
        Domain::AcademicEvent.new(
          id: rs.read(String),
          title: rs.read(String),
          kind: Domain::AcademicEventKind.from_db(rs.read(String)),
          subject: rs.read(String),
          starts_at: rs.read(Time),
          ends_at: rs.read(Time),
          description: rs.read(String?),
          location: rs.read(String?),
          status: Domain::AcademicEventStatus.from_db(rs.read(String)),
          created_by: rs.read(String)
        )
      end

      private def event_from_row(row) : Domain::AcademicEvent
        Domain::AcademicEvent.new(
          id: row[0],
          title: row[1],
          kind: Domain::AcademicEventKind.from_db(row[2]),
          subject: row[3],
          starts_at: row[4],
          ends_at: row[5],
          description: row[6],
          location: row[7],
          status: Domain::AcademicEventStatus.from_db(row[8]),
          created_by: row[9]
        )
      end
    end
  end
end
