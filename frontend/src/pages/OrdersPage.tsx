import React, { useEffect, useState } from 'react';
import api from '@/api/client';

interface Order {
  _id: string;
  stripePaymentIntentId: string;
  status: string;
  total: number;
  currency: string;
  items: Array<{ title: string; quantity: number; price: number }>;
  createdAt: string;
}

interface OrdersResponse {
  orders: Order[];
  pagination: { page: number; totalPages: number; total: number };
}

/**
 * Merchant order management page.
 * Displays order lifecycle state, allows status transitions, and partial/full refunds.
 * SFP-144, SFP-174, SFP-175, SFP-176
 */
export default function OrdersPage(): React.ReactElement {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pagination.page) });
    if (statusFilter) params.set('status', statusFilter);

    void api
      .get<OrdersResponse>(`/orders?${params.toString()}`)
      .then(({ data }) => {
        setOrders(data.orders);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  }, [pagination.page, statusFilter]);

  async function handleStatusUpdate(orderId: string, newStatus: string): Promise<void> {
    await api.patch(`/orders/${orderId}/status`, { status: newStatus });
    setOrders((prev) =>
      prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
    );
  }

  async function handleRefund(orderId: string, amount?: number): Promise<void> {
    // TODO [SFP-176]: show refund amount input modal
    await api.post(`/orders/${orderId}/refund`, { amount, reason: 'requested_by_customer' });
    setOrders((prev) =>
      prev.map((o) =>
        o._id === orderId ? { ...o, status: amount ? 'partially_refunded' : 'refunded' } : o
      )
    );
  }

  const STATUS_OPTIONS: Record<string, string[]> = {
    pending_payment: ['cancelled'],
    payment_confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
    refunded: [],
    partially_refunded: ['refunded'],
  };

  return (
    <main className="orders-page">
      <h1>Order Management</h1>

      <div className="orders-filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {[
            'pending_payment', 'payment_confirmed', 'processing',
            'shipped', 'delivered', 'cancelled', 'refunded', 'partially_refunded',
          ].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <span>{pagination.total} orders</span>
      </div>

      {loading && <p>Loading orders…</p>}

      <table className="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id}>
              <td><code>{order._id.slice(-8)}</code></td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td>{order.items.map((i) => `${i.title} ×${i.quantity}`).join(', ')}</td>
              <td>${order.total.toFixed(2)}</td>
              <td>{order.status.replace(/_/g, ' ')}</td>
              <td>
                {/* Lifecycle transitions (SFP-174) */}
                {(STATUS_OPTIONS[order.status] ?? []).map((next) => (
                  <button key={next} onClick={() => void handleStatusUpdate(order._id, next)}>
                    Mark as {next.replace(/_/g, ' ')}
                  </button>
                ))}
                {/* Refund actions (SFP-176) */}
                {order.status === 'payment_confirmed' || order.status === 'delivered' ? (
                  <button onClick={() => void handleRefund(order._id)}>Full Refund</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <nav aria-label="Orders pagination">
        <button
          disabled={pagination.page <= 1}
          onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
        >
          Previous
        </button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
        >
          Next
        </button>
      </nav>
    </main>
  );
}
