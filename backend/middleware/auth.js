/**
 * Middleware to check if user is authenticated
 */
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

/**
 * Middleware to verify cron request is from Cloud Scheduler
 * In production: requires X-Cloudscheduler header
 * In development: allows all requests (for manual testing)
 */
function verifyCronRequest(req, res, next) {
  // In production, verify the request is from Cloud Scheduler
  if (process.env.NODE_ENV === 'production') {
    const cronHeader = req.get('X-Cloudscheduler');
    if (!cronHeader) {
      return res.status(403).json({ error: 'Forbidden - X-Cloudscheduler header required' });
    }
  }
  // In development, allow all requests for manual testing
  next();
}

module.exports = {
  isAuthenticated,
  verifyCronRequest
};

