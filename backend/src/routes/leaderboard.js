const express = require('express');
const prisma = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Simple in-memory cache
const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(department, search, limit) {
  return `lb:${department || 'all'}:${search || ''}:${limit}`;
}

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  if (entry) delete cache[key];
  return null;
}

function setCache(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

/**
 * GET /api/leaderboard
 * Returns ranked leaderboard of non-admin users by REWARD-category points only.
 * Tie-break: higher overall performance score (users.points) wins.
 * Query: department (ID), search (name), limit (default 50)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { department, search, limit: limitParam } = req.query;
    const limit = Math.min(parseInt(limitParam) || 50, 200);

    const cacheKey = getCacheKey(department, search, limit);
    const cached = getCached(cacheKey);

    let rankings;

    if (cached) {
      rankings = cached;
    } else {
      // Build WHERE conditions for the user filter
      const userWhere = [`u."role" != 'ADMIN'`];
      const params = [];
      let paramIndex = 1;

      if (department) {
        userWhere.push(`u."departmentId" = $${paramIndex}`);
        params.push(department);
        paramIndex++;
      }

      if (search) {
        userWhere.push(`(LOWER(u."firstName") LIKE $${paramIndex} OR LOWER(u."lastName") LIKE $${paramIndex})`);
        params.push(`%${search.toLowerCase()}%`);
        paramIndex++;
      }

      const whereClause = userWhere.join(' AND ');

      // Leaderboard query:
      // Only count points where category = 'REWARD'
      // Tie-break by total user points (overall performance), then name
      const query = `
        SELECT 
          u."id" AS "userId",
          u."firstName",
          u."lastName",
          u."points" AS "totalPoints",
          u."grade",
          u."avatarUrl",
          d."name" AS "department",
          COALESCE(SUM(CASE WHEN pl."category" = 'REWARD' THEN pl."points" ELSE 0 END), 0)::int AS "rewardPoints"
        FROM "users" u
        LEFT JOIN "departments" d ON u."departmentId" = d."id"
        LEFT JOIN "point_logs" pl ON pl."userId" = u."id"
        WHERE ${whereClause}
        GROUP BY u."id", u."firstName", u."lastName", u."points", u."grade", u."avatarUrl", d."name"
        ORDER BY "rewardPoints" DESC, u."points" DESC, u."firstName" ASC
      `;

      const rows = await prisma.$queryRawUnsafe(query, ...params);

      // Assign ranks (handle ties — same rewardPoints + totalPoints = same rank)
      rankings = [];
      let currentRank = 0;
      let prevReward = null;
      let prevTotal = null;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rewardPoints = Number(row.rewardPoints);
        const totalPoints = Number(row.totalPoints);

        if (rewardPoints !== prevReward || totalPoints !== prevTotal) {
          currentRank = i + 1;
        }

        rankings.push({
          rank: currentRank,
          userId: row.userId,
          firstName: row.firstName,
          lastName: row.lastName,
          department: row.department,
          avatarUrl: row.avatarUrl || null,
          rewardPoints,
          totalPoints,
          grade: row.grade,
        });

        prevReward = rewardPoints;
        prevTotal = totalPoints;
      }

      setCache(cacheKey, rankings);
    }

    // Determine authenticated user's rank
    const myEntry = rankings.find((r) => r.userId === req.user.id);
    let myRank = null;

    if (myEntry) {
      const nextRankEntry = rankings.find((r) => r.rank < myEntry.rank);
      const pointsToNext = nextRankEntry
        ? nextRankEntry.rewardPoints - myEntry.rewardPoints + 1
        : 0;

      myRank = {
        rank: myEntry.rank,
        rewardPoints: myEntry.rewardPoints,
        totalPoints: myEntry.totalPoints,
        pointsToNext,
      };
    }

    // Apply limit to the returned list
    const leaderboard = rankings.slice(0, limit);

    res.json({
      leaderboard,
      total: rankings.length,
      myRank,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
