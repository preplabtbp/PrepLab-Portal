import { useQuery } from '@tanstack/react-query';
import { getWOData, getSpareparts, getEmployees, getInternalTickets } from '@/src/sheets-api';

export function useWorkOrders() {
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data,
    isLoading: loading,
    refetch: loadData,
  } = useQuery({
    queryKey: ['workOrders'],
    queryFn: async () => {
      const [woData, ticketData, sparepartsList] = await Promise.all([
        getWOData(),
        getInternalTickets(),
        getSpareparts(),
      ]);
      return {
        woData: woData || [],
        ticketData: ticketData || [],
        sparepartsList: sparepartsList || [],
      };
    },
  });

  return {
    woData: data?.woData || [],
    ticketData: data?.ticketData || [],
    sparepartsList: data?.sparepartsList || [],
    employees: employeesData || [],
    loading,
    setLoading: () => {}, // Maintain compatibility if used elsewhere, although React Query handles it.
    loadData,
  };
}
