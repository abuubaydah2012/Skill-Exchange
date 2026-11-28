/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { rankMatchesForUser } from '../../services/matchingAlgorithm';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { StarRating } from '../common/StarRating';
import { AppointmentModal } from '../appointments/AppointmentModal';
import { UserProfile } from '../../types';
import {
  Sparkles,
  RefreshCw,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const SmartMatchesView: React.FC = () => {
  const { currentUser, users } = useApp();
  const navigate = useNavigate();

  const [selectedTeacherForSession, setSelectedTeacherForSession] = useState<UserProfile | null>(null);
  const [filterMutualOnly, setFilterMutualOnly] = useState(false);

  if (!currentUser) return null;

  const matches = rankMatchesForUser(currentUser, users);
  const mutualSwaps = matches.filter((m) => m.isMutualSwap);
  const displayedMatches = filterMutualOnly ? mutualSwaps : matches;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Smart Skill Matches & Reciprocal Swaps
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
          Our deterministic matching engine analyzes your learning interests (
          <strong className="text-neutral-800 dark:text-neutral-200">
            {currentUser.learningInterests.join(', ') || 'None specified'}
          </strong>
          ) and complementary skills from across the community.
        </p>
      </div>

      {/* Mutual Swap Spotlight Banner */}
      {mutualSwaps.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/40 dark:to-sky-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>{mutualSwaps.length} Mutual Skill Swap Opportunities Found!</span>
                  <Badge variant="success">Zero Platform Fees</Badge>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 max-w-xl">
                  These community members teach skills you want to learn AND want to learn skills you already teach. You can swap lessons 1:1 without paying any cash.
                </p>
              </div>
            </div>

            <button
              onClick={() => setFilterMutualOnly(!filterMutualOnly)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                filterMutualOnly
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              {filterMutualOnly ? 'Show All Matches' : 'Filter Mutual Swaps Only'}
            </button>
          </div>
        </div>
      )}

      {/* Algorithm Explainer Box */}
      <div className="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-neutral-900 dark:text-white">Deterministic Scoring Formula: </strong>
          Matches are scored from 0% to 100% based on direct skill complementarity (+35–55%), reciprocal mutual swap potential (+45%), shared interests (+15%), educator verification and rating history (+15%), and schedule flexibility (+10%).
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {displayedMatches.map((match) => {
          const candidate = match.matchedUser;

          return (
            <div
              key={candidate.id}
              className={`p-5 rounded-2xl bg-white dark:bg-neutral-900 border transition-all ${
                match.isMutualSwap
                  ? 'border-emerald-300 dark:border-emerald-800/80 shadow-xs ring-1 ring-emerald-500/10'
                  : 'border-neutral-200 dark:border-neutral-800 shadow-xs'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* User info */}
                <div className="flex items-start gap-4">
                  <Avatar
                    name={candidate.name}
                    avatarUrl={candidate.avatarUrl}
                    bgColor={candidate.avatarBgColor}
                    size="lg"
                    isVerified={candidate.isProfileVerified}
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                        {candidate.name}
                      </h3>
                      {match.isMutualSwap && (
                        <Badge variant="success">
                          <RefreshCw className="w-3 h-3" />
                          <span>Mutual Swap Partner</span>
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                      {candidate.headline} · {candidate.location}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1.5 flex-wrap">
                      {(candidate.reviewCount ?? 0) > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                            {candidate.rating.toFixed(2)}
                          </span>
                          <span className="text-neutral-400">({candidate.reviewCount})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            New Teacher
                          </span>
                          <span className="text-neutral-400">No ratings yet</span>
                        </div>
                      )}
                      <span>·</span>
                      <span>{candidate.completedSessionsCount} sessions completed</span>
                      <span>·</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {match.priceOption}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score & Action */}
                <div className="flex items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-neutral-100 dark:border-neutral-800">
                  <div className="text-left lg:text-right">
                    <div className="font-mono text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                      {match.matchScore}%
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                      Compatibility Score
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/profile/${candidate.id}`)}
                      className="px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => setSelectedTeacherForSession(candidate)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Request Session
                    </button>
                  </div>
                </div>
              </div>

              {/* Match Reasons & Complementary Skill Breakdown */}
              <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* What they teach you */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    What {candidate.name.split(' ')[0]} Teaches (Matches Your Wishlist):
                  </span>
                  {match.theyTeachWhatYouWant.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {match.theyTeachWhatYouWant.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-semibold"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-500 italic">Explore full profile for teaching skills</span>
                  )}
                </div>

                {/* What you teach them */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    What You Can Teach {candidate.name.split(' ')[0]} in Return:
                  </span>
                  {match.youTeachWhatTheyWant.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {match.youTeachWhatTheyWant.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-500 italic">No reciprocal swap interest recorded</span>
                  )}
                </div>
              </div>

              {/* Match reasons pills */}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-500">
                {match.matchReasons.map((reason, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>{reason}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
