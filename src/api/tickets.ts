export const getTickets = async (statusFilter: string) => {
  const res = await fetch('/api/tickets');
  if (!res.ok) throw new Error('Failed to fetch tickets');
  const data = await res.json();
  const filteredData = data.filter((t: any) => t.source === 'inspeksi' || t.ticketId.startsWith('TKT-'));
  if (statusFilter === 'ALL') return filteredData;
  return filteredData.filter((t: any) => t.status?.toUpperCase() === statusFilter.toUpperCase());
};
