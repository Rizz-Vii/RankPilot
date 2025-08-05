const { IncrementalCache } = require("next/dist/server/lib/incremental-cache");

class CustomIncrementalCache extends IncrementalCache {
  constructor(options) {
    super(options);

    // Configure cache for better performance on Windows
    this.cacheDirectory = options.dev ? "./.next/cache" : "./.next/cache";
    this.maxMemoryCacheSize = 50 * 1024 * 1024; // 50MB
    this.maxFileSystemCacheSize = 500 * 1024 * 1024; // 500MB
  }

  async get(_key, ctx) {
    try {
      return await super.get(_key, ctx);
    } catch (_error) {
      console.warn("Cache get _error:", _error.message);
      return null;
    }
  }

  async set(_key, _data, ctx) {
    try {
      return await super.set(_key, _data, ctx);
    } catch (_error) {
      console.warn("Cache set _error:", _error.message);
      return;
    }
  }
}

module.exports = CustomIncrementalCache;
