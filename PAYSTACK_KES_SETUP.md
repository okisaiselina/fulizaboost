# Paystack KES Currency & M-Pesa Setup Guide

## Critical Issue: "Currency is not supported by merchant"

This error occurs when your Paystack merchant account hasn't explicitly enabled KES (Kenyan Shilling) or M-Pesa as a supported payment method.

---

## Solution: Enable KES & M-Pesa in Your Paystack Account

### Step 1: Login to Paystack Dashboard
1. Go to https://dashboard.paystack.com
2. Sign in with your merchant account credentials

### Step 2: Enable KES Currency
1. Click **Settings** in the left sidebar
2. Click **Currencies**
3. Look for **KES (Kenyan Shilling)**
4. If not shown as "Active", click to enable it
5. Click **Save**

### Step 3: Enable M-Pesa Channel
1. In Settings, click **Integrations & Plugins**
2. Look for **Mobile Money** or **M-Pesa**
3. Enable the **M-Pesa** option
4. Click **Save**

### Step 4: Verify Keys
1. Go to **Settings → Developer** in the dashboard
2. Copy your **Secret Key** (starts with `sk_live_`)
3. Copy your **Public Key** (starts with `pk_live_`)
4. Ensure these are set in your environment variables:
   ```env
   PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
   ```

---

## How Payment Initialization Now Works

### Request Payload Structure
```json
{
  "email": "user@example.com",
  "amount": 50000,
  "currency": "KES",
  "reference": "boost-id-12345",
  "channels": ["mobile_money"],
  "mobile_money": {
    "phone": "254712345678",
    "provider": "mpesa"
  },
  "metadata": {
    "application_id": "boost-id-12345",
    "phone_number": "254712345678",
    "custom_fields": [
      {
        "display_name": "Phone Number",
        "variable_name": "phone_number",
        "value": "254712345678"
      }
    ]
  }
}
```

### Key Parameters:
- **amount**: In kobo (multiply KES by 100) - e.g., 500 KES = 50000 kobo
- **currency**: Must be "KES" for Kenya
- **channels**: Must include "mobile_money"
- **mobile_money.provider**: Must be "mpesa"
- **mobile_money.phone**: Formatted as 254XXXXXXXXX (no leading 0, no +)

---

## Error Debugging

If you still get "Currency is not supported by merchant" error:

### Check 1: Verify Account Status
```
Visit: https://dashboard.paystack.com/settings/currencies
Ensure: KES is shown as "Active"
```

### Check 2: Check API Keys
```
Make sure PAYSTACK_SECRET_KEY is from a LIVE account (sk_live_)
Test keys (sk_test_) won't work in production
```

### Check 3: Verify M-Pesa Setup
```
Settings → Integrations & Plugins
M-Pesa should be listed and enabled
```

### Check 4: Browser Console Logs
When payment initialization fails, check browser console for:
```
[v0] Paystack API Error Details: {
  status: 400,
  error: "...",
  fullError: {...}
}
```
Copy the full error and check against Paystack documentation.

---

## Amount Formatting

**Paystack uses KOBO (1/100 of Kenyan Shilling)**

Examples:
- 100 KES = 10,000 kobo
- 500 KES = 50,000 kobo
- 1000 KES = 100,000 kobo
- 5000 KES = 500,000 kobo

**Code:**
```javascript
const amountInKobo = amount * 100; // amount is in KES
```

---

## Phone Number Formatting

**Paystack requires: 254XXXXXXXXX format**

Conversion rules:
- `0712345678` → `254712345678` (remove 0, add 254)
- `+254712345678` → `254712345678` (remove +)
- `254712345678` → `254712345678` (already correct)

**Code:**
```javascript
let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/-/g, "");
if (formattedPhone.startsWith("0")) {
  formattedPhone = "254" + formattedPhone.substring(1);
} else if (!formattedPhone.startsWith("254")) {
  formattedPhone = "254" + formattedPhone;
}
formattedPhone = formattedPhone.replace("+", "");
```

---

## Complete Flow Checklist

- [ ] Paystack merchant account created
- [ ] KES currency enabled in Dashboard
- [ ] M-Pesa channel enabled in Integrations
- [ ] Secret Key set in `PAYSTACK_SECRET_KEY` env variable
- [ ] Public Key set in `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` env variable
- [ ] Phone number formatted correctly (254XXXXXXXXX)
- [ ] Amount in kobo (multiply by 100)
- [ ] Currency set to "KES"
- [ ] Channels array includes "mobile_money"
- [ ] mobile_money provider set to "mpesa"
- [ ] Email is valid format

---

## Testing Payment

1. Fill payment form with:
   - ID Number: 12345678
   - Phone: 0712345678
   - Email: test@example.com
   - New Limit: 10,000

2. Click "Pay now"

3. Paystack popup should appear

4. If error "Currency not supported": Follow steps above to enable KES

5. If error "No such channel": Ensure M-Pesa is enabled

6. If payment completes: Success! Transaction will appear in Paystack dashboard

---

## Support

If still having issues:
1. Check browser console: `F12 → Console tab`
2. Look for `[v0] Paystack API Error Details` logs
3. Visit https://support.paystack.com for account-specific help
4. Ensure your Paystack account is verified and approved for live transactions
