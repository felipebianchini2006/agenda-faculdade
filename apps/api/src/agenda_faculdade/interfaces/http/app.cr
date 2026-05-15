require "kemal"
require "json"
require "uri"

module AgendaFaculdade
  module Interfaces
    module Http
      class CorsHandler < Kemal::Handler
        def initialize(@origin : String)
        end

        def call(context)
          context.response.headers["Access-Control-Allow-Origin"] = @origin
          context.response.headers["Access-Control-Allow-Credentials"] = "true"
          context.response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Test-User-Email, X-Test-User-Name"
          context.response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
          context.response.headers["Vary"] = "Origin"

          if context.request.method == "OPTIONS"
            context.response.status_code = 204
            return
          end

          call_next(context)
        end
      end

      class OriginGuard
        SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

        def self.allowed?(method : String, origin : String?, allowed_origin : String) : Bool
          return true if SAFE_METHODS.includes?(method.upcase)
          return true unless origin

          normalize_origin(origin) == normalize_origin(allowed_origin)
        end

        private def self.normalize_origin(origin : String) : String
          origin.ends_with?("/") ? origin[0, origin.size - 1] : origin
        end
      end

      class OriginGuardHandler < Kemal::Handler
        def initialize(@origin : String)
        end

        def call(context)
          unless OriginGuard.allowed?(context.request.method, context.request.headers["Origin"]?, @origin)
            context.response.status_code = 403
            context.response.content_type = "application/json"
            context.response.print({"error" => "forbidden origin"}.to_json)
            return
          end

          call_next(context)
        end
      end

      class App
        SESSION_COOKIE = "agenda_session"

        def initialize(@config : Config, @store : Infrastructure::PostgresStore)
          @cipher = Infrastructure::TokenCipher.new(@config.token_encryption_key)
          @oauth = Infrastructure::GoogleOAuthClient.new(@config)
          @calendar = @config.fake_google_calendar? ? Infrastructure::FakeCalendarClient.new(@store) : Infrastructure::GoogleCalendarClient.new(@config, @oauth, @cipher)
          @sync = Application::SyncService.new(@store, @calendar, Application::CalendarPayloadBuilder.new)
        end

        def mount : Nil
          use CorsHandler.new(@config.frontend_origin)
          use OriginGuardHandler.new(@config.frontend_origin)

          options "/*" do |env|
            env.response.status_code = 204
            ""
          end

          get "/api/health" do |env|
            json(env, {"status" => "ok"})
          end

          get "/api/me" do |env|
            user = current_user(env)
            unless user
              next json(env, {"error" => "unauthorized"}, 401)
            end

            json(env, {"user" => user_json(user), "calendarConnected" => @store.calendar_connected?(user.id)})
          end

          post "/api/auth/logout" do |env|
            token = session_token(env)
            @store.delete_session(token) if token
            clear_session_cookie(env)
            json(env, {"ok" => true})
          end

          get "/auth/google/start" do |env|
            state = Infrastructure::IdGenerator.generate("state")
            set_cookie(env, "oauth_state", state, 600)
            env.redirect @oauth.auth_url(
              state,
              "/auth/google/callback",
              ["openid", "email", "profile"]
            )
          end

          get "/auth/google/callback" do |env|
            state = env.params.query["state"]?
            unless state && state == cookie_value(env, "oauth_state")
              clear_cookie(env, "oauth_state")
              next json(env, {"error" => "invalid oauth state"}, 400)
            end
            clear_cookie(env, "oauth_state")

            code = env.params.query["code"]?
            unless code
              next json(env, {"error" => "missing code"}, 400)
            end

            token = @oauth.exchange_code(code, "/auth/google/callback")
            identity = @oauth.fetch_identity(token.access_token)
            user = @store.upsert_user_from_google(identity.sub, identity.email, identity.name, identity.avatar_url, @config.admin_bootstrap_email)
            create_login_session(env, user)
            env.redirect @config.frontend_origin
          end

          get "/auth/google/calendar/start" do |env|
            user = require_user(env)
            next user unless user.is_a?(Domain::User)

            state = Infrastructure::IdGenerator.generate("state")
            set_cookie(env, "calendar_oauth_state", state, 600)
            env.redirect @oauth.auth_url(
              state,
              "/auth/google/calendar/callback",
              ["https://www.googleapis.com/auth/calendar.events.owned"],
              "offline",
              "consent"
            )
          end

          get "/auth/google/calendar/callback" do |env|
            user = require_user(env)
            next user unless user.is_a?(Domain::User)

            state = env.params.query["state"]?
            unless state && state == cookie_value(env, "calendar_oauth_state")
              clear_cookie(env, "calendar_oauth_state")
              next json(env, {"error" => "invalid oauth state"}, 400)
            end
            clear_cookie(env, "calendar_oauth_state")

            code = env.params.query["code"]?
            unless code
              next json(env, {"error" => "missing code"}, 400)
            end

            token = @oauth.exchange_code(code, "/auth/google/calendar/callback")
            unless token.refresh_token
              next json(env, {"error" => "Google did not return a refresh token. Try reconnecting with consent."}, 400)
            end

            expires_at = token.expires_in.try { |seconds| Time.utc + seconds.seconds }
            @store.upsert_calendar_connection(user.id, @cipher.encrypt(token.refresh_token.not_nil!), token.scope, expires_at)
            @sync.enqueue_all_for_user(user.id)
            @sync.process_due if @config.sync_inline?
            env.redirect @config.frontend_origin
          end

          post "/auth/google/calendar/disconnect" do |env|
            user = require_user(env)
            next user unless user.is_a?(Domain::User)

            @store.delete_calendar_connection(user.id)
            json(env, {"ok" => true})
          end

          get "/auth/test/login" do |env|
            next json(env, {"error" => "not found"}, 404) unless @config.test_auth_enabled?

            email = env.params.query["email"]? || @config.admin_bootstrap_email
            name = env.params.query["name"]? || email.split("@").first
            user = @store.upsert_user_from_google("test-#{email}", email, name, nil, @config.admin_bootstrap_email)
            create_login_session(env, user)
            env.redirect @config.frontend_origin
          end

          post "/auth/test/connect-calendar" do |env|
            next json(env, {"error" => "not found"}, 404) unless @config.test_auth_enabled?
            user = require_user(env)
            next user unless user.is_a?(Domain::User)

            @store.upsert_calendar_connection(user.id, @cipher.encrypt("fake-refresh-token-#{user.id}"), "calendar.events.owned", Time.utc + 1.hour)
            @sync.enqueue_all_for_user(user.id)
            @sync.process_due if @config.sync_inline?
            json(env, {"ok" => true})
          end

          get "/api/events" do |env|
            user = require_user(env)
            next user unless user.is_a?(Domain::User)

            json(env, {"events" => @store.list_events.map { |event| event_json(event) }})
          end

          post "/api/admin/events" do |env|
            user = require_admin(env)
            next user unless user.is_a?(Domain::User)

            payload = request_json(env)
            starts_at = Time.parse_rfc3339(payload["startsAt"].as_s)
            ends_at = payload["endsAt"]?.try { |value| Time.parse_rfc3339(value.as_s) } || starts_at + 1.hour
            event = Domain::AcademicEvent.create(
              id: Infrastructure::IdGenerator.generate("evt"),
              title: payload["title"].as_s,
              kind: Domain::AcademicEventKind.from_db(payload["kind"].as_s),
              subject: payload["subject"].as_s,
              starts_at: starts_at,
              ends_at: ends_at,
              description: payload["description"]?.try(&.as_s),
              location: payload["location"]?.try(&.as_s),
              created_by: user.id
            )
            @store.create_event(event)
            @sync.enqueue_event_changed(event.id, "upsert")
            @sync.process_due if @config.sync_inline?
            json(env, {"event" => event_json(event)}, 201)
          rescue ex : Domain::ValidationError
            json(env, {"error" => ex.message}, 422)
          end

          patch "/api/admin/events/:id" do |env|
            user = require_admin(env)
            next user unless user.is_a?(Domain::User)

            existing = @store.find_event(env.params.url["id"])
            next json(env, {"error" => "not found"}, 404) unless existing

            payload = request_json(env)
            starts_at = Time.parse_rfc3339(payload["startsAt"].as_s)
            ends_at = payload["endsAt"]?.try { |value| Time.parse_rfc3339(value.as_s) } || starts_at + 1.hour
            event = Domain::AcademicEvent.create(
              id: existing.id,
              title: payload["title"].as_s,
              kind: Domain::AcademicEventKind.from_db(payload["kind"].as_s),
              subject: payload["subject"].as_s,
              starts_at: starts_at,
              ends_at: ends_at,
              description: payload["description"]?.try(&.as_s),
              location: payload["location"]?.try(&.as_s),
              created_by: existing.created_by
            )
            @store.update_event(event)
            @sync.enqueue_event_changed(event.id, "upsert")
            @sync.process_due if @config.sync_inline?
            json(env, {"event" => event_json(event)})
          rescue ex : Domain::ValidationError
            json(env, {"error" => ex.message}, 422)
          end

          delete "/api/admin/events/:id" do |env|
            user = require_admin(env)
            next user unless user.is_a?(Domain::User)

            existing = @store.find_event(env.params.url["id"])
            next json(env, {"error" => "not found"}, 404) unless existing

            deleted = existing.soft_delete
            @store.update_event(deleted)
            @sync.enqueue_event_changed(deleted.id, "delete")
            @sync.process_due if @config.sync_inline?
            json(env, {"event" => event_json(deleted)})
          end

          get "/api/admin/users" do |env|
            user = require_admin(env)
            next user unless user.is_a?(Domain::User)

            json(env, {"users" => @store.list_users.map { |managed| user_json(managed) }})
          end

          patch "/api/admin/users/:id" do |env|
            user = require_admin(env)
            next user unless user.is_a?(Domain::User)

            payload = request_json(env)
            role = Domain::UserRole.from_db(payload["role"].as_s)
            status = Domain::UserStatus.from_db(payload["status"].as_s)
            managed = @store.update_user(env.params.url["id"], role, status)
            next json(env, {"error" => "not found"}, 404) unless managed

            json(env, {"user" => user_json(managed)})
          rescue ex : Domain::ValidationError
            json(env, {"error" => ex.message}, 422)
          end

          post "/api/admin/users/test-member" do |env|
            next json(env, {"error" => "not found"}, 404) unless @config.test_auth_enabled?
            user = require_admin(env)
            next user unless user.is_a?(Domain::User)

            managed = @store.upsert_user_from_google("test-colega@example.com", "colega@example.com", "Colega", nil, @config.admin_bootstrap_email)
            json(env, {"user" => user_json(managed)}, 201)
          end

          post "/api/test/reset" do |env|
            next json(env, {"error" => "not found"}, 404) unless @config.test_auth_enabled?

            @store.reset_test_data!
            json(env, {"ok" => true})
          end

          get "/api/test/calendar-requests" do |env|
            next json(env, {"error" => "not found"}, 404) unless @config.test_auth_enabled?

            json(env, {"requests" => @store.list_fake_calendar_requests})
          end
        end

        private def current_user(env) : Domain::User?
          test_user = current_test_user(env)
          return test_user if test_user

          token = session_token(env)
          return nil unless token

          user = @store.find_user_by_session_token(token)
          return nil unless user && user.can_access?

          user
        end

        private def current_test_user(env) : Domain::User?
          return nil unless @config.test_auth_enabled?

          email = env.request.headers["X-Test-User-Email"]?
          return nil unless email

          name = env.request.headers["X-Test-User-Name"]? || email.split("@").first
          user = @store.upsert_user_from_google("test-#{email}", email, name, nil, @config.admin_bootstrap_email)
          user.can_access? ? user : nil
        end

        private def require_user(env)
          current_user(env) || json(env, {"error" => "unauthorized"}, 401)
        end

        private def require_admin(env)
          user = current_user(env)
          return json(env, {"error" => "unauthorized"}, 401) unless user
          return json(env, {"error" => "forbidden"}, 403) unless user.admin?

          user
        end

        private def create_login_session(env, user : Domain::User) : Nil
          token = @store.create_session(user.id, Time.utc + 30.days)
          set_cookie(env, SESSION_COOKIE, token, 30 * 24 * 60 * 60)
        end

        private def session_token(env) : String?
          cookie_value(env, SESSION_COOKIE)
        end

        private def cookie_value(env, name : String) : String?
          env.request.cookies[name]?.try(&.value)
        end

        private def set_cookie(env, name : String, value : String, max_age : Int32, same_site : String = "Lax") : Nil
          parts = ["#{name}=#{URI.encode_www_form(value)}", "Path=/", "HttpOnly", "SameSite=#{same_site}", "Max-Age=#{max_age}"]
          parts << "Secure" if @config.production?
          env.response.headers.add("Set-Cookie", parts.join("; "))
        end

        private def clear_session_cookie(env) : Nil
          clear_cookie(env, SESSION_COOKIE)
        end

        private def clear_cookie(env, name : String, same_site : String = "Lax") : Nil
          parts = ["#{name}=;", "Path=/", "HttpOnly", "SameSite=#{same_site}", "Max-Age=0"]
          parts << "Secure" if @config.production?
          env.response.headers.add("Set-Cookie", parts.join("; "))
        end

        private def request_json(env) : JSON::Any
          body = env.request.body.try(&.gets_to_end) || "{}"
          JSON.parse(body)
        end

        private def json(env, payload, status : Int32 = 200) : String
          env.response.status_code = status
          env.response.content_type = "application/json"
          payload.to_json
        end

        private def user_json(user : Domain::User) : Hash(String, JSON::Any)
          JSON.parse({
            "id" => user.id,
            "email" => user.email,
            "name" => user.name,
            "avatarUrl" => user.avatar_url,
            "role" => user.role.to_db,
            "status" => user.status.to_db,
            "calendarConnected" => @store.calendar_connected?(user.id),
          }.to_json).as_h
        end

        private def event_json(event : Domain::AcademicEvent) : Hash(String, JSON::Any)
          JSON.parse({
            "id" => event.id,
            "title" => event.title,
            "kind" => event.kind.to_db,
            "subject" => event.subject,
            "startsAt" => event.starts_at.to_rfc3339,
            "endsAt" => event.ends_at.to_rfc3339,
            "description" => event.description,
            "location" => event.location,
            "status" => event.status.to_db,
          }.to_json).as_h
        end
      end
    end
  end
end
