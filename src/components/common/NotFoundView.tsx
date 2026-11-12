/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 mb-4">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
        Page Not Found (404)
      </h1>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
        The page you are looking for does not exist or has been moved to another skill directory.
      </p>
      <button
        onClick={() => navigate(currentUser?.role === 'admin' ? '/admin' : '/dashboard')}
        className="mt-6 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>
    </div>
  );
};
