import { useQuery } from '@tanstack/react-query';
import { fetchClients } from '../services/api/dashboard';

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  });
}
