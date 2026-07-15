// =====================================================
// CONVERTO — Notification Utilities
// =====================================================
// Shared between UserSide and ServerSide.
// Keep this file identical in both projects.
// =====================================================

/**
 * Formats an ISO date string into a human-readable relative time.
 * 
 * @example
 * formatRelativeTime('2026-07-15T10:00:00Z') // "5m ago"
 * formatRelativeTime('2026-07-14T10:00:00Z') // "1d ago"
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 30) return 'Just now';
  if (diffMins < 1) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate a message to a max length with ellipsis.
 */
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Get a category label for display.
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    system: 'System',
    request: 'Request',
    promo: 'Promo',
    security: 'Security',
    payment: 'Payment',
    chat: 'Chat',
  };
  return labels[category] || category;
}
