/**
 * Connection Pooling Optimization for Firebase and External APIs
 * Implements efficient connection management for scalability
 */

import { getApps, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

interface QueueItem {
  endpoint: string;
  options: RequestInit;
  resolve: (_value: unknown) => void;
  reject: (reason?: unknown) => void;
}


interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export const connectionPoolConfig: ConnectionPoolConfig = {
  maxConnections: process.env.NODE_ENV === 'production' ? 20 : 5,
  connectionTimeout: 30000, // 30 seconds
  idleTimeout: 300000, // 5 minutes
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

export class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private activeConnections: Map<string, any> = new Map();
  private connectionCounts: Map<string, number> = new Map();

  private constructor() { }

  static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  /**
   * Get optimized Firestore connection with pooling
   */
  getFirestoreConnection(appName: string = 'default') {
    const connectionKey = `firestore-${appName}`;

    if (this.activeConnections.has(connectionKey)) {
      this.incrementConnectionCount(connectionKey);
      return this.activeConnections.get(connectionKey);
    }

    try {
      // Initialize Firebase app if not exists
      let app;
      const existingApps = getApps();
      const existingApp = existingApps.find(a => a.name === appName);

      if (existingApp) {
        app = existingApp;
      } else {
        app = initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'rankpilot-h3jpc',
          // Add other config as needed
        }, appName);
      }

      const db = getFirestore(app);

      // Connect to emulator in development
      if (process.env.NODE_ENV === 'development' && !this.activeConnections.has(connectionKey)) {
        try {
          connectFirestoreEmulator(db, 'localhost', 8080);
        } catch (_error) {
          // Emulator already connected or not available
        }
      }

      this.activeConnections.set(connectionKey, db);
      this.incrementConnectionCount(connectionKey);

      // Set up connection cleanup
      this.scheduleConnectionCleanup(connectionKey);

      return db;
    } catch (error) {
      console.error(`Error creating Firestore connection for ${appName}:`, error);
      throw error;
    }
  }

  /**
   * Create HTTP connection pool for external APIs
   */
  createHttpPool(baseURL: string, options: Partial<ConnectionPoolConfig> = {}) {
    const config = { ...connectionPoolConfig, ...options };
    const poolKey = `http-${baseURL}`;

    if (this.activeConnections.has(poolKey)) {
      return this.activeConnections.get(poolKey);
    }

    // For Node.js environments, you could use 'undici' or 'http' pools
    // For browser environments, implement a simple request queue
    const pool = {
      baseURL,
      config,
      activeRequests: 0,
      queue: [] as QueueItem[],

      async request(endpoint: string, options: RequestInit = {}) {
        if (this.activeRequests >= config.maxConnections) {
          return new Promise((resolve, reject) => {
            this.queue.push({ endpoint, options, resolve, reject });
          });
        }

        return this.executeRequest(endpoint, options);
      },

      async executeRequest(endpoint: string, options: RequestInit) {
        this.activeRequests++;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), config.connectionTimeout);

          const _response = await fetch(`${baseURL}${endpoint}`, {
            ...options,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Process queue if available
          if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) {
              this.executeRequest(next.endpoint, next.options)
                .then(next.resolve)
                .catch(next.reject);
            }
          }

          return _response;
        } catch (error) {
          throw error;
        } finally {
          this.activeRequests--;
        }
      }
    };

    this.activeConnections.set(poolKey, pool);
    return pool;
  }

  /**
   * Monitor connection health and performance
   */
  getConnectionMetrics() {
    const metrics = {
      totalConnections: this.activeConnections.size,
      connectionCounts: Object.fromEntries(this.connectionCounts),
      connectionTypes: Array.from(this.activeConnections.keys()),
      memoryUsage: process.memoryUsage ? process.memoryUsage() : null,
    };

    return metrics;
  }

  /**
   * Cleanup idle connections
   */
  cleanupIdleConnections() {
    const now = Date.now();
    const idleThreshold = now - connectionPoolConfig.idleTimeout;

    for (const [_key, lastUsed] of this.connectionCounts.entries()) {
      if (lastUsed < idleThreshold) {
        this.activeConnections.delete(_key);
        this.connectionCounts.delete(_key);
        console.log(`Cleaned up idle connection: ${_key}`);
      }
    }
  }

  private incrementConnectionCount(_key: string) {
    this.connectionCounts.set(_key, Date.now());
  }

  private scheduleConnectionCleanup(_key: string) {
    setTimeout(() => {
      if (this.connectionCounts.has(_key)) {
        const lastUsed = this.connectionCounts.get(_key)!;
        const now = Date.now();

        if (now - lastUsed > connectionPoolConfig.idleTimeout) {
          this.activeConnections.delete(_key);
          this.connectionCounts.delete(_key);
          console.log(`Auto-cleaned connection: ${_key}`);
        }
      }
    }, connectionPoolConfig.idleTimeout);
  }
}

// Export singleton instance
export const connectionPool = ConnectionPoolManager.getInstance();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    connectionPool.cleanupIdleConnections();
  });
}
