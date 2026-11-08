export interface DrizzleConfig {
  schema: string;
  out: string;
  dialect: 'postgresql' | 'mysql' | 'sqlite';
  dbCredentials: {
    url: string;
  };
}

const config: DrizzleConfig = {
  schema: './src/lib/database/schema.ts',
  out: './src/lib/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
};

export default config;
