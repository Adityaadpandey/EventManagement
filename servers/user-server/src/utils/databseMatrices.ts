import { prisma } from "../config/db";

export async function getDatabaseMetrics() {
  try {
    const startTime = Date.now();

    // Basic health check
    const healthCheck = await prisma.$queryRaw`SELECT 1 as health_check`;
    const basicQueryTime = Date.now() - startTime;

    // Get available database statistics (only successful ones)
    const [basicStats, lockStats, cacheStats, customTableStats] =
      await Promise.all([
        getBasicStats(),
        getLockStats(),
        getCacheStats(),
        getCustomTableStats(),
      ]);

    return {
      status: "connected",
      healthCheck: healthCheck ? "passed" : "failed",
      responseTime: {
        ms: basicQueryTime,
      },
      database: basicStats,
      performance: {
        locks: lockStats,
        cache: cacheStats,
      },
      tables: customTableStats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Database connection failed",
      timestamp: new Date().toISOString(),
    };
  }
}

// Basic database information
async function getBasicStats() {
  try {
    const version =
      (await prisma.$queryRaw`SELECT version() as version`) as any[];
    const currentTime =
      (await prisma.$queryRaw`SELECT NOW() as current_time`) as any[];
    const timezone =
      (await prisma.$queryRaw`SELECT current_setting('timezone') as timezone`) as any[];

    return {
      version: version[0]?.version || "Unknown",
      currentTime: currentTime[0]?.current_time,
      timezone: timezone[0]?.timezone || "Unknown",
      connected: true,
    };
  } catch (error) {
    return {
      error: "Failed to fetch basic database info",
      connected: false,
    };
  }
}

// Get custom table statistics using your Prisma models
async function getCustomTableStats() {
  try {
    const tableStats = [];

    // Example: Get counts for your actual tables (replace with your model names)
    // You'll need to replace these with your actual Prisma model names

    // Generic approach - get table names from information_schema
    const tables = (await prisma.$queryRaw`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            LIMIT 10
        `) as any[];

    // For each table, try to get basic count
    for (const table of tables) {
      try {
        const tableName = table.table_name;
        const count = (await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${tableName}"`,
        )) as any[];

        tableStats.push({
          name: tableName,
          rowCount: parseInt(count[0]?.count || "0"),
          status: "accessible",
        });
      } catch (tableError) {
        tableStats.push({
          name: table.table_name,
          status: "inaccessible",
          error: "Cannot access table",
        });
      }
    }

    return {
      tables: tableStats,
      totalTables: tables.length,
    };
  } catch (error) {
    return {
      error: "Failed to fetch table information",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lock statistics (this one works in your setup)
async function getLockStats() {
  try {
    const locks = (await prisma.$queryRaw`
            SELECT
                mode,
                COUNT(*) as count
            FROM pg_locks
            GROUP BY mode
            ORDER BY count DESC
        `) as any[];

    // Simplified blocked queries check
    const currentConnections = (await prisma.$queryRaw`
            SELECT COUNT(*) as total_connections
            FROM pg_stat_activity
            WHERE pid != pg_backend_pid()
        `) as any[];

    return {
      byMode: locks.map((lock: any) => ({
        mode: lock.mode,
        count: parseInt(lock.count || "0"),
      })),
      totalLocks: locks.reduce(
        (sum: number, lock: any) => sum + parseInt(lock.count || "0"),
        0,
      ),
      activeConnections: parseInt(
        currentConnections[0]?.total_connections || "0",
      ),
    };
  } catch (error) {
    return {
      error: "Failed to fetch lock stats",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Cache hit ratio (this works in your setup)
async function getCacheStats() {
  try {
    // Get buffer cache hit ratio
    const bufferHits = (await prisma.$queryRaw`
            SELECT
                SUM(heap_blks_hit) as heap_hits,
                SUM(heap_blks_read) as heap_reads,
                CASE
                    WHEN SUM(heap_blks_hit + heap_blks_read) = 0 THEN 0
                    ELSE ROUND(SUM(heap_blks_hit) * 100.0 / SUM(heap_blks_hit + heap_blks_read), 2)
                END as hit_ratio
            FROM pg_statio_user_tables
        `) as any[];

    // Get shared buffer settings
    const sharedBuffers = (await prisma.$queryRaw`
            SELECT setting as shared_buffers
            FROM pg_settings
            WHERE name = 'shared_buffers'
        `) as any[];

    const effectiveCacheSize = (await prisma.$queryRaw`
            SELECT setting as effective_cache_size
            FROM pg_settings
            WHERE name = 'effective_cache_size'
        `) as any[];

    return {
      hitRatio: parseFloat(bufferHits[0]?.hit_ratio || "100").toFixed(2),
      heapHits: parseInt(bufferHits[0]?.heap_hits || "0"),
      heapReads: parseInt(bufferHits[0]?.heap_reads || "0"),
      settings: {
        sharedBuffers: sharedBuffers[0]?.shared_buffers || "Unknown",
        effectiveCacheSize:
          effectiveCacheSize[0]?.effective_cache_size || "Unknown",
      },
      status:
        parseFloat(bufferHits[0]?.hit_ratio || "100") > 95
          ? "good"
          : "needs_attention",
    };
  } catch (error) {
    return {
      error: "Failed to fetch cache stats",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
