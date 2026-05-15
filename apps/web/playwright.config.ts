import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "docker compose up --build --force-recreate postgres api",
      url: "http://127.0.0.1:4000/api/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        APP_ENV: "test",
        ENABLE_TEST_AUTH: "true",
        FAKE_GOOGLE_CALENDAR: "true",
        FRONTEND_ORIGIN: "http://localhost:3000",
        APP_BASE_URL: "http://127.0.0.1:4000",
        SYNC_INLINE: "true",
      },
    },
    {
      command: "npm run dev --workspace @agenda/web",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:4000",
        NEXT_PUBLIC_TEST_AUTH: "true",
      },
    },
  ],
});
