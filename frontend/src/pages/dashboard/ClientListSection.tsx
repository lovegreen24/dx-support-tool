import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Box,
  LinearProgress,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { Client } from '../../types';
import { useClients } from '../../hooks/useClients';

const PROPOSAL_STATUS_META: Record<
  Client['proposalStatus'],
  { label: string; color: 'default' | 'warning' | 'success' }
> = {
  not_started: { label: '未着手', color: 'default' },
  in_progress: { label: '進行中', color: 'warning' },
  completed: { label: '完了', color: 'success' },
};

function HearingProgressCell({ rate }: { rate: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
      <LinearProgress
        variant="determinate"
        value={rate}
        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 36, textAlign: 'right' }}>
        {rate}%
      </Typography>
    </Box>
  );
}

function ClientRow({ client }: { client: Client }) {
  const statusMeta = PROPOSAL_STATUS_META[client.proposalStatus];
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {client.name}
        </Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{client.industry}</TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {client.employeeCount}名
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{client.fiscalYearEnd}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <HearingProgressCell rate={client.hearingCompletionRate} />
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Chip label={statusMeta.label} color={statusMeta.color} size="small" />
      </TableCell>
    </TableRow>
  );
}

export function ClientListSection() {
  const { data: clients, isLoading, isError } = useClients();

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 2 }}>
        クライアント一覧
      </Typography>
      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">クライアント一覧の取得に失敗しました</Alert>}
      {clients && (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>企業名</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>業種</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  従業員数
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>決算期</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>ヒアリング完了率</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>提案書ステータス</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((client) => (
                <ClientRow key={client.clientId} client={client} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
