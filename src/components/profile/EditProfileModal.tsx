/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile } from '../../types';
import { Upload, X, Plus, Trash2 } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, updateProfile } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [headline, setHeadline] = useState(currentUser?.headline || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [avatarBgColor, setAvatarBgColor] = useState(currentUser?.avatarBgColor || '#0284c7');
  const [languagesText, setLanguagesText] = useState(
    currentUser?.languages.join(', ') || ''
  );
  const [cvFileName, setCvFileName] = useState(currentUser?.cvFileName || '');

  // Experience and Education list states
  const [experienceCompany, setExperienceCompany] = useState('');
  const [experienceTitle, setExperienceTitle] = useState('');
  const [experiencePeriod, setExperiencePeriod] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const languages = languagesText
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const updatedExperience = [...currentUser.experience];
    if (experienceCompany.trim() && experienceTitle.trim()) {
      updatedExperience.push({
        id: 'exp-' + Math.random().toString(36).substring(2, 7),
        company: experienceCompany.trim(),
        title: experienceTitle.trim(),
        period: experiencePeriod.trim() || '2024 - Present',
        description: 'Professional role contribution.',
      });
    }

    updateProfile({
      name: name.trim(),
      headline: headline.trim(),
      bio: bio.trim(),
      location: location.trim(),
      avatarUrl: avatarUrl.trim(),
      avatarBgColor,
      languages,
      cvFileName: cvFileName || undefined,
      experience: updatedExperience,
    });

    onClose();
  };

  const handleSimulateCvUpload = () => {
    setCvFileName(`${name.toLowerCase().replace(/\s+/g, '_')}_resume_2026.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Edit Profile Details
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Professional Headline
            </label>
            <input
              type="text"
              required
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer & Spanish Tutor"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Biography
            </label>
            <textarea
              required
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other learners and teachers about your background and goals..."
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Location
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Berlin, Germany"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Languages (comma separated)
              </label>
              <input
                type="text"
                value={languagesText}
                onChange={(e) => setLanguagesText(e.target.value)}
                placeholder="English (Fluent), Russian (Native)"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* Avatar Color Picker */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Avatar Badge Color Theme
            </label>
            <div className="flex items-center gap-2">
              {['#0284c7', '#059669', '#d97706', '#9333ea', '#e11d48', '#2563eb', '#4f46e5'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarBgColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                    avatarBgColor === color ? 'ring-2 ring-neutral-900 dark:ring-white scale-110' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Add Experience Item */}
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">
              Add Professional Experience Entry
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={experienceTitle}
                onChange={(e) => setExperienceTitle(e.target.value)}
                placeholder="Role / Job Title (e.g. UX Designer)"
                className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
              />
              <input
                type="text"
                value={experienceCompany}
                onChange={(e) => setExperienceCompany(e.target.value)}
                placeholder="Company / Institution"
                className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* CV Attachment Simulation */}
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Curriculum Vitae (CV / Resume)
            </label>
            <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-3 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
              <span className="text-neutral-600 dark:text-neutral-400">
                {cvFileName || 'No CV document attached'}
              </span>
              <button
                type="button"
                onClick={handleSimulateCvUpload}
                className="text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
              >
                Upload PDF Resume
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
