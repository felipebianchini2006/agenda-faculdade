require "../spec_helper"

def build_config(app_env = "production")
  AgendaFaculdade::Config.new(
    app_env: app_env,
    port: 4000,
    frontend_origin: "https://calendario.felipeb.tech",
    app_base_url: "https://calendario.felipeb.tech",
    database_url: "postgres://agenda:agenda@postgres:5432/agenda_faculdade",
    session_secret: "production-session-secret-value-123456",
    token_encryption_key: "production-token-secret-value-123456",
    admin_bootstrap_email: "admin@example.com",
    google_client_id: "google-client-id",
    google_client_secret: "google-client-secret",
    google_oauth_authorize_url: "https://accounts.google.com/o/oauth2/v2/auth",
    google_oauth_token_url: "https://oauth2.googleapis.com/token",
    google_userinfo_url: "https://openidconnect.googleapis.com/v1/userinfo",
    google_calendar_api_base_url: "https://www.googleapis.com/calendar/v3"
  )
end

describe AgendaFaculdade::Config do
  it "accepts production config when secrets and origins are explicit" do
    build_config.validate!.should be_nil
  end

  it "rejects placeholder production secrets" do
    config = build_config
    config = AgendaFaculdade::Config.new(
      app_env: config.app_env,
      port: config.port,
      frontend_origin: config.frontend_origin,
      app_base_url: config.app_base_url,
      database_url: config.database_url,
      session_secret: "dev-session-secret-change-me",
      token_encryption_key: config.token_encryption_key,
      admin_bootstrap_email: config.admin_bootstrap_email,
      google_client_id: config.google_client_id,
      google_client_secret: config.google_client_secret,
      google_oauth_authorize_url: config.google_oauth_authorize_url,
      google_oauth_token_url: config.google_oauth_token_url,
      google_userinfo_url: config.google_userinfo_url,
      google_calendar_api_base_url: config.google_calendar_api_base_url
    )

    expect_raises(ArgumentError, /SESSION_SECRET/) do
      config.validate!
    end
  end

  it "rejects non-https production origins" do
    config = build_config
    config = AgendaFaculdade::Config.new(
      app_env: config.app_env,
      port: config.port,
      frontend_origin: "http://calendario.felipeb.tech",
      app_base_url: config.app_base_url,
      database_url: config.database_url,
      session_secret: config.session_secret,
      token_encryption_key: config.token_encryption_key,
      admin_bootstrap_email: config.admin_bootstrap_email,
      google_client_id: config.google_client_id,
      google_client_secret: config.google_client_secret,
      google_oauth_authorize_url: config.google_oauth_authorize_url,
      google_oauth_token_url: config.google_oauth_token_url,
      google_userinfo_url: config.google_userinfo_url,
      google_calendar_api_base_url: config.google_calendar_api_base_url
    )

    expect_raises(ArgumentError, /FRONTEND_ORIGIN/) do
      config.validate!
    end
  end
end
