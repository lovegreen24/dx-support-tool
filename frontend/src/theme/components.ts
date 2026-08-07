import type { Components, Theme } from '@mui/material/styles';

export const components: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        paddingTop: 8,
        paddingBottom: 8,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12,
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: '#0f1b3c',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: '#0f1b3c',
        color: '#c7d1ef',
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        margin: '2px 8px',
        '&.Mui-selected': {
          backgroundColor: 'rgba(79, 157, 255, 0.16)',
          color: '#ffffff',
        },
      },
    },
  },
};
