// API Client untuk menghubungkan Frontend ke Backend Server (Cloud SQL)

const API_BASE = '/api';

export const fetchEmployees = async () => {
  const res = await fetch(`${API_BASE}/employees`);
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
};

export const fetchEquipments = async () => {
  const res = await fetch(`${API_BASE}/equipments`);
  if (!res.ok) throw new Error('Failed to fetch equipments');
  return res.json();
};

export const fetchWorkOrders = async () => {
  const res = await fetch(`${API_BASE}/work-orders`);
  if (!res.ok) throw new Error('Failed to fetch work orders');
  return res.json();
};

export const createWorkOrder = async (woData: any) => {
  const res = await fetch(`${API_BASE}/work-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(woData),
  });
  if (!res.ok) throw new Error('Failed to create work order');
  return res.json();
};
