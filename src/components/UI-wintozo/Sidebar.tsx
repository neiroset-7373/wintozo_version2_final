import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User } from '../../types/index';

interface Props {
  user: User;
  selectedUserId: number | null;
  onSelectUser: (userId: number, username: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, selectedUserId, onSelectUser, onLogout }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showBattle, setShowBattle] = useState(false);
  const [battleStats, setBattleStats] = useState<any[]>([]);
  const [tab, setTab] = useState<'chats' | 'users'>('chats');

  useEffect(() => {
    loadUsers();
    const interval = setInterval(loadUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadUsers() {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch {}
  }

  async function loadBattle() {
    try {
      const data = await api.getEmojiBattle();
      setBattleStats(data.stats || []);
      setShowBattle(true);
    } catch {}
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const proStyle = user.has_pro ? { fontWeight: 700 } : {};

  return (
    <div style={{
      width: 280, height: '100vh', background: 'rgba(10,0,21,0.97)',
      borderRight: '1px solid rgba(124,58,237,0.2)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '16px', borderBottom: '1px solid rgba(124,58,237,0.15)',
        background: 'rgba(124,58,237,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0
          }}>{user.emoji || '😊'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, ...proStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
              @{user.username}
              {user.has_pro && <span style={{ fontSize: 12, color: '#fbbf24' }}>💎</span>}
              {user.is_admin && <span style={{ fontSize: 12, color: '#f59e0b' }}>👑</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              ID: {user.id} • {user.has_pro ? 'Wintozo Pro' : 'Обычный'}
            </div>
          </div>
          <button onClick={onLogout} title="Выйти" style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, color: '#fca5a5', cursor: 'pointer',
            padding: '6px 8px', fontSize: 12
          }}>Выйти</button>
        </div>

        {/* Search */}
        <input
          placeholder="🔍 Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid rgba(124,58,237,0.25)',
            background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13,
            outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '8px', gap: 6 }}>
        {(['chats', 'users'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px', borderRadius: 8, border: 'none',
            background: tab === t ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'rgba(255,255,255,0.05)',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
          }}>
            {t === 'chats' ? '💬 Чаты' : '👥 Люди'}
          </button>
        ))}
      </div>

      {/* Battle Button */}
      <button onClick={loadBattle} style={{
        margin: '0 8px 8px', padding: '10px', borderRadius: 10, border: 'none',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.3))',
        borderTop: '1px solid rgba(124,58,237,0.3)',
        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
      }}>⚔️ Битва эмодзи</button>

      {/* Users List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {/* WintozоBot first */}
        <div
          onClick={() => onSelectUser(0, 'WintozоBot')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 10, cursor: 'pointer', marginBottom: 4,
            background: selectedUserId === 0
              ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))'
              : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(124,58,237,0.2)'
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>🤖</div>
          <div>
            <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13 }}>WintozоBot</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {user.is_admin ? 'Напиши /cmd для консоли' : 'Официальный бот'}
            </div>
          </div>
        </div>

        {/* Wintozo Official */}
        <div
          onClick={() => onSelectUser(-1, 'Wintozo Official')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 10, cursor: 'pointer', marginBottom: 8,
            background: selectedUserId === -1
              ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))'
              : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(251,191,36,0.2)'
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>📢</div>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>Wintozo Official</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Официальный канал</div>
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, padding: '4px 4px 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Пользователи ({filtered.length})
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 20 }}>
            {search ? 'Никого не найдено' : 'Загрузка...'}
          </div>
        )}

        {filtered.map(u => (
          <div
            key={u.id}
            onClick={() => onSelectUser(u.id, u.username)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 10, cursor: 'pointer', marginBottom: 4,
              background: selectedUserId === u.id
                ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedUserId === u.id ? 'rgba(124,58,237,0.4)' : 'transparent'}`,
              transition: 'all 0.15s'
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(124,58,237,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
            }}>{u.emoji || '😊'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#fff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontWeight: u.has_pro ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                @{u.username}
                {u.has_pro && <span style={{ fontSize: 11 }}>💎</span>}
                {u.is_admin && <span style={{ fontSize: 11 }}>👑</span>}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>ID: {u.id}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Battle Modal */}
      {showBattle && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowBattle(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #0a0015, #1a0035)',
            border: '1px solid rgba(124,58,237,0.4)',
            borderRadius: 16, padding: 24, maxWidth: 380, width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#fff', textAlign: 'center', margin: '0 0 8px', fontSize: 20 }}>⚔️ Битва эмодзи</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 12, marginBottom: 20 }}>
              Эта неделя • Рейтинг по активности
            </p>
            {battleStats.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Нет данных за эту неделю</p>
            ) : (
              battleStats.slice(0, 10).map((s, i) => (
                <div key={s.emoji} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', marginBottom: 6, borderRadius: 10,
                  background: i === 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                  border: i === 0 ? '1px solid rgba(251,191,36,0.4)' : '1px solid transparent'
                }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 16 }}>#{i + 1}</span>
                  <span style={{ fontSize: 24 }}>{s.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                      {i === 0 ? '🏆 Лидер' : `${s.registrations} регистраций`}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      {s.activity} активностей
                    </div>
                  </div>
                  {i === 0 && <span style={{ color: '#fbbf24', fontSize: 18 }}>👑</span>}
                </div>
              ))
            )}
            <button onClick={() => setShowBattle(false)} style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 12,
              background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit'
            }}>Закрыть</button>
          </div>
        </div>
      )}

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 4px; }
      `}</style>
    </div>
  );
}
