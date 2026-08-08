export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  HASHIDS_SALT: string;
  S3_ENDPOINT: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_BUCKET: string;
  S3_REGION: string;
  APP_URL: string;
  EMAIL_DRIVER: string;
  EMAIL_SMTP_HOST: string;
  EMAIL_SMTP_PORT: string;
  EMAIL_SMTP_USER: string;
  EMAIL_SMTP_PASS: string;
  EMAIL_SMTP_SECURE: string;
  EMAIL_API_KEY: string;
  EMAIL_FROM_ADDRESS: string;
  EMAIL_FROM_NAME: string;
  ENVIRONMENT?: string;
  TURNSTILE_SECRET_KEY?: string;
}