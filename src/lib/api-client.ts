import { apiClient } from '@/api/client';
import { SIMULATED_DATE_STORAGE_KEY } from '@/features/time-travel/timeTravelUtils';

apiClient.interceptors.request.use((config) => {
  const simulatedDate =
    typeof window !== 'undefined' && window.sessionStorage
      ? sessionStorage.getItem(SIMULATED_DATE_STORAGE_KEY)
      : null;
  if (simulatedDate && config.headers) {
    config.headers['X-Simulated-Date'] = simulatedDate;
  }
  return config;
});

export { apiClient };
export default apiClient;
