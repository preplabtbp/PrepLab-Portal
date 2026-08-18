import { useQuery } from '@tanstack/react-query';
import { getTickets } from '../api/tickets';

export const useTickets = (statusFilter: string = 'all') => {
  return useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () => getTickets(statusFilter),
  });
};
