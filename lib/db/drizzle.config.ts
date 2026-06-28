import { defineConfig } from "drizzle-kit";
import path from "path";

// Load environment variables from root .env file
try {
  process.loadEnvFile(path.resolve(__dirname, "../../.env"));
} catch (e) {
  // Fallback for older Node versions or if the env file is missing
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
