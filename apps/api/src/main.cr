require "./agenda_faculdade"

config = AgendaFaculdade::Config.load
store = AgendaFaculdade::Infrastructure::PostgresStore.new(config.database_url)
store.migrate! if config.run_migrations?

Kemal.config.env = config.test? ? "development" : config.app_env
Kemal.config.port = config.port
Kemal.config.host_binding = "0.0.0.0"

AgendaFaculdade::Interfaces::Http::App.new(config, store).mount
Kemal.run
