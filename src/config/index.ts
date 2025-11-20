
/**
 * Musubi - Configuration Management
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

export interface Config {
  supabase: {
    url: string;
    key: string;
  };
  notion: {
    apiKey: string;
    databaseId: string;
  };
  anthropic: {
    apiKey: string;
  };
  openai: {
    apiKey: string;
  };
  google: {
    apiKey: string;
  };
  github: {
    token: string;
  };
  cheki: {
    basePath: string | null;
    logDirectory: string;
    projects: {
      name: string;
      logFile: string;
      keywords: string[];
    }[];
  };
}

/**
 * Determine Cheki path based on environment
 */
function getChekiPath(): string | null {
  const envPath = process.env.CHEKI_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  // Try desktop path
  const desktopPath = 'D:/n8n-log-collector';
  if (existsSync(desktopPath)) {
    return desktopPath;
  }

  // Try laptop path
  const laptopPath = 'C:/Users/emoto/n8n-log-collector';
  if (existsSync(laptopPath)) {
    return laptopPath;
  }

  // Return null if not found (Cheki is optional)
  return null;
}

/**
 * Application configuration
 */
export const appConfig: Config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || '',
  },
  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
    databaseId: process.env.NOTION_DATABASE_ID || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
  },
  github: {
    token: process.env.GITHUB_TOKEN || '',
  },
  cheki: {
    basePath: getChekiPath(),
    logDirectory: 'logs',
    projects: [
      {
        name: 'jarvis',
        logFile: 'jarvis/jarvis-dev.log',
        keywords: ['jarvis', 'ジャーヴィス', 'assistant', 'ai assistant'],
      },
      {
        name: 'checkie',
        logFile: 'checkie/checkie-dev.log',
        keywords: ['checkie', 'チェキ', 'log collector', 'data collection', 'n8n'],
      },
      {
        name: 'musubi',
        logFile: 'musubi/musubi-dev.log',
        keywords: ['musubi', 'ムスビ', 'autonomous', 'self-improving', 'zero person'],
      },
    ],
  },
};

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!appConfig.supabase.url) {
    errors.push('SUPABASE_URL is not set');
  }
  if (!appConfig.supabase.key) {
    errors.push('SUPABASE_KEY is not set');
  }
  // Notion is optional
  // Anthropic is optional if using other providers
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export default appConfig;
