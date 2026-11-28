/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile, UserSkill } from '../../types';
import { Avatar } from '../common/Avatar';
import { Calendar, Clock, DollarSign, RefreshCw, X } from 'lucide-react';

interface AppointmentModalProps {
  teacher: UserProfile;
  initialSkillId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  teacher,
  initialSkillId,
  isOpen,
  onClose,
}) => {
  const { currentUser, createAppointment } = useApp();

  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    initialSkillId || (teacher.teachingSkills[0]?.id || '')
  );
  const [requestedDate, setRequestedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState<string>('18:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [isFreeSwap, setIsFreeSwap] = useState<boolean>(true);
  const [offeredSwapSkillName, setOfferedSwapSkillName] = useState<string>(
    currentUser?.teachingSkills[0]?.name || ''
  );
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const targetTeacherId = teacher.id || (teacher as any)._id;
  const selectedSkill =
    teacher.teachingSkills.find((s) => s.id === selectedSkillId) ||
    teacher.teachingSkills[0] ||
    { id: 'skill-general', name: 'General Mentorship Session', hourlyPrice: 0, proficiency: 'Intermediate' };

  const hourlyRate = selectedSkill ? (selectedSkill.hourlyPrice || 0) : 0;
  const totalCost = isFreeSwap ? 0 : Math.round((hourlyRate * durationMinutes) / 60);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!targetTeacherId) {
      setFormError('Instructor ID is missing. Please reopen the instructor profile.');
      return;
    }

    if (!requestedDate) {
      setFormError('Please select a valid date for the session.');
      return;
    }

    if (!startTime) {
      setFormError('Please select a start time for the session.');
      return;
    }

    if (isFreeSwap && !offeredSwapSkillName.trim()) {
      setFormError('Please specify the skill or topic you can teach in return.');
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({
        learnerId: currentUser.id,
        learnerName: currentUser.name,
        teacherId: targetTeacherId,
        teacherName: teacher.name,
        skillId: selectedSkill.id,
        skillName: selectedSkill.name,
        requestedDate,
        startTime,
        durationMinutes,
        isFreeSwap,
        offeredSwapSkillName: isFreeSwap ? offeredSwapSkillName.trim() : undefined,
        hourlyPrice: hourlyRate,
        totalCost,
        message: message.trim(),
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Could not submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 overflow-hidden">
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Avatar
              name={teacher.name}
              avatarUrl={teacher.avatarUrl}
              bgColor={teacher.avatarBgColor}
              size="md"
              isVerified={teacher.isProfileVerified}
            />
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Request Session with {teacher.name}
              </h3>
              <p className="text-xs text-neutral-500">{teacher.headline}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mt-3 p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Select Skill */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Select Skill to Learn
            </label>
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
            >
              {teacher.teachingSkills.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.name} ({sk.proficiency} · ${sk.hourlyPrice}/hr)
                </option>
              ))}
            </select>
          </div>

          {/* Session Mode: Free Swap vs Paid */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Exchange Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsFreeSwap(true)}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isFreeSwap
                    ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Free Skill Swap ($0)</span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">
                  Teach a skill in return.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsFreeSwap(false)}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  !isFreeSwap
                    ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-neutral-900 dark:text-white font-bold">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Paid Lesson (${totalCost})</span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">
                  Standard hourly rate.
                </p>
              </button>
            </div>
          </div>

          {/* Reciprocal skill offering if free swap */}
          {isFreeSwap && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Skill You Will Teach in Return
              </label>
              {currentUser.teachingSkills.length > 0 ? (
                <select
                  value={offeredSwapSkillName}
                  onChange={(e) => setOfferedSwapSkillName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {currentUser.teachingSkills.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.proficiency})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={offeredSwapSkillName}
                  onChange={(e) => setOfferedSwapSkillName(e.target.value)}
                  placeholder="e.g. Conversational Russian or Figma UI"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
              )}
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
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
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              >
                <option value={30}>30 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
              </select>
            </div>
          </div>

          {/* Availability Hint */}
          {selectedSkill?.availabilitySchedule && (
            <p className="text-[11px] text-neutral-500">
              Instructor schedule: <em>{selectedSkill.availabilitySchedule}</em>
            </p>
          )}

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Note or Learning Goals
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What specific topics or outcomes would you like to achieve?"
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs">
              <span className="text-neutral-500">Total: </span>
              <strong className="text-neutral-900 dark:text-white font-mono text-sm">
                {isFreeSwap ? 'Free ($0 Swap)' : `$${totalCost}.00 USD`}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                {submitting ? 'Sending Request...' : 'Send Request'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
