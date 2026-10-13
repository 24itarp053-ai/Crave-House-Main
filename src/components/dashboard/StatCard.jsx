import React from 'react';

/**
 * StatCard — reusable KPI summary card for dashboards.
 * @param {string} label
 * @param {string|number} value
 * @param {ReactNode} icon
 * @param {string} [accent] — optional accent color for the icon bg
 * @param {string} [prefix] — e.g. "₹"
 */
export default function StatCard({ label, value, icon, accent = '#d4a373', prefix = '' }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: accent + '18', color: accent }}>
        {icon}
      </div>
      <div className="stat-card-body">
        <span className="stat-card-value">{prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</span>
        <span className="stat-card-label">{label}</span>
      </div>
    </div>
  );
}
