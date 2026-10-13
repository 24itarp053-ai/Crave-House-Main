import React from 'react';

/**
 * StatusBadge — renders a colored pill badge for order/reservation status.
 * @param {string} status  — e.g. "Pending", "Completed", "Cancelled"
 */
const STATUS_STYLES = {
  Pending:     { bg: '#fff9e6', color: '#b08200', border: '#ffeeba' },
  Confirmed:   { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' },
  Preparing:   { bg: '#e3f2fd', color: '#1565c0', border: '#bbdefb' },
  Ready:       { bg: '#f3e5f5', color: '#6a1b9a', border: '#e1bee7' },
  Completed:   { bg: '#f1f8e9', color: '#33691e', border: '#dcedc8' },
  Cancelled:   { bg: '#fdf2f2', color: '#9b3a3a', border: '#f5c6cb' },
  Active:      { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' },
  Inactive:    { bg: '#f5f5f5', color: '#757575', border: '#e0e0e0' },
  Available:   { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' },
  Reserved:    { bg: '#fff9e6', color: '#b08200', border: '#ffeeba' },
  Occupied:    { bg: '#e3f2fd', color: '#1565c0', border: '#bbdefb' },
  Maintenance: { bg: '#fdf2f2', color: '#9b3a3a', border: '#f5c6cb' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: '#f5f5f5', color: '#555', border: '#ddd' };
  return (
    <span
      className="status-badge"
      style={{ background: style.bg, color: style.color, borderColor: style.border }}
    >
      {status}
    </span>
  );
}
