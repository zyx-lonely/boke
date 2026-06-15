class LRUCache {
  constructor(maxSize = 100, maxAge = 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.misses++;
      return null;
    }
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, { data: item.data, timestamp: Date.now() });
    this.hits++;
    return item.data;
  }

  set(key, data) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`
    };
  }

  startCleanup(intervalMs = 30000) {
    return setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache) {
        if (now - item.timestamp > this.maxAge) {
          this.cache.delete(key);
        }
      }
    }, intervalMs);
  }
}

const dataCache = new LRUCache(100, 60 * 1000);

function getCachedData(key) {
  return dataCache.get(key);
}

function setCachedData(key, data) {
  dataCache.set(key, data);
}

function clearCache(key) {
  if (key) {
    dataCache.delete(key);
  } else {
    dataCache.clear();
  }
}

module.exports = { LRUCache, dataCache, getCachedData, setCachedData, clearCache };
