/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'sm', className = '' }) => {
  const sizeStyles = {
    sm: {
      skill: 'text-[17px] leading-[0.95]',
      exchange: 'text-[10.5px] leading-none mt-[2px]',
    },
    md: {
      skill: 'text-xl leading-[0.95]',
      exchange: 'text-xs leading-none mt-[3px]',
    },
    lg: {
      skill: 'text-[26px] leading-[0.95]',
      exchange: 'text-[13px] leading-none mt-1',
    },
  }[size];

  return (
    <span
      className={`inline-flex flex-col items-start text-left select-none ${className}`}
      aria-label="Skill Exchange"
    >
      <span
        className={`font-extrabold tracking-tight text-neutral-900 dark:text-white ${sizeStyles.skill}`}
      >
        Skill
      </span>
      <span
        className={`font-semibold tracking-[0.04em] text-sky-600 dark:text-sky-400 ${sizeStyles.exchange}`}
      >
        Exchange
      </span>
    </span>
  );
};
