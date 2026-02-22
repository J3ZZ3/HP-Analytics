export const env = {
  PORT: Number(process.env.PORT || 8080),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT || 6379),
  JWT_SECRET: process.env.JWT_SECRET || "change_me",
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 100),
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
} as const;

if (!env.DATABASE_URL) {
  // In docker compose this is always set via env_file
}
