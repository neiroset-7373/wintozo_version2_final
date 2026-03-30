interface Props { onRetry: () => void; }

export default function ConnectionError({ onRetry }: Props) {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0a0015, #1a0015)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif", color: '#fff', textAlign: 'center', padding: 24
    }}>
      <div style={{ fontSize: 80, marginBottom: 24 }}>⚠️</div>
      <div style={{
        fontSize: 48, fontWeight: 900, color: '#ef4444',
        textShadow: '0 0 20px rgba(239,68,68,0.8)', marginBottom: 8
      }}>526</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#fca5a5' }}>
        Сервер недоступен
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 300, lineHeight: 1.6, marginBottom: 32 }}>
        Не удалось подключиться к серверу Wintozo.<br />
        Проверь интернет-соединение или попробуй позже.
      </p>
      <button onClick={onRetry} style={{
        padding: '14px 40px', borderRadius: 12, border: 'none',
        background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
        color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 0 30px rgba(124,58,237,0.6)', fontFamily: 'inherit'
      }}>🔄 Переподключиться</button>
    </div>
  );
}
