import {
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { ApprovalStep, CaseProgress } from '../../types';
import { useCaseProgress } from '../../hooks/useCaseProgress';

function activeStepIndex(steps: ApprovalStep[]): number {
  const index = steps.findIndex((step) => step.status !== 'completed');
  return index === -1 ? steps.length : index;
}

function CaseCard({ caseProgress }: { caseProgress: CaseProgress }) {
  const completedCount = caseProgress.steps.filter((step) => step.status === 'completed').length;

  return (
    <Box sx={{ py: 2 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}
      >
        <Typography variant="h4" component="h4">
          {caseProgress.clientName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          承認済み {completedCount} / {caseProgress.steps.length}
        </Typography>
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Stepper
          activeStep={activeStepIndex(caseProgress.steps)}
          alternativeLabel
          sx={{ minWidth: { xs: 560, sm: 0 } }}
        >
          {caseProgress.steps.map((step) => (
            <Step key={step.label} completed={step.status === 'completed'}>
              <StepLabel
                optional={
                  step.approvedAt ? (
                    <Typography variant="body2" color="text.secondary">
                      {step.approvedAt}
                    </Typography>
                  ) : undefined
                }
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
    </Box>
  );
}

export function CaseProgressSection() {
  const { data: cases, isLoading, isError } = useCaseProgress();

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 1 }}>
        案件進捗・承認履歴
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        案件管理MCP(Googleスプレッドシート連携)の6承認ポイントを表示します
      </Typography>
      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">案件進捗の取得に失敗しました</Alert>}
      {cases && (
        <Stack divider={<Divider />}>
          {cases.map((caseProgress) => (
            <CaseCard key={caseProgress.caseId} caseProgress={caseProgress} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}
