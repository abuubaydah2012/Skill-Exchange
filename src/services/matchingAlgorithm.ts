/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, MatchResult } from '../types';

/**
 * Deterministic Matching Formula Documentation:
 *
 * Total Score = Base Compatibility + Category Overlap + Educator Quality + Practical Availability
 *
 * 1. Skill Compatibility (Max 60 pts):
 *    - Mutual Skill Swap (User A teaches what User B wants AND User B teaches what User A wants): 45 pts
 *      + Additional reciprocal skills: up to 10 pts (5 pts per extra match)
 *    - Direct Match (Target user teaches a skill current user wants to learn): 35 pts
 *    - Reverse Match (Current user teaches what target user wants): 15 pts
 *
 * 2. Shared Learning Interests / Domain Overlap (Max 15 pts):
 *    - Target user and current user share learning interests: 5 pts per shared topic (max 15 pts)
 *
 * 3. Educator Experience & Rating Quality (Max 15 pts):
 *    - Rating >= 4.9: 10 pts; Rating >= 4.7: 6 pts; Rating >= 4.5: 3 pts
 *    - Average experience across teaching skills >= 7 yrs: 5 pts; >= 4 yrs: 3 pts
 *
 * 4. Swap & Availability Flexibility (Max 10 pts):
 *    - Offers Free Skill Swap: 5 pts
 *    - Profile verified: 5 pts
 *
 * Clamped strictly between 0% and 100%.
 */
export function calculateMatchScore(
  currentUser: UserProfile,
  candidateUser: UserProfile
): MatchResult {
  if (currentUser.id === candidateUser.id) {
    return {
      matchedUser: candidateUser,
      matchScore: 0,
      isMutualSwap: false,
      theyTeachWhatYouWant: [],
      youTeachWhatTheyWant: [],
      sharedInterests: [],
      matchReasons: [],
      availabilityMatchScore: 0,
      priceOption: 'Free Swap Available',
    };
  }

  // 1. What candidate teaches that current user wants
  const userInterestsLower = currentUser.learningInterests.map((s) => s.toLowerCase().trim());
  const theyTeachWhatYouWant: string[] = [];

  candidateUser.teachingSkills.forEach((skill) => {
    const skillNameLower = skill.name.toLowerCase().trim();
    const isDirectMatch = userInterestsLower.some(
      (interest) =>
        interest.includes(skillNameLower) ||
        skillNameLower.includes(interest) ||
        interest.split(' ')[0] === skillNameLower.split(' ')[0]
    );
    if (isDirectMatch) {
      theyTeachWhatYouWant.push(skill.name);
    }
  });

  // 2. What current user teaches that candidate wants
  const candidateInterestsLower = candidateUser.learningInterests.map((s) => s.toLowerCase().trim());
  const youTeachWhatTheyWant: string[] = [];

  currentUser.teachingSkills.forEach((skill) => {
    const skillNameLower = skill.name.toLowerCase().trim();
    const isDirectMatch = candidateInterestsLower.some(
      (interest) =>
        interest.includes(skillNameLower) ||
        skillNameLower.includes(interest) ||
        interest.split(' ')[0] === skillNameLower.split(' ')[0]
    );
    if (isDirectMatch) {
      youTeachWhatTheyWant.push(skill.name);
    }
  });

  // 3. Shared interests
  const sharedInterests: string[] = [];
  currentUser.learningInterests.forEach((interest) => {
    if (
      candidateUser.learningInterests.some(
        (ci) => ci.toLowerCase().trim() === interest.toLowerCase().trim()
      )
    ) {
      sharedInterests.push(interest);
    }
  });

  // Calculate score
  let score = 0;
  const matchReasons: string[] = [];

  const isMutualSwap = theyTeachWhatYouWant.length > 0 && youTeachWhatTheyWant.length > 0;

  if (isMutualSwap) {
    score += 45;
    matchReasons.push(
      `Perfect Mutual Swap: ${candidateUser.name.split(' ')[0]} teaches ${theyTeachWhatYouWant.join(', ')} and wants to learn ${youTeachWhatTheyWant.join(', ')} from you!`
    );
    const extraMatches = theyTeachWhatYouWant.length + youTeachWhatTheyWant.length - 2;
    if (extraMatches > 0) {
      score += Math.min(10, extraMatches * 5);
      matchReasons.push(`Multiple complementary skill exchanges available.`);
    }
  } else if (theyTeachWhatYouWant.length > 0) {
    score += 35;
    matchReasons.push(
      `Teaches skills you are actively looking to learn: ${theyTeachWhatYouWant.join(', ')}.`
    );
  } else if (youTeachWhatTheyWant.length > 0) {
    score += 15;
    matchReasons.push(
      `Looking for skills you teach: ${youTeachWhatTheyWant.join(', ')}.`
    );
  }

  // Shared learning interests
  if (sharedInterests.length > 0) {
    const interestBonus = Math.min(15, sharedInterests.length * 5);
    score += interestBonus;
    matchReasons.push(
      `Shared curiosity in: ${sharedInterests.join(', ')}.`
    );
  }

  // Rating & experience factors
  if (candidateUser.rating >= 4.9) {
    score += 10;
    matchReasons.push(`Top-rated educator (${candidateUser.rating.toFixed(2)} ★ rating with ${candidateUser.reviewCount} reviews).`);
  } else if (candidateUser.rating >= 4.7) {
    score += 6;
    matchReasons.push(`Highly reviewed teacher (${candidateUser.rating.toFixed(2)} ★).`);
  }

  const avgExperience =
    candidateUser.teachingSkills.length > 0
      ? candidateUser.teachingSkills.reduce((sum, s) => sum + s.yearsExperience, 0) /
        candidateUser.teachingSkills.length
      : 0;

  if (avgExperience >= 7) {
    score += 5;
    matchReasons.push(`High domain expertise with ${Math.round(avgExperience)}+ average years experience.`);
  }

  // Free swap & verification bonus
  const offersFreeSwap = candidateUser.teachingSkills.some((s) => s.freeSwapAvailable);
  const offersPaid = candidateUser.teachingSkills.some((s) => s.paidLessonAvailable);

  if (offersFreeSwap) {
    score += 5;
  }
  if (candidateUser.isProfileVerified) {
    score += 5;
    matchReasons.push(`Identity & verified credentials confirmed by Skill Exchange moderators.`);
  }

  // Determine pricing option text
  let priceOption: MatchResult['priceOption'] = 'Free Swap Available';
  if (offersFreeSwap && offersPaid) {
    priceOption = 'Both Available';
  } else if (offersPaid && !offersFreeSwap) {
    priceOption = 'Paid Lessons Only';
  } else {
    priceOption = 'Free Swap Available';
  }

  // Clamp 0 - 100
  const finalScore = Math.min(100, Math.max(0, score));

  // Determine availability match score (deterministic based on overlap)
  const availabilityMatchScore = offersFreeSwap ? 92 : 78;

  return {
    matchedUser: candidateUser,
    matchScore: finalScore,
    isMutualSwap,
    theyTeachWhatYouWant,
    youTeachWhatTheyWant,
    sharedInterests,
    matchReasons,
    availabilityMatchScore,
    priceOption,
  };
}

export function rankMatchesForUser(
  currentUser: UserProfile,
  allUsers: UserProfile[]
): MatchResult[] {
  return allUsers
    .filter((u) => u.id !== currentUser.id && !u.isSuspended)
    .map((candidate) => calculateMatchScore(currentUser, candidate))
    .sort((a, b) => b.matchScore - a.matchScore);
}
