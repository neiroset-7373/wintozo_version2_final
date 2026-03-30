import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 35);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0a0015 0%, #1a0035 50%, #0a0025 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: 30,
        background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, fontWeight: 900, color: '#fff',
        boxShadow: '0 0 60px rgba(124,58,237,0.8)',
        marginBottom: 32, animation: 'pulse 2s infinite'
      }}>W</div>

      <h1 style={{
        color: '#fff', fontSize: 36, fontWeight: 800, margin: '0 0 8px',
        background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
      }}>Wintozo</h1>
      <p style={{ color: '#7c3aed', fontSize: 14, margin: '0 0 48px', letterSpacing: 3 }}>
        MESSENGER v2.0
      </p>

      <div style={{ width: 260, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
          borderRadius: 4, transition: 'width 0.05s linear',
          boxShadow: '0 0 10px rgba(124,58,237,0.8)'
        }} />
      </div>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 12 }}>
        Загрузка... {progress}%
      </p>

      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 60px rgba(124,58,237,0.8)} 50%{box-shadow:0 0 80px rgba(124,58,237,1)} }`}</style>
    </div>
  );
}
