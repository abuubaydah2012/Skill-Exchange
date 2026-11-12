/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile, UserRole } from '../../types';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  CheckCircle2,
  Lock,
  Unlock,
} from 'lucide-react';

export const AdminUsersView: React.FC = () => {
  const {
    users,
    currentUser,
    toggleUserSuspension,
    toggleUserVerification,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && u.isSuspended) return false;
    if (statusFilter === 'suspended' && !u.isSuspended) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          User Governance & Account Moderation
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Review user profiles, enforce suspensions for policy breaches, and verify accredited members.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or city..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
          >
            <option value="all">All Roles</option>
            <option value="learner">Learners</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Members</option>
            <option value="suspended">Suspended Accounts</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-950 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Teaching Skills</th>
                <th className="py-3.5 px-4">Sessions</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredUsers.map((u) => {
                const isCurrent = currentUser?.id === u.id;

                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 ${
                      u.isSuspended ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={u.name}
                          avatarUrl={u.avatarUrl}
                          bgColor={u.avatarBgColor}
                          size="sm"
                          isVerified={u.isProfileVerified}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] text-neutral-400 font-normal">
                                (You)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-500 truncate block max-w-xs">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 capitalize font-medium">
                      <Badge variant={u.role === 'admin' ? 'accent' : u.role === 'teacher' ? 'success' : 'neutral'}>
                        {u.role}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400">
                      {u.location}
                    </td>

                    <td className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300 font-mono tabular-nums">
                      {u.teachingSkills.length} skills listed
                    </td>

                    <td className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300 font-mono tabular-nums">
                      {u.completedSessionsCount}
                    </td>

                    <td className="py-3.5 px-4">
                      {u.isSuspended ? (
                        <Badge variant="error">Suspended</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle verification badge */}
                        <button
                          onClick={() => toggleUserVerification(u.id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                          title="Toggle verified badge"
                        >
                          {u.isProfileVerified ? 'Unverify' : 'Verify'}
                        </button>

                        {/* Suspension Toggle (Safeguarded) */}
                        <button
                          onClick={() => toggleUserSuspension(u.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                            u.isSuspended
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {u.isSuspended ? 'Reinstate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
