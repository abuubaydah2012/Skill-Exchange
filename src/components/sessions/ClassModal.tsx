/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClassSession, SessionFormat } from '../../types';
import { AlertCircle, X } from 'lucide-react';

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
  const { currentUser, categories, createClass, updateClass } = useApp();

  const initialDateObj = initialClass?.dateTime
    ? new Date(initialClass.dateTime)
    : new Date(Date.now() + 86400000 * 2);

  const formatLocalDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const formatLocalTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [title, setTitle] = useState(initialClass?.title || '');
  const [skillName, setSkillName] = useState(
    initialClass?.skillName || (currentUser?.teachingSkills[0]?.name || '')
  );
  const [category, setCategory] = useState(
    initialClass?.category ||
      currentUser?.teachingSkills[0]?.category ||
      categories[0]?.name ||
      'Technology & Programming'
  );
  const [description, setDescription] = useState(initialClass?.description || '');
  const [scheduledDate, setScheduledDate] = useState(formatLocalDate(initialDateObj));
  const [startTime, setStartTime] = useState(formatLocalTime(initialDateObj));
  const [durationMinutes, setDurationMinutes] = useState(initialClass?.durationMinutes || 60);
  const [capacity, setCapacity] = useState(initialClass?.capacity || 15);
  const [isFree, setIsFree] = useState(initialClass ? initialClass.isFree : true);
  const [price, setPrice] = useState(initialClass?.price || 25);
  const [format, setFormat] = useState<SessionFormat>(
    initialClass?.format || 'Interactive Workshop'
  );
  const [meetingLink, setMeetingLink] = useState(initialClass?.meetingLink || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initialClass?.thumbnailUrl || '');
  const [instructions, setInstructions] = useState(initialClass?.instructions || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    if (!title.trim() || !skillName.trim() || !category.trim() || !description.trim()) {
      setFormError('Class title, skill/topic, main category, and description are required.');
      return;
    }

    if (!scheduledDate || !startTime) {
      setFormError('Scheduled date and start time are required.');
      return;
    }

    const combinedDate = new Date(`${scheduledDate}T${startTime}`);
    if (Number.isNaN(combinedDate.getTime()) || combinedDate.getTime() <= Date.now()) {
      setFormError('Scheduled date and start time must be in the future.');
      return;
    }

    if (!isFree && (Number.isNaN(Number(price)) || Number(price) <= 0)) {
      setFormError('Please enter a valid price greater than $0 for paid classes.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        skillName: skillName.trim(),
        category,
        description: description.trim(),
        dateTime: combinedDate.toISOString(),
        durationMinutes: Number(durationMinutes) || 60,
        capacity: Number(capacity) || 15,
        isFree,
        price: isFree ? 0 : Number(price),
        format,
        meetingLink: meetingLink.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        instructions: instructions.trim(),
      };

      const ok = initialClass
        ? await updateClass(initialClass.id, payload)
        : await createClass(payload);

      if (ok) {
        onClose();
      } else {
        setFormError('Could not save the live class. Please check your inputs and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl my-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
        <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            {initialClass ? 'Edit Class / Reschedule' : 'Host a New Live Class'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Skill / Topic
              </label>
              <input
                type="text"
                required
                list="teacher-skills-datalist"
                value={skillName}
                onChange={(e) => {
                  setSkillName(e.target.value);
                  const matching = currentUser.teachingSkills.find(
                    (s) => s.name === e.target.value
                  );
                  if (matching) setCategory(matching.category);
                }}
                placeholder="e.g. React & TypeScript"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
              {currentUser.teachingSkills.length > 0 && (
                <datalist id="teacher-skills-datalist">
                  {currentUser.teachingSkills.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Main Category
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              >
                {categories.length === 0 ? (
                  <option value={category}>{category}</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Description
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn during this live class?"
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              >
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
                <option value={120}>120 mins</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Max Participants
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Class Type
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as SessionFormat)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              >
                <option value="Interactive Workshop">Workshop</option>
                <option value="Masterclass">Masterclass</option>
                <option value="Practice Lab">Practice Lab</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Pricing
              </label>
              <div className="flex items-center gap-2 pt-1">
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
                      min={1}
                      max={500}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder="25"
                      className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Meeting Link / Online Meeting URL
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/... or Zoom URL"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Class Image / Thumbnail URL (Optional)
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Additional Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Prerequisites, tools to install, or meeting passcode..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Publishing...' : initialClass ? 'Save Changes' : 'Publish Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
