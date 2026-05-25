/**
 * emailService.ts
 * Order transactional emails via SendGrid.
 * SFP-173 — Order confirmation email after successful payment.
 */

export interface OrderConfirmationPayload {
  orderId: string;
  userEmail: string;
  total: number;
  currency: string;
  items: {
    title: string;
    sku: string;
    quantity: number;
    price: number;
  }[];
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Sends an order confirmation email to the customer.
 * In production this calls the SendGrid API; in dev/test it logs to stdout.
 */
export async function sendOrderConfirmationEmail(
  payload: OrderConfirmationPayload
): Promise<void> {
  const { orderId, userEmail, total, currency, items, shippingAddress } = payload;

  const lineItems = items
    .map((i) => `  - ${i.title} (x${i.quantity}) — ${currency} ${(i.price * i.quantity).toFixed(2)}`)
    .join('\n');

  const addressLine = [
    shippingAddress.line1,
    shippingAddress.line2,
    `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`,
    shippingAddress.country,
  ]
    .filter(Boolean)
    .join(', ');

  const body = `
Thank you for your order!

Order ID : ${orderId}
Total    : ${currency} ${total.toFixed(2)}

Items:
${lineItems}

Shipping to: ${addressLine}

We'll send a shipping confirmation once your order is on its way.

— The ShopFlow Team
  `.trim();

  // SFP-22: HTML email body for richer order confirmation display
  const htmlBody = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#2563eb">Your ShopFlow order is confirmed!</h2>
  <p><strong>Order ID:</strong> ${orderId}</p>
  <p><strong>Total:</strong> ${currency} ${total.toFixed(2)}</p>
  <h3>Items</h3>
  <ul>${items.map(i => `<li>${i.title} &times;${i.quantity} &mdash; ${currency} ${(i.price * i.quantity).toFixed(2)}</li>`).join('')}</ul>
  <h3>Shipping to</h3>
  <p>${addressLine}</p>
  <p style="color:#6b7280;font-size:14px">We'll send a shipping confirmation once your order is on its way.</p>
  <p>&mdash; The ShopFlow Team</p>
</div>`.trim();

  if (process.env.SENDGRID_API_KEY) {
    // Production path — SendGrid
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.default.send({
      to: userEmail,
      from: process.env.EMAIL_FROM ?? 'noreply@shopflow.com',
      subject: `Your ShopFlow order #${orderId} is confirmed`,
      text: body,
      html: htmlBody,
    });
  } else {
    // Dev / test path — log only
    console.info(`[emailService] Order confirmation email (dry-run)\nTo: ${userEmail}\n\n${body}\n`);
  }
}
