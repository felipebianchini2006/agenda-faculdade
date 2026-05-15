module AgendaFaculdade
  class Config
    getter app_env,
      port,
      frontend_origin,
      app_base_url,
      database_url,
      session_secret,
      token_encryption_key,
      admin_bootstrap_email,
      google_client_id,
      google_client_secret,
      google_oauth_authorize_url,
      google_oauth_token_url,
      google_userinfo_url,
      google_calendar_api_base_url

    def initialize(
      @app_env : String,
      @port : Int32,
      @frontend_origin : String,
      @app_base_url : String,
      @database_url : String,
      @session_secret : String,
      @token_encryption_key : String,
      @admin_bootstrap_email : String,
      @google_client_id : String,
      @google_client_secret : String,
      @google_oauth_authorize_url : String,
      @google_oauth_token_url : String,
      @google_userinfo_url : String,
      @google_calendar_api_base_url : String
    )
    end

    def self.load : Config
      Config.new(
        app_env: env("APP_ENV", "development"),
        port: env("PORT", "4000").to_i,
        frontend_origin: env("FRONTEND_ORIGIN", "http://localhost:3000"),
        app_base_url: env("APP_BASE_URL", "http://localhost:4000"),
        database_url: env("DATABASE_URL", "postgres://agenda:agenda@localhost:5438/agenda_faculdade"),
        session_secret: env("SESSION_SECRET", "dev-session-secret-change-me"),
        token_encryption_key: env("OAUTH_TOKEN_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef"),
        admin_bootstrap_email: env("ADMIN_BOOTSTRAP_EMAIL", "felipebianchini02@gmail.com"),
        google_client_id: env("GOOGLE_CLIENT_ID", "replace-me"),
        google_client_secret: env("GOOGLE_CLIENT_SECRET", "replace-me"),
        google_oauth_authorize_url: env("GOOGLE_OAUTH_AUTHORIZE_URL", "https://accounts.google.com/o/oauth2/v2/auth"),
        google_oauth_token_url: env("GOOGLE_OAUTH_TOKEN_URL", "https://oauth2.googleapis.com/token"),
        google_userinfo_url: env("GOOGLE_USERINFO_URL", "https://openidconnect.googleapis.com/v1/userinfo"),
        google_calendar_api_base_url: env("GOOGLE_CALENDAR_API_BASE_URL", "https://www.googleapis.com/calendar/v3")
      )
    end

    def production? : Bool
      app_env == "production"
    end

    def test? : Bool
      app_env == "test"
    end

    def run_migrations? : Bool
      ENV["RUN_MIGRATIONS"]? == "true"
    end

    def test_auth_enabled? : Bool
      ENV["ENABLE_TEST_AUTH"]? == "true"
    end

    def fake_google_calendar? : Bool
      ENV["FAKE_GOOGLE_CALENDAR"]? == "true"
    end

    def sync_inline? : Bool
      ENV["SYNC_INLINE"]? == "true"
    end

    private def self.env(key : String, fallback : String) : String
      ENV[key]? || fallback
    end
  end
end

