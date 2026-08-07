import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Box, Typography, TextField, Button, Alert } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      navigate('/');
    } else {
      setError(true);
    }
  };

  return (
    <Paper elevation={6} sx={{ p: 4, width: 360, maxWidth: '100%' }}>
      <Typography variant="h3" component="h1" sx={{ mb: 1 }}>
        進捗ダッシュボード
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        パスワードを入力してください
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          type="password"
          label="パスワード"
          fullWidth
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          error={error}
          helperText={error ? 'パスワードが正しくありません' : ' '}
          sx={{ mb: 1 }}
        />
        <Button type="submit" variant="contained" fullWidth size="large">
          ログイン
        </Button>
      </Box>
      {import.meta.env.DEV && (
        <Alert severity="info" sx={{ mt: 2 }}>
          開発環境: パスワードは frontend/.env.local の VITE_DASHBOARD_PASSWORD を参照
        </Alert>
      )}
    </Paper>
  );
}
