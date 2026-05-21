import React, { useState, useEffect } from 'react';
import { X, Send, User as UserIcon, Mail, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface Message {
  id: string;
  from: string;
  fromName: string;
  to: string;
  text: string;
  timestamp: string;
}

export function MessagingCenter({ 
  currentUser, 
  isOpen, 
  onClose 
}: { 
  currentUser: User, 
  isOpen: boolean, 
  onClose: () => void 
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');

  useEffect(() => {
    // Load users from MDM API
    fetch('/api/v1/mdm/users')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data.filter((u: User) => u.id !== currentUser.id));
          if (data.length > 0) setSelectedRecipient(data[0].id);
        }
      });

    // Load messages from localStorage
    const saved = localStorage.getItem('becs_messages');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  const handleSend = () => {
    if (!inputText.trim() || !selectedRecipient) return;

    const recipient = users.find(u => u.id === selectedRecipient);
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      from: currentUser.id,
      fromName: currentUser.username,
      to: selectedRecipient,
      text: inputText,
      timestamp: new Date().toISOString()
    };

    const updated = [...messages, newMessage];
    setMessages(updated);
    localStorage.setItem('becs_messages', JSON.stringify(updated));
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-clinical-bg border-l border-clinical-border shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-500">
      <div className="p-6 border-b border-clinical-border bg-clinical-bg flex items-center justify-between">
        <div className="flex items-center gap-3">
           <Mail className="text-rose-500" />
           <h2 className="text-sm font-black text-clinical-text uppercase tracking-widest">Command Message Center</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-clinical-bg rounded-lg text-clinical-muted transition-colors">
           <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.filter(m => m.from === currentUser.id || m.to === currentUser.id).map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.from === currentUser.id ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-[12px] ${msg.from === currentUser.id ? 'bg-rose-600 text-white rounded-tr-none' : 'bg-clinical-card text-clinical-text rounded-tl-none border border-clinical-border'}`}>
              <p className="font-medium leading-relaxed">{msg.text}</p>
            </div>
            <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest mt-2">
              {msg.from === currentUser.id ? 'Me' : msg.fromName} • {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      <div className="p-6 bg-clinical-card/30 border-t border-clinical-border space-y-4">
        <div>
           <label className="text-[9px] font-black text-clinical-muted uppercase tracking-widest block mb-2">To Specialist/Station</label>
           <select 
             value={selectedRecipient} 
             onChange={e => setSelectedRecipient(e.target.value)}
             className="w-full bg-clinical-bg border border-clinical-border rounded-xl p-3 text-[11px] font-black uppercase text-clinical-muted outline-none focus:border-rose-500 transition-all"
           >
             {users.map(u => (
               <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
             ))}
           </select>
        </div>
        <div className="flex gap-2">
           <input 
             type="text" 
             value={inputText}
             onChange={e => setInputText(e.target.value)}
             onKeyPress={e => e.key === 'Enter' && handleSend()}
             placeholder="Enter tactical message..."
             className="flex-1 bg-clinical-bg border border-clinical-border rounded-xl px-4 py-3 text-xs text-clinical-text placeholder-slate-700 outline-none focus:border-rose-500 transition-all"
           />
           <button 
             onClick={handleSend}
             className="p-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-900/40 transition-all active:scale-95"
           >
             <Send size={18} />
           </button>
        </div>
        <div className="flex items-center gap-2 text-clinical-muted">
           <ShieldCheck size={12} />
           <span className="text-[8px] font-black uppercase tracking-widest italic">Encrypted Point-to-Point Communication</span>
        </div>
      </div>
    </div>
  );
}
