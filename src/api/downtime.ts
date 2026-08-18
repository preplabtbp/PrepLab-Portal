export const getDowntimeRecords = async () => {
  const res = await fetch('/api/downtime');
  if (!res.ok) throw new Error('Failed to fetch downtime records');
  return res.json();
};

export const updateDowntimeRepair = async (id: string, repairTime: string, notes: string) => {
  const res = await fetch(`/api/downtime/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repairTime, notes })
  });
  if (!res.ok) throw new Error('Failed to update downtime repair');
  return res.json();
};
