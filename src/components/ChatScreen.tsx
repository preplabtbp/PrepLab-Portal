import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, User } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export default function ChatScreen({ inspectorName, inspectorNik }: { inspectorName: string, inspectorNik: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [text, setText] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const room = 'global';

  useEffect(() => {
    // Fetch old messages
    fetch(`/api/chat/${room}`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error(err));

    // Initialize socket
    const socket = io();
    socketRef.current = socket;

    socket.emit('join', {
      nik: inspectorNik,
      name: inspectorName,
      room
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [inspectorNik, inspectorName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', {
      room,
      senderNik: inspectorNik,
      senderName: inspectorName,
      text
    });
    setText('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 pt-20 pb-24 md:pb-6 relative">
      <div className="px-6 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ruang Obrolan</h1>
          <p className="text-slate-500 text-sm">{onlineUsers.length} Online</p>
        </div>
      </div>
      
      {/* Online Users Horizontal List */}
      <div className="px-6 mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {onlineUsers.map(u => (
          <div key={u.nik} className="flex flex-col items-center flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-teal-100 border-2 border-teal-500 flex items-center justify-center text-teal-600 font-bold relative">
              {u.name.charAt(0)}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <span className="text-[10px] text-slate-600 mt-1 max-w-[50px] truncate">{u.name}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4">
        {messages.map((msg, i) => {
          const isMe = msg.senderNik === inspectorNik;
          return (
            <motion.div 
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
                {!isMe && <p className="text-[10px] font-bold text-teal-600 mb-1">{msg.senderName}</p>}
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-teal-100' : 'text-slate-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-6 mt-4 pb-20 md:pb-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Ketik pesan..."
            className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-sm"
          />
          <button type="submit" disabled={!text.trim()} className="bg-teal-600 text-white p-3 rounded-full hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-md">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
