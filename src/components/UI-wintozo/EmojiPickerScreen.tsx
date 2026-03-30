import { useState } from 'react';

const EMOJIS = [
  '😊','😎','🔥','💎','👑','⚡','🌟','🎯','🦋','🐉',
  '🦁','🐺','🦊','🐯','🦅','🐬','🦄','🐙','🎭','🎮',
  '🚀','💫','🌈','❄️','🌊','🍀','🎵','💜','💙','🖤',
  '👻','🤖','👾','🧠','💥','🎪','🏆','⚔️','🛡️','🌙'
];

interface Props {
  onSelect: (emoji: string) => void;
}

export default function EmojiPickerScreen({ onSelect }: Props) {
  const [selected, setSelected] = useState('');

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0a0015 0%, #1a0035 50%, #0a0025 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif", overflow: 'auto'
    }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '24px', textAlign: 'center' }}>
        <h1 style={{
          color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 8,
          background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>Выбери свой эмодзи!</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 8 }}>
          Это твой символ в Wintozo. Каждую неделю — битва эмодзи! ⚔️
        </p>
        <p style={{ color: 'rgba(124,58,237,0.8)', fontSize: 12, marginBottom: 24 }}>
          Под каким эмодзи больше активных пользователей — побеждает!
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 8, marginBottom: 24,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 16, padding: 16,
          border: '1px solid rgba(124,58,237,0.2)'
        }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setSelected(e)} style={{
              fontSize: 28, background: selected === e
                ? 'linear-gradient(135deg, #7c3aed, #3b82f6)'
                : 'rgba(255,255,255,0.05)',
              border: selected === e ? '2px solid #a78bfa' : '2px solid transparent',
              borderRadius: 10, padding: '8px 4px', cursor: 'pointer',
              transition: 'all 0.15s',
              transform: selected === e ? 'scale(1.15)' : 'scale(1)',
              boxShadow: selected === e ? '0 0 15px rgba(124,58,237,0.6)' : 'none'
            }}>{e}</button>
          ))}
        </div>

        {selected && (
          <div style={{
            padding: '16px', borderRadius: 12, marginBottom: 16,
            background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)'
          }}>
            <p style={{ color: '#fff', margin: 0, fontSize: 16 }}>
              Выбрано: <span style={{ fontSize: 28 }}>{selected}</span>
            </p>
          </div>
        )}

        <button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 'none',
            background: selected ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: selected ? 'pointer' : 'not-allowed',
            boxShadow: selected ? '0 0 30px rgba(124,58,237,0.6)' : 'none',
            fontFamily: 'inherit', transition: 'all 0.2s'
          }}
        >
          {selected ? `✅ Выбрать ${selected}` : '👆 Сначала выбери эмодзи'}
        </button>
      </div>
    </div>
  );
}
