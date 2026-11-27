/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { authApi } from '../../services/api';
import { UserRole, IdentityDocumentType, UploadedCertificateDraft } from '../../types';
import {
  COUNTRY_CODES,
  calculateAge,
  getRequiredDocumentType,
  validateAgeAndDocument,
  validateEmail,
  validatePhoneNumber,
  checkPasswordStrength,
  formatFileSize,
  readFileAsDataURL,
} from '../../utils/ageVerification';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Award,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Camera,
  ArrowRight,
  Layers,
  Sparkles,
  Check,
  FileCheck,
  X,
  Sun,
  Moon,
} from 'lucide-react';

export const RegisterForm: React.FC = () => {
  const { registerUser, users, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const identityFileInputId = useId();
  const certFileInputId = useId();
  const avatarFileInputId = useId();

  // 1. Personal Information State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // 2. Account Role State
  const [role, setRole] = useState<UserRole>('learner');

  // 3. Identity Verification State
  const [idDocumentNumber, setIdDocumentNumber] = useState('');
  const [idFile, setIdFile] = useState<{
    name: string;
    size: number;
    dataUrl: string;
    progress: number;
  } | null>(null);

  // 4. Certificates State
  const [certificates, setCertificates] = useState<
    (UploadedCertificateDraft & { id: string; progress: number })[]
  >([]);

  // 5. Profile Picture State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFileName, setAvatarFileName] = useState<string>('');
  const [avatarFileSize, setAvatarFileSize] = useState<number>(0);

  // 6. Password & Security State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation & UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed values
  const age = calculateAge(dateOfBirth);
  const requiredDocType: IdentityDocumentType | null = getRequiredDocumentType(age);
  const passwordStrength = checkPasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Handle Date of Birth change
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDob = e.target.value;
    setDateOfBirth(newDob);

    // Clear previous document file if age category changed (minor vs adult)
    const newAge = calculateAge(newDob);
    const newDocType = getRequiredDocumentType(newAge);
    if (requiredDocType && newDocType && requiredDocType !== newDocType) {
      setIdFile(null);
      setIdDocumentNumber('');
    }

    if (errors.dateOfBirth) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.dateOfBirth;
        return copy;
      });
    }
  };

  // Handle Identity Document PDF Selection
  const handleIdFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF format
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrors((prev) => ({
        ...prev,
        idFile: 'Invalid file format. Only PDF documents are accepted for identity verification.',
      }));
      e.target.value = '';
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        idFile: 'File exceeds maximum limit of 10MB.',
      }));
      e.target.value = '';
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.idFile;
      return copy;
    });

    try {
      const dataUrl = await readFileAsDataURL(file);
      setIdFile({
        name: file.name,
        size: file.size,
        dataUrl,
        progress: 100,
      });
    } catch {
      setErrors((prev) => ({
        ...prev,
        idFile: 'Failed to read document file. Please try again.',
      }));
    }
  };

  const removeIdFile = () => {
    setIdFile(null);
  };

  // Handle Multiple Certificate PDF Selection
  const handleCertFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newCertDrafts: (UploadedCertificateDraft & { id: string; progress: number })[] = [];
    let hasInvalidFormat = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        hasInvalidFormat = true;
        continue;
      }

      try {
        const dataUrl = await readFileAsDataURL(file);
        const defaultTitle = file.name
          .replace(/\.pdf$/i, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        newCertDrafts.push({
          id: 'draft-cert-' + Math.random().toString(36).substring(2, 9),
          title: defaultTitle,
          issuingOrganization: '',
          fileName: file.name,
          fileSize: file.size,
          fileData: dataUrl,
          progress: 100,
        });
      } catch {
        // Skip failed file read
      }
    }

    if (hasInvalidFormat) {
      setErrors((prev) => ({
        ...prev,
        certificates: 'Non-PDF files were skipped. Only PDF files are accepted for certificates.',
      }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.certificates;
        return copy;
      });
    }

    if (newCertDrafts.length > 0) {
      setCertificates((prev) => [...prev, ...newCertDrafts]);
    }
    e.target.value = '';
  };

  const removeCertificate = (certId: string) => {
    setCertificates((prev) => prev.filter((c) => c.id !== certId));
  };

  const updateCertField = (
    certId: string,
    field: 'title' | 'issuingOrganization',
    val: string
  ) => {
    setCertificates((prev) =>
      prev.map((c) => (c.id === certId ? { ...c, [field]: val } : c))
    );
  };

  // Handle Profile Picture Selection
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        avatar: 'Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP.',
      }));
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        avatar: 'Profile picture must be under 5MB.',
      }));
      e.target.value = '';
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.avatar;
      return copy;
    });

    try {
      const dataUrl = await readFileAsDataURL(file);
      setAvatarPreview(dataUrl);
      setAvatarFileName(file.name);
      setAvatarFileSize(file.size);
    } catch {
      setErrors((prev) => ({
        ...prev,
        avatar: 'Failed to process image. Please try another file.',
      }));
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setAvatarFileName('');
    setAvatarFileSize(0);
  };

  // Form Submission & Validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    const newErrors: Record<string, string> = {};

    // 1. Full Name validation
    if (name.trim().length < 2) {
      newErrors.name = 'Please provide your full name (at least 2 characters).';
    }

    // 2. Email Address validation
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!validateEmail(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    } else if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      newErrors.email = 'An account with this email address already exists.';
    } else {
      try {
        const check = await authApi.checkEmail(cleanEmail);
        const isAvailable =
          check.data?.available !== undefined
            ? check.data.available
            : (check as any).available;
        if (check.success && isAvailable === false) {
          newErrors.email =
            check.data?.message ||
            check.message ||
            'An account with this email address already exists.';
        }
      } catch {
        // Fallback to submission-time backend check if check-email endpoint fails
      }
    }

    // 3. Phone Number validation
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required.';
    } else if (!validatePhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number (at least 7 digits).';
    }

    // 4. Date of Birth & Age validation
    if (!dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required.';
    } else {
      const ageVal = validateAgeAndDocument(
        dateOfBirth,
        requiredDocType || 'National ID (NID)'
      );
      if (!ageVal.valid) {
        newErrors.dateOfBirth = ageVal.error || 'Please enter a valid date of birth.';
      }
    }

    // 5. Identity Verification validation
    if (!requiredDocType) {
      newErrors.identity = 'Please select a valid date of birth first.';
    } else {
      if (!idDocumentNumber.trim()) {
        newErrors.idDocumentNumber =
          requiredDocType === 'National ID (NID)'
            ? 'National ID (NID) card number is required.'
            : 'Birth Certificate registration number is required.';
      }
      if (!idFile || !idFile.dataUrl) {
        newErrors.idFile = `Please upload your ${requiredDocType} PDF document.`;
      }
    }

    // 6. Password validation
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setGlobalError('Please fix the errors highlighted below before proceeding.');
      // Scroll to top of card
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const registrationPayload = {
        name: name.trim(),
        email: cleanEmail,
        phoneNumber: phoneNumber.trim(),
        countryCode,
        dateOfBirth,
        role,
        password,
        identityDocument: {
          type: requiredDocType!,
          documentNumber: idDocumentNumber.trim(),
          fileName: idFile!.name,
          fileSize: idFile!.size,
          fileData: idFile!.dataUrl,
        },
        certificates: certificates.map((c) => ({
          title: c.title,
          issuingOrganization: c.issuingOrganization || 'Educational/Professional Issuer',
          fileName: c.fileName,
          fileSize: c.fileSize,
          fileData: c.fileData,
        })),
        avatarUrl: avatarPreview || undefined,
      };

      const result = await registerUser(registrationPayload);
      console.log('[RegisterForm] Registration outcome:', result);

      if (result.success) {
        navigate('/dashboard');
      } else {
        const errorMsg = result.error || 'Registration failed. Please check your information.';
        setGlobalError(errorMsg);
        if (errorMsg.toLowerCase().includes('email')) {
          setErrors((prev) => ({ ...prev, email: errorMsg }));
        } else if (errorMsg.toLowerCase().includes('phone')) {
          setErrors((prev) => ({ ...prev, phoneNumber: errorMsg }));
        }
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setGlobalError('An unexpected error occurred during registration. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-sky-500 selection:text-white transition-colors">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          aria-label="Toggle color mode"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
        </button>
      </div>

      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-gradient-to-tr from-sky-600/10 via-indigo-600/10 to-emerald-600/10 blur-[120px] rounded-full dark:opacity-100 opacity-60" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Prominent Header with Skill Exchange Logo */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-3 group focus:outline-none"
            aria-label="Skill Exchange Home"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform duration-300">
              <Layers className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="text-left">
              <span className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white block leading-tight">
                Skill Exchange
              </span>
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-widest block">
                Knowledge Community
              </span>
            </div>
          </Link>

          <h1 className="mt-5 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Create Your Skill Exchange Account
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Join a global community exchanging knowledge and booking masterclasses.
          </p>
        </div>

        {/* Registration Card */}
        <div className="mt-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/90 rounded-2xl shadow-xl dark:shadow-2xl p-6 sm:p-10 backdrop-blur-md">
          {globalError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Error</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{globalError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ============================================================== */}
            {/* SECTION 1: Personal Information */}
            {/* ============================================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Personal Information
                </h2>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.name;
                          return copy;
                        });
                      }
                    }}
                    placeholder="e.g. Alex Morgan"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border ${
                      errors.name
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-neutral-900 dark:text-white focus:ring-rose-500'
                        : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-700 focus:ring-neutral-200 dark:focus:ring-neutral-800'
                    } focus:outline-none focus:ring-2 transition-all`}
                  />
                  <User className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-3" />
                </div>
                {errors.name && (
                  <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.email;
                          return copy;
                        });
                      }
                    }}
                    onBlur={async () => {
                      const clean = email.toLowerCase().trim();
                      if (clean && validateEmail(clean)) {
                        try {
                          const check = await authApi.checkEmail(clean);
                          if (check.success && check.data && !check.data.available) {
                            setErrors((prev) => ({
                              ...prev,
                              email: check.data?.message || 'An account with this email address already exists.',
                            }));
                          }
                        } catch {
                          // Ignore blur check error if offline
                        }
                      }
                    }}
                    placeholder="alex@example.com"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border ${
                      errors.email
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-neutral-900 dark:text-white focus:ring-rose-500'
                        : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-700 focus:ring-neutral-200 dark:focus:ring-neutral-800'
                    } focus:outline-none focus:ring-2 transition-all`}
                  />
                  <Mail className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-3" />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Phone Number with Country Code */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800 cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code + c.abbr} value={c.code} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                          {c.flag} {c.abbr} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 relative">
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (errors.phoneNumber) {
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.phoneNumber;
                            return copy;
                          });
                        }
                      }}
                      placeholder="e.g. 555-0199 or 01712345678"
                      className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border ${
                        errors.phoneNumber
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-neutral-900 dark:text-white focus:ring-rose-500'
                          : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-700 focus:ring-neutral-200 dark:focus:ring-neutral-800'
                      } focus:outline-none focus:ring-2 transition-all`}
                    />
                    <Phone className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-3" />
                  </div>
                </div>
                {errors.phoneNumber && (
                  <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.phoneNumber}</span>
                  </p>
                )}
              </div>

              {/* Date of Birth & Automatic Age Calculation */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Date of Birth <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={handleDobChange}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border ${
                      errors.dateOfBirth
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-neutral-900 dark:text-white focus:ring-rose-500'
                        : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:border-neutral-400 dark:focus:border-neutral-700 focus:ring-neutral-200 dark:focus:ring-neutral-800'
                    } focus:outline-none focus:ring-2 transition-all`}
                  />
                  <Calendar className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-3" />
                </div>
                {errors.dateOfBirth && (
                  <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.dateOfBirth}</span>
                  </p>
                )}

                {/* Live Age Indicator Banner */}
                {dateOfBirth && (
                  <div
                    className={`mt-2.5 p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      age >= 18
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                        : age > 0
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/80 text-sky-800 dark:text-sky-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {age >= 18 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold">
                          Calculated Age: {age} {age === 1 ? 'year' : 'years'} old
                        </span>
                        <span className="text-[11px] block opacity-85">
                          {age >= 18
                            ? 'Adult (18+) — National ID (NID) document required'
                            : age > 0
                            ? 'Minor (Under 18) — Official Birth Certificate required'
                            : 'Invalid date of birth entered'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        age >= 18
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30'
                      }`}
                    >
                      {age >= 18 ? 'Adult' : 'Minor'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION 2: Account Role */}
            {/* ============================================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Account Role
                </h2>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Select Your Primary Platform Role <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('learner')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'learner'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30 ring-1 ring-sky-500 text-neutral-900 dark:text-white'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 hover:bg-neutral-100/50 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">Learner</span>
                      {role === 'learner' ? (
                        <div className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1.5 leading-relaxed">
                      I want to learn skills from peers, enroll in interactive workshops, and exchange knowledge.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'teacher'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30 ring-1 ring-sky-500 text-neutral-900 dark:text-white'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 hover:bg-neutral-100/50 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">Teacher</span>
                      {role === 'teacher' ? (
                        <div className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1.5 leading-relaxed">
                      I want to teach lessons, host masterclasses, and offer free skill swaps to the community.
                    </p>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                  Note: You can both teach and learn on any verified Skill Exchange account.
                </p>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION 3: Identity Verification (Strict Age-Based Logic) */}
            {/* ============================================================== */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Identity Verification
                  </h2>
                </div>
                {requiredDocType && (
                  <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    PDF Document Only
                  </span>
                )}
              </div>

              {!dateOfBirth ? (
                /* Prompt user to select DOB first */
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/80 text-center">
                  <ShieldCheck className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-300">
                    Please select your Date of Birth in Section 1
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Your required identity verification document (National ID vs. Birth Certificate) is automatically determined based on your verified age.
                  </p>
                </div>
              ) : age >= 18 ? (
                /* Adult >= 18: National ID Required */
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>National ID (NID) Required — Adult User ({age} years old)</span>
                    </div>
                    <p className="text-[11px] text-emerald-700/90 dark:text-emerald-200/80 mt-1 leading-relaxed">
                      As an adult user, government regulations require a valid National ID (NID) card for identity verification. Birth certificates are not accepted for adults.
                    </p>
                  </div>

                  {/* NID Number Field */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      National ID (NID) Card Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={idDocumentNumber}
                      onChange={(e) => {
                        setIdDocumentNumber(e.target.value);
                        if (errors.idDocumentNumber) {
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.idDocumentNumber;
                            return copy;
                          });
                        }
                      }}
                      placeholder="e.g. NID-88401923"
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                        errors.idDocumentNumber
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-neutral-900 dark:text-white'
                          : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-700'
                      } focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800`}
                    />
                    {errors.idDocumentNumber && (
                      <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.idDocumentNumber}</span>
                      </p>
                    )}
                  </div>

                  {/* NID PDF Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Upload National ID Document (PDF format only) <span className="text-rose-400">*</span>
                    </label>

                    {!idFile ? (
                      <div className="relative">
                        <input
                          id={identityFileInputId}
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleIdFileSelect}
                          className="sr-only"
                        />
                        <label
                          htmlFor={identityFileInputId}
                          className={`w-full p-6 rounded-xl border-2 border-dashed ${
                            errors.idFile
                              ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
                              : 'border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-950/60'
                          } flex flex-col items-center justify-center text-center cursor-pointer transition-colors group`}
                        >
                          <Upload className="w-7 h-7 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors mb-2" />
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                            Click to browse or drop your National ID (NID) PDF here
                          </span>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                            PDF format only · Maximum 10MB
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                              {idFile.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                              <span>{formatFileSize(idFile.size)}</span>
                              <span>·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Ready for verification
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={removeIdFile}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-neutral-200 dark:hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {errors.idFile && (
                      <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.idFile}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Minor < 18: Birth Certificate Required */
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/70 bg-sky-50/70 dark:bg-sky-950/30 text-xs">
                    <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold">
                      <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Birth Certificate Required — Minor User ({age} years old)</span>
                    </div>
                    <p className="text-[11px] text-sky-700/90 dark:text-sky-200/80 mt-1 leading-relaxed">
                      For members under 18 years of age, identity verification is conducted via your official Birth Certificate. National ID is not required.
                    </p>
                  </div>

                  {/* Birth Certificate Number Field */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Birth Certificate Registration Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={idDocumentNumber}
                      onChange={(e) => {
                        setIdDocumentNumber(e.target.value);
                        if (errors.idDocumentNumber) {
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.idDocumentNumber;
                            return copy;
                          });
                        }
                      }}
                      placeholder="e.g. BC-2009-948201"
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                        errors.idDocumentNumber
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-neutral-900 dark:text-white'
                          : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-700'
                      } focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800`}
                    />
                    {errors.idDocumentNumber && (
                      <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.idDocumentNumber}</span>
                      </p>
                    )}
                  </div>

                  {/* Birth Certificate PDF Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Upload Birth Certificate (PDF format only) <span className="text-rose-400">*</span>
                    </label>

                    {!idFile ? (
                      <div className="relative">
                        <input
                          id={identityFileInputId}
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleIdFileSelect}
                          className="sr-only"
                        />
                        <label
                          htmlFor={identityFileInputId}
                          className={`w-full p-6 rounded-xl border-2 border-dashed ${
                            errors.idFile
                              ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
                              : 'border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-950/60'
                          } flex flex-col items-center justify-center text-center cursor-pointer transition-colors group`}
                        >
                          <Upload className="w-7 h-7 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors mb-2" />
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                            Click to browse or drop your Birth Certificate PDF here
                          </span>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                            PDF format only · Maximum 10MB
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                              {idFile.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                              <span>{formatFileSize(idFile.size)}</span>
                              <span>·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Ready for verification
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={removeIdFile}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-neutral-200 dark:hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {errors.idFile && (
                      <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.idFile}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================== */}
            {/* SECTION 4: Certificates & Qualifications */}
            {/* ============================================================== */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Certificates & Qualifications
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  Optional · Multiple PDFs
                </span>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Upload your educational degrees, professional certifications, or skill accreditation diplomas. Verified certificates will earn verified badges on your profile.
              </p>

              {/* Upload Dropzone */}
              <div>
                <input
                  id={certFileInputId}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={handleCertFilesSelect}
                  className="sr-only"
                />
                <label
                  htmlFor={certFileInputId}
                  className="w-full p-5 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-950/60 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
                >
                  <Award className="w-6 h-6 text-neutral-400 group-hover:text-amber-500 transition-colors mb-1.5" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Click to add certificates (PDF files only)
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Select one or multiple PDF documents
                  </span>
                </label>
              </div>

              {errors.certificates && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.certificates}</span>
                </p>
              )}

              {/* Uploaded Certificate List */}
              {certificates.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    Uploaded Certificates ({certificates.length})
                  </span>
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                            {cert.fileName}
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 shrink-0">
                            ({formatFileSize(cert.fileSize)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCertificate(cert.id)}
                          className="text-neutral-400 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Remove certificate"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">
                            Certificate Title
                          </label>
                          <input
                            type="text"
                            value={cert.title}
                            onChange={(e) => updateCertField(cert.id, 'title', e.target.value)}
                            placeholder="e.g. AWS Solutions Architect"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">
                            Issuing Institution / Organization
                          </label>
                          <input
                            type="text"
                            value={cert.issuingOrganization || ''}
                            onChange={(e) =>
                              updateCertField(cert.id, 'issuingOrganization', e.target.value)
                            }
                            placeholder="e.g. Amazon Web Services"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-700"
                          />
                        </div>
                      </div>

                      {/* Upload progress indicator */}
                      <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 pt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready to attach to profile</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ============================================================== */}
            {/* SECTION 5: Profile Picture Upload */}
            {/* ============================================================== */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center">
                    5
                  </span>
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Profile Picture
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  JPG, PNG, WEBP · Max 5MB
                </span>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex flex-col sm:flex-row items-center gap-5">
                {/* Circular Preview */}
                <div className="relative shrink-0">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-sky-500 shadow-md shadow-sky-500/10"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400">
                      <Camera className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider">
                        No photo
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload & Actions */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <input
                      id={avatarFileInputId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarSelect}
                      className="sr-only"
                    />
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <label
                        htmlFor={avatarFileInputId}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{avatarPreview ? 'Change Photo' : 'Upload Photo'}</span>
                      </label>

                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg cursor-pointer transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {avatarFileName ? (
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
                      {avatarFileName} ({formatFileSize(avatarFileSize)})
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      A clear, friendly face photo helps you build instant trust for bookings and skill swaps.
                    </p>
                  )}
                </div>
              </div>

              {errors.avatar && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.avatar}</span>
                </p>
              )}
            </div>

            {/* ============================================================== */}
            {/* SECTION 6: Password & Security */}
            {/* ============================================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center">
                  6
                </span>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Password & Security
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.password;
                            return copy;
                          });
                        }
                      }}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border ${
                        errors.password
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-neutral-900 dark:text-white'
                          : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-700'
                      } focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800`}
                    />
                    <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-0.5"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) {
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.confirmPassword;
                            return copy;
                          });
                        }
                      }}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border ${
                        errors.confirmPassword
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-neutral-900 dark:text-white'
                          : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-neutral-400 dark:focus:border-neutral-700'
                      } focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800`}
                    />
                    <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-0.5"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.confirmPassword}</span>
                    </p>
                  )}
                  {confirmPassword.length > 0 && !errors.confirmPassword && (
                    <p
                      className={`text-[11px] mt-1 flex items-center gap-1 font-medium ${
                        passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Passwords match
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" /> Passwords do not match
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">Password Strength:</span>
                    <span
                      className={`font-bold ${
                        passwordStrength.label === 'Strong'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : passwordStrength.label === 'Good'
                          ? 'text-sky-600 dark:text-sky-400'
                          : passwordStrength.label === 'Fair'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>

                  {/* 4-bar strength indicator */}
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${
                          passwordStrength.score >= step
                            ? passwordStrength.color
                            : 'bg-neutral-200 dark:bg-neutral-800'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-tight">
                    {passwordStrength.feedback}
                  </p>
                </div>
              )}
            </div>

            {/* ============================================================== */}
            {/* Complete Registration Action Button */}
            {/* ============================================================== */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 text-sm font-bold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-neutral-900/10 dark:shadow-white/5 cursor-pointer active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white dark:border-neutral-950 border-t-transparent rounded-full animate-spin" />
                    <span>Processing Secure Registration...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-neutral-500 dark:text-neutral-400 mt-3">
                By registering, you agree to Skill Exchange Community Guidelines and Identity Verification Standards.
              </p>
            </div>
          </form>

          {/* Already registered sign in link */}
          <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Already registered?{' '}
            </span>
            <Link
              to="/login"
              className="text-xs font-semibold text-neutral-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
