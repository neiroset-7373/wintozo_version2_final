import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { socket } from '../../services/socket';
import { User, Message } from '../../types/index';

interface Props {
  user: User;
  targetUserId: number;
  targetUsername: string;
  incomingCall: any;
  onCallHandled: () => void;
}

const EMOJI_LIST = ['😊','😂','❤️','🔥','👍','🎉','😎','💎','👑','⚡','🌟','😍','🤔','😢','🙏','💪','✅','❌','🚀','💜'];

export default function ChatView({ user, targetUserId, targetUsername, incomingCall, onCallHandled }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [cmdMode, setCmdMode] = useState(false);
  const [cmdOutput, setCmdOutput] = useState('');
  const [cmdInput, setCmdInput] = useState('');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'in-call'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [channelMessages, setChannelMessages] = useState<any[]>([]);
  const [isChannel, setIsChannel] = useState(false);
  const [isBot, setIsBot] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatId = [Math.min(user.id, targetUserId), Math.max(user.id, targetUserId)].join('_');

  useEffect(() => {
    const isC = targetUserId === -1;
    const isB = targetUserId === 0;
    setIsChannel(isC);
    setIsBot(isB);
    setMessages([]);
    setChannelMessages([]);
    setCmdMode(false);
    setCmdOutput('');

    if (isC) {
      api.getChannelMessages('Wintozo Official').then(setChannelMessages).catch(() => {});
    } else if (isB) {
      // Bot chat - load from server with special chat_id
      api.getMessages(`bot_${user.id}`).then(setMessages).catch(() => {});
    } else {
      api.getMessages(chatId).then(setMessages).catch(() => {});
    }
  }, [targetUserId]);

  useEffect(() => {
    const unsub = socket.onMessage((data) => {
      if (data.type === 'new_message' && data.message) {
        const msg = data.message;
        if (msg.chat_id === chatId || msg.chat_id === `bot_${user.id}`) {
          setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
        }
      }
      if (data.type === 'channel_message' && data.channel === 'Wintozo Official') {
        setChannelMessages(prev => [...prev, data.message]);
      }
      if (data.type === 'call_incoming') {
        // handled by App
      }
      if (data.type === 'call_answered') {
        setCallState('in-call');
      }
      if (data.type === 'call_ended' || data.type === 'call_rejected') {
        setCallState('idle');
      }
    });
    return unsub;
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, channelMessages]);

  async function sendText() {
    const content = text.trim();
    if (!content) return;
    setText('');

    // Check admin cmd
    if (content === '/cmd' && user.is_admin && isBot) {
      setCmdMode(true);
      setCmdOutput('💻 Консоль Wintozo Admin\nНапиши /help для списка команд');
      return;
    }

    try {
      if (isChannel) {
        if (!user.has_pro && !user.is_admin) {
          setMessages(prev => [...prev, {
            id: Date.now(), chat_id: 'channel', sender_id: 0, sender_username: 'System',
            type: 'text', content: '❌ Нужна подписка Wintozo Pro для отправки в канал', created_at: new Date().toISOString()
          }]);
          return;
        }
        await api.sendChannelMessage('Wintozo Official', content);
      } else {
        const cid = isBot ? `bot_${user.id}` : chatId;
        await api.sendMessage(cid, content, 'text');
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  async function runCmd() {
    if (!cmdInput.trim()) return;
    const cmd = cmdInput.trim();
    setCmdInput('');
    setCmdOutput(prev => prev + `\n\n> ${cmd}\nОбработка...`);
    try {
      const res = await api.adminCmd(cmd);
      setCmdOutput(prev => prev + `\n${res.output}`);
    } catch (e: any) {
      setCmdOutput(prev => prev + `\n❌ Ошибка: ${e.message}`);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const { url } = await api.uploadFile(blob, 'voice.webm');
          const cid = isBot ? `bot_${user.id}` : chatId;
          await api.sendMessage(cid, '🎤 Голосовое сообщение', 'voice', url);
        } catch (e) { console.error(e); }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      alert('Нет доступа к микрофону');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await api.uploadFile(file, file.name);
      const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file';
      const cid = isBot ? `bot_${user.id}` : chatId;
      await api.sendMessage(cid, file.name, type, url);
    } catch (e: any) {
      console.error(e);
    }
    e.target.value = '';
  }

  async function startCall(type: 'audio' | 'video') {
    setCallType(type);
    setCallState('calling');
    socket.send({ type: 'call_offer', target_id: targetUserId, call_type: type });
    setTimeout(() => {
      if (callState === 'calling') setCallState('idle');
    }, 30000);
  }

  function endCall() {
    socket.send({ type: 'call_end', target_id: targetUserId });
    setCallState('idle');
  }

  const allMessages = isChannel ? channelMessages : messages;

  function renderMessage(msg: any) {
    const isMe = msg.sender_id === user.id;
    const time = new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    const serverUrl = 'https://wintozo-messenger.onrender.com';

    return (
      <div key={msg.id} style={{
        display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
        alignItems: 'flex-end', gap: 8, marginBottom: 12,
        padding: '0 16px'
      }}>
        {!isMe && (
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
          }}>
            {msg.sender_username === 'WintozоBot' ? '🤖' : msg.sender_username === 'Admin' ? '👑' : '👤'}
          </div>
        )}
        <div style={{ maxWidth: '70%' }}>
          {!isMe && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2, paddingLeft: 4 }}>
              @{msg.sender_username}
            </div>
          )}
          <div style={{
            padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isMe
              ? 'linear-gradient(135deg, #7c3aed, #3b82f6)'
              : 'rgba(255,255,255,0.08)',
            color: '#fff', fontSize: 14, lineHeight: 1.5,
            boxShadow: isMe ? '0 0 15px rgba(124,58,237,0.3)' : 'none',
            border: isMe ? 'none' : '1px solid rgba(255,255,255,0.1)'
          }}>
            {msg.type === 'voice' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🎤</span>
                <audio controls src={`${serverUrl}${msg.file_url}`} style={{ height: 32, maxWidth: 200 }} />
              </div>
            )}
            {msg.type === 'video' && (
              <video controls src={`${serverUrl}${msg.file_url}`} style={{ maxWidth: '100%', borderRadius: 8 }} />
            )}
            {msg.type === 'image' && (
              <img src={`${serverUrl}${msg.file_url}`} style={{ maxWidth: '100%', borderRadius: 8 }} alt="img" />
            )}
            {msg.type === 'file' && (
              <a href={`${serverUrl}${msg.file_url}`} target="_blank" rel="noreferrer" style={{ color: '#fff' }}>
                📎 {msg.content}
              </a>
            )}
            {(msg.type === 'text' || !msg.type) && <span>{msg.content}</span>}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: isMe ? 'right' : 'left', marginTop: 3, paddingLeft: 4 }}>
            {time}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0015 0%, #0f0020 100%)',
      fontFamily: "'Segoe UI', sans-serif", position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid rgba(124,58,237,0.2)',
        background: 'rgba(10,0,21,0.9)', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: isBot ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : isChannel
            ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'rgba(124,58,237,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
        }}>
          {isBot ? '🤖' : isChannel ? '📢' : '💬'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
            {isBot ? 'WintozоBot' : isChannel ? 'Wintozo Official' : `@${targetUsername}`}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
            {isBot ? (user.is_admin ? 'Напиши /cmd для консоли' : 'Официальный бот') :
              isChannel ? 'Официальный канал' : `ID: ${targetUserId}`}
          </div>
        </div>
        {!isBot && !isChannel && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => startCall('audio')} style={{
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: 'rgba(34,197,94,0.2)', color: '#4ade80',
              cursor: 'pointer', fontSize: 16, fontFamily: 'inherit'
            }}>📞</button>
            <button onClick={() => startCall('video')} style={{
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: 'rgba(59,130,246,0.2)', color: '#60a5fa',
              cursor: 'pointer', fontSize: 16, fontFamily: 'inherit'
            }}>🎥</button>
          </div>
        )}
      </div>

      {/* Incoming call */}
      {incomingCall && (
        <div style={{
          margin: 16, padding: 16, borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(59,130,246,0.2))',
          border: '1px solid rgba(34,197,94,0.5)', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ fontSize: 28 }}>📞</span>
          <div style={{ flex: 1, color: '#fff' }}>
            <div style={{ fontWeight: 700 }}>{incomingCall.call_type === 'video' ? '🎥 Видеозвонок' : '📞 Аудиозвонок'}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>от @{incomingCall.from_username}</div>
          </div>
          <button onClick={() => { setCallState('in-call'); onCallHandled(); socket.send({ type: 'call_answer', target_id: incomingCall.from_id }); }} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: '#22c55e', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', marginRight: 8
          }}>✅ Принять</button>
          <button onClick={() => { onCallHandled(); socket.send({ type: 'call_reject', target_id: incomingCall.from_id }); }} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: '#ef4444', color: '#fff', cursor: 'pointer', fontFamily: 'inherit'
          }}>❌ Отклонить</button>
        </div>
      )}

      {/* Call in progress */}
      {callState !== 'idle' && (
        <div style={{
          margin: 16, padding: 16, borderRadius: 14,
          background: callState === 'calling' ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)',
          border: `1px solid ${callState === 'calling' ? 'rgba(251,191,36,0.5)' : 'rgba(34,197,94,0.5)'}`,
          display: 'flex', alignItems: 'center', gap: 12, color: '#fff'
        }}>
          <span style={{ fontSize: 24, animation: 'pulse 1s infinite' }}>
            {callType === 'video' ? '🎥' : '📞'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{callState === 'calling' ? 'Звоним...' : 'Звонок идёт'}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>@{targetUsername}</div>
          </div>
          <button onClick={endCall} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: '#ef4444', color: '#fff', cursor: 'pointer', fontFamily: 'inherit'
          }}>📵 Завершить</button>
        </div>
      )}

      {/* Admin CMD Console */}
      {cmdMode && (
        <div style={{
          margin: 16, padding: 16, borderRadius: 14,
          background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(124,58,237,0.5)',
          fontFamily: 'monospace'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>💻 Admin Console</span>
            <button onClick={() => setCmdMode(false)} style={{
              background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16
            }}>✕</button>
          </div>
          <div style={{
            background: '#000', borderRadius: 8, padding: 12, marginBottom: 12,
            minHeight: 120, maxHeight: 200, overflowY: 'auto',
            color: '#4ade80', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap'
          }}>{cmdOutput}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={cmdInput}
              onChange={e => setCmdInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runCmd()}
              placeholder="Введи команду..."
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8,
                background: '#111', border: '1px solid rgba(124,58,237,0.4)',
                color: '#4ade80', fontSize: 12, fontFamily: 'monospace', outline: 'none'
              }}
            />
            <button onClick={runCmd} style={{
              padding: '10px 16px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit'
            }}>▶</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 12, paddingBottom: 12 }}>
        {allMessages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {isBot ? '🤖' : isChannel ? '📢' : '💬'}
            </div>
            <p>{isBot && user.is_admin ? 'Напиши /cmd для открытия консоли' : 'Начни разговор!'}</p>
          </div>
        )}
        {allMessages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(124,58,237,0.2)',
          background: 'rgba(10,0,21,0.95)',
          display: 'flex', flexWrap: 'wrap', gap: 6
        }}>
          {EMOJI_LIST.map(e => (
            <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false); }} style={{
              fontSize: 22, background: 'rgba(255,255,255,0.05)', border: 'none',
              borderRadius: 8, padding: '4px 6px', cursor: 'pointer'
            }}>{e}</button>
          ))}
        </div>
      )}

      {/* Input */}
      {!isChannel || user.has_pro || user.is_admin ? (
        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(124,58,237,0.2)',
          background: 'rgba(10,0,21,0.95)', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <button onClick={() => setShowEmoji(s => !s)} style={{
            width: 40, height: 40, borderRadius: 10, border: 'none',
            background: 'rgba(255,255,255,0.07)', color: '#fff',
            cursor: 'pointer', fontSize: 18, flexShrink: 0
          }}>😊</button>

          <button onClick={() => fileInputRef.current?.click()} style={{
            width: 40, height: 40, borderRadius: 10, border: 'none',
            background: 'rgba(255,255,255,0.07)', color: '#fff',
            cursor: 'pointer', fontSize: 18, flexShrink: 0
          }}>📎</button>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFile}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" />

          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText()}
            placeholder={isBot && user.is_admin ? 'Напиши /cmd для консоли...' : 'Сообщение...'}
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 12,
              border: '1px solid rgba(124,58,237,0.25)',
              background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14,
              outline: 'none', fontFamily: 'inherit'
            }}
          />

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            style={{
              width: 40, height: 40, borderRadius: 10, border: 'none', flexShrink: 0,
              background: isRecording ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)',
              color: '#fff', cursor: 'pointer', fontSize: 18,
              boxShadow: isRecording ? '0 0 15px rgba(239,68,68,0.6)' : 'none'
            }}
          >🎤</button>

          <button onClick={sendText} style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', flexShrink: 0,
            background: text.trim() ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'rgba(255,255,255,0.07)',
            color: '#fff', cursor: 'pointer', fontSize: 18,
            boxShadow: text.trim() ? '0 0 15px rgba(124,58,237,0.5)' : 'none'
          }}>➤</button>
        </div>
      ) : (
        <div style={{
          padding: '16px', borderTop: '1px solid rgba(124,58,237,0.2)',
          background: 'rgba(10,0,21,0.95)', textAlign: 'center',
          color: 'rgba(255,255,255,0.4)', fontSize: 13
        }}>
          💎 Нужна подписка <strong style={{ color: '#fbbf24' }}>Wintozo Pro</strong> для отправки в канал
        </div>
      )}

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 4px; }
      `}</style>
    </div>
  );
}
