/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { BrandLogo } from '../common/BrandLogo';
import {
  Bell,
  Sun,
  Moon,
  RotateCcw,
  LogOut,
  User,
  ShieldCheck,
  Check,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const {
    currentUser,
    notifications,
    theme,
    toggleTheme,
    resetDemoData,
    loginWithDemoRole,
    logout,
    dashboardSearchQuery,
    setDashboardSearchQuery,
    triggerDashboardSearch,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  const [navSearch, setNavSearch] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const unreadCount = currentUser
    ? notifications.filter((n) => n.userId === currentUser.id && !n.isRead).length
    : 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentSearchValue = isDashboard ? dashboardSearchQuery : navSearch;

  const handleSearchChange = (value: string) => {
    if (isDashboard) {
      setDashboardSearchQuery(value);
    } else {
      setNavSearch(value);
    }
  };

  const handleSearchClear = () => {
    if (isDashboard) {
      setDashboardSearchQuery('');
    } else {
      setNavSearch('');
    }
    searchInputRef.current?.focus();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDashboard) {
      triggerDashboardSearch();
      return;
    }
    const trimmed = navSearch.trim();
    navigate(trimmed ? `/discover?q=${encodeURIComponent(trimmed)}` : '/discover');
  };

  const handleRoleSwitch = (role: UserRole) => {
    loginWithDemoRole(role);
    setShowRoleMenu(false);
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => navigate(currentUser?.role === 'admin' ? '/admin' : '/dashboard')}
            className="flex items-center text-left group cursor-pointer py-1 transition-opacity hover:opacity-80"
            aria-label="Skill Exchange Home"
          >
            <BrandLogo size="sm" />
          </button>
        </div>

        {/* Zone 2: Search Bar (In-place on Dashboard, navigates to Discover on submit elsewhere) */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={currentSearchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search skills, courses, or teachers..."
              aria-label="Search skills, courses, or teachers"
              className="w-full pl-9 pr-14 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-colors"
            />
            {currentSearchValue ? (
              <button
                type="button"
                onClick={handleSearchClear}
                aria-label="Clear search"
                className="absolute right-2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-200/60 dark:bg-neutral-800 rounded">
                /
              </kbd>
            )}
          </div>
        </form>

        {/* Zone 3: Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Demo Role Switcher */}
          {currentUser && (
            <div className="relative" ref={roleMenuRef}>
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                title="Switch Demo Role"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="capitalize">{currentUser.role}</span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">
                  (Demo Switch)
                </span>
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    Demo Role Profiles
                  </div>
                  <button
                    onClick={() => handleRoleSwitch('learner')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer"
                  >
                    <span>Elena Rostova (Learner)</span>
                    {currentUser.role === 'learner' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('teacher')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer"
                  >
                    <span>Marcus Vance (Teacher)</span>
                    {currentUser.role === 'teacher' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('admin')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer"
                  >
                    <span>Sarah Jenkins (Admin)</span>
                    {currentUser.role === 'admin' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle color mode"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          {currentUser && (
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              aria-label="View notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>
          )}

          {/* Profile Dropdown */}
          {currentUser ? (
            <div className="relative ml-1" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Avatar
                  name={currentUser.name}
                  avatarUrl={currentUser.avatarUrl}
                  bgColor={currentUser.avatarBgColor}
                  size="sm"
                  isVerified={currentUser.isProfileVerified}
                />
                <span className="hidden md:inline-block text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[120px]">
                  {currentUser.name}
                </span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50">
                  <div className="px-3.5 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {currentUser.email}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {currentUser.role}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate(`/profile/${currentUser.id}`);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-neutral-500" />
                    <span>My Public Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-neutral-500" />
                    <span>Settings & Security</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      resetDemoData();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer border-t border-neutral-100 dark:border-neutral-800"
                  >
                    <RotateCcw className="w-4 h-4 text-neutral-500" />
                    <span>Reset Demo Data</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
