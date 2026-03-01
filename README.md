# 🛍️ NovaTech Ventures — School Marketplace

A full-featured school marketplace with student verification, store management, and order notifications.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd novatechventures_website
npm install
```

### 2. Configure Email (Important!)
To enable order notifications to tanclarise46@gmail.com, you need a **Gmail App Password**:

1. Go to your Google Account → Security
2. Enable 2-Step Verification (if not done)
3. Go to **App Passwords** → Generate a new one (App: Mail)
4. Copy the 16-character password

Then open `config/email.js` and replace:
```js
pass: 'YOUR_APP_PASSWORD_HERE'
```
with your actual App Password.

### 3. Start the Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 4. Open in Browser
```
http://localhost:3000
```

---

## 🔑 Default Accounts

| Role   | Username       | Password     |
|--------|---------------|--------------|
| Admin  | admin         | admin123     |
| Seller | clarise       | clarise123   |
| Seller | jollibee_store | jollibee123 |
| Seller | mcdo_store    | mcdo123      |

---

## 📁 Folder Structure

```
novatechventures_website/
├── app.js                    ← Main entry point
├── config/
│   ├── database.js           ← SQLite setup + seed data
│   └── email.js              ← Nodemailer email config
├── middleware/
│   └── auth.js               ← Login/admin/seller guards
├── routes/
│   ├── auth.js               ← Login, register, logout
│   ├── store.js              ← Browse stores, seller dashboard
│   ├── orders.js             ← Cart, place order, cancel
│   ├── verification.js       ← Student verification form
│   └── admin.js              ← Admin panel
├── views/
│   ├── partials/             ← header.ejs, footer.ejs
│   ├── auth/                 ← login.ejs, register.ejs
│   ├── store/                ← browse, view, cart, dashboard, orders
│   ├── verification/         ← form.ejs, status.ejs
│   └── admin/                ← dashboard, verifications, orders, users
├── public/
│   ├── css/style.css         ← All styles
│   ├── js/main.js            ← Client-side JS
│   └── uploads/              ← Student ID photos
└── database.sqlite           ← Auto-generated SQLite database
```

---

## ✅ Features

- **Browse** stores and products without login
- **Add to cart** without verification
- **Place Order** triggers verification check:
  - Not verified → Show verification form
  - Pending → "Account under review"
  - Rejected → Allow resubmission
  - Approved → Place order ✅
- **Cancel** pending orders only (confirmed orders cannot be cancelled)
- **Admin** can approve/reject verifications with notes
- **Email notification** sent to tanclarise46@gmail.com on every order from Clarise's store
- **Contact number validation** — Philippine mobile numbers only (09XX or +639XX)
- **Student ID photo upload** — stored securely in /public/uploads
- **Facebook profile info** — noted for anti-scam awareness
- **Fast food chains** — Jollibee and McDonald's with available school meals

---

## 🗄️ Database Tables

| Table         | Purpose                          |
|---------------|----------------------------------|
| users         | All users (buyer, seller, admin) |
| verifications | Student identity verification    |
| stores        | Store profiles                   |
| products      | Products per store               |
| cart_items    | Temporary cart per user          |
| orders        | Placed orders                    |
| order_items   | Items inside each order          |
