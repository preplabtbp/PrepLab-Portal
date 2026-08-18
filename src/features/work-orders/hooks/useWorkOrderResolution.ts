import { toast } from 'sonner';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateWOStatus, resolveInternalTicket } from '@/src/sheets-api';

export function useWorkOrderResolution(inspectorName: string, parsedDevOptions: any, onSuccess: () => void) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [useSparepart, setUseSparepart] = useState(false);
  const [spareparts, setSpareparts] = useState<{name: string, qty: string}[]>([{name: '', qty: ''}]);
  const [selectedTechs, setSelectedTechs] = useState<{ nik: string, nama: string }[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [waMessageToModal, setWaMessageToModal] = useState('');
  const [resolutionPhoto, setResolutionPhoto] = useState('');
  
  const queryClient = useQueryClient();

  const resetForm = () => {
    setResolvingId(null);
    setResolveNotes('');
    setUseSparepart(false);
    setSpareparts([{name: '', qty: ''}]);
    setSelectedTechs([]);
    setTechSearch('');
    setResolutionPhoto('');
    // Do not reset waMessageToModal here because we might set it right after
  };

  const resolveTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const teknisiString = selectedTechs.length > 0 ? selectedTechs.map(t => t.nama).join(', ') : inspectorName;
      const sparepartNameString = useSparepart ? spareparts.map(sp => sp.name).join(', ') : undefined;
      const sparepartQtyString = useSparepart ? spareparts.map(sp => sp.qty).join(', ') : undefined;

      return resolveInternalTicket({
        ticketId,
        status: 'Closed',
        tindakan: resolveNotes,
        pic: teknisiString,
        sparepart_name: sparepartNameString,
        sparepart_qty: sparepartQtyString,
        devOptions: parsedDevOptions,
        photoBase64: resolutionPhoto
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      resetForm();
      if (data && data.waMessageText) {
          setWaMessageToModal(data.waMessageText);
      } else {
          toast.success('Berhasil ditutup!');
      }
      onSuccess();
    },
    onError: (err) => console.error(err),
  });

  const resolveWOMutation = useMutation({
    mutationFn: async (wo_id: string) => {
      const teknisiString = selectedTechs.length > 0 ? selectedTechs.map(t => t.nama).join(", ") : inspectorName;
      const sparepartNameString = useSparepart ? spareparts.map(sp => sp.name).join(", ") : undefined;
      const sparepartQtyString = useSparepart ? spareparts.map(sp => sp.qty).join(", ") : undefined;

      return updateWOStatus(
        wo_id,
        'Closed',
        resolveNotes,
        teknisiString,
        sparepartNameString,
        sparepartQtyString,
        parsedDevOptions,
        resolutionPhoto
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      resetForm();
      if (data && data.waMessageText) {
          setWaMessageToModal(data.waMessageText);
      } else {
          toast.success('Berhasil ditutup!');
      }
      onSuccess();
    },
    onError: (err) => console.error(err),
  });

  return {
    resolutionPhoto, setResolutionPhoto,
    waMessageToModal, setWaMessageToModal,
    resolvingId, setResolvingId,
    resolveNotes, setResolveNotes,
    useSparepart, setUseSparepart,
    spareparts, setSpareparts,
    selectedTechs, setSelectedTechs,
    techSearch, setTechSearch,
    isResolving: resolveTicketMutation.isPending || resolveWOMutation.isPending,
    handleResolvePermintaan: (id: string) => resolveTicketMutation.mutate(id),
    handleResolveWO: (id: string) => resolveWOMutation.mutate(id),
    resetForm
  };
}
