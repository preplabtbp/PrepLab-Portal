import React, { useState } from 'react';
import { Sparkles, Send, Code2, Bot, User, RefreshCw, Copy, Check, Sliders, ShieldCheck, Zap, Terminal, FileText, Cpu, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export function AiStudioPlaygroundScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('Anda adalah asisten AI cerdas untuk portal PrepLab. Jawab pertanyaan dengan singkat, akurat, dan ramah.');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const quickPrompts = [
    { title: 'Diagnosis Peralatan', prompt: 'Bantu saya mendiagnosis masalah pompa minyak yang mengeluarkan bunyi berisik dan overheat.' },
    { title: 'Ringkasan Laporan WO', prompt: 'Buatkan ringkasan profesional untuk laporan Work Order yang terlambat 3 hari.' },
    { title: 'Generate Kode TypeScript', prompt: 'Tuliskan fungsi TypeScript untuk memvalidasi nomor NIK karyawan 16 digit.' },
    { title: 'Analisis Data Downtime', prompt: 'Berikan 3 rekomendasi strategi pencegahan downtime unit excavator.' },
  ];

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || isGenerating) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsGenerating(true);

    try {
      // Build history payload for server
      const historyPayload = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          modelName: selectedModel,
          systemInstruction,
          temperature,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan respons AI');
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.text || 'Tidak ada teks yang dihasilkan.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('AI Error:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `⚠️ Error: ${err.message || 'Gagal terhubung ke Vertex AI.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const generateTsSnippet = () => {
    return `import { generateText } from './src/ai.js';

// Menggunakan Vertex AI (Memotong Kredit Gratis GCP $300 Anda)
async function runAi() {
  const result = await generateText(
    ${JSON.stringify(inputPrompt || 'Masukan prompt di sini...')},
    '${selectedModel}'
  );
  console.log(result);
}

runAi();`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-lg text-white">PrepLab AI Studio</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                Vertex AI • Credit GCP Active
              </span>
            </div>
            <p className="text-xs text-slate-400">Interactive Prompt Playground terhubung langsung dengan saldo $300 GCP Anda</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCodeModal(true)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>Dapatkan Kode</span>
          </button>
          <button
            onClick={() => setMessages([])}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-800 transition"
            title="Bersihkan Percakapan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat / Prompt View */}
        <div className="flex-1 flex flex-col bg-slate-950/80">
          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/5">
                  <Cpu className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">Uji Prompt & Model Gemini</h3>
                  <p className="text-sm text-slate-400">
                    Ketik prompt atau pilih salah satu inspirasi di bawah ini untuk memulai pengujian real-time dengan model Vertex AI.
                  </p>
                </div>

                {/* Quick Prompts */}
                <div className="grid grid-cols-2 gap-3 w-full text-left">
                  {quickPrompts.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.prompt)}
                      className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition group text-left"
                    >
                      <div className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-200 mb-1">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-2">
                        {item.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`group relative max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    
                    <div className="mt-2 flex items-center justify-between text-[10px] opacity-70">
                      <span>{msg.timestamp}</span>
                      {msg.role === 'model' && (
                        <button
                          onClick={() => handleCopy(msg.text, idx)}
                          className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                        >
                          {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isGenerating && (
              <div className="flex space-x-3 items-center text-slate-400 text-xs">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-spin">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <span>Gemini sedang berpikir & memproses di Vertex AI...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-slate-900 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end space-x-3"
            >
              <div className="flex-1 relative">
                <textarea
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ketik prompt di sini... (Tekan Enter untuk mengirim)"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!inputPrompt.trim() || isGenerating}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition flex items-center space-x-2 shadow-lg shadow-indigo-600/20"
              >
                <span>Kirim</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right: Model Settings Panel (Just like GCP AI Studio Sidebar) */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 p-5 space-y-6 overflow-y-auto hidden md:block">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Model Settings</span>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            </select>
          </div>

          {/* System Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">System Instructions</label>
            </div>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              rows={4}
              placeholder="Berikan konteks atau instruksi spesifik kepada model..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-slate-400">Temperature</label>
              <span className="font-mono text-indigo-400">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0.0 (Presisi/Faktual)</span>
              <span>1.0 (Kreatif)</span>
            </div>
          </div>

          {/* GCP Billing Info Box */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>GCP Billing Status</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Semua permintaan dari Studio ini dijalankan langsung via SDK <code className="text-indigo-300">@google/genai</code> dan ditagihkan ke **Kredit Gratis $300 GCP** Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Get Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white text-base">Kode Siap Pakai (TypeScript)</h3>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Copy kode di bawah ini untuk memanggil model Vertex AI secara langsung di fitur mana pun pada aplikasi Anda:
            </p>

            <div className="relative bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
              <pre>{generateTsSnippet()}</pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateTsSnippet());
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition"
              >
                {codeCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
