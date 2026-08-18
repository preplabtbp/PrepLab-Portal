import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getApdSettings, getApdHistoryByNik, getEmployees, addEmployee, uploadApdProof } from '@/src/sheets-api';
import { format } from 'date-fns';

export type ApdEntry = {
  id: string;
  apd: string;
  ukuran: string;
  jumlah: string;
  keterangan: string;
  warningMessage: string | null;
};

export const getHistoryIgnoreCase = (history: Record<string, any[]>, key: string) => {
  if (!history) return [];
  const found = Object.keys(history).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? history[found] : [];
};

export function useApdInput() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showAddedPopup, setShowAddedPopup] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);

  const { data: intervals = {} } = useQuery({
    queryKey: ['apdSettings'],
    queryFn: async () => {
      const data = await getApdSettings();
      return data || {};
    }
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    staleTime: 1000 * 60 * 5,
  });

  const employees = employeesData || [];
  const uniqueJabatan = Array.from(new Set(employees.map((e: any) => e.jabatan).filter(Boolean))) as string[];
  const uniqueDivisi = Array.from(new Set(employees.map((e: any) => e.divisi).filter(Boolean))) as string[];
  const uniqueGrup = Array.from(new Set(employees.map((e: any) => e.grup).filter(Boolean))) as string[];

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ nik: '', nama: '', jabatan: '', divisi: '', grup: '' });
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Form states
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entries, setEntries] = useState<ApdEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signatureRef = useRef<any>(null);

  const [uploadingApd, setUploadingApd] = useState<{nik: string, apd: string, date: string} | null>(null);

  const handleUploadProof = async (nik: string, apd: string, date: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingApd({ nik, apd, date });
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res: any = await uploadApdProof(nik, apd, date, base64, file.name);
        if (res && res.url) {
          setEmployeeData((prev: any) => {
            if (!prev) return prev;
            const newHistory = { ...prev.history };
            const histList = getHistoryIgnoreCase(newHistory, apd);
            if (histList) {
              const histIdx = histList.findIndex((h: any) => (typeof h === 'string' ? h : h.date) === date);
              if (histIdx !== -1) {
                histList[histIdx] = { date, url: res.url };
              }
            }
            return { ...prev, history: newHistory };
          });
          toast.success('Bukti berhasil diupload!');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengupload bukti');
    } finally {
      setUploadingApd(null);
    }
  };

  return {
    searchQuery, setSearchQuery,
    isSearching, setIsSearching,
    showAddedPopup, setShowAddedPopup,
    employeeData, setEmployeeData,
    intervals, setIntervals: (updater: any) => {}, // Maintain compatibility
    employees, 
    setEmployees: (updater: any) => {
      queryClient.setQueryData(['employees'], updater);
    },
    uniqueJabatan, uniqueDivisi, uniqueGrup,
    showAddEmployee, setShowAddEmployee,
    newEmployee, setNewEmployee,
    isAddingEmployee, setIsAddingEmployee,
    showDropdown, setShowDropdown,
    tanggal, setTanggal,
    entries, setEntries,
    isSubmitting, setIsSubmitting,
    signatureRef,
    uploadingApd,
    handleUploadProof
  };
}
