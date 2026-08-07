export interface Client {
  clientId: string;
  name: string;
  industry: string;
  employeeCount: number;
  fiscalYearEnd: string;
  hearingCompletionRate: number;
  proposalStatus: 'not_started' | 'in_progress' | 'completed';
}
