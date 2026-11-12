/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClassSession, SessionFormat } from '../../types';
import { X } from 'lucide-react';

interface ClassModalProps {
  initialClass?: ClassSession;
  isOpen: boolean;
  onClose: () => void;
}

export const ClassModal: React.FC<ClassModalProps> = ({
  initialClass,
  isOpen,
  onClose,
}) => {
  const { currentUser, createClass, updateClass } = useApp();

  const [title, setTitle] = useState(initialClass?.title || '');
  const [skillName, setSkillName] = useState(
    initialClass?.skillName || (currentUser?.teachingSkills[0]?.name || '')
  );
  const [category, setCategory] = useState(
    initialClass?.category || (currentUser?.teachingSkills[0]?.category || 'Development')
  );
  const [description, setDescription] = useState(initialClass?.description || '');
  const [dateTime, setDateTime] = useState(
    initialClass?.dateTime
      ? initialClass.dateTime.slice(0, 16)
      : new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16)
  );
  const [durationMinutes, setDurationMinutes] = useState(initialClass?.durationMinutes || 60);
  const [capacity, setCapacity] = useState(initialClass?.capacity || 6);
  const [isFree, setIsFree] = useState(initialClass ? initialClass.isFree : true);
  const [price, setPrice] = useState(initialClass?.price || 0);
  const [format, setFormat] = useState<SessionFormat>(
    initialClass?.format || 'Interactive Workshop'
  );

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !skillName.trim()) return;

    if (initialClass) {
      updateClass(initialClass.id, {
        title: title.trim(),
        skillName: skillName.trim(),
        category,
        description: description.trim(),
        dateTime: new Date(dateTime).toISOString(),
        durationMinutes,
        capacity,
        isFree,
        price: isFree ? 0 : price,
        format,
      });
    } else {
      createClass({
        title: title.trim(),
        skillName: skillName.trim(),
        category,
        description: description.trim(),
        dateTime: new Date(dateTime).toISOString(),
        durationMinutes,
        capacity,
        isFree,
        price: isFree ? 0 : price,
        format,
        meetingLink: '',
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 overflow-hidden">
        <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            {initialClass ? 'Edit Class Details' : 'Create New Class / Workshop'}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Class Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Masterclass: Advanced State Modeling in React"
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Associated Skill
              </label>
              {currentUser.teachingSkills.length > 0 ? (
                <select
                  value={skillName}
                  onChange={(e) => {
                    setSkillName(e.target.value);
                    const matching = currentUser.teachingSkills.find(
                      (s) => s.name === e.target.value
                    );
                    if (matching) setCategory(matching.category);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {currentUser.teachingSkills.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g. React & TypeScript"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
              )}
            </div>

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
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Description & Learning Syllabus
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will attendees learn during this session?"
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Duration (mins)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              >
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
                <option value={120}>120 mins</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Max Capacity
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Session Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as SessionFormat)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              >
                <option value="Interactive Workshop">Interactive Workshop</option>
                <option value="1-on-1 Video">1-on-1 Video</option>
                <option value="Practice Lab">Practice Lab</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Pricing
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => {
                      setIsFree(e.target.checked);
                      if (e.target.checked) setPrice(0);
                    }}
                    className="rounded"
                  />
                  <span>Free Class</span>
                </label>

                {!isFree && (
                  <div className="flex-1 relative">
                    <span className="absolute left-2.5 top-2 text-xs text-neutral-400">$</span>
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder="35"
                      className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              {initialClass ? 'Save Changes' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
