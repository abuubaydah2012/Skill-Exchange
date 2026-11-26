/**
 * Skill Exchange Centralized Frontend API Service
 * Connects the React application to the Express + MongoDB Atlas backend.
 */

// Base API URL: uses Vite environment variable VITE_API_URL if configured,
// otherwise defaults to local backend port 5000.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `Request failed with status ${response.status}`,
      };
    }

    return data;
  } catch (error: any) {
    console.warn(`[API] Network error communicating with ${url}:`, error.message);
    return {
      success: false,
      message: error.message || 'Network error connecting to backend service.',
    };
  }
}

// -----------------------------------------------------------------------------
// 1. Authentication API
// -----------------------------------------------------------------------------
export const authApi = {
  register: (userData: any) =>
    request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

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
