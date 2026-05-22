import axios from 'axios';
import { POS_TOKEN } from '../config/constants';

// Production: use empty string so requests go to same origin (nginx proxies /label to backend)
// Local dev: vite.config.js proxies /label/template(s) to localhost:3080
const API_BASE_URL = '';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to inject token
client.interceptors.request.use((config) => {
  if (POS_TOKEN) {
    config.headers.Authorization = `Bearer ${POS_TOKEN}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const labelAPI = {
  getTemplates: (businessId) => client.get(`/label/templates/${businessId}`),
  getActiveTemplate: (businessId) => client.get(`/label/templates/${businessId}/active`),
  getTemplate: (id) => client.get(`/label/template/${id}`),
  createTemplate: (data) => client.post('/label/template', data),
  updateTemplate: (id, data) => client.put(`/label/template/${id}`, data),
  activateTemplate: (id, businessId) => client.put(`/label/template/${id}/activate`, { businessId }),
  deleteTemplate: (id) => client.delete(`/label/template/${id}`)
};

export default client;
