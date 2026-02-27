class MemoryCache {
  constructor({ update, ttl }) {
    this.updater = update;
    this.ttl = ttl;
    this.cache = new Map();
  }

  async update(key) {
    console.log('Debug - MemoryCache update called with key:', key);
    try {
      const value = await this.updater(key);
      console.log(
        'Debug - MemoryCache update result:',
        value ? 'Success' : 'Failed'
      );
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });
      return value;
    } catch (error) {
      console.error('MemoryCache update error:', error.message);
      throw error;
    }
  }

  async read(key) {
    console.log('Debug - MemoryCache read called with key:', key);
    const cached = this.cache.get(key);

    if (!cached || Date.now() - cached.timestamp > this.ttl * 1000) {
      console.log('Debug - Cache miss, updating...');
      return this.update(key);
    }

    console.log('Debug - Cache hit');
    return cached.value;
  }
}

module.exports = MemoryCache;
