function envTrim(key: string): string {
  return (process.env[key] ?? '').trim()
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/worksync',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  },
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'WorkSync <noreply@worksync.app>',
  },
  invitationExpiryDays: parseInt(process.env.INVITATION_EXPIRY_DAYS ?? '7', 10),
  passwordResetExpiryMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES ?? '30', 10),
  trustProxy: envTrim('TRUST_PROXY'),
  rateLimit: {
    login: {
      windowMinutes: parseInt(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MINUTES ?? '15', 10),
      max: parseInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? '10', 10),
    },
    register: {
      windowMinutes: parseInt(process.env.AUTH_REGISTER_RATE_LIMIT_WINDOW_MINUTES ?? '60', 10),
      max: parseInt(process.env.AUTH_REGISTER_RATE_LIMIT_MAX ?? '5', 10),
    },
    forgot: {
      windowMinutes: parseInt(process.env.AUTH_FORGOT_RATE_LIMIT_WINDOW_MINUTES ?? '15', 10),
      max: parseInt(process.env.AUTH_FORGOT_RATE_LIMIT_MAX ?? '5', 10),
    },
    reset: {
      windowMinutes: parseInt(process.env.AUTH_RESET_RATE_LIMIT_WINDOW_MINUTES ?? '15', 10),
      max: parseInt(process.env.AUTH_RESET_RATE_LIMIT_MAX ?? '10', 10),
    },
  },
  cloudinary: {
    cloudName: envTrim('CLOUDINARY_CLOUD_NAME'),
    apiKey: envTrim('CLOUDINARY_API_KEY'),
    apiSecret: envTrim('CLOUDINARY_API_SECRET'),
  },
}
