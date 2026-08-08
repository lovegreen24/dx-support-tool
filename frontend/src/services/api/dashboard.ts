import type { Client, CaseProgress } from '../../types';
import { apiClient } from '../../lib/apiClient';
import { API_PATHS } from '../../types';

export async function fetchClients(): Promise<Client[]> {
  const response = await apiClient.get<Client[]>(API_PATHS.CLIENTS);
  return response.data;
}

export async function fetchCaseProgress(): Promise<CaseProgress[]> {
  const response = await apiClient.get<CaseProgress[]>(API_PATHS.CASE_PROGRESS);
  return response.data;
}
