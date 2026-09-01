export const getTickets = async (statusFilter: string = 'ALL') => {
  const res = await fetch('/api/tickets');
  if (!res.ok) throw new Error('Failed to fetch tickets');
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const filteredData = data.filter((t: any) => t.source === 'inspeksi' || (t.ticketId && t.ticketId.startsWith('TKT-')));
  if (!statusFilter || statusFilter.toUpperCase() === 'ALL') return filteredData;
  return filteredData.filter((t: any) => t.status?.toUpperCase() === statusFilter.toUpperCase());
};
