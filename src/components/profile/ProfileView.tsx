/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { StarRating } from '../common/StarRating';
import { EditProfileModal } from './EditProfileModal';
import { AppointmentModal } from '../appointments/AppointmentModal';
import { calculateProfileCompleteness } from '../../utils/profileCompleteness';
import {
  MapPin,
  Languages,
  Calendar,
  CheckCircle2,
  Star,
  Award,
  BookOpen,
  Briefcase,
  GraduationCap,
  FileText,
  Edit2,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, users, reviews } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'skills' | 'reviews' | 'credentials' | 'background'>('skills');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  // If no ID or ID is self, show currentUser
  const targetUser = id ? users.find((u) => u.id === id) : currentUser;

  if (!targetUser) {
    return (
      <div className="p-12 text-center text-xs text-neutral-500">
        User profile not found.
      </div>
    );
  }

  const isSelf = currentUser?.id === targetUser.id;
  const userReviews = reviews.filter((r) => r.reviewedUserId === targetUser.id);
  const completeness = calculateProfileCompleteness(targetUser);

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar
              name={targetUser.name}
              avatarUrl={targetUser.avatarUrl}
              bgColor={targetUser.avatarBgColor}
              size="xl"
              isVerified={targetUser.isProfileVerified}
            />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {targetUser.name}
                </h1>
                {targetUser.isProfileVerified && (
                  <span className="text-sky-600 dark:text-sky-400" title="Verified Member">
                    <CheckCircle2 className="w-5 h-5 fill-current" />
                  </span>
                )}
                <Badge variant={targetUser.role === 'teacher' ? 'success' : 'neutral'}>
                  {targetUser.role}
                </Badge>
              </div>

              <p className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mt-1">
                {targetUser.headline}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-2.5">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{targetUser.location}</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" />
                  <span>{targetUser.languages.join(', ')}</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {targetUser.rating.toFixed(2)}
                  </span>
                  <span>({targetUser.reviewCount} reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isSelf ? (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate(`/messages?user=${targetUser.id}`)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message</span>
                </button>
                {targetUser.teachingSkills.length > 0 && (
                  <button
                    onClick={() => setIsAppointmentModalOpen(true)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
                  >
                    Request Session
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 leading-relaxed">
          {targetUser.bio}
        </p>

        {/* Profile Completeness (if viewing own profile) */}
        {isSelf && completeness.percentage < 100 && (
          <div className="mt-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                Profile Completeness: {completeness.percentage}%
              </span>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Missing: {completeness.missingFields.join(', ')}
              </p>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
            >
              Update Missing Info
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'skills'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          Teaching & Learning Skills
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'reviews'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          Verified Reviews ({userReviews.length})
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'credentials'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          Credentials & Certificates ({targetUser.certificates.length})
        </button>
        <button
          onClick={() => setActiveTab('background')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'background'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          Experience & CV
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          {/* Teaching skills */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Teaching Skills</span>
            </h3>

            {targetUser.teachingSkills.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No teaching skills listed.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targetUser.teachingSkills.map((sk) => (
                  <div
                    key={sk.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>{sk.category}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {sk.freeSwapAvailable ? 'Free Swap Available' : `$${sk.hourlyPrice}/hr`}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                      {sk.name}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {sk.proficiency}
                      </span>
                      <span>·</span>
                      <span>{sk.yearsExperience} yrs experience</span>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                      {sk.description}
                    </p>

                    {sk.availabilitySchedule && (
                      <p className="text-[11px] text-neutral-500 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        Schedule: {sk.availabilitySchedule}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Learning Interests */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Learning Interests</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {targetUser.learningInterests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {userReviews.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              No reviews recorded for {targetUser.name} yet.
            </div>
          ) : (
            userReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {rev.reviewerName}
                  </span>
                  <StarRating rating={rev.rating} size="sm" showValue />
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                  &ldquo;{rev.comment}&rdquo;
                </p>
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  {rev.sessionTitle} · {new Date(rev.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'credentials' && (
        <div className="space-y-6">
          {/* Identity Verification Record */}
          {targetUser.identityVerification && (
            <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Official Identity Verification
                  </h3>
                </div>
                <Badge
                  variant={
                    targetUser.identityVerification.status === 'Verified'
                      ? 'success'
                      : targetUser.identityVerification.status === 'Rejected'
                      ? 'error'
                      : 'warning'
                  }
                >
                  {targetUser.identityVerification.status === 'Pending'
                    ? 'Pending Review'
                    : targetUser.identityVerification.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                    Document Type
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-white mt-0.5 block">
                    {targetUser.identityVerification.documentType}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                    Document Number
                  </span>
                  <span className="font-mono font-semibold text-neutral-900 dark:text-white mt-0.5 block">
                    {isSelf || currentUser?.role === 'admin'
                      ? targetUser.identityVerification.documentNumber
                      : '••••••••' + targetUser.identityVerification.documentNumber.slice(-4)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                    Verified Age
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-white mt-0.5 block">
                    {targetUser.age ? `${targetUser.age} years old` : 'Verified'}
                  </span>
                </div>
              </div>

              {targetUser.identityVerification.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-bold">Rejection Feedback: </span>
                  <span>{targetUser.identityVerification.rejectionReason}</span>
                </div>
              )}
            </div>
          )}

          {/* Educational & Professional Certificates */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Certificates & Accredited Qualifications ({targetUser.certificates.length})</span>
            </h3>

            {targetUser.certificates.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                No credentials or certificates uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targetUser.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">
                        {cert.title}
                      </span>
                      <Badge variant={cert.status === 'Verified' ? 'success' : 'neutral'}>
                        {cert.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Issued by {cert.issuingOrganization} ({cert.issueDate})
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Credential for: {cert.relatedSkill}
                    </p>
                    {cert.fileName && (
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-sky-600 dark:text-sky-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-mono truncate">{cert.fileName}</span>
                        </div>
                        {cert.fileData && (
                          <a
                            href={cert.fileData}
                            download={cert.fileName}
                            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white shrink-0 ml-2 font-medium"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'background' && (
        <div className="space-y-6">
          {/* Experience */}
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-neutral-500" />
              <span>Professional Experience</span>
            </h4>
            {targetUser.experience.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No experience listed.</p>
            ) : (
              <div className="space-y-3 divide-y divide-neutral-100 dark:divide-neutral-800">
                {targetUser.experience.map((exp) => (
                  <div key={exp.id} className="pt-2.5 first:pt-0">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white">
                      <span>{exp.title}</span>
                      <span className="text-neutral-500 font-normal">{exp.period}</span>
                    </div>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 block mt-0.5">
                      {exp.company}
                    </span>
                    <p className="text-[11px] text-neutral-500 mt-1">{exp.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Education */}
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-neutral-500" />
              <span>Education</span>
            </h4>
            {targetUser.education.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No education listed.</p>
            ) : (
              <div className="space-y-3 divide-y divide-neutral-100 dark:divide-neutral-800">
                {targetUser.education.map((edu) => (
                  <div key={edu.id} className="pt-2.5 first:pt-0">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white">
                      <span>{edu.degree}</span>
                      <span className="text-neutral-500 font-normal">{edu.year}</span>
                    </div>
                    <span className="text-xs text-neutral-500 block mt-0.5">
                      {edu.institution}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CV Document Attachment */}
          {targetUser.cvFileName && (
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <span className="font-semibold text-neutral-900 dark:text-white">
                  Attached CV: {targetUser.cvFileName}
                </span>
              </div>
              <span className="text-neutral-400 text-[11px]">PDF Document</span>
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {/* Appointment Request Modal */}
      {isAppointmentModalOpen && (
        <AppointmentModal
          teacher={targetUser}
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
        />
      )}
    </div>
  );
};
