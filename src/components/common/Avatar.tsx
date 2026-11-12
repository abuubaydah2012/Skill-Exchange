/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  bgColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isVerified?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  bgColor = '#0284c7',
  size = 'md',
  isVerified = false,
  className = '',
}) => {
  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-medium',
    lg: 'w-14 h-14 text-base font-semibold',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  const badgeSizeClasses = {
    xs: 'w-2.5 h-2.5 -right-0.5 -bottom-0.5',
    sm: 'w-3 h-3 -right-0.5 -bottom-0.5',
    md: 'w-3.5 h-3.5 -right-0.5 -bottom-0.5',
    lg: 'w-4 h-4 right-0 bottom-0',
    xl: 'w-5 h-5 right-0.5 bottom-0.5',
  };

  return (
    <div className={`relative inline-flex shrink-0 select-none ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className={`${sizeClasses[size]} rounded-full object-cover border border-neutral-200 dark:border-neutral-800`}
        />
      ) : (
        <div
          style={{ backgroundColor: bgColor }}
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white tracking-wider shadow-inner`}
        >
          {getInitials(name)}
        </div>
      )}
      {isVerified && (
        <span
          title="Verified Profile"
          className={`absolute ${badgeSizeClasses[size]} bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400`}
        >
          <CheckCircle2 className="w-full h-full fill-current" />
        </span>
      )}
    </div>
  );
};
