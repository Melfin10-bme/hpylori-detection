const API_BASE = '/api';

// Helper function for making API requests
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ============= Auth API =============

export const login = (username, password) => request('/auth/login', {
  method: 'POST',
  body: { username, password },
});

export const register = (username, email, password, role) => request('/auth/register', {
  method: 'POST',
  body: { username, email, password, role },
});

export const getCurrentUser = () => request('/auth/me');

export const getUsers = () => request('/users');

export const deleteUser = (id) => request(`/users/${id}`, {
  method: 'DELETE',
});

// ============= Appointments API =============

export const getAppointments = (patientId = null) => {
  const endpoint = patientId ? `/appointments?patientId=${patientId}` : '/appointments';
  return request(endpoint);
};

export const createAppointment = (appointment) => request('/appointments', {
  method: 'POST',
  body: appointment,
});

export const updateAppointment = (id, appointment) => request(`/appointments/${id}`, {
  method: 'PUT',
  body: appointment,
});

export const deleteAppointment = (id) => request(`/appointments/${id}`, {
  method: 'DELETE',
});

// ============= Patient API =============

export const getPatients = () => request('/patients');

export const getPatient = (id) => request(`/patients/${id}`);

export const createPatient = (patient) => request('/patients', {
  method: 'POST',
  body: patient,
});

export const updatePatient = (id, patient) => request(`/patients/${id}`, {
  method: 'PUT',
  body: patient,
});

export const deletePatient = (id) => request(`/patients/${id}`, {
  method: 'DELETE',
});

// ============= Test API =============

export const getTests = (patientId = null) => {
  const endpoint = patientId ? `/tests?patientId=${patientId}` : '/tests';
  return request(endpoint);
};

export const getTest = (id) => request(`/tests/${id}`);

export const createTest = (test) => request('/tests', {
  method: 'POST',
  body: test,
});

export const analyzeSignal = (binarySignal) => request('/tests/analyze', {
  method: 'POST',
  body: { binarySignal },
});

export const generateRandomSignal = () => request('/tests/generate-random', {
  method: 'POST',
});

export const batchCreateTests = (patientId, signals) => request('/tests/batch', {
  method: 'POST',
  body: { patientId, signals },
});

export const compareTest = (testId) => request(`/tests/${testId}/compare`);

// ============= Report API =============

export const getReports = () => request('/reports');

export const generatePDFReport = (patientId, testId) => request('/reports/generate-pdf', {
  method: 'POST',
  body: { patientId, testId, format: 'PDF' },
});

export const generateCSVReport = (patientId, testId) => request('/reports/generate-csv', {
  method: 'POST',
  body: { patientId, testId, format: 'CSV' },
});

// ============= Analytics API =============

export const getAnalyticsSummary = () => request('/analytics/summary');

export const getAnalyticsTrends = () => request('/analytics/trends');

// ============= Chat API =============

export const sendChatMessage = (message) => request('/chat', {
  method: 'POST',
  body: { message },
});

// ============= Fake Data API =============

export const generateFakeData = (numPatients = 50) => request(`/generate-fake-data?num_patients=${numPatients}`, {
  method: 'POST',
});

// ============= Health Check =============

export const healthCheck = () => request('/health');

export default {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getTests,
  getTest,
  createTest,
  analyzeSignal,
  generateRandomSignal,
  getReports,
  generatePDFReport,
  generateCSVReport,
  getAnalyticsSummary,
  getAnalyticsTrends,
  sendChatMessage,
  generateFakeData,
  healthCheck,
};