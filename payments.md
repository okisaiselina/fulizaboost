# Paystack Payment Integration - Complete Guide

## Overview
Complete migration from Intasend M-Pesa STK Push to Paystack payment gateway with **inline modal popup** (no page redirect). Payment form appears as an overlay on the same page.

---

## Part 1: Environment Variables Setup

### Required .env Variables

Add these variables to your `.env.local` file:

```env
# Paystack API Keys (from https://dashboard.paystack.com)
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx

# Existing Variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxx
```

### How to Get Paystack Keys

1. Go to https://dashboard.paystack.com/settings/developer
2. Copy your **Secret Key** (starts with `sk_live_`)
3. Copy your **Public Key** (starts with `pk_live_`)
4. Add both to your `.env.local` file
5. Keep `PAYSTACK_SECRET_KEY` private - never share it!

---

## Part 2: Payment Flow - Inline Modal Popup

### How It Works Now

1. **User submits payment form** (ID, Phone, Email)
2. **Backend initializes Paystack transaction** and returns reference
3. **Frontend opens Paystack payment modal popup** using `PaystackPop.openIframe()`
4. **User pays within the modal** (no page redirect)
5. **Success callback verifies payment** in background
6. **Modal closes automatically** and payment status updates
7. **Success message shown** - user stays on same page

### User Experience

- Payment form modal appears
- User fills in details and clicks "Pay now"
- Paystack payment popup appears **over the modal** on the same tab
- User enters card/payment details
- Modal auto-closes on success
- Page stays intact, content visible behind modal

---

## Part 3: Files Modified

### 1. `/app/layout.tsx` - Added Paystack Library

**Added to `<head>` section:**
```html
<script src="https://js.paystack.co/v1/inline.js"></script>
```

This loads the Paystack JavaScript library globally, enabling `PaystackPop` API for inline payment modals.

---

### 2. `/app/actions.ts` - Payment Functions

**Removed:**
- `initializeIntasendPayment()` - Old Intasend M-Pesa STK push
- `checkPaymentStatus()` - Old status polling

**Added:**
- `initializePaystackPayment()` - Initialize payment with Paystack API
- `verifyPaystackPayment()` - Verify payment was successful

#### Function: `initializePaystackPayment()`
```typescript
export async function initializePaystackPayment(
  boostId: string,
  phoneNumber: string,
  amount: number,
  email: string
)
```

**What it does:**
- Creates a transaction with Paystack API
- Returns `authorization_url`, `access_code`, and `reference`
- Uses Bearer token auth with `PAYSTACK_SECRET_KEY`
- Converts amount to kobo (multiply by 100)
- Sets metadata with phone number and boost ID

**Authorization Header:**
```typescript
'Authorization': `Bearer ${paystackSecretKey}`
```

#### Function: `verifyPaystackPayment()`
```typescript
export async function verifyPaystackPayment(reference: string)
```

**What it does:**
- Verifies if payment with given reference was successful
- Polls Paystack API: `GET /transaction/verify/{reference}`
- Returns payment status: `'success'`, `'failed'`, or `'unknown'`
- Uses same Bearer token authentication

---

### 3. `/components/payment-modal.tsx` - UI & Payment Handler

**Changes Made:**

#### Added Email Input Field
```tsx
<div>
  <label>Email Address</label>
  <Input
    type="email"
    placeholder="your@email.com"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
  />
  <p className="text-xs text-gray-600">Required for payment receipt</p>
</div>
```

#### Updated Payment Handler
```tsx
const handler = (window as any).PaystackPop.setup({
  key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
  email: email,
  amount: Math.floor(Number(processingFee) * 100), // In kobo
  ref: paymentResult.reference,
  onClose: () => {
    // User closed payment modal
    setIsLoading(false);
    setError('Payment cancelled');
    setPaymentStatus('form');
  },
  onSuccess: (response: any) => {
    // Payment successful
    handlePaymentSuccess();
  }
});

handler.openIframe(); // Opens payment modal on same page
```

#### Updated State Management
- Changed `transactionId` → `reference` (Paystack uses reference)
- Added `email` state for email input
- Modified polling to use `verifyPaystackPayment()`
- Handlers now trigger inline `onSuccess`/`onClose` callbacks

#### Updated Retry Handler
- Uses same `PaystackPop.openIframe()` logic
- Allows user to retry payment without closing page

---

## Part 4: API Requests & Authorization

### Initialize Payment Request

**Endpoint:** `POST https://api.paystack.co/transaction/initialize`

**Headers:**
```javascript
{
  'Authorization': 'Bearer sk_live_xxxxxxxxxxxxxxxxxxxxx',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "amount": 5000,
  "currency": "KES",
  "reference": "boost-id-12345",
  "metadata": {
    "phone_number": "254712345678",
    "boost_id": "boost-id-12345"
  }
}
```

**Success Response (200 OK):**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "0peioxfhd0",
    "reference": "boost-id-12345"
  }
}
```

---

### Verify Payment Request

**Endpoint:** `GET https://api.paystack.co/transaction/verify/{reference}`

**Headers:**
```javascript
{
  'Authorization': 'Bearer sk_live_xxxxxxxxxxxxxxxxxxxxx',
  'Accept': 'application/json'
}
```

**Success Response (200 OK):**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "id": 12345,
    "reference": "boost-id-12345",
    "amount": 5000,
    "paid_at": "2025-04-30T10:30:00.000Z",
    "status": "success",
    "customer": {
      "id": 67890,
      "email": "user@example.com"
    }
  }
}
```

---

## Part 5: Key Differences from Intasend

| Feature | Intasend | Paystack |
|---------|----------|----------|
| **Payment Method** | M-Pesa STK Push (phone) | Card/Mobile Money (popup) |
| **User Flow** | STK prompt on phone | Modal popup on page |
| **Timeout** | 2 minutes to enter PIN | Depends on payment method |
| **Verification** | Poll transaction status | Poll transaction reference |
| **Amount Format** | String, in cents | Number, in kobo (×100) |
| **Reference** | `transaction_id` | `reference` |
| **Page Behavior** | Redirects away | Stays on same page |

---

## Part 6: Testing

### Test Payment Credentials

**Card Number:** `4111 1111 1111 1111`  
**Expiry:** Any future date (e.g., `01/29`)  
**CVV:** Any 3 digits (e.g., `123`)  

### Steps to Test

1. Set `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` in `.env.local`
2. Fill in payment form (ID, Phone, Email)
3. Click "Pay now"
4. Paystack modal appears on same page
5. Enter test card details
6. Payment completes → modal closes → success message shown
7. Page stays intact with all content visible

---

## Part 7: Error Handling

### Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Payment gateway not configured" | Missing env vars | Add `PAYSTACK_SECRET_KEY` |
| "Invalid request" | Wrong amount format | Amount must be in kobo (×100) |
| "Unauthorized" | Secret key expired/invalid | Get new keys from Paystack dashboard |
| "Network error" | API timeout or offline | Check internet connection |
| "Payment timeout" | User doesn't complete | Allow retry after 30 seconds |

---

## Part 8: Security Notes

1. **Never expose** `PAYSTACK_SECRET_KEY` - keep in `.env.local` only
2. **Always use** Bearer token for backend requests
3. **Verify payments** before updating user limits
4. **Use HTTPS** in production
5. **Implement RLS policies** in Supabase for database security

---

## Part 1: Environment Variables Setup

### Required .env Variables

Add these variables to your `.env.local` file:

```env
# Paystack API Keys (from https://dashboard.paystack.com)
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx

# Existing Variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxx
```

### How to Get Paystack Keys

1. Go to https://dashboard.paystack.com/settings/developer
2. Copy your **Secret Key** (starts with `sk_live_`)
3. Copy your **Public Key** (starts with `pk_live_`)
4. Add both to your `.env.local` file
5. Keep `PAYSTACK_SECRET_KEY` private - never share it!

---

## Part 2: Files Modified

### 1. `/app/actions.ts` - Payment Logic

**Changes Made:**
- Removed: `initializeIntasendPayment()` function
- Removed: `checkPaymentStatus()` function  
- Added: `initializePaystackPayment()` function
- Added: `verifyPaystackPayment()` function

**Key Functions:**

#### `initializePaystackPayment()`
```typescript
export async function initializePaystackPayment(
  boostId: string,
  phoneNumber: string,
  amount: number,
  email: string
)
```

**What it does:**
- Takes user email as parameter (Paystack requirement)
- Converts amount to kobo (multiply by 100)
- Creates Paystack transaction
- Returns authorization URL to redirect user

**Important Details:**
- Amount is in **Kobo** (not Shilling). E.g., 100 Ksh = 10,000 Kobo
- Email is required for Paystack (needed for receipts)
- Returns `authorizationUrl` for user to complete payment
- Uses Bearer token authentication with Paystack Secret Key

**Authorization Header:**
```typescript
'Authorization': `Bearer ${paystackSecretKey}`
```

#### `verifyPaystackPayment()`
```typescript
export async function verifyPaystackPayment(reference: string)
```

**What it does:**
- Verifies payment status using transaction reference
- Called repeatedly to check if user completed payment
- Returns `success: true` when payment is verified

---

### 2. `/components/payment-modal.tsx` - User Interface

**Changes Made:**
- Removed import: `initializeIntasendPayment, checkPaymentStatus`
- Added import: `initializePaystackPayment, verifyPaystackPayment`
- Added state: `email` (new user input)
- Removed state: `transactionId` → Replaced with `reference`
- Updated polling effect to use `verifyPaystackPayment()`
- Added email input field to form
- Updated payment redirect logic

**New Form Fields:**

1. **ID Number** (existing)
2. **Phone Number** (existing)
3. **Email Address** (NEW)
   - Required for Paystack receipts
   - Validated as proper email format
   - Placeholder: `your@email.com`

**Payment Flow Changes:**

Old Flow (Intasend):
```
User submits form → STK push sent to phone → Poll for status → Success
```

New Flow (Paystack):
```
User submits form → Redirect to Paystack payment page → User completes payment → Poll for verification → Success
```

**State Variables Updated:**
```typescript
// OLD
const [transactionId, setTransactionId] = useState<string | null>(null);

// NEW
const [email, setEmail] = useState('');
const [reference, setReference] = useState<string | null>(null);
```

**Form Submission Changes:**

Before:
```typescript
const paymentResult = await initializeIntasendPayment(
  submitResult.boostId || '',
  phoneNumber,
  processingFee,
  newLimit
);
```

After:
```typescript
const paymentResult = await initializePaystackPayment(
  submitResult.boostId || '',
  phoneNumber,
  processingFee,
  email  // NEW: email parameter required
);

// If successful, redirect to Paystack payment page
if (paymentResult.authorizationUrl) {
  window.location.href = paymentResult.authorizationUrl;
}
```

---

## Part 3: Authorization Headers

### How Authorization Works

Both API endpoints require Bearer token authentication:

**Paystack API Requests:**
```
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
Accept: application/json
```

The secret key is:
- ✅ Safe to use on **server-side** (Server Actions)
- ❌ Never expose on **client-side**
- ✅ Sent via HTTPS only
- ❌ Never commit to Git (use `.env.local`)

### Request Examples

**Initialize Payment:**
```javascript
fetch('https://api.paystack.co/transaction/initialize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${paystackSecretKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    amount: 10000,  // in kobo
    reference: 'boost-123'
  })
})
```

**Verify Payment:**
```javascript
fetch('https://api.paystack.co/transaction/verify/boost-123', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${paystackSecretKey}`,
    'Accept': 'application/json',
  }
})
```

---

## Part 4: API Endpoints & Payloads

### 1. Initialize Payment

**Endpoint:** `POST https://api.paystack.co/transaction/initialize`

**Request Headers:**
```
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

**Request Payload:**
```json
{
  "email": "user@example.com",
  "amount": 10000,
  "reference": "boost-unique-id",
  "metadata": {
    "phone_number": "254712345678",
    "boost_id": "boost-unique-id"
  }
}
```

**Response (Success):**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "xxxx",
    "reference": "xxxx"
  }
}
```

**User Action:** User visits `authorization_url` to complete payment

---

### 2. Verify Payment

**Endpoint:** `GET https://api.paystack.co/transaction/verify/{reference}`

**Request Headers:**
```
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxx
Accept: application/json
```

**Response (Success):**
```json
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "status": "success",
    "reference": "xxxx",
    "amount": 10000,
    "paid_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**Response (Failed):**
```json
{
  "status": false,
  "message": "Verification failed",
  "data": {
    "status": "failed"
  }
}
```

---

## Part 5: Testing Checklist

### Before Going Live

1. **Environment Variables**
   - [ ] `PAYSTACK_SECRET_KEY` added to `.env.local`
   - [ ] `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` added to `.env.local`
   - [ ] Keys are from Paystack dashboard (not demo keys)

2. **Payment Flow**
   - [ ] Form accepts email address
   - [ ] Form accepts phone number
   - [ ] Submit redirects to Paystack page
   - [ ] Payment completes successfully
   - [ ] Verification polls work correctly
   - [ ] Success page appears after payment

3. **Error Handling**
   - [ ] Shows error if email invalid
   - [ ] Shows error if phone invalid
   - [ ] Shows error if payment fails
   - [ ] Shows timeout message if verification takes too long

4. **Database**
   - [ ] Boost request saved with correct status
   - [ ] Payment status updated after verification

---

## Part 6: Removed Code

### Deleted Functions (from Intasend)

**Function:** `initializeIntasendPayment()`
- Sent STK push directly to M-Pesa
- Replaced by Paystack redirect flow

**Function:** `checkPaymentStatus()`
- Polled Intasend API for payment status
- Replaced by `verifyPaystackPayment()`

**Removed Dependencies:**
- No changes to packages (Paystack uses standard fetch API)

---

## Part 7: Troubleshooting

### Issue: 401 Unauthorized
**Cause:** Invalid or missing `PAYSTACK_SECRET_KEY`
**Fix:** 
1. Copy key from https://dashboard.paystack.com/settings/developer
2. Paste into `.env.local`
3. Restart dev server

### Issue: "Invalid email address"
**Cause:** Email field is empty or invalid
**Fix:** User must enter valid email in form

### Issue: Payment not verifying
**Cause:** User didn't complete payment on Paystack page
**Fix:** Payment verification waits 30 seconds (MAX_STATUS_CHECKS)

### Issue: "Amount must be an integer"
**Cause:** Amount not converted to kobo correctly
**Fix:** Check that `Math.floor(amount * 100)` is used

---

## Part 8: Key Differences: Intasend vs Paystack

| Feature | Intasend | Paystack |
|---------|----------|----------|
| **Payment Method** | STK Push (M-Pesa Direct) | Hosted Checkout Page |
| **User Action** | Approve prompt on phone | Complete payment on webpage |
| **Amount Format** | String (KES) | Integer (Kobo) |
| **Email Required** | No | Yes |
| **User Redirect** | None | Yes, to Paystack page |
| **Authentication** | Bearer Token | Bearer Token |
| **API Style** | RESTful | RESTful |

---

## Part 9: Production Deployment

### Steps to Deploy

1. **Update environment variables on Vercel:**
   - Go to Vercel project settings
   - Add `PAYSTACK_SECRET_KEY` variable
   - Add `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` variable
   - Deploy will auto-use new variables

2. **Test on Vercel staging:**
   - Complete a test payment
   - Verify payment processed
   - Check database has correct status

3. **Monitor in production:**
   - Watch logs for payment errors
   - Check Paystack dashboard for transactions
   - Monitor payment completion rate

---

## Summary of Changes

✅ **Replaced:** Intasend STK Push → Paystack Hosted Checkout  
✅ **Added:** Email field (Paystack requirement)  
✅ **Updated:** All payment API calls with Paystack endpoints  
✅ **Added:** Proper authorization headers with Bearer tokens  
✅ **Fixed:** Amount formatting (now in kobo)  
✅ **Updated:** Payment verification logic  

**Website is now using Paystack for all payments with proper security headers and error handling.**
