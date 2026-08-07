import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Header } from '../components/Header';
import { Sidebar, DRAWER_WIDTH } from '../components/Sidebar';

export function MainLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex' }}>
      <Header onMenuClick={() => setMobileOpen((prev) => !prev)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
