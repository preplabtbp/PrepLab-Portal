import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDowntimeRecords, updateDowntimeRepair } from '../api/downtime';
import { toast } from 'sonner';

export const useDowntime = () => {
  const queryClient = useQueryClient();

  const { data: records = [], isLoading, error } = useQuery({
    queryKey: ['downtime-records'],
    queryFn: getDowntimeRecords,
  });

  const repairMutation = useMutation({
    mutationFn: ({ id, repairTime, notes }: { id: string; repairTime: string; notes: string }) => 
      updateDowntimeRepair(id, repairTime, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtime-records'] });
      toast.success('Downtime repair updated successfully');
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to update downtime repair');
    }
  });

  const handleEndDowntime = async (id: string) => {
    const confirm = window.confirm('Konfirmasi bahwa perbaikan telah selesai dan alat kembali beroperasi?');
    if (!confirm) return;

    const notes = window.prompt("Catatan perbaikan yang dilakukan?", "Perbaikan selesai");
    if (notes === null) return; // cancelled

    const repairTime = new Date().toISOString();
    repairMutation.mutate({ id, repairTime, notes });
  };

  return {
    records: records.filter((r: any) => r.status !== 'Fixed'), // Only active downtime
    isLoading,
    error,
    handleEndDowntime,
    isRepairing: repairMutation.isPending
  };
};
