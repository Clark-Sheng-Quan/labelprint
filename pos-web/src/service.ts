import axios from 'axios';
import { POS_WEB_CONFIG } from './config';

// Sync and get the active template for the business
export const fetchActiveTemplate = async (businessId?: string) => {
  try {
    const bid = businessId || POS_WEB_CONFIG.businessId;
    const response = await axios.post(`${POS_WEB_CONFIG.apiBase}/sync`, {
      params: {
        businessId: bid
      },
      headers: {
        'Authorization': `Bearer ${POS_WEB_CONFIG.token}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to sync active template:', error);
    throw error;
  }
};

// Sync/refresh the active template
export const syncActiveTemplate = async (businessId?: string) => {
  try {
    const template = await fetchActiveTemplate(businessId);
    return template;
  } catch (error) {
    console.error('Failed to sync active template:', error);
    throw error;
  }
};
