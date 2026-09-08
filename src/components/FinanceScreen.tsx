import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, Button, Input, Select } from './ui';
import { 
  Receipt, Camera, Upload, Sparkles, Loader2, PlusCircle, Trash2, 
  Search, Filter, ShoppingBag, CreditCard, DollarSign, Calendar, 
  CheckCircle2, ArrowUpRight, RefreshCw, FileText, Check,
  Pencil, ChevronDown, ChevronUp, X, Layers, Store, Edit3
} from 'lucide-react';
import { PageHeader } from './PageHeader';

interface TransactionItem {
  id?: number;
  transactionCode: string;
  date: string;
  itemTitle: string;
  merchantName: string;
  category: string;
  paymentMethod: string;
  amount: number;
  qty: number;
  notes?: string;
  receiptPhotoUrl?: string;
}

const CATEGORY_OPTIONS = ['#Makanan', '#Peralatan', '#Operasional', '#Logistik', '#Transportasi', '#Lainnya'];
const PAYMENT_OPTIONS = ['Tunai', 'Transfer', 'QRIS', 'Kartu'];

export function FinanceScreen({ inspectorName, inspectorNik }: { inspectorName: string; inspectorNik: string }) {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'history'>('scan');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ totalSpent: 0, totalItems: 0, topCategory: '-' });

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // AI Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedReceiptResult, setScannedReceiptResult] = useState<{
    date: string;
    merchantName: string;
    paymentMethod: string;
    itemsCount: number;
    items: TransactionItem[];
  } | null>(null);

  // Grouping & View Mode state
  const [historyViewMode, setHistoryViewMode] = useState<'receipt' | 'item'>('receipt');
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});

  // Edit Transaction Modal State
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [editForm, setEditForm] = useState({
    itemTitle: '',
    amount: '',
    category: '#Makanan',
    merchantName: '',
    paymentMethod: 'Tunai',
    date: '',
    notes: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Manual Form State
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualItemTitle, setManualItemTitle] = useState('');
  const [manualMerchantName, setManualMerchantName] = useState('Rahmatika Freshmart');
  const [manualCategory, setManualCategory] = useState('#Makanan');
  const [manualPaymentMethod, setManualPaymentMethod] = useState('Tunai');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
      }
    } catch (err) {
      console.error('Failed fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/finance/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary({
          totalSpent: data.totalSpent || 0,
          totalItems: data.totalItems || 0,
          topCategory: data.topCategory || '-'
        });
      }
    } catch (err) {
      console.error('Failed fetching summary:', err);
    }
  };

  // Handle Receipt Image Scanning with Gemini AI Vision
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Mohon pilih file gambar (.jpg, .png, .jpeg)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await scanReceiptWithAI(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const scanReceiptWithAI = async (base64Data: string, mimeType: string) => {
    setIsScanning(true);
    setScannedReceiptResult(null);
    try {
      const res = await fetch('/api/finance/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data, mimeType })
      });

      const data = await res.json();
      if (res.ok && data.success && data.items && data.items.length > 0) {
        // Auto-save to database immediately so data is not lost on reload
        try {
          const saveRes = await fetch('/api/finance/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactions: data.items,
              createdByNik: inspectorNik,
              createdByName: inspectorName
            })
          });

          if (saveRes.ok) {
            toast.success(`Berhasil! ${data.itemsCount} transaksi otomatis tersimpan ke riwayat.`);
            fetchTransactions();
            fetchSummary();
          } else {
            toast.warning(`Berhasil memindai ${data.itemsCount} transaksi (Silakan klik tombol simpan).`);
          }
        } catch (saveErr) {
          console.error('Auto-save error:', saveErr);
        }

        setScannedReceiptResult({
          date: data.date,
          merchantName: data.merchantName,
          paymentMethod: data.paymentMethod,
          itemsCount: data.itemsCount,
          items: data.items
        });
      } else {
        toast.error(data.error || 'Gagal memindai foto struk dengan AI Vision');
      }
    } catch (err: any) {
      toast.error('Error memindai gambar: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Save Scanned Items to DB (Manual Fallback / Re-save)
  const handleSaveScannedItems = async () => {
    if (!scannedReceiptResult || scannedReceiptResult.items.length === 0) return;

    try {
      setLoading(true);
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: scannedReceiptResult.items,
          createdByNik: inspectorNik,
          createdByName: inspectorName
        })
      });

      if (res.ok) {
        toast.success(`Tersimpan! ${scannedReceiptResult.items.length} item berhasil masuk ke riwayat keuangan.`);
        setScannedReceiptResult(null);
        fetchTransactions();
        fetchSummary();
        setActiveTab('history');
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal menyimpan transaksi');
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Single Manual Entry
  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemTitle.trim()) {
      toast.error('Nama item / barang wajib diisi!');
      return;
    }
    const amountVal = Math.abs(parseInt(manualAmount, 10)) || 0;
    if (amountVal <= 0) {
      toast.error('Harga nominal wajib diisi!');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        date: manualDate,
        itemTitle: manualItemTitle,
        merchantName: manualMerchantName,
        category: manualCategory,
        paymentMethod: manualPaymentMethod,
        amount: amountVal,
        notes: manualNotes,
        createdByNik: inspectorNik,
        createdByName: inspectorName
      };

      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Catatan transaksi berhasil disimpan!');
        setManualItemTitle('');
        setManualAmount('');
        setManualNotes('');
        fetchTransactions();
        fetchSummary();
        setActiveTab('history');
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal menyimpan transaksi');
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: TransactionItem) => {
    setEditingTransaction(item);
    setEditForm({
      itemTitle: item.itemTitle || '',
      amount: String(item.amount || 0),
      category: item.category || '#Makanan',
      merchantName: item.merchantName || '',
      paymentMethod: item.paymentMethod || 'Tunai',
      date: item.date || new Date().toISOString().split('T')[0],
      notes: item.notes || ''
    });
  };

  // Save Edit Transaction
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction?.id) return;

    if (!editForm.itemTitle.trim()) {
      toast.error('Nama produk / item tidak boleh kosong!');
      return;
    }

    const amt = Math.abs(parseInt(editForm.amount, 10)) || 0;

    try {
      setIsUpdating(true);
      const res = await fetch(`/api/finance/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemTitle: editForm.itemTitle,
          amount: amt,
          category: editForm.category,
          merchantName: editForm.merchantName,
          paymentMethod: editForm.paymentMethod,
          date: editForm.date,
          notes: editForm.notes
        })
      });

      if (res.ok) {
        toast.success('Harga & transaksi berhasil diperbarui!');
        setEditingTransaction(null);
        fetchTransactions();
        fetchSummary();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal memperbarui transaksi');
      }
    } catch (err: any) {
      toast.error('Error memperbarui transaksi: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle Receipt Collapse
  const toggleReceiptGroup = (key: string) => {
    setExpandedReceipts(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  };

  // Delete Item
  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?')) return;

    try {
      const res = await fetch(`/api/finance/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Transaksi berhasil dihapus.');
        fetchTransactions();
        fetchSummary();
      } else {
        toast.error('Gagal menghapus transaksi.');
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = searchQuery === '' || 
      t.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.transactionCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'ALL' || t.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group transactions by receipt (Date + Merchant + Payment Method)
  const receiptGroups = useMemo(() => {
    const groupsMap = new Map<string, {
      id: string;
      date: string;
      merchantName: string;
      paymentMethod: string;
      items: TransactionItem[];
      totalAmount: number;
      totalItems: number;
    }>();

    filteredTransactions.forEach(tx => {
      const key = `${tx.date}__${tx.merchantName}__${tx.paymentMethod}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          id: key,
          date: tx.date,
          merchantName: tx.merchantName,
          paymentMethod: tx.paymentMethod,
          items: [],
          totalAmount: 0,
          totalItems: 0
        });
      }
      const g = groupsMap.get(key)!;
      g.items.push(tx);
      g.totalAmount += (tx.amount || 0);
      g.totalItems += 1;
    });

    return Array.from(groupsMap.values());
  }, [filteredTransactions]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      <PageHeader 
        title="Catat Keuangan & Struk AI" 
        description="Pemindaian struk otomatis per item produk dengan AI Vision & pencatatan transaksi terpadu"
        icon={<Receipt className="w-full h-full text-white" />}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">Total Pengeluaran</p>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatRupiah(summary.totalSpent)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">Total Transaksi</p>
              <h3 className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {summary.totalItems} <span className="text-xs font-normal text-[var(--text-muted)]">Item</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">Kategori Terbesar</p>
              <h3 className="text-lg font-bold text-purple-600 dark:text-purple-300 mt-1 truncate">
                {summary.topCategory}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'scan'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" /> 📸 Scan Struk (AI Vision)
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'manual'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <PlusCircle className="w-4 h-4" /> ✍️ Tambah Manual
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <FileText className="w-4 h-4" /> 📜 Riwayat ({transactions.length})
        </button>
      </div>

      {/* TAB 1: AI Vision Receipt Scanner */}
      {activeTab === 'scan' && (
        <Card className="p-4 space-y-4">
          <div className="text-center space-y-1.5">
            <h4 className="font-bold text-sm text-[var(--text-main)] flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Pindai Struk / Mutasi Pembayaran dengan AI Vision
            </h4>
            <p className="text-xs text-[var(--text-muted)] max-w-lg mx-auto">
              Unggah foto struk belanjaan atau screenshot mutasi bank. AI Vision akan membaca, memisahkan, dan otomatis menyimpan setiap transaksi ke database.
            </p>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-500/80 rounded-2xl p-6 text-center bg-emerald-500/5 hover:bg-emerald-500/10 transition-all cursor-pointer space-y-3"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-xs text-[var(--text-main)]">
                Klik untuk Ambil Foto atau Upload Gambar Struk
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Format yang didukung: JPG, PNG, JPEG (Mendukung struk toko, mutasi m-banking, QRIS)
              </p>
            </div>
            <Button variant="secondary" className="text-xs font-bold pointer-events-none">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Pilih File Gambar
            </Button>
          </div>

          {/* Scanning Progress */}
          {isScanning && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs space-y-2 text-center animate-pulse">
              <div className="flex items-center justify-center gap-2 font-bold text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>⌛ Membaca Transaksi dari Gambar...</span>
              </div>
              <p className="text-[11px]">
                Sedang memindai mutasi / struk menggunakan AI Vision, mohon tunggu sebentar...
              </p>
            </div>
          )}

          {/* Scanned Result Card */}
          {scannedReceiptResult && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg)] border border-emerald-500/30 space-y-4 shadow-sm animate-in fade-in duration-300">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="font-bold text-sm text-[var(--text-main)]">
                      Hasil Pemindaian Struk
                    </h5>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {scannedReceiptResult.itemsCount} transaksi terdeteksi dan otomatis tersimpan
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-auto text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Tersimpan di Database
                </span>
              </div>

              {/* Receipt Metadata Chips */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--input-bg)] border border-[var(--border-main)]">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-[var(--text-main)]">{scannedReceiptResult.date}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--input-bg)] border border-[var(--border-main)]">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-semibold text-[var(--text-main)]">{scannedReceiptResult.merchantName}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--input-bg)] border border-[var(--border-main)]">
                  <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                  <span className="font-semibold text-[var(--text-main)]">{scannedReceiptResult.paymentMethod}</span>
                </div>
              </div>

              {/* Parsed Items List */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)]/40 divide-y divide-[var(--border-main)]">
                {scannedReceiptResult.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-[var(--card-bg)] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-[var(--text-main)] truncate">
                          {item.itemTitle}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5 flex-wrap">
                          <span className="px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {item.category}
                          </span>
                          <span>{item.merchantName}</span>
                          <span className="text-[var(--text-muted)]">•</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{item.transactionCode}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation Row */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <span className="font-bold text-xs text-[var(--text-main)]">Total Nilai Struk ({scannedReceiptResult.itemsCount} Item)</span>
                <span className="font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(scannedReceiptResult.items.reduce((sum, item) => sum + (item.amount || 0), 0))}
                </span>
              </div>

              {/* Proportional Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Button 
                  onClick={() => {
                    setActiveTab('history');
                    setScannedReceiptResult(null);
                  }}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 rounded-xl shadow-xs transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Lihat Riwayat Transaksi ({transactions.length})
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => {
                    setScannedReceiptResult(null);
                    fileInputRef.current?.click();
                  }}
                  className="w-full h-11 border-[var(--border-main)] hover:bg-[var(--input-bg)] text-[var(--text-main)] font-bold text-xs flex items-center justify-center gap-2 rounded-xl transition-all"
                >
                  <Camera className="w-4 h-4" />
                  Pindai Struk Baru
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: Manual Entry Form */}
      {activeTab === 'manual' && (
        <Card className="p-4 space-y-4">
          <h4 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            Tambah Transaksi Keuangan Manual
          </h4>

          <form onSubmit={handleSaveManualEntry} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-main)]">Tanggal Transaksi</label>
                <Input 
                  type="date"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-main)]">Nama Toko / Merchant</label>
                <Input 
                  type="text"
                  placeholder="Contoh: Rahmatika Freshmart"
                  value={manualMerchantName}
                  onChange={e => setManualMerchantName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-main)]">Nama Produk / Item Belanja</label>
              <Input 
                type="text"
                placeholder="Contoh: IKAN NILA / TERIYAKI SLICE"
                value={manualItemTitle}
                onChange={e => setManualItemTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-main)]">Kategori</label>
                <Select
                  value={manualCategory}
                  onChange={e => setManualCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-main)]">Metode Pembayaran</label>
                <Select
                  value={manualPaymentMethod}
                  onChange={e => setManualPaymentMethod(e.target.value)}
                >
                  {PAYMENT_OPTIONS.map(pm => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-main)]">Harga (Nominal Rp)</label>
                <Input 
                  type="number"
                  placeholder="Contoh: 18500"
                  value={manualAmount}
                  onChange={e => setManualAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-main)]">Catatan Tambahan (Opsional)</label>
              <Input 
                type="text"
                placeholder="Catatan keperluan atau lokasi"
                value={manualNotes}
                onChange={e => setManualNotes(e.target.value)}
              />
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <PlusCircle className="w-4 h-4 mr-1.5" />}
              Simpan Transaksi Keuangan
            </Button>
          </form>
        </Card>
      )}

      {/* TAB 3: Transactions History List */}
      {(activeTab === 'history' || activeTab === 'scan' || activeTab === 'manual') && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Daftar Catatan Keuangan ({filteredTransactions.length})
              </h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                {receiptGroups.length} struk belanja / pembayaran tercatat
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--border-main)] self-start sm:self-auto">
              <button
                onClick={() => setHistoryViewMode('receipt')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                  historyViewMode === 'receipt'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" /> Per Struk ({receiptGroups.length})
              </button>
              <button
                onClick={() => setHistoryViewMode('item')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                  historyViewMode === 'item'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Per Item ({filteredTransactions.length})
              </button>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="space-y-2.5">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Semua
              </button>
              {CATEGORY_OPTIONS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                    selectedCategoryFilter === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <Input 
                type="text"
                placeholder="Cari nama produk, toko, atau kode transaksi..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          {/* Loading & Empty states */}
          {loading && transactions.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Memuat daftar transaksi...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)] text-xs">
              Belum ada catatan transaksi yang sesuai.
            </div>
          ) : historyViewMode === 'receipt' ? (
            /* VIEW 1: GROUPED BY RECEIPT */
            <div className="space-y-3">
              {receiptGroups.map((group) => {
                const isExpanded = expandedReceipts[group.id] !== false; // default open
                return (
                  <div 
                    key={group.id}
                    className="rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] shadow-xs overflow-hidden transition-all hover:border-emerald-500/40"
                  >
                    {/* Receipt Group Header */}
                    <div 
                      onClick={() => toggleReceiptGroup(group.id)}
                      className="p-3.5 bg-[var(--input-bg)]/60 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[var(--input-bg)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate">
                              {group.merchantName}
                            </h5>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                              {group.paymentMethod}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                              {group.totalItems} Item
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-emerald-500" />
                            <span>{group.date}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-[var(--text-muted)] block">Total Struk</span>
                          <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                            {formatRupiah(group.totalAmount)}
                          </span>
                        </div>
                        <button 
                          className="p-1 rounded-lg hover:bg-[var(--card-bg)] text-[var(--text-muted)]"
                          aria-label="Toggle detail struk"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Receipt Items Details */}
                    {isExpanded && (
                      <div className="p-3 border-t border-[var(--border-main)] divide-y divide-[var(--border-main)] space-y-0.5">
                        {group.items.map((item, idx) => (
                          <div 
                            key={item.id || idx}
                            className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-[var(--input-bg)]/40 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-5 h-5 rounded-full bg-[var(--input-bg)] text-[var(--text-muted)] font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs text-[var(--text-main)] truncate">
                                  {item.itemTitle}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    {item.category}
                                  </span>
                                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{item.transactionCode}</span>
                                  {item.notes && <span>• {item.notes}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                {formatRupiah(item.amount)}
                              </span>

                              {/* Edit Price Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(item);
                                }}
                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/15 transition-colors"
                                title="Edit Harga & Transaksi"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Item Button */}
                              {item.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTransaction(item.id!);
                                  }}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-colors"
                                  title="Hapus Transaksi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW 2: FLAT ITEMS LIST */
            <div className="space-y-2">
              {filteredTransactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)] flex items-center justify-between gap-3 transition-all hover:border-emerald-500/40 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[var(--text-main)] truncate">
                          {tx.itemTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {tx.category}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                          {tx.paymentMethod}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-1 flex-wrap">
                        <span>🗓️ {tx.date}</span>
                        <span>•</span>
                        <span className="font-medium text-[var(--text-main)]">🏪 {tx.merchantName}</span>
                        <span>•</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{tx.transactionCode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(tx.amount)}
                    </span>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(tx)}
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/15 transition-colors"
                      title="Edit Harga & Transaksi"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    {tx.id && (
                      <button
                        onClick={() => handleDeleteTransaction(tx.id!)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-colors"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* EDIT MODAL DIALOG */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-main)]">
                    Edit Transaksi & Harga
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    {editingTransaction.transactionCode}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingTransaction(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="space-y-3">
              {/* Highlighted Price Input */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-1">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>💰 Harga / Nominal (Rp)</span>
                  <span className="text-[10px] font-normal text-[var(--text-muted)]">Wajib diisi</span>
                </label>
                <Input 
                  type="number"
                  placeholder="Contoh: 18500"
                  value={editForm.amount}
                  onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                  className="font-bold text-sm bg-[var(--card-bg)] border-emerald-500/40 focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              {/* Product Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-main)]">Nama Produk / Item Belanja</label>
                <Input 
                  type="text"
                  placeholder="Nama produk"
                  value={editForm.itemTitle}
                  onChange={e => setEditForm({ ...editForm, itemTitle: e.target.value })}
                  required
                />
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-main)]">Kategori</label>
                  <Select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-main)]">Metode</label>
                  <Select
                    value={editForm.paymentMethod}
                    onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                  >
                    {PAYMENT_OPTIONS.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Merchant & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-main)]">Toko / Merchant</label>
                  <Input 
                    type="text"
                    value={editForm.merchantName}
                    onChange={e => setEditForm({ ...editForm, merchantName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-main)]">Tanggal</label>
                  <Input 
                    type="date"
                    value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 py-2.5 text-xs font-bold"
                >
                  Batal
                </Button>
                <Button 
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceScreen;
