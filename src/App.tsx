import { useState, useEffect } from 'react';
import { api, setToken, clearToken } from './services/api';
import { socket } from './services/socket';
import { User, AppScreen } from './types/index';
import SplashScreen from './components/UI-wintozo/SplashScreen';
import AuthScreen from './components/UI-wintozo/AuthScreen';
import EmojiPickerScreen from './components/UI-wintozo/EmojiPickerScreen';
import Sidebar from './components/UI-wintozo/Sidebar';
import ChatView from './components/UI-wintozo/ChatView';
import ConnectionError from './components/UI-wintozo/ConnectionError';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [serverError, setServerError] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    // Try to restore session from cookie/token
    const savedToken = getCookie('wtoken');
    if (savedToken) {
      setToken(savedToken);
      setTokenState(savedToken);
      api.me()
        .then(userData => {
          setUser(userData);
          if (userData.needs_emoji && !userData.is_admin) {
            setScreen('emoji-pick');
          } else {
            setScreen('main');
            connectWS(savedToken);
          }
        })
        .catch(() => {
          deleteCookie('wtoken');
          clearToken();
          setScreen('auth');
        });
    } else {
      setTimeout(() => setScreen('auth'), 2000);
    }
  }, []);

  function connectWS(tok: string) {
    socket.connect(tok);
    socket.onMessage((data) => {
      if (data.type === 'call_incoming') {
        setIncomingCall(data);
      }
      if (data.type === 'kicked') {
        handleLogout();
      }
    });
  }

  function handleLoginSuccess(userData: User, tok: string) {
    setUser(userData);
    setToken(tok);
    setTokenState(tok);
    setCookie('wtoken', tok, 30);
    if (userData.needs_emoji && !userData.is_admin) {
      setScreen('emoji-pick');
    } else {
      setScreen('main');
      connectWS(tok);
    }
  }

  function handleEmojiSelected(emoji: string) {
    api.setEmoji(emoji).then(() => {
      setUser(prev => prev ? { ...prev, emoji, needs_emoji: false } : prev);
      setScreen('main');
      if (token) connectWS(token);
    }).catch(console.error);
  }

  function handleLogout() {
    socket.disconnect();
    clearToken();
    deleteCookie('wtoken');
    setUser(null);
    setSelectedUserId(null);
    setScreen('auth');
    api.logout().catch(() => {});
  }

  function handleSelectUser(userId: number, username: string) {
    setSelectedUserId(userId);
    setSelectedUsername(username);
  }

  if (serverError) {
    return <ConnectionError onRetry={() => { setServerError(false); window.location.reload(); }} />;
  }

  if (screen === 'splash') return <SplashScreen />;
  if (screen === 'auth') return <AuthScreen onSuccess={handleLoginSuccess} />;
  if (screen === 'emoji-pick') return <EmojiPickerScreen onSelect={handleEmojiSelected} />;

  return (
    <div className="app-container">
      <Sidebar
        user={user!}
        selectedUserId={selectedUserId}
        onSelectUser={handleSelectUser}
        onLogout={handleLogout}
      />
      <div className="chat-area">
        {selectedUserId ? (
          <ChatView
            user={user!}
            targetUserId={selectedUserId}
            targetUsername={selectedUsername}
            incomingCall={incomingCall}
            onCallHandled={() => setIncomingCall(null)}
          />
        ) : (
          <div className="empty-chat">
            <div className="empty-chat-inner">
              <div className="empty-logo">W</div>
              <h2>Wintozo</h2>
              <p>Выбери чат чтобы начать общение</p>
              {user?.is_admin && (
                <div className="admin-hint">
                  👑 Ты Администратор<br />
                  <span>Напиши /cmd в чате с WintozоBot для консоли</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=None;Secure`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}
