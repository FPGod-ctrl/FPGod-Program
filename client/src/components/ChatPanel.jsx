import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { Spinner } from './ui/Loading.jsx';

/**
 * Real-time refinement chat for a plan or email.
 * Props: targetType ('plan'|'email'), targetId, onUpdate(updatedContent)
 */
export default function ChatPanel({ targetType, targetId, onUpdate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!targetId) { setMessages([]); return undefined; }
    api.get(`/chat/${targetType}/${targetId}`)
      .then((rows) => active && setMessages(rows))
      .catch(() => active && setMessages([]));
    return () => { active = false; };
  }, [targetType, targetId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !targetId) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text, id: `tmp-${Date.now()}` }]);
    setSending(true);
    try {
      const res = await api.post(`/chat/${targetType}/${targetId}`, { message: text });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply, id: `a-${Date.now()}` }]);
      if (res.updatedContent != null) onUpdate?.(res.updatedContent);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${err.message}`, id: `e-${Date.now()}` }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="card chat" style={{ height: '100%', minHeight: 420 }}>
      <div className="card-head">
        <h3>✨ Refine with AI</h3>
        <span className="badge teal">{targetType}</span>
      </div>
      <div className="chat-log" ref={logRef}>
        {messages.length === 0 && (
          <div className="muted" style={{ fontSize: 13, padding: 8 }}>
            Ask for changes in plain English — e.g. “Make the tone warmer”, “Add a section on
            tax efficiency”, or “Shorten the summary”. Edits apply to the {targetType} live.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role}`}>{m.content}</div>
        ))}
        {sending && (
          <div className="chat-msg assistant"><Spinner /> <span style={{ marginLeft: 8 }}>Thinking…</span></div>
        )}
      </div>
      <div className="chat-input">
        <textarea
          rows={1}
          placeholder={targetId ? 'Type an instruction…' : 'Select an item first'}
          value={input}
          disabled={!targetId || sending}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="btn accent" onClick={send} disabled={!targetId || sending || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
