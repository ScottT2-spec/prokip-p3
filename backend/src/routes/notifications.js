const express = require('express');
const prisma = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// SSE: Real-time notification stream
// ============================================================

// In-memory map of userId → Set<Response> for SSE clients
const sseClients = new Map();

/**
 * Push a notification to all connected SSE clients for a user.
 * Called from points route after creating a notification.
 */
function pushToUser(userId, notification) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const data = JSON.stringify(notification);
  for (const res of clients) {
    res.write(`data: ${data}\n\n`);
  }
}

/**
 * GET /api/notifications/stream - SSE endpoint
 * Supports auth via Authorization header OR ?token= query param
 * (EventSource API doesn't support custom headers)
 */
router.get('/stream', (req, res, next) => {
  // Allow token via query param for SSE (EventSource limitation)
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, authenticate, (req, res) => {
  const userId = req.user.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx
  });

  // Send initial heartbeat
  res.write(': connected\n\n');

  // Register client
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(userId);
    }
  });
});

// ============================================================
// REST: Notification CRUD
// ============================================================

/**
 * GET /api/notifications - List user's notifications
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, unreadOnly } = req.query;

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') where.read = false;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit) || 20, 50),
      }),
      prisma.notification.count({
        where: { userId: req.user.id, read: false },
      }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PATCH /api/notifications/:id/read - Mark single as read
 */
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    res.json({ message: 'Marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PATCH /api/notifications/read-all - Mark all as read
 */
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.json({ message: 'All marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * DELETE /api/notifications/clear - Delete all read notifications
 */
router.delete('/clear', authenticate, async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.user.id, read: true },
    });

    res.json({ message: 'Cleared read notifications.' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = { router, pushToUser };
