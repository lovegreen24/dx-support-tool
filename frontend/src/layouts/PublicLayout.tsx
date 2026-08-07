import type { ReactNode } from 'react';
import { Box } from '@mui/material';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f1b3c 0%, #142352 100%)',
        px: 2,
      }}
    >
      {children}
    </Box>
  );
}
