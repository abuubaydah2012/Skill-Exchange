/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { NotificationCategory, PlatformNotification } from '../../types';
import { Badge } from '../common/Badge';
import {
  Bell,
  CheckCheck,
  CalendarDays,
  Video,
  MessageSquare,
  Award,
  CreditCard,
  AlertTriangle,
  Megaphone,
  Check,
  ArrowRight,
} from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const {
    currentUser,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<'All' | NotificationCategory>('All');

  if (!currentUser) return null;

  // Filter for current user
  const userNotifications = notifications.filter((n) => n.userId === currentUser.id);

  const filteredNotifications = userNotifications.filter((n) => {
    if (selectedCategory !== 'All' && n.category !== selectedCategory) return false;
    return true;
  });

  const unreadTotal = userNotifications.filter((n) => !n.isRead).length;

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'Appointments':
        return <CalendarDays className="w-4 h-4 text-sky-500" />;
      case 'Sessions':
        return <Video className="w-4 h-4 text-emerald-500" />;
      case 'Messages':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'Verifications':
        return <Award className="w-4 h-4 text-amber-500" />;
      case 'Payments':
        return <CreditCard className="w-4 h-4 text-rose-500" />;
      case 'Complaints':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'Announcements':
        return <Megaphone className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-neutral-500" />;
    }
  };

  const categories: Array<'All' | NotificationCategory> = [
    'All',
    'Appointments',
    'Sessions',
    'Messages',
    'Verifications',
    'Payments',
    'Complaints',
    'Announcements',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Notification Center
            </h1>
            {unreadTotal > 0 && (
              <Badge variant="warning">{unreadTotal} Unread</Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Stay informed on session confirmations, swap proposals, payments, and verifications.
          </p>
        </div>

        {unreadTotal > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notification items */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <Bell className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              No notifications in this category
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              You are completely caught up!
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                notif.isRead
                  ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                  : 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/60 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getCategoryIcon(notif.category)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                      {notif.title}
                    </h3>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                    )}
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    {notif.message}
                  </p>

                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {new Date(notif.createdAt).toLocaleDateString()} at{' '}
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notif.actionUrl && (
                  <button
                    onClick={() => {
                      markNotificationAsRead(notif.id);
                      navigate(notif.actionUrl!);
                    }}
                    className="p-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {!notif.isRead && (
                  <button
                    onClick={() => markNotificationAsRead(notif.id)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
