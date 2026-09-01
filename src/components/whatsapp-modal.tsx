import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from './ui';
import { getAppSettings } from '../sheets-api';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageText?: string;
  message?: string;
  title?: string;
  description?: string;
}

export function WhatsAppModal({ isOpen, onClose, messageText, message, title, description }: WhatsAppModalProps) {
  const [targetNumber, setTargetNumber] = useState('');
  const finalMessage = messageText || message || '';

  useEffect(() => {
    if (isOpen) {
       getAppSettings().then(settings => {
          if (settings && settings.success && settings.data) {
             const found = settings.data.find((s: any) => s.settingKey === 'WA_TARGET_NUMBER');
             if (found && found.settingValue) {
                setTargetNumber(found.settingValue);
             }
          }
       }).catch(e => console.error(e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    let waUrl = `https://wa.me/?text=${encodeURIComponent(finalMessage)}`;
    
    if (targetNumber) {
      if (targetNumber.includes('chat.whatsapp.com')) {
         // Jika link grup, gunakan wa.me/?text= agar user bisa memilih grup dengan text prefilled.
         waUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      } else {
         // Coba parse nomor HP, ambil nomor pertama jika ada multiple
         const firstPart = targetNumber.split(/[,\/&]/)[0];
         let cleanNumber = firstPart.replace(/\D/g, '');
         if (cleanNumber) {
            if (cleanNumber.startsWith('0')) {
               cleanNumber = '62' + cleanNumber.substring(1);
            }
            waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(messageText)}`;
         }
      }
    }
    
    if (waUrl.startsWith('https://wa.me/')) {
       window.open(waUrl, '_blank');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-emerald-500 p-6 flex flex-col items-center justify-center text-white relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-emerald-100 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Send className="w-8 h-8 relative left-1" />
          </div>
          <h2 className="text-xl font-bold text-center">{title || 'Berhasil Disubmit!'}</h2>
          <p className="text-emerald-50 text-center text-sm mt-1">{description || 'Laporan telah tersimpan di sistem.'}</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-600 text-sm text-center">
            {targetNumber ? 'Kirimkan notifikasi laporan ini ke PIC via WhatsApp agar segera ditindaklanjuti.' : 'Kirimkan notifikasi laporan ini ke Grup/PIC via WhatsApp agar segera ditindaklanjuti.'}
          </p>
          <Button onClick={handleSend} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 py-6 text-base rounded-xl shadow-lg shadow-emerald-200">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            Kirim ke WhatsApp {targetNumber && 'Target'}
          </Button>
          <button onClick={onClose} className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors font-medium">
            Tutup & Lewati
          </button>
        </div>
      </div>
    </div>
  );
}
