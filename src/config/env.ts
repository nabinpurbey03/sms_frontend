import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .url('VITE_API_BASE_URL must be a valid URL')
    .default('http://localhost:8000'),
  VITE_API_VERSION: z
    .string()
    .regex(/^\//, 'VITE_API_VERSION must start with a forward slash (e.g. /api/v1)')
    .default('/api/v1'),
  VITE_TENANT_HEADER_NAME: z
    .string()
    .min(1, 'VITE_TENANT_HEADER_NAME is required')
    .default('X-Tenant-ID'),
  VITE_APP_NAME: z.string().default('Schools Up Pro'),
});

const parsedEnv = envSchema.safeParse(import.meta.env);

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment configuration:',
    parsedEnv.error.flatten().fieldErrors
  );
}

const rawConfig = parsedEnv.success ? parsedEnv.data : envSchema.parse({});

export const ENV = Object.freeze({
  API_BASE_URL: rawConfig.VITE_API_BASE_URL.replace(/\/$/, ''),
  API_VERSION: rawConfig.VITE_API_VERSION.replace(/\/$/, ''),
  TENANT_HEADER_NAME: rawConfig.VITE_TENANT_HEADER_NAME,
  APP_NAME: rawConfig.VITE_APP_NAME,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
});

export const getApiUrl = (endpoint = ''): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${ENV.API_BASE_URL}${ENV.API_VERSION}${cleanEndpoint}`;
};
