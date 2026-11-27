/**
 * Skill Exchange Centralized Frontend API Service
 * Connects the React application to the Express + MongoDB Atlas backend.
 */

// Base API URL: uses Vite environment variable VITE_API_URL if configured,
// otherwise defaults to local backend port 5000. Normalizes trailing slashes and ensures /api path.
const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
export const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
export const TOKEN_STORAGE_KEY = 'SKILL_EXCHANGE_AUTH_TOKEN';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  unreadCount?: number;
  error?: string;
}

/**
 * Helper to perform typed fetch requests with automatic JWT authorization header injection.
 * Robust against localhost vs 127.0.0.1 loopback resolution differences and Vite dev proxy.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Determine candidate URLs: configured API_BASE_URL, alternate loopback, and relative proxy (/api)
  const primaryUrl = `${API_BASE_URL}${endpoint}`;
  const candidateUrls: string[] = [primaryUrl];

  if (primaryUrl.includes('localhost:5000')) {
    candidateUrls.push(primaryUrl.replace('localhost:5000', '127.0.0.1:5000'));
  } else if (primaryUrl.includes('127.0.0.1:5000')) {
    candidateUrls.push(primaryUrl.replace('127.0.0.1:5000', 'localhost:5000'));
  }
  const relativeProxyUrl = `/api${endpoint}`;
  if (!candidateUrls.includes(relativeProxyUrl)) {
    candidateUrls.push(relativeProxyUrl);
  }

  let lastError: any = null;

  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl, {
        ...options,
        headers,
      });

      console.log(`[API] ${options.method || 'GET'} ${targetUrl}`);
      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || `Request completed with status ${response.status}` };
      }

      if (!response.ok) {
        const errorDetail =
          data.message ||
          data.error ||
          (data.errors && typeof data.errors === 'object'
            ? Object.values(data.errors).join(', ')
            : undefined) ||
          data.data?.message ||
          data.data?.error ||
          `Backend error (HTTP ${response.status}): ${response.statusText || 'Request failed'}`;
        console.warn(`[API] Response error on ${targetUrl}:`, { status: response.status, errorDetail, data });
        return {
          success: false,
          message: errorDetail,
          error: errorDetail,
          data: data.data || undefined,
        };
      }

      console.log(`[API] Success ${targetUrl} (HTTP ${response.status})`);
      return data as ApiResponse<T>;
    } catch (err: any) {
      lastError = err;
      console.warn(`[API] Attempt on ${targetUrl} failed:`, err?.message);
      // Continue to next candidate URL (e.g. 127.0.0.1 or /api) if network/CORS error occurs on this address
      continue;
    }
  }

  const networkErrMsg = lastError?.message
    ? `Network error: ${lastError.message}. Tried ${candidateUrls.join(', ')}`
    : `Could not connect to backend server. Tried ${candidateUrls.join(', ')}`;
  console.warn(`[API] All candidate URLs failed for ${primaryUrl}:`, networkErrMsg);
  return {
    success: false,
    message: networkErrMsg,
    error: networkErrMsg,
  };
}

// -----------------------------------------------------------------------------
// 1. Authentication API
// -----------------------------------------------------------------------------
export const authApi = {
  register: (userData: any) =>
    request<{ user: any; certificates?: any[]; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  checkEmail: (email: string) =>
    request<{ available: boolean; message: string }>(
      `/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`
    ),

  getMe: () => request<any>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  },
};

// -----------------------------------------------------------------------------
// 2. Users API
// -----------------------------------------------------------------------------
export const userApi = {
  getUsers: (params?: { role?: string; search?: string; location?: string }) => {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.search) query.set('search', params.search);
    if (params?.location) query.set('location', params.location);
    const qs = query.toString();
    return request<any[]>(`/users${qs ? `?${qs}` : ''}`);
  },

  getUserById: (id: string) => request<any>(`/users/${id}`),

  updateProfile: (profileData: any) =>
    request<any>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  deleteUser: (id: string) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),
};

// -----------------------------------------------------------------------------
// 3. Skills API
// -----------------------------------------------------------------------------
export const skillApi = {
  getSkills: (params?: { category?: string; skillType?: string; search?: string; freeOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.skillType) query.set('skillType', params.skillType);
    if (params?.search) query.set('search', params.search);
    if (params?.freeOnly) query.set('freeOnly', 'true');
    const qs = query.toString();
    return request<any[]>(`/skills${qs ? `?${qs}` : ''}`);
  },

  createSkill: (skillData: any) =>
    request<any>('/skills', {
      method: 'POST',
      body: JSON.stringify(skillData),
    }),

  updateSkill: (id: string, skillData: any) =>
    request<any>(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(skillData),
    }),

  deleteSkill: (id: string) =>
    request(`/skills/${id}`, {
      method: 'DELETE',
    }),

  getSkillsByUser: (userId: string) => request<any[]>(`/skills/user/${userId}`),
};

// -----------------------------------------------------------------------------
// 4. Appointments API
// -----------------------------------------------------------------------------
export const appointmentApi = {
  createAppointment: (appointmentData: any) =>
    request<any>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    }),

  getAppointments: () => request<any[]>('/appointments'),

  getAppointmentById: (id: string) => request<any>(`/appointments/${id}`),

  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    request<any>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, cancellationReason }),
    }),

  cancelAppointment: (id: string, reason?: string) =>
    request<any>(`/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  getAppointmentsByUser: (userId: string) => request<any[]>(`/appointments/user/${userId}`),
};

// -----------------------------------------------------------------------------
// 5. Notifications API
// -----------------------------------------------------------------------------
export const notificationApi = {
  getNotifications: () => request<any[]>('/notifications'),

  markAsRead: (id: string) =>
    request<any>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: () =>
    request<any>('/notifications/read-all', {
      method: 'PATCH',
    }),
};

// -----------------------------------------------------------------------------
// 6. Reviews API
// -----------------------------------------------------------------------------
export const reviewApi = {
  createReview: (reviewData: any) =>
    request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    }),

  getReviewsByUser: (userId: string) => request<any[]>(`/reviews/user/${userId}`),
};

// -----------------------------------------------------------------------------
// 7. Certificates API
// -----------------------------------------------------------------------------
export const certificateApi = {
  createCertificate: (certData: any) =>
    request<any>('/certificates', {
      method: 'POST',
      body: JSON.stringify(certData),
    }),

  getCertificatesByUser: (userId: string) => request<any[]>(`/certificates/user/${userId}`),

  deleteCertificate: (id: string) =>
    request(`/certificates/${id}`, {
      method: 'DELETE',
    }),
};

// -----------------------------------------------------------------------------
// 8. Health & System Diagnostic API
// -----------------------------------------------------------------------------
export const healthApi = {
  checkHealth: () => request<any>('/health'),
};
