import { Box, Typography, Paper, Grid } from '@mui/material';
import { ClientListSection } from './dashboard/ClientListSection';
import { CaseProgressSection } from './dashboard/CaseProgressSection';
import { DUMMY_CLIENTS } from './dashboard/dummyData';

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

function buildStats() {
  const clientCount = DUMMY_CLIENTS.length;
  const avgHearingRate = Math.round(
    DUMMY_CLIENTS.reduce((sum, client) => sum + client.hearingCompletionRate, 0) / clientCount,
  );
  const completedProposals = DUMMY_CLIENTS.filter(
    (client) => client.proposalStatus === 'completed',
  ).length;
  const unansweredItems = DUMMY_CLIENTS.filter(
    (client) => client.hearingCompletionRate < 100,
  ).length;

  return [
    { label: 'クライアント数', value: `${clientCount}件` },
    { label: 'ヒアリング完了率', value: `${avgHearingRate}%` },
    { label: '提案書生成済み', value: `${completedProposals}件` },
    { label: '未回答項目あり', value: `${unansweredItems}件` },
  ];
}

export function DashboardPage() {
  const stats = buildStats();

  return (
    <Box>
      <Typography variant="h2" component="h2" sx={{ mb: 3 }}>
        進捗ダッシュボード
      </Typography>
      <Grid container spacing={2}>
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </Grid>
      <ClientListSection />
      <CaseProgressSection />
    </Box>
  );
}
