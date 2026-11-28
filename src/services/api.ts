/**
 * Skill Exchange Centralized Frontend API Service
 * Connects the React application to the Express + MongoDB Atlas backend.
 */

// Base API URL configuration:
// - In production, strictly requires VITE_API_URL (points to deployed backend Web Service).
// - In development, falls back to local backend port 5000 if VITE_API_URL is unset.
const isProduction = import.meta.env.PROD;
const envApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

const resolvedBaseUrl = envApiUrl
  ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`)
  : (isProduction ? '' : 'http://localhost:5000/api');

export const API_BASE_URL = resolvedBaseUrl;
export const TOKEN_STORAGE_KEY = 'SKILL_EXCHANGE_AUTH_TOKEN';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  unreadCount?: number;
  error?: string;
  status?: number;
}

/**
 * Helper to perform typed fetch requests with automatic JWT authorization header injection.
 * - Production: uses strict explicit backend Web Service URL; never uses loopback or static site relative fallbacks.
 * - Development: supports localhost, 127.0.0.1 loopback, and local Vite dev proxy (/api).
 * - Validates Content-Type, non-empty response, and valid JSON payload.
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

  // In production, require explicit VITE_API_URL configuration
  if (isProduction && !API_BASE_URL) {
    const configError =
      'Production API URL is not configured. Please set VITE_API_URL in Render Static Site environment settings to your backend Web Service URL (e.g. https://your-backend.onrender.com/api).';
    console.error('[API Config Error]', configError);
    return {
      success: false,
      message: configError,
      error: configError,
    };
  }

  const primaryUrl = `${API_BASE_URL}${endpoint}`;
  const candidateUrls: string[] = [primaryUrl];

  // In local development only: support loopback alternatives and Vite dev proxy (/api)
  if (!isProduction) {
    if (primaryUrl.includes('localhost:5000')) {
      candidateUrls.push(primaryUrl.replace('localhost:5000', '127.0.0.1:5000'));
    } else if (primaryUrl.includes('127.0.0.1:5000')) {
      candidateUrls.push(primaryUrl.replace('127.0.0.1:5000', 'localhost:5000'));
    }
    const relativeProxyUrl = `/api${endpoint}`;
    if (!candidateUrls.includes(relativeProxyUrl)) {
      candidateUrls.push(relativeProxyUrl);
    }
  }

  let lastError: any = null;

  for (const targetUrl of candidateUrls) {
    try {
      console.log(`[API] ${options.method || 'GET'} ${targetUrl}`);
      const response = await fetch(targetUrl, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Strict validation: Reject HTML responses (e.g. static hosting SPA fallback)
      const isHtml =
        contentType.includes('text/html') ||
        text.trim().startsWith('<!doctype') ||
        text.trim().startsWith('<html');

      if (isHtml) {
        const htmlError = `Backend returned HTML instead of JSON. The API endpoint (${targetUrl}) reached a static site or SPA fallback instead of the Express backend.`;
        console.error(`[API Error] Non-JSON response on ${targetUrl}:`, htmlError);
        return {
          success: false,
          message: htmlError,
          error: htmlError,
        };
      }

      // Strict validation: Reject empty responses
      if (!text || text.trim().length === 0) {
        const emptyError = `Empty response (HTTP ${response.status}) received from ${targetUrl}. Expected JSON API payload.`;
        console.error(`[API Error] Empty response on ${targetUrl}:`, emptyError);
        return {
          success: false,
          message: emptyError,
          error: emptyError,
        };
      }

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr: any) {
        const parseErrorMsg = `Invalid JSON response from ${targetUrl}: ${parseErr?.message}`;
        console.error('[API Error] JSON parse error:', parseErrorMsg, text.slice(0, 200));
        return {
          success: false,
          message: parseErrorMsg,
          error: parseErrorMsg,
        };
      }

      if (endpoint === '/auth/register') {
        const safeBody = {
          success: data?.success,
          message: data?.message,
          error: data?.error,
          errors: data?.errors,
          hasData: Boolean(data?.data),
          dataKeys: data?.data ? Object.keys(data.data) : null,
          hasUser: Boolean(data?.data?.user),
          hasToken: Boolean(data?.data?.token),
        };
        console.log(`[Diagnostic:api.ts] Registration HTTP Status: ${response.status}`, safeBody);
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
          status: response.status,
          message: errorDetail,
          error: errorDetail,
          data: data.data || undefined,
        };
      }

      // Even on HTTP 2xx, verify logical success flag if present
      if (data && typeof data === 'object' && data.success === false) {
        const errorDetail =
          data.message ||
          data.error ||
          `Backend returned failure status (HTTP ${response.status})`;
        console.warn(`[API] Logical failure on ${targetUrl}:`, errorDetail);
        return {
          success: false,
          status: response.status,
          message: errorDetail,
          error: errorDetail,
          data: data.data || undefined,
        };
      }

      console.log(`[API] Success ${targetUrl} (HTTP ${response.status})`);
      return {
        ...(data as any),
        status: response.status,
      } as ApiResponse<T>;
    } catch (err: any) {
      lastError = err;
      console.warn(`[API] Attempt on ${targetUrl} failed:`, err?.message);
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

  login: (identifier: string, password: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: identifier, identifier, password }),
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

  getAppointments: (params?: { status?: string; role?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.role) query.set('role', params.role);
    const qs = query.toString();
    return request<any[]>(`/appointments${qs ? `?${qs}` : ''}`);
  },

  getAppointmentById: (id: string) => request<any>(`/appointments/${id}`),

  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    request<any>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, cancellationReason, rejectionReason: cancellationReason }),
    }),

  acceptAppointment: (id: string) =>
    request<any>(`/appointments/${id}/accept`, {
      method: 'PATCH',
    }),

  rejectAppointment: (id: string, rejectionReason?: string) =>
    request<any>(`/appointments/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectionReason, cancellationReason: rejectionReason, reason: rejectionReason }),
    }),

  cancelAppointment: (id: string, reason?: string) =>
    request<any>(`/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  getAppointmentsByUser: (userId: string) => request<any[]>(`/appointments/user/${userId}`),
};

// -----------------------------------------------------------------------------
// 5. Messaging API
// -----------------------------------------------------------------------------
export const messageApi = {
  getConversations: () => request<any[]>('/messages/conversations'),

  getMessages: (conversationId: string) => request<any[]>(`/messages/conversations/${conversationId}`),

  searchTeachers: (searchQuery?: string) => {
    const qs = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
    return request<any[]>(`/messages/teachers${qs}`);
  },

  sendMessage: (payload: { receiverId: string; text?: string; attachmentName?: string; attachmentSize?: string }) =>
    request<{ message: any; conversation: any }>('/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  markAsRead: (conversationId: string) =>
    request(`/messages/conversations/${conversationId}/read`, {
      method: 'PATCH',
    }),

  deleteConversation: (conversationId: string) =>
    request<{ conversationId: string }>(`/messages/conversations/${conversationId}`, {
      method: 'DELETE',
    }),
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
