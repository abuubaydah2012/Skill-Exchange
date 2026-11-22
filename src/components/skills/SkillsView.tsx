/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
} from 'lucide-react';

export const SkillsView: React.FC = () => {
  const {
    currentUser,
    addSkill,
    editSkill,
    deleteSkill,
    addLearningInterest,
    removeLearningInterest,
  } = useApp();

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);

  // Skill Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Development');
  const [description, setDescription] = useState('');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('Advanced');
  const [yearsExperience, setYearsExperience] = useState(4);
  const [freeSwapAvailable, setFreeSwapAvailable] = useState(true);
  const [paidLessonAvailable, setPaidLessonAvailable] = useState(true);
  const [hourlyPrice, setHourlyPrice] = useState(45);
  const [availabilitySchedule, setAvailabilitySchedule] = useState('Weekdays 18:00 - 21:00');

  // New Learning Interest Input
  const [newInterestInput, setNewInterestInput] = useState('');

  if (!currentUser) return null;

  const openAddModal = () => {
    setEditingSkill(null);
    setName('');
    setCategory('Development');
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
    setName(skill.name);
    setCategory(skill.category);
    setDescription(skill.description);
    setProficiency(skill.proficiency);
    setYearsExperience(skill.yearsExperience);
    setFreeSwapAvailable(skill.freeSwapAvailable);
    setPaidLessonAvailable(skill.paidLessonAvailable);
    setHourlyPrice(skill.hourlyPrice);
    setAvailabilitySchedule(skill.availabilitySchedule);
    setIsSkillModalOpen(true);
  };

  const handleSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingSkill) {
      editSkill(editingSkill.id, {
        name: name.trim(),
        category,
        description: description.trim(),
        proficiency,
        yearsExperience,
        freeSwapAvailable,
        paidLessonAvailable,
        hourlyPrice: paidLessonAvailable ? hourlyPrice : 0,
        availabilitySchedule,
      });
    } else {
      addSkill({
        name: name.trim(),
        category,
        description: description.trim(),
        proficiency,
        yearsExperience,
        freeSwapAvailable,
        paidLessonAvailable,
        hourlyPrice: paidLessonAvailable ? hourlyPrice : 0,
        availabilitySchedule,
        verificationStatus: 'Pending',
      });
    }

    setIsSkillModalOpen(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {editingSkill ? 'Edit Teaching Skill' : 'Add New Teaching Skill'}
              </h3>
              <button
                onClick={() => setIsSkillModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSkillSubmit} className="mt-4 space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  >
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="Languages">Languages</option>
                    <option value="Business">Business</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Music">Music</option>
                    <option value="Culinary">Culinary</option>
                    <option value="Photography">Photography</option>
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
                  onClick={() => setIsSkillModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  {editingSkill ? 'Save Changes' : 'Add Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
