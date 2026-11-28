/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { skillApi, userApi } from '../../services/api';
import { ClassSession, UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Clock,
  Compass,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Users,
  Video,
  X,
} from 'lucide-react';

interface SearchSkillItem {
  id: string;
  name: string;
  category: string;
  description: string;
  proficiency: string;
  skillType: string;
  yearsExperience: number;
  freeSwapAvailable: boolean;
  paidLessonAvailable: boolean;
  hourlyPrice: number;
  availabilitySchedule: string;
  ownerId: string;
  ownerName: string;
  ownerRole?: string;
  ownerAvatarUrl?: string;
  ownerAvatarBgColor?: string;
  ownerLocation?: string;
  ownerRating?: number;
}

interface DashboardSearchResultsProps {
  query: string;
  submitCount: number;
  onClear: () => void;
}

export const DashboardSearchResults: React.FC<DashboardSearchResultsProps> = ({
  query,
  submitCount,
  onClear,
}) => {
  const { currentUser, classes, enrollInClass } = useApp();
  const navigate = useNavigate();

  const trimmedQuery = query.trim();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [skills, setSkills] = useState<SearchSkillItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState<number>(0);

  // Detail modals for clicked course or skill
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SearchSkillItem | null>(null);

  const lastSearchedRef = useRef<{ query: string; retryToken: number } | null>(null);
  const prevSubmitCountRef = useRef<number>(submitCount);

  // Local courses/classes matching from AppContext
  const matchingClasses = useMemo(() => {
    if (!trimmedQuery) return [];
    const q = trimmedQuery.toLowerCase();
    return classes.filter((cls) => {
      if (cls.status === 'Cancelled') return false;
      return (
        cls.title.toLowerCase().includes(q) ||
        cls.skillName.toLowerCase().includes(q) ||
        cls.category.toLowerCase().includes(q) ||
        cls.description.toLowerCase().includes(q) ||
        cls.teacherName.toLowerCase().includes(q)
      );
    });
  }, [classes, trimmedQuery]);

  useEffect(() => {
    if (!trimmedQuery) {
      setTeachers([]);
      setSkills([]);
      setError(null);
      setIsLoading(false);
      lastSearchedRef.current = null;
      return;
    }

    const isEnterTrigger = submitCount !== prevSubmitCountRef.current;
    prevSubmitCountRef.current = submitCount;

    // Avoid duplicate API calls if Enter is pressed for the exact same already-fetched query
    if (
      isEnterTrigger &&
      lastSearchedRef.current &&
      lastSearchedRef.current.query === trimmedQuery &&
      lastSearchedRef.current.retryToken === retryToken
    ) {
      return;
    }

    let cancelled = false;
    const delayMs = isEnterTrigger || retryToken > 0 ? 0 : 300;

    setIsLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        lastSearchedRef.current = { query: trimmedQuery, retryToken };
        const [usersRes, skillsRes] = await Promise.all([
          userApi.getUsers({ search: trimmedQuery }),
          skillApi.getSkills({ search: trimmedQuery }),
        ]);

        if (cancelled) return;

        if (!usersRes.success && !skillsRes.success) {
          setError(
            usersRes.message ||
              skillsRes.message ||
              'Unable to load search results from the server.'
          );
          setTeachers([]);
          setSkills([]);
          setIsLoading(false);
          return;
        }

        const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
        const normalizedTeachers: UserProfile[] = rawUsers
          .map((u: any) => ({
            ...u,
            id: u.id || u._id,
            teachingSkills: Array.isArray(u.teachingSkills) ? u.teachingSkills : [],
          }))
          .filter(
            (u: UserProfile) =>
              !u.isSuspended &&
              u.role !== 'admin' &&
              (!currentUser || u.id !== currentUser.id) &&
              (u.role === 'teacher' || u.teachingSkills.length > 0)
          );

        const rawSkills = Array.isArray(skillsRes.data) ? skillsRes.data : [];
        const normalizedSkills: SearchSkillItem[] = rawSkills.map((s: any) => {
          const owner = typeof s.userId === 'object' && s.userId !== null ? s.userId : null;
          return {
            id: s.id || s._id,
            name: s.name || '',
            category: s.category || 'General',
            description: s.description || '',
            proficiency: s.proficiency || 'Intermediate',
            skillType: s.skillType || 'Teaching',
            yearsExperience: s.yearsExperience ?? 1,
            freeSwapAvailable: Boolean(s.freeSwapAvailable),
            paidLessonAvailable: Boolean(s.paidLessonAvailable),
            hourlyPrice: s.hourlyPrice ?? 0,
            availabilitySchedule: s.availabilitySchedule || 'Flexible schedule',
            ownerId: owner ? owner._id || owner.id || '' : typeof s.userId === 'string' ? s.userId : '',
            ownerName: owner?.name || 'Instructor',
            ownerRole: owner?.role,
            ownerAvatarUrl: owner?.avatarUrl,
            ownerAvatarBgColor: owner?.avatarBgColor,
            ownerLocation: owner?.location,
            ownerRating: owner?.rating,
          };
        });

        setTeachers(normalizedTeachers);
        setSkills(normalizedSkills);
        setIsLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'An unexpected error occurred while searching.');
        setIsLoading(false);
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmedQuery, submitCount, retryToken, currentUser]);

  const totalCount = matchingClasses.length + skills.length + teachers.length;

  return (
    <div className="space-y-6">
      {/* Search Results Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
              Search results for &ldquo;{trimmedQuery}&rdquo;
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isLoading
                ? 'Searching courses, skills, and teachers...'
                : `${totalCount} ${totalCount === 1 ? 'result' : 'results'} found (${matchingClasses.length} courses, ${skills.length} skills, ${teachers.length} teachers)`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          <span>Clear Search</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-10 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-3 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Searching MongoDB directory for &ldquo;{trimmedQuery}&rdquo;...
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Search Request Failed
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRetryToken((t) => t + 1)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && totalCount === 0 && (
        <div className="p-10 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            No matching results found
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
            We couldn&apos;t find any courses, skills, or teachers matching &ldquo;{trimmedQuery}&rdquo;. Try a different keyword or clear the search to return to your dashboard.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onClear}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate(`/discover?q=${encodeURIComponent(trimmedQuery)}`)}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Browse Discover Skills</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Sections */}
      {!isLoading && !error && totalCount > 0 && (
        <div className="space-y-6">
          {/* 1. Courses & Workshops */}
          {matchingClasses.length > 0 && (
            <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Courses & Workshops ({matchingClasses.length})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {matchingClasses.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className="text-left p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500">
                      <span className="font-medium">{cls.category} · {cls.format}</span>
                      <Badge variant={cls.isFree ? 'success' : 'neutral'}>
                        {cls.isFree ? 'Free' : `$${cls.price} USD`}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white mt-1.5 line-clamp-1">
                      {cls.title}
                    </h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                      {cls.description}
                    </p>
                    <div className="mt-3 pt-2.5 border-t border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Instructor: <strong className="text-neutral-700 dark:text-neutral-300">{cls.teacherName}</strong></span>
                      <span>{cls.durationMinutes}m · {cls.enrolledUserIds.length}/{cls.capacity} enrolled</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 2. Skills */}
          {skills.length > 0 && (
            <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Skills ({skills.length})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => setSelectedSkill(skill)}
                    className="text-left p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-neutral-500 truncate">
                          {skill.category} · {skill.proficiency}
                        </span>
                        <Badge variant={skill.freeSwapAvailable ? 'success' : 'neutral'}>
                          {skill.freeSwapAvailable ? 'Free Swap' : `$${skill.hourlyPrice}/hr`}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white mt-1.5 line-clamp-1">
                        {skill.name}
                      </h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                        {skill.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
                      <span className="truncate">By <strong className="text-neutral-700 dark:text-neutral-300">{skill.ownerName}</strong></span>
                      <span className="text-sky-600 dark:text-sky-400 font-semibold shrink-0 ml-2">View Details</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 3. Teachers & Mentors */}
          {teachers.length > 0 && (
            <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Teachers & Mentors ({teachers.length})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => navigate(`/profile/${teacher.id}`)}
                    className="text-left p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            name={teacher.name}
                            avatarUrl={teacher.avatarUrl}
                            bgColor={teacher.avatarBgColor}
                            size="sm"
                            isVerified={teacher.isProfileVerified}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                              {teacher.name}
                            </h4>
                            <p className="text-[11px] text-neutral-500 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span>{teacher.location || 'Remote'}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{(teacher.rating ?? 0).toFixed(1)}</span>
                        </div>
                      </div>

                      {teacher.headline && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2">
                          {teacher.headline}
                        </p>
                      )}

                      {teacher.teachingSkills.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {teacher.teachingSkills.slice(0, 3).map((s) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500">
                        {teacher.reviewCount ?? 0} reviews
                      </span>
                      <span className="text-sky-600 dark:text-sky-400 font-semibold">
                        View Profile
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                  <span>{selectedClass.category}</span>
                  <span>·</span>
                  <span>{selectedClass.format}</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {selectedClass.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {selectedClass.description}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Instructor</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedClass.teacherName}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Pricing</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedClass.isFree ? 'Free Workshop' : `$${selectedClass.price} USD`}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-neutral-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Date</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {new Date(selectedClass.dateTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Duration & Seats</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedClass.durationMinutes}m · {selectedClass.enrolledUserIds.length}/{selectedClass.capacity}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
              {selectedClass.teacherId && (
                <button
                  type="button"
                  onClick={() => {
                    const tid = selectedClass.teacherId;
                    setSelectedClass(null);
                    navigate(`/profile/${tid}`);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg cursor-pointer"
                >
                  View Instructor
                </button>
              )}
              {selectedClass.isFree &&
                currentUser &&
                !selectedClass.enrolledUserIds.includes(currentUser.id) &&
                selectedClass.teacherId !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => {
                      enrollInClass(selectedClass.id);
                      setSelectedClass(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                  >
                    Enroll Free
                  </button>
                )}
              <button
                type="button"
                onClick={() => {
                  setSelectedClass(null);
                  navigate('/classes');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 cursor-pointer"
              >
                Open Live Classes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                  <span>{selectedSkill.category}</span>
                  <span>·</span>
                  <span>{selectedSkill.proficiency}</span>
                  <span>·</span>
                  <span>{selectedSkill.skillType}</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {selectedSkill.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSkill(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {selectedSkill.description}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Instructor</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedSkill.ownerName}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Exchange Option</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedSkill.freeSwapAvailable
                      ? selectedSkill.paidLessonAvailable
                        ? `Free Swap or $${selectedSkill.hourlyPrice}/hr`
                        : 'Free Skill Swap'
                      : `$${selectedSkill.hourlyPrice}/hr`}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Experience</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedSkill.yearsExperience} {selectedSkill.yearsExperience === 1 ? 'year' : 'years'}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Availability</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedSkill.availabilitySchedule}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedSkill(null)}
                className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
              {selectedSkill.ownerId && (
                <button
                  type="button"
                  onClick={() => {
                    const oid = selectedSkill.ownerId;
                    setSelectedSkill(null);
                    navigate(`/profile/${oid}`);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>View Instructor & Book</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
