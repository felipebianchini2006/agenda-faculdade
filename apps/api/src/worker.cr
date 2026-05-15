require "./agenda_faculdade"

config = AgendaFaculdade::Config.load
store = AgendaFaculdade::Infrastructure::PostgresStore.new(config.database_url)
cipher = AgendaFaculdade::Infrastructure::TokenCipher.new(config.token_encryption_key)
oauth = AgendaFaculdade::Infrastructure::GoogleOAuthClient.new(config)
calendar =
  if config.fake_google_calendar?
    AgendaFaculdade::Infrastructure::FakeCalendarClient.new(store)
  else
    AgendaFaculdade::Infrastructure::GoogleCalendarClient.new(config, oauth, cipher)
  end
sync = AgendaFaculdade::Application::SyncService.new(store, calendar, AgendaFaculdade::Application::CalendarPayloadBuilder.new)

loop do
  sync.process_due(25)
  sleep 5.seconds
end

