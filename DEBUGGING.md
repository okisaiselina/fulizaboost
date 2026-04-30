# Fuliza Boost Payment Debugging Guide

## Payment Processing Flow

### 1. User Submits Form
- ID Number & M-Pesa Phone Number entered
- Form validated on client side (phone format check)

### 2. Server Actions Triggered
- **submitBoostRequest()**: Saves boost request to `fuliza_boosts` table
- **initializeIntasendPayment()**: Calls Intasend M-Pesa API

### 3. Timeout Protection
- 30-second timeout on all payment requests
- If timeout occurs, error message displayed and user can retry
- Retry uses the saved boost ID

## Common Issues & Solutions

### Issue: "An error occurred while processing your payment"

**Possible Causes & Solutions:**

1. **Wrong Intasend API Key**
   - Check `INTASEND_SECRET_KEY` environment variable is correct
   - Verify it's from your Intasend dashboard (Settings → API Keys)
   - Should start with `test_` or `prod_`
   - Check browser console for detailed error message

2. **Phone Number Format**
   - Must start with `07` or `01`
   - Should have 10 digits total
   - Examples: `0712345678`, `0112345678`
   - The app strips spaces and special characters automatically

3. **Database Table Missing**
   - Ensure `fuliza_boosts` table exists in your Supabase project
   - Check Supabase dashboard: SQL Editor → see if table exists
   - If missing, run the setup script or create manually

4. **Supabase Connection**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
   - Both must be from same Supabase project (NOT your old project)

5. **Network/API Issues**
   - Intasend API might be down
   - Check internet connection
   - Use Retry button to try again

## Debugging Steps

### Step 1: Check Browser Console
Press `F12` → Console tab → Look for `[v0]` prefixed messages

Expected logs:
```
[v0] Starting payment process for phone: 0712345678
[v0] Submit result: { success: true, boostId: "uuid-here" }
[v0] Initializing payment with Intasend
[v0] Formatted phone number: 254712345678
[v0] Sending to Intasend API: { ... }
[v0] Response status: 200
[v0] Payment result: { success: true, transactionId: "trans-id" }
```

### Step 2: Check Network Requests
1. Press `F12` → Network tab
2. Click "Pay now" button
3. Look for request to `api.intasend.com`
4. Check response status and body

### Step 3: Verify Environment Variables
In your browser, check if they're loaded:
- Open DevTools Console
- Type: `fetch('/api/env-check')` or check the app initialization

### Step 4: Check Supabase Dashboard
1. Go to supabase.com
2. Open your **fuliza-boost** project (NOT your old one)
3. SQL Editor → run: `SELECT * FROM fuliza_boosts LIMIT 1;`
4. Verify table exists and has records

## Retry Mechanism

If payment fails:
1. Error message displays with details
2. "Retry Payment" button appears
3. Click to retry without re-entering phone number
4. Boost ID is preserved and reused

## Timeout Behavior

- Payment processing has 30-second timeout
- If no response after 30 seconds:
  - Error message: "Payment processing timed out"
  - "Retry Payment" button enabled
  - User can retry or submit new request

## Success Indicators

When payment succeeds:
1. Green toast notification appears (top-right)
2. Format: `✓ 071****678 - Limit boosted to Ksh 16,000`
3. Phone number masked for security
4. Notification disappears after 5 seconds
5. Modal closes automatically

## Testing Intasend

### Test Credentials
- Use test phone numbers provided by Intasend
- Use test API keys (start with `test_`)
- Check Intasend docs for test phone numbers

### Verify API Call Manually
```bash
curl -X POST https://api.intasend.com/api/v1/payment/mpesa/request/ \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "254712345678",
    "amount": 100,
    "currency": "KES",
    "reference": "FULIZA-test-123"
  }'
```

## Support

Check browser console for detailed error logs (messages starting with `[v0]`)
All major errors include full error details for debugging.
