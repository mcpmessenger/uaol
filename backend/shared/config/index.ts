// NOTE: dotenv.config() has been REMOVED from this file to prevent race conditions.
// Each service's index.ts must call dotenv.config() BEFORE importing this config module.
// This ensures process.env.DATABASE_URL is set before the database connection pool is created.

// Use getters to read from process.env dynamically (not cached)
export const config = {
  get database() {
    // ALWAYS log when getter is accessed for debugging
    process.stdout.write(`[Config] database.url getter accessed\n`);
    process.stdout.write(`[Config] process.env.DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}\n`);
    if (process.env.DATABASE_URL) {
      const urlForLogging = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
      process.stdout.write(`[Config] process.env.DATABASE_URL value: ${urlForLogging.substring(0, 60)}...\n`);
    }
    
    const url = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/uaol';
    process.stdout.write(`[Config] Returning URL: ${url.includes('localhost') ? 'LOCALHOST (FALLBACK)' : 'REMOTE'}\n`);
    
    // Debug: Log when getter is accessed (only for localhost to avoid spam)
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      console.log('[Config] ⚠️ WARNING: database.url getter returning localhost!');
      console.log('[Config] process.env.DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    }
    return {
      url: url,
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10000', 10),
    };
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
  get oauth() {
    // Return values directly from process.env - read fresh each time oauth getter is called
    const googleObj = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    };

    const outlookObj = {
      clientId: process.env.OUTLOOK_CLIENT_ID || '',
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
      redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/auth/outlook/callback',
      tenant: process.env.OUTLOOK_TENANT || 'common',
      scopes: [
        'openid',
        'email',
        'profile',
        'offline_access',
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/Calendars.Read',
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/Files.Read',
      ],
    };

    const icloudObj = {
      clientId: process.env.ICLOUD_CLIENT_ID || '',
      clientSecret: process.env.ICLOUD_CLIENT_SECRET || '',
      redirectUri: process.env.ICLOUD_REDIRECT_URI || 'http://localhost:3000/auth/icloud/callback',
      teamId: process.env.ICLOUD_TEAM_ID || '',
      keyId: process.env.ICLOUD_KEY_ID || '',
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.icloud.com/mail',
        'https://www.icloud.com/calendar',
        'https://www.icloud.com/drive',
      ],
    };

    return {
      google: googleObj,
      outlook: outlookObj,
      icloud: icloudObj,
    };
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

