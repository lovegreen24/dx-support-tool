import { useQuery } from '@tanstack/react-query';
import { fetchCaseProgress } from '../services/api/dashboard';

export function useCaseProgress() {
  return useQuery({
    queryKey: ['case-progress'],
    queryFn: fetchCaseProgress,
  });
}
