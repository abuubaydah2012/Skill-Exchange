/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { categoryApi } from '../../services/api';
import { UserSkill, ProficiencyLevel } from '../../types';
import { Badge } from '../common/Badge';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Search,
} from 'lucide-react';

export const SkillsView: React.FC = () => {
  const {
    currentUser,
    categories,
    categoriesLoading,
    categoriesError,
    refreshCategories,
    addSkill,
    editSkill,
    deleteSkill,
    addLearningInterest,
    removeLearningInterest,
    addToast,
  } = useApp();

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);

  // Skill Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [description, setDescription] = useState('');

  // Suggest New Category Modal State
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestType, setSuggestType] = useState<'category' | 'subcategory'>('category');
  const [suggestName, setSuggestName] = useState('');
  const [suggestParentId, setSuggestParentId] = useState('');
  const [suggestDesc, setSuggestDesc] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('Advanced');
  const [yearsExperience, setYearsExperience] = useState(4);
  const [freeSwapAvailable, setFreeSwapAvailable] = useState(true);
  const [paidLessonAvailable, setPaidLessonAvailable] = useState(true);
  const [hourlyPrice, setHourlyPrice] = useState(45);
  const [availabilitySchedule, setAvailabilitySchedule] = useState('Weekdays 18:00 - 21:00');
  const [isSavingSkill, setIsSavingSkill] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Learning Interest Input
  const [newInterestInput, setNewInterestInput] = useState('');

  if (!currentUser) return null;

  const filteredCategoryOptions = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [categories, categorySearch]);

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c.name === category) || null,
    [categories, category]
  );

  const availableSubcategories = selectedCategoryObj?.subcategories || [];

  const openAddModal = () => {
    setEditingSkill(null);
    setFormError(null);
    setName('');
    setCategory(categories[0]?.name || '');
    setSubcategory('');
    setCategorySearch('');
    setDescription('');
    setProficiency('Advanced');
    setYearsExperience(3);
    setFreeSwapAvailable(true);
    setPaidLessonAvailable(true);
    setHourlyPrice(40);
    setAvailabilitySchedule('Flexible evenings');
    setIsSkillModalOpen(true);
  };

  const openEditModal = (skill: UserSkill) => {
    setEditingSkill(skill);
    setFormError(null);
    setName(skill.name);
    setCategory(skill.category);
    setSubcategory(skill.subcategory || '');
    setCategorySearch('');
    setDescription(skill.description);
    setProficiency(skill.proficiency);
    setYearsExperience(skill.yearsExperience);
    setFreeSwapAvailable(skill.freeSwapAvailable);
    setPaidLessonAvailable(skill.paidLessonAvailable);
    setHourlyPrice(skill.hourlyPrice);
    setAvailabilitySchedule(skill.availabilitySchedule);
    setIsSkillModalOpen(true);
  };

  const handleSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSkill) return;

    setFormError(null);
    if (!name.trim()) {
      setFormError('Skill Name is required.');
      return;
    }
    if (!category.trim()) {
      setFormError('Main Category is required.');
      return;
    }
    if (!description.trim()) {
      setFormError('Description & Coaching Approach is required.');
      return;
    }
    if (Number.isNaN(yearsExperience) || yearsExperience < 0) {
      setFormError('Years of Experience must be a valid non-negative number.');
      return;
    }
    if (paidLessonAvailable && (Number.isNaN(hourlyPrice) || hourlyPrice < 0)) {
      setFormError('Hourly Price must be a valid non-negative number.');
      return;
    }

    const matchedCat = categories.find((c) => c.name === category);
    const matchedSub = matchedCat?.subcategories.find((s) => s.name === subcategory);

    setIsSavingSkill(true);
    try {
      const ok = editingSkill
        ? await editSkill(editingSkill.id, {
            name: name.trim(),
            category,
            subcategory: subcategory || '',
            categoryId: matchedCat?.id,
            subcategoryId: matchedSub?.id,
            description: description.trim(),
            proficiency,
            yearsExperience,
            freeSwapAvailable,
            paidLessonAvailable,
            hourlyPrice: paidLessonAvailable ? hourlyPrice : 0,
            availabilitySchedule: availabilitySchedule.trim() || 'Flexible schedule',
          })
        : await addSkill({
            name: name.trim(),
            category,
            subcategory: subcategory || '',
            categoryId: matchedCat?.id,
            subcategoryId: matchedSub?.id,
            description: description.trim(),
            proficiency,
            yearsExperience,
            freeSwapAvailable,
            paidLessonAvailable,
            hourlyPrice: paidLessonAvailable ? hourlyPrice : 0,
            availabilitySchedule: availabilitySchedule.trim() || 'Flexible schedule',
            verificationStatus: 'Pending',
          });

      if (ok) {
        setIsSkillModalOpen(false);
      } else {
        setFormError('Could not save skill. Please verify your inputs and try again.');
      }
    } finally {
      setIsSavingSkill(false);
    }
  };

  const handleSuggestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestName.trim()) return;
    setIsSuggesting(true);
    try {
      const res = await categoryApi.suggestCategory({
        type: suggestType,
        name: suggestName.trim(),
        parentCategoryId: suggestType === 'subcategory' ? suggestParentId : undefined,
        description: suggestDesc.trim(),
      });
      if (res.success) {
        addToast(
          'success',
          'Suggestion Submitted',
          'Your category suggestion was sent to Admins for review.'
        );
        setIsSuggestModalOpen(false);
        setSuggestName('');
        setSuggestDesc('');
      } else {
        addToast('error', 'Submission Failed', res.message || 'Could not submit suggestion.');
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterestInput.trim()) return;
    addLearningInterest(newInterestInput.trim());
    setNewInterestInput('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Skill Repertoire & Learning Interests
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Configure the subjects you teach to others, and list the topics you want to learn.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Teaching Skill</span>
        </button>
      </div>

      {/* SECTION 1: Skills You Teach */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Skills You Teach ({currentUser.teachingSkills.length})</span>
          </h2>
          <span className="text-xs text-neutral-500">
            Available for both 1:1 swaps and private bookings
          </span>
        </div>

        {currentUser.teachingSkills.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              No teaching skills listed yet
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Add at least one skill you can share or coach to unlock mutual skill swaps.
            </p>
            <button
              onClick={openAddModal}
              className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg"
            >
              Add First Skill
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentUser.teachingSkills.map((sk) => (
              <div
                key={sk.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-neutral-500 font-medium">
                      {sk.category}
                      {sk.subcategory ? ` · ${sk.subcategory}` : ''}
                    </span>
                    <Badge
                      variant={
                        sk.verificationStatus === 'Verified'
                          ? 'success'
                          : sk.verificationStatus === 'Pending'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {sk.verificationStatus}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                    {sk.name}
                  </h3>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {sk.proficiency}
                    </span>
                    <span>·</span>
                    <span>{sk.yearsExperience} yrs experience</span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-3 leading-relaxed">
                    {sk.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Free Skill Swap:</span>
                      <strong className={sk.freeSwapAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}>
                        {sk.freeSwapAvailable ? 'Enabled' : 'Disabled'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Hourly Rate:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {sk.paidLessonAvailable ? `$${sk.hourlyPrice}/hr` : 'Swaps Only'}
                      </span>
                    </div>

                    {sk.availabilitySchedule && (
                      <div className="text-[11px] text-neutral-500 pt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        <span>{sk.availabilitySchedule}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(sk)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    title="Edit Skill"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSkill(sk.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Delete Skill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Skills You Want to Learn (Learning Interests) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Skills You Want to Learn (Wishlist)</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Adding topics here immediately updates your smart match recommendations with teachers who teach them.
            </p>
          </div>
        </div>

        {/* Add Interest Form */}
        <form onSubmit={handleAddInterest} className="flex gap-2 max-w-md">
          <input
            type="text"
            value={newInterestInput}
            onChange={(e) => setNewInterestInput(e.target.value)}
            placeholder="e.g. React & TypeScript, French Conversation, Guitar..."
            className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
          >
            Add Interest
          </button>
        </form>

        {/* Current Interests Tags */}
        <div className="pt-2">
          {currentUser.learningInterests.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">No learning interests added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentUser.learningInterests.map((interest) => (
                <div
                  key={interest}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200"
                >
                  <span>{interest}</span>
                  <button
                    type="button"
                    onClick={() => removeLearningInterest(interest)}
                    className="text-neutral-400 hover:text-rose-600 p-0.5 cursor-pointer"
                    title={`Remove ${interest}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skill Modal */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg my-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {editingSkill ? 'Edit Teaching Skill' : 'Add New Teaching Skill'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSkillModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSkillSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. React & TypeScript Architecture"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Main Category
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestType('category');
                      setSuggestParentId(selectedCategoryObj?.id || categories[0]?.id || '');
                      setIsSuggestModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Suggest a New Category</span>
                  </button>
                </div>

                {categoriesError ? (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
                    <span>{categoriesError}</span>
                    <button
                      type="button"
                      onClick={refreshCategories}
                      className="font-semibold underline cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Filter categories..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
                      />
                    </div>
                    <select
                      required
                      disabled={categoriesLoading}
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setSubcategory('');
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                    >
                      {categoriesLoading ? (
                        <option value="">Loading categories...</option>
                      ) : filteredCategoryOptions.length === 0 ? (
                        <option value="">No categories match filter</option>
                      ) : (
                        filteredCategoryOptions.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Subcategory (Optional)
                    </label>
                    <select
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                    >
                      <option value="">General / All in {category || 'Category'}</option>
                      {availableSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Proficiency Level
                    </label>
                    <select
                      value={proficiency}
                      onChange={(e) => setProficiency(e.target.value as ProficiencyLevel)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description & Coaching Approach
                </label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What topics do you cover? What can learners expect to master?"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Hourly Price ($ USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={250}
                    value={hourlyPrice}
                    onChange={(e) => setHourlyPrice(Number(e.target.value))}
                    disabled={!paidLessonAvailable}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeSwapAvailable}
                    onChange={(e) => setFreeSwapAvailable(e.target.checked)}
                    className="rounded"
                  />
                  <span>Offer Free Skill Swaps</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paidLessonAvailable}
                    onChange={(e) => setPaidLessonAvailable(e.target.checked)}
                    className="rounded"
                  />
                  <span>Offer Paid Lessons</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Availability Schedule
                </label>
                <input
                  type="text"
                  value={availabilitySchedule}
                  onChange={(e) => setAvailabilitySchedule(e.target.value)}
                  placeholder="e.g. Mon-Thu 18:00 - 21:00 CET, Sat morning"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  disabled={isSavingSkill}
                  onClick={() => setIsSkillModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSkill}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSavingSkill ? 'Saving...' : editingSkill ? 'Save Changes' : 'Save Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Suggest New Category Modal */}
      {isSuggestModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Suggest a New Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSuggestSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Suggestion Type
                </label>
                <select
                  value={suggestType}
                  onChange={(e) => setSuggestType(e.target.value as 'category' | 'subcategory')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  <option value="category">New Main Category</option>
                  <option value="subcategory">New Subcategory under Existing Category</option>
                </select>
              </div>

              {suggestType === 'subcategory' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Parent Category
                  </label>
                  <select
                    required
                    value={suggestParentId}
                    onChange={(e) => setSuggestParentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Proposed Name
                </label>
                <input
                  type="text"
                  required
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  placeholder="e.g. Quantum Computing or Blockchain Architecture"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description / Rationale (Optional)
                </label>
                <textarea
                  rows={2}
                  value={suggestDesc}
                  onChange={(e) => setSuggestDesc(e.target.value)}
                  placeholder="Briefly describe what skills belong here..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuggestModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSuggesting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  {isSuggesting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
