// Fail fast at startup if required environment variables are missing.
for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    throw new Error(`Missing env var ${key}. Copy .env.example to .env and fill it in.`);
  }
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  isProd: process.env.NODE_ENV === 'production',
};
