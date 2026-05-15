# Agenda Faculdade

Agenda academica para provas e trabalhos, com frontend Next.js, backend Crystal/Kemal, Postgres, PWA e sincronizacao por usuario com Google Calendar.

## Desenvolvimento

```bash
npm install
docker compose up --build postgres api
npm run dev:web
```

O frontend fica em `http://localhost:3000` e a API em `http://localhost:4000`.

## Deploy em VPS

1. Copie `.env.example` para `.env`.
2. Configure dominio, segredos e credenciais OAuth do Google.
3. No Google Cloud Console, cadastre os redirects:
   - `https://SEU_DOMINIO/auth/google/callback`
   - `https://SEU_DOMINIO/auth/google/calendar/callback`
4. Suba tudo:

```bash
docker compose --env-file .env up --build -d
```

O servico `proxy` publica a aplicacao em `HTTP_PORT` e encaminha `/api/*` e `/auth/*` para a API.

## Google OAuth em producao

Para liberar o app para qualquer usuario Google, publique e envie o app para verificacao no Google Cloud Console.

URLs publicas para preencher no OAuth consent screen:

- App home page: `https://calendario.felipeb.tech/sobre`
- Privacy policy: `https://calendario.felipeb.tech/privacidade`
- Terms of service: `https://calendario.felipeb.tech/termos`
- Authorized domain: `felipeb.tech`

Redirect URIs do OAuth client web:

- `https://calendario.felipeb.tech/auth/google/callback`
- `https://calendario.felipeb.tech/auth/google/calendar/callback`

Scopes usados pelo app:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/calendar.events.owned`

Justificativa do Calendar: a Agenda Faculdade cria, atualiza e remove eventos academicos no calendario principal do proprio usuario, para que ele receba lembretes do Google Calendar. O app nao le eventos pessoais existentes para exibicao no produto.

## Verificacao

```bash
npm run test --workspace @agenda/web
npm run lint --workspace @agenda/web
npm run build --workspace @agenda/web
docker compose run --rm api crystal spec
docker compose run --rm api crystal build src/main.cr -o /tmp/agenda-api
docker compose run --rm api crystal build src/worker.cr -o /tmp/agenda-worker
npm run e2e --workspace @agenda/web
```

O E2E usa `ENABLE_TEST_AUTH=true`, `FAKE_GOOGLE_CALENDAR=true` e valida desktop/mobile com Playwright.

