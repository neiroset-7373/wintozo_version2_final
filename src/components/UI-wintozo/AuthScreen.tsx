import { useState } from 'react';
import { api } from '../../services/api';
import { User } from '../../types/index';

interface Props {
  onSuccess: (user: User, token: string) => void;
}

export default function AuthScreen({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) {
      setError('Заполни все поля');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = mode === 'login'
        ? await api.login(username.trim(), password)
        : await api.register(username.trim(), password);
      onSuccess(res.user, res.token);
    } catch (e: any) {
      setError(e.message || 'Ошибка сервера');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0a0015 0%, #1a0035 50%, #0a0025 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{
        width: '100%', maxWidth: 400, padding: '0 24px'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 44, fontWeight: 900, color: '#fff',
            boxShadow: '0 0 40px rgba(124,58,237,0.7)',
            margin: '0 auto 20px'
          }}>W</div>
          <h1 style={{
            color: '#fff', fontSize: 32, fontWeight: 800, margin: 0,
            background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Wintozo</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontSize: 13, letterSpacing: 2 }}>MESSENGER</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', marginBottom: 24,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12, padding: 4
        }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
              flex: 1, padding: '12px 0', border: 'none', borderRadius: 10,
              background: mode === m ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'transparent',
              color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: mode === m ? '0 0 20px rgba(124,58,237,0.5)' : 'none'
            }}>
              {m === 'login' ? 'Войти' : 'Регистрация'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Никнейм"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(124,58,237,0.3)',
              background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 15,
              outline: 'none', width: '100%', boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(124,58,237,0.3)',
              background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 15,
              outline: 'none', width: '100%', boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            color: '#fca5a5', fontSize: 13, textAlign: 'center'
          }}>{error}</div>
        )}

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 'none',
            background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 0 30px rgba(124,58,237,0.6)',
            transition: 'all 0.2s', fontFamily: 'inherit', letterSpacing: 0.5
          }}
        >
          {loading ? '⏳ Загрузка...' : mode === 'login' ? '🚀 Войти' : '✨ Создать аккаунт'}
        </button>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 32 }}>
          Wintozo Messenger • v2.0 • Windows 7+ • Android 7+ • iOS 16+
        </p>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.35) !important; }
        input:focus { border-color: rgba(124,58,237,0.7) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
      `}</style>
    </div>
  );
}
