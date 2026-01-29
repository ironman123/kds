import api from '../../api/client';

// --- ORDERS ---

export const createOrder = async (orderData) =>
{
    // orderData: { tableId, waiterId, servePolicy, customerName? }
    const res = await api.post('/orders', orderData);
    return res.data;
};

export const getOrderById = async (orderId) =>
{
    const res = await api.get(`/orders/${orderId}`);
    return res.data;
};

export const getActiveOrders = async () =>
{
    const res = await api.get('/orders/active');
    return res.data;
};

export const getOrdersForTable = async (tableId) =>
{
    const res = await api.get(`/orders/table/${tableId}`);
    return res.data;
};

export const changeOrderStatus = async (orderId, newStatus) =>
{
    const res = await api.patch(`/orders/${orderId}/status`, { newStatus });
    return res.data;
};

// --- ORDER ITEMS ---

export const addItemToOrder = async (orderId, itemData) =>
{
    // itemData: { menuItemId, quantity, notes }
    const res = await api.post(`/orders/${orderId}/items`, itemData);
    return res.data;
};

export const updateItemStatus = async (itemId, newStatus) =>
{
    const res = await api.patch(`/orders/items/${itemId}/status`, { newStatus });
    return res.data;
};

export const removeOrderItem = async (itemId) =>
{
    await api.delete(`/orders/items/${itemId}`);
};