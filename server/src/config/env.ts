import dotenv from "dotenv";
dotenv.config();

function require_env(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "4000", 10),

  // Auth
  JWT_SECRET: require_env("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",

  // Database
  DATABASE_URL: require_env("DATABASE_URL"),

  // Google Maps Platform
  GOOGLE_PLACES_API_KEY: require_env("GOOGLE_PLACES_API_KEY"),

  // CORS
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",

  // Session config
  DEFAULT_SEARCH_RADIUS_METERS: parseInt(
    process.env.DEFAULT_SEARCH_RADIUS_METERS ?? "2000",
    10,
  ),
  MAX_RESTAURANTS_PER_SESSION: parseInt(
    process.env.MAX_RESTAURANTS_PER_SESSION ?? "20",
    10,
  ),
} as const;
