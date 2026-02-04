import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const labelAPI = {
  getTemplates: (businessId) => client.get(`/label/templates/${businessId}`),
  getTemplate: (id) => client.get(`/label/template/${id}`),
  createTemplate: (data) => client.post('/label/template', data),
  updateTemplate: (id, data) => client.put(`/label/template/${id}`, data),
  deleteTemplate: (id) => client.delete(`/label/template/${id}`)
};

export default client;
