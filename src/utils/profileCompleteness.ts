/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../types';

export function calculateProfileCompleteness(user: UserProfile): {
  percentage: number;
  missingFields: string[];
} {
  let score = 0;
  const missing: string[] = [];

  if (user.name && user.name.trim().length > 2) {
    score += 15;
  } else {
    missing.push('Full Name');
  }

  if (user.bio && user.bio.trim().length > 20) {
    score += 15;
  } else {
    missing.push('Detailed Bio');
  }

  if (user.location && user.location.trim().length > 2) {
    score += 10;
  } else {
    missing.push('Location');
  }

  if (user.languages && user.languages.length > 0) {
    score += 10;
  } else {
    missing.push('Languages Spoken');
  }

  if (user.teachingSkills && user.teachingSkills.length > 0) {
    score += 20;
  } else {
    missing.push('At least one Teaching Skill');
  }

  if (user.learningInterests && user.learningInterests.length > 0) {
    score += 15;
  } else {
    missing.push('At least one Learning Interest');
  }

  if ((user.experience && user.experience.length > 0) || (user.education && user.education.length > 0)) {
    score += 10;
  } else {
    missing.push('Experience or Education');
  }

  if (user.cvFileName || user.portfolioLinks.length > 0) {
    score += 5;
  } else {
    missing.push('Portfolio or CV Document');
  }

  return {
    percentage: Math.min(100, score),
    missingFields: missing,
  };
}
