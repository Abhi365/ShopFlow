import { Request, Response } from 'express';
import { Order, OrderStatus } from '../models/Order';
import { refundOrder } from '../services/stripeService';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  payment_confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  refunded: [],
  partially_refunded: ['refunded'],
};

/**
 * GET /api/orders
 * Returns paginated orders for the merchant with lifecycle state.
 * SFP-144, SFP-174
 */
export async function listOrders(req: Request, res: Response): Promise<void> {
  const merchantId = req.user!.sub;
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { merchantId };
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Order.countDocuments(filter),
  ]);

  res.json({
    orders,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
}

/**
 * PATCH /api/orders/:orderId/status
 * Enforces valid lifecycle transitions for merchant order management.
 * SFP-144, SFP-174
 */
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  const { status: newStatus } = req.body as { status: OrderStatus };
  const merchantId = req.user!.sub;

  const order = await Order.findOne({ _id: orderId, merchantId });
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    res.status(400).json({
      error: `Cannot transition from ${order.status} to ${newStatus}`,
      allowed,
    });
    return;
  }

  order.status = newStatus;
  await order.save();
  res.json(order);
}

/**
 * POST /api/orders/:orderId/refund
 * Initiates partial or full refund. Delegates to Stripe Refunds API.
 * SFP-144, SFP-176
 */
export async function issueRefund(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  const { amount, reason } = req.body as { amount?: number; reason?: string };

  // amount should be in dollars; convert to cents for Stripe
  const amountCents = amount !== undefined ? Math.round(amount * 100) : undefined;

  await refundOrder(orderId, amountCents, reason);
  const updated = await Order.findById(orderId).lean();
  res.json(updated);
}
