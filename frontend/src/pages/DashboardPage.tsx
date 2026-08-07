import { Box, Typography, Paper, Grid } from '@mui/material';

export function DashboardPage() {
  return (
    <Box>
      <Typography variant="h2" component="h2" sx={{ mb: 3 }}>
        進捗ダッシュボード
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="body2" color="text.secondary">
              クライアント数
            </Typography>
            <Typography variant="h2">—</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ヒアリング完了率
            </Typography>
            <Typography variant="h2">—</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              提案書生成済み
            </Typography>
            <Typography variant="h2">—</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              未回答項目
            </Typography>
            <Typography variant="h2">—</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
