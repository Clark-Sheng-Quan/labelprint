import axios from 'axios';
import { POS_WEB_CONFIG } from './config';

// GET /label/render?business_id=xxx
// Returns TSPL with placeholders unreplaced (#{storeName}, #{productName}, etc.)
export const fetchTSPL = async (businessId?: string): Promise<string> => {
  const bid = businessId || POS_WEB_CONFIG.businessId;
  const response = await axios.get(`/label/render`, {
    params: { business_id: bid },
    headers: { 'Authorization': `Bearer ${POS_WEB_CONFIG.token}` }
  });
  return response.data.tspl as string;
};
