/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { UserProfile, UserSkill } from '../../types';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { StarRating } from '../common/StarRating';
import { AppointmentModal } from '../appointments/AppointmentModal';
import {
  Search,
  Filter,
  RotateCcw,
  Star,
  MapPin,
  Clock,
  Sparkles,
  DollarSign,
  MessageSquare,
  CalendarDays,
  UserCheck,
  ChevronDown,
} from 'lucide-react';

export const DiscoveryView: React.FC = () => {
  const { users, currentUser, categories, categoriesLoading, categoriesError, refreshCategories } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filters State
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All');
  const [categoryFilterSearch, setCategoryFilterSearch] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [selectedProficiency, setSelectedProficiency] = useState('All');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free_swap' | 'paid'>('all');
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [locationQuery, setLocationQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'price_low' | 'price_high' | 'experience'>('relevance');

  // Appointment Modal Target
  const [selectedTeacherForSession, setSelectedTeacherForSession] = useState<UserProfile | null>(null);

  // Legacy category name compatibility map for older seed/profile records
  const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
    development: 'Technology & Programming',
    'software engineering': 'Technology & Programming',
    'web development': 'Technology & Programming',
    design: 'Design & Creativity',
    languages: 'Languages & Communication',
    music: 'Music & Performing Arts',
    'music & audio': 'Music & Performing Arts',
    business: 'Business & Marketing',
    marketing: 'Business & Marketing',
    photography: 'Photography & Media',
    culinary: 'Lifestyle, Health & Fitness',
  };

  const normalizeSkillCategory = (rawCategory: string) => {
    const trimmed = (rawCategory || '').trim();
    return LEGACY_CATEGORY_ALIASES[trimmed.toLowerCase()] || trimmed;
  };

  // Visible category tabs from MongoDB (filtered by optional categoryFilterSearch)
  const visibleCategories = useMemo(() => {
    const q = categoryFilterSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [categories, categoryFilterSearch]);

  // Available subcategories for currently selected main categories
  const availableSubcategories = useMemo(() => {
    if (selectedCategories.length === 0) return [];
    const subSet = new Set<string>();
    categories.forEach((c) => {
      if (selectedCategories.includes(c.name)) {
        c.subcategories.forEach((s) => subSet.add(s.name));
      }
    });
    return Array.from(subSet).sort();
  }, [categories, selectedCategories]);

  const toggleCategorySelection = (catName: string) => {
    setSelectedSubcategory('All');
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  // Filter and sort candidates
  const filteredTeachers = useMemo(() => {
    return users
      .filter((user) => {
        // Exclude suspended and self
        if (user.isSuspended) return false;
        if (currentUser && user.id === currentUser.id) return false;
        // User must teach at least one skill
        if (user.teachingSkills.length === 0) return false;

        // Search Query (Matches user name or any skill name/description)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = user.name.toLowerCase().includes(q);
          const matchesBio = user.bio.toLowerCase().includes(q);
          const matchesSkill = user.teachingSkills.some(
            (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
          );
          if (!matchesName && !matchesBio && !matchesSkill) return false;
        }

        // Location Filter
        if (locationQuery.trim()) {
          const lq = locationQuery.toLowerCase().trim();
          if (!user.location.toLowerCase().includes(lq)) return false;
        }

        // Rating Filter (teachers without reviews are excluded when a minimum rating is selected)
        if (minRating > 0 && ((user.reviewCount ?? 0) === 0 || user.rating < minRating)) return false;

        // Multi-Category Filter (normalizes legacy category names)
        if (selectedCategories.length > 0) {
          const hasCategory = user.teachingSkills.some((s) =>
            selectedCategories.includes(normalizeSkillCategory(s.category))
          );
          if (!hasCategory) return false;
        }

        // Subcategory Filter
        if (selectedSubcategory !== 'All') {
          const subLower = selectedSubcategory.toLowerCase();
          const hasSub = user.teachingSkills.some(
            (s) =>
              (s.subcategory && s.subcategory.toLowerCase() === subLower) ||
              s.name.toLowerCase().includes(subLower)
          );
          if (!hasSub) return false;
        }

        // Proficiency Filter
        if (selectedProficiency !== 'All') {
          const hasProf = user.teachingSkills.some((s) => s.proficiency === selectedProficiency);
          if (!hasProf) return false;
        }

        // Experience Filter
        if (minExperience > 0) {
          const maxExp = Math.max(...user.teachingSkills.map((s) => s.yearsExperience), 0);
          if (maxExp < minExperience) return false;
        }

        // Pricing Filter
        if (pricingFilter === 'free_swap') {
          const hasSwap = user.teachingSkills.some((s) => s.freeSwapAvailable);
          if (!hasSwap) return false;
        } else if (pricingFilter === 'paid') {
          const hasPaid = user.teachingSkills.some((s) => s.paidLessonAvailable);
          if (!hasPaid) return false;
        }

        // Max Price Filter (checks if any skill price is <= maxPrice)
        const minSkillPrice = Math.min(...user.teachingSkills.map((s) => s.hourlyPrice), 0);
        if (minSkillPrice > maxPrice) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          return b.rating - a.rating;
        }
        if (sortBy === 'price_low') {
          const aPrice = Math.min(...a.teachingSkills.map((s) => s.hourlyPrice));
          const bPrice = Math.min(...b.teachingSkills.map((s) => s.hourlyPrice));
          return aPrice - bPrice;
        }
        if (sortBy === 'price_high') {
          const aPrice = Math.max(...a.teachingSkills.map((s) => s.hourlyPrice));
          const bPrice = Math.max(...b.teachingSkills.map((s) => s.hourlyPrice));
          return bPrice - aPrice;
        }
        if (sortBy === 'experience') {
          const aExp = Math.max(...a.teachingSkills.map((s) => s.yearsExperience));
          const bExp = Math.max(...b.teachingSkills.map((s) => s.yearsExperience));
          return bExp - aExp;
        }
        // Relevance default (rating * review count weighting)
        return b.rating * b.reviewCount - a.rating * a.reviewCount;
      });
  }, [
    users,
    currentUser,
    searchQuery,
    locationQuery,
    minRating,
    selectedCategories,
    selectedSubcategory,
    selectedProficiency,
    minExperience,
    pricingFilter,
    maxPrice,
    sortBy,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedSubcategory('All');
    setCategoryFilterSearch('');
    setMinRating(0);
    setMinExperience(0);
    setSelectedProficiency('All');
    setPricingFilter('all');
    setMaxPrice(100);
    setLocationQuery('');
    setSortBy('relevance');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategories.length > 0 ||
    selectedSubcategory !== 'All' ||
    minRating > 0 ||
    minExperience > 0 ||
    selectedProficiency !== 'All' ||
    pricingFilter !== 'all' ||
    maxPrice < 100 ||
    locationQuery !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Discover Teachers & Skills
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Connect with peer mentors for reciprocal skill swaps or book private lessons with certified professionals.
        </p>
      </div>

      {/* Filter and Search Bar Container */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        {/* Search Input Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by skill name (e.g. React, Spanish, SEO, Cooking) or instructor..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div className="relative">
            <MapPin className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Filter by location (e.g. Berlin, Austin)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>
        </div>

        {/* Dynamic MongoDB Category & Subcategory Filter */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Categories {selectedCategories.length > 0 ? `(${selectedCategories.length} selected)` : ''}
            </span>
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={categoryFilterSearch}
                onChange={(e) => setCategoryFilterSearch(e.target.value)}
                placeholder="Filter categories..."
                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {categoriesError ? (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>{categoriesError}</span>
              <button type="button" onClick={refreshCategories} className="font-semibold underline cursor-pointer">
                Retry
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedSubcategory('All');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedCategories.length === 0
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                All Categories
              </button>

              {categoriesLoading ? (
                <span className="text-xs text-neutral-400 px-2">Loading categories...</span>
              ) : (
                visibleCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategorySelection(cat.name)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Dynamic Subcategories for Selected Main Categories */}
          {availableSubcategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
              <span className="text-[11px] font-semibold text-neutral-400 shrink-0 mr-1">
                Subcategory:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubcategory('All')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedSubcategory === 'All'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                All
              </button>
              {availableSubcategories.map((subName) => (
                <button
                  key={subName}
                  type="button"
                  onClick={() => setSelectedSubcategory(subName)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selectedSubcategory === subName
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {subName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Secondary Filter Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          {/* Exchange Type */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Lesson Type
            </label>
            <select
              value={pricingFilter}
              onChange={(e) => setPricingFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
            >
              <option value="all">All Formats</option>
              <option value="free_swap">Free Swap Available</option>
              <option value="paid">Paid Lessons</option>
            </select>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Minimum Rating
            </label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
            >
              <option value={0}>Any Rating</option>
              <option value={4.8}>4.8 ★ & Above</option>
              <option value={4.5}>4.5 ★ & Above</option>
              <option value={4.0}>4.0 ★ & Above</option>
            </select>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Experience
            </label>
            <select
              value={minExperience}
              onChange={(e) => setMinExperience(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
            >
              <option value={0}>Any Experience</option>
              <option value={3}>3+ Years</option>
              <option value={5}>5+ Years</option>
              <option value={8}>8+ Years</option>
            </select>
          </div>

          {/* Proficiency */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Proficiency
            </label>
            <select
              value={selectedProficiency}
              onChange={(e) => setSelectedProficiency(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          {/* Max Price Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 mb-1">
              <span>Max Hourly Rate</span>
              <span className="font-mono tabular-nums text-neutral-900 dark:text-white">${maxPrice}/hr</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-neutral-900 dark:accent-white"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
            >
              <option value="relevance">Highest Relevance</option>
              <option value="rating">Top Rated (★)</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="experience">Most Experienced</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-neutral-500">
              Showing <strong>{filteredTeachers.length}</strong> matching mentors
            </span>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Teachers Results Grid */}
      {filteredTeachers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">
            No mentors match your active criteria
          </p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Try loosening price constraints, switching category filters, or searching for related topics.
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => {
            const hasFreeSwap = teacher.teachingSkills.some((s) => s.freeSwapAvailable);
            const lowestPrice = Math.min(...teacher.teachingSkills.map((s) => s.hourlyPrice));

            return (
              <div
                key={teacher.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 flex flex-col justify-between transition-colors"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={teacher.name}
                        avatarUrl={teacher.avatarUrl}
                        bgColor={teacher.avatarBgColor}
                        size="md"
                        isVerified={teacher.isProfileVerified}
                      />
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                          {teacher.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[130px]">{teacher.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {(teacher.reviewCount ?? 0) > 0 ? (
                        <>
                          <div className="flex items-center justify-end gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            <span className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums">
                              {teacher.rating.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block tabular-nums">
                            ({teacher.reviewCount} {teacher.reviewCount === 1 ? 'review' : 'reviews'})
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            New Teacher
                          </span>
                          <span className="text-[10px] text-neutral-400">No ratings yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Headline & Bio */}
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mt-3 line-clamp-1">
                    {teacher.headline}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {teacher.bio}
                  </p>

                  {/* Skills Tag Area */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                      Teaching Repertoire
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {teacher.teachingSkills.map((sk) => (
                        <span
                          key={sk.id}
                          className="text-[11px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium"
                        >
                          {sk.name} <span className="text-neutral-400 text-[10px]">({sk.proficiency})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pricing and Availability */}
                  <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                    <div>
                      {hasFreeSwap ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Free Swap Available
                        </span>
                      ) : (
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          From ${lowestPrice}/hr
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      {teacher.completedSessionsCount} sessions taught
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => navigate(`/profile/${teacher.id}`)}
                    className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-center cursor-pointer transition-colors"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => navigate(`/messages?user=${teacher.id}`)}
                    className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-center cursor-pointer transition-colors"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => setSelectedTeacherForSession(teacher)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg text-center cursor-pointer transition-colors shadow-xs"
                  >
                    Request
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Appointment Request Modal */}
      {selectedTeacherForSession && (
        <AppointmentModal
          teacher={selectedTeacherForSession}
          isOpen={!!selectedTeacherForSession}
          onClose={() => setSelectedTeacherForSession(null)}
        />
      )}
    </div>
  );
};
