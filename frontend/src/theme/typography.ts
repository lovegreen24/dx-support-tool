import type { TypographyVariantsOptions } from '@mui/material/styles';

export const typography: TypographyVariantsOptions = {
  fontFamily: [
    '"Hiragino Kaku Gothic ProN"',
    '"Hiragino Sans"',
    '"Yu Gothic"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: { fontSize: '2rem', fontWeight: 700 },
  h2: { fontSize: '1.5rem', fontWeight: 700 },
  h3: { fontSize: '1.25rem', fontWeight: 600 },
  h4: { fontSize: '1.1rem', fontWeight: 600 },
  body1: { fontSize: '0.95rem' },
  body2: { fontSize: '0.85rem' },
  button: { fontWeight: 600, textTransform: 'none' },
};
