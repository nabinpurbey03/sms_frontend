import { useMutation } from '@tanstack/react-query';
import { startViewSession } from './api';

export const useStartViewSession = () => {
  return useMutation({
    mutationFn: startViewSession,
  });
};
