import { Box, Typography, Paper, Grid, CircularProgress, Alert } from '@mui/material';
import { ClientListSection } from './dashboard/ClientListSection';
import { CaseProgressSection } from './dashboard/CaseProgressSection';
import { useClients } from '../hooks/useClients';
import type { Client } from '../types';

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h2">{value}</Typography>
      </Paper>
    </Grid>
  );
}

function buildStats(clients: Client[]) {
  const clientCount = clients.length;
  const avgHearingRate =
    clientCount === 0
      ? 0
      : Math.round(
          clients.reduce((sum, client) => sum + client.hearingCompletionRate, 0) / clientCount,
        );
  const completedProposals = clients.filter(
    (client) => client.proposalStatus === 'completed',
  ).length;
  const unansweredItems = clients.filter((client) => client.hearingCompletionRate < 100).length;

  return [
    { label: 'クライアント数', value: `${clientCount}件` },
    { label: 'ヒアリング完了率', value: `${avgHearingRate}%` },
    { label: '提案書生成済み', value: `${completedProposals}件` },
    { label: '未回答項目あり', value: `${unansweredItems}件` },
  ];
}

export function DashboardPage() {
  const { data: clients, isLoading, isError } = useClients();

  return (
    <Box>
      <Typography variant="h2" component="h2" sx={{ mb: 3 }}>
        進捗ダッシュボード
      </Typography>
      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">クライアント情報の取得に失敗しました</Alert>}
      {clients && (
        <Grid container spacing={2}>
          {buildStats(clients).map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </Grid>
      )}
      <ClientListSection />
      <CaseProgressSection />
    </Box>
  );
}
