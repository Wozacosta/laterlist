/**
 * Spaced repetition utilities for the learning tracker.
 *
 * Priority-scaled max intervals control how frequently a topic
 * should be reviewed. Higher priority = shorter max interval.
 */

/** Maximum days between reviews, indexed by priority (1-5). */
const MAX_INTERVAL_BY_PRIORITY: Record<number, number> = {
  1: 30, // lowest priority — up to 30 days between reviews
  2: 21,
  3: 14, // default
  4: 7,
  5: 3, // critical — review every 3 days max
};

/**
 * Returns the maximum allowed interval (in days) for a given priority.
 * Higher priority topics have shorter max intervals.
 */
export function maxInterval(priority: number): number {
  return MAX_INTERVAL_BY_PRIORITY[priority] ?? 14;
}

/**
 * Calculates urgency score for a topic.
 * urgency = daysSinceLastActivity / maxInterval(priority)
 * Values >= 1.0 mean the topic is overdue for review.
 */
export function urgency(
  daysSinceLastActivity: number,
  priority: number
): number {
  const max = maxInterval(priority);
  return max > 0 ? daysSinceLastActivity / max : 0;
}
