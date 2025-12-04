import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory (2 levels up from shared/config)
const envPath = resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/uaol',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10000', 10),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    clusterMode: process.env.REDIS_CLUSTER_MODE === 'true',
  },
  mq: {
    type: (process.env.MQ_TYPE || 'kafka') as 'kafka' | 'sqs',
    kafka: {
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    },
    sqs: {
      region: process.env.SQS_REGION || 'us-east-1',
      queueUrl: process.env.SQS_QUEUE_URL || '',
    },
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.S3_BUCKET_NAME || 'uaol-storage',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  apiGateway: {
    port: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
    rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100', 10),
  },
  services: {
    auth: {
      port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
    },
    toolRegistry: {
      port: parseInt(process.env.TOOL_REGISTRY_SERVICE_PORT || '3002', 10),
    },
    jobOrchestration: {
      port: parseInt(process.env.JOB_ORCHESTRATION_SERVICE_PORT || '3003', 10),
    },
    toolProxy: {
      port: parseInt(process.env.TOOL_PROXY_SERVICE_PORT || '3004', 10),
    },
    billing: {
      port: parseInt(process.env.BILLING_SERVICE_PORT || '3005', 10),
    },
    storage: {
      port: parseInt(process.env.STORAGE_SERVICE_PORT || '3006', 10),
    },
  },
  secrets: {
    managerType: (process.env.SECRETS_MANAGER_TYPE || 'aws-secrets-manager') as 'aws-secrets-manager' | 'vault',
    vault: {
      addr: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || '',
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
    },
  },
  env: process.env.NODE_ENV || 'development',
};

