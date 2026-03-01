// config/email.js
// Nodemailer setup for sending order notifications

const nodemailer = require('nodemailer');

// Configure your email transporter here
// For Gmail, enable "Less secure apps" or use an App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'tanclarise46@gmail.com',
    pass: process.env.EMAIL_PASS || 'YOUR_APP_PASSWORD_HERE' // Use Gmail App Password
  }
});

/**
 * Send order notification email to store owner
 * @param {Object} options - { to, storeName, orderDetails, buyerName, total }
 */
async function sendOrderNotification(options) {
  const { to, storeName, orderItems, buyerName, total, orderId } = options;

  // Build items list for email
  const itemsList = orderItems.map(item =>
    `• ${item.name} x${item.quantity} — ₱${(item.price_at_order * item.quantity).toFixed(2)}`
  ).join('\n');

  const mailOptions = {
    from: `"NovaTech Ventures" <${process.env.EMAIL_USER || 'tanclarise46@gmail.com'}>`,
    to: to,
    subject: `🛒 New Order #${orderId} for ${storeName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
        <h2 style="color: #e74c3c;">🛒 New Order Received!</h2>
        <p style="color: #555;">Hi <strong>${storeName}</strong>, you have a new order!</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Order #${orderId}</h3>
          <p><strong>Buyer:</strong> ${buyerName}</p>
          <hr style="border: 1px solid #eee;">
          <h4>Items Ordered:</h4>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 14px;">${itemsList}</pre>
          <hr style="border: 1px solid #eee;">
          <h3 style="color: #e74c3c;">Total: ₱${parseFloat(total).toFixed(2)}</h3>
        </div>
        
        <p style="color: #888; font-size: 12px;">
          This notification was sent by NovaTech Ventures School Marketplace.<br>
          Please log in to your seller dashboard to confirm this order.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Order email sent:', info.messageId);
    return { success: true };
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendOrderNotification };
