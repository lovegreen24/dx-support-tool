import { AppBar, Toolbar, Typography, IconButton, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../hooks/useAuth';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { logout } = useAuth();

  return (
    <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1, fontSize: '1rem' }}>
          中小企業DX伴走支援ツール
        </Typography>
        <Tooltip title="ログアウト">
          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
