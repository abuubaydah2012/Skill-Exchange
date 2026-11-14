/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IdentityDocumentType } from '../types';

export interface CountryCodeOption {
  code: string;
  country: string;
  flag: string;
  abbr: string;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+1', country: 'United States', flag: '🇺🇸', abbr: 'US' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', abbr: 'GB' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩', abbr: 'BD' },
  { code: '+91', country: 'India', flag: '🇮🇳', abbr: 'IN' },
  { code: '+1', country: 'Canada', flag: '🇨🇦', abbr: 'CA' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', abbr: 'AU' },
  { code: '+49', country: 'Germany', flag: '🇩🇪', abbr: 'DE' },
  { code: '+33', country: 'France', flag: '🇫🇷', abbr: 'FR' },
  { code: '+81', country: 'Japan', flag: '🇯🇵', abbr: 'JP' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', abbr: 'SG' },
  { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪', abbr: 'AE' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷', abbr: 'BR' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', abbr: 'NG' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰', abbr: 'PK' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩', abbr: 'ID' },
];

/**
 * Accurately calculates age from Date of Birth (YYYY-MM-DD) string based on current date.
 */
export function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 0 ? age : 0;
}

/**
 * Returns required identity document type based on calculated age.
 * - Under 18: Birth Certificate
 * - 18 or above: National ID (NID)
 */
export function getRequiredDocumentType(age: number): IdentityDocumentType | null {
  if (age <= 0) return null;
  if (age < 18) return 'Birth Certificate';
  return 'National ID (NID)';
}

/**
 * Validates whether the submitted document matches the user's calculated age.
 */
export function validateAgeAndDocument(
  dobString: string,
  documentType: IdentityDocumentType | string
): { valid: boolean; error?: string; age: number } {
  if (!dobString) {
    return { valid: false, error: 'Date of birth is required.', age: 0 };
  }

  const age = calculateAge(dobString);

  if (age <= 0 || age > 120) {
    return { valid: false, error: 'Please enter a realistic and valid date of birth.', age };
  }

  if (age < 18) {
    if (documentType !== 'Birth Certificate') {
      return {
        valid: false,
        error: 'Users under 18 years old must verify using a Birth Certificate. National ID is not accepted for minors.',
        age,
      };
    }
  } else {
    if (documentType !== 'National ID (NID)') {
      return {
        valid: false,
        error: 'Users aged 18 or older must verify using a National ID (NID). Birth certificates are not accepted for adults.',
        age,
      };
    }
  }

  return { valid: true, age };
}

/**
 * Format bytes into human-readable string (e.g. "450 KB", "2.1 MB")
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Read File object as base64 Data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Cryptographic SHA-256 password hash using browser Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const subtleCrypto =
    typeof crypto !== 'undefined' && crypto.subtle
      ? crypto.subtle
      : typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle
      ? globalThis.crypto.subtle
      : null;

  if (subtleCrypto) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await subtleCrypto.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }

  // Pure deterministic JS fallback hash if subtle crypto is unavailable
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sha256_sim_' + Math.abs(hash).toString(16);
}

/**
 * Email format validation regex
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Phone number format validation
 */
export function validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Password strength calculation
 */
export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  feedback: string;
  hasMinLength: boolean;
  hasNumber: boolean;
  hasLetter: boolean;
  hasUpperAndLower: boolean;
  hasSpecial: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 6;
  const hasLength8 = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (password.length === 0) {
    return {
      score: 0,
      label: 'Weak',
      color: 'bg-neutral-700',
      feedback: 'Enter a secure password',
      hasMinLength: false,
      hasNumber: false,
      hasLetter: false,
      hasUpperAndLower: false,
      hasSpecial: false,
    };
  }

  let score = 0;
  if (hasMinLength) score++;
  if (hasLetter && hasNumber) score++;
  if (hasLength8 && hasUpperAndLower) score++;
  if (hasSpecial && score >= 2) score++;

  if (score <= 1) {
    return {
      score: 1,
      label: 'Weak',
      color: 'bg-rose-500',
      feedback: 'Needs at least 6 characters with mixed letters and numbers',
      hasMinLength,
      hasNumber,
      hasLetter,
      hasUpperAndLower,
      hasSpecial,
    };
  } else if (score === 2) {
    return {
      score: 2,
      label: 'Fair',
      color: 'bg-amber-500',
      feedback: 'Good start. Add capital letters and symbols for better security',
      hasMinLength,
      hasNumber,
      hasLetter,
      hasUpperAndLower,
      hasSpecial,
    };
  } else if (score === 3) {
    return {
      score: 3,
      label: 'Good',
      color: 'bg-sky-500',
      feedback: 'Strong password. Add special characters for maximum strength',
      hasMinLength,
      hasNumber,
      hasLetter,
      hasUpperAndLower,
      hasSpecial,
    };
  } else {
    return {
      score: 4,
      label: 'Strong',
      color: 'bg-emerald-500',
      feedback: 'Excellent! Your password meets all security criteria',
      hasMinLength,
      hasNumber,
      hasLetter,
      hasUpperAndLower,
      hasSpecial,
    };
  }
}
