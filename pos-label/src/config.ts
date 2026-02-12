// POS Web independent configuration
export const POS_WEB_CONFIG = {
  // Business ID for POS system
  businessId: localStorage.getItem('posBusinessId') || '67295c445242136caa4511d4',
  
  // Token for API authentication
  token: localStorage.getItem('posToken') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjVmN2JiOTE5NmVhMjA3MjJkOWQxMWI5IiwiZW1haWwiOiJsb3VoYW93ZWlAZ21haWwuY29tIiwicGhvbmUiOiIwNDAwMDAwMDAxIiwiZXhwIjoxNzc4MTEyMTk5fQ.MMK6x3tAHLNbxsm4-BxSHtlkkRmiGEQ4XZu862tKKU0'
};
