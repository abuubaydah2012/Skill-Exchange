/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  className = '',
}) => {
  return (
    <div
      className={`p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
          {value}
        </div>
        {(subValue || trend) && (
          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {trend && <span className="text-emerald-600 dark:text-emerald-400 font-medium">{trend}</span>}
            {subValue && <span>{subValue}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
