## 🚀 Fuliza Boost - Setup Instructions

This is a standalone Fuliza limit booster application that uses a **dedicated Supabase project** to avoid table conflicts with your existing databases.

### Prerequisites
- A **NEW Supabase project** (not your existing one)
- Intasend API keys (for M-Pesa payments)

### Step 1: Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project" and create a project named `fuliza-boost`
3. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Create the Database Table

In your Supabase project, go to **SQL Editor** and run this:

```sql
CREATE TABLE IF NOT EXISTS fuliza_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_number TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  new_limit BIGINT NOT NULL,
  processing_fee BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuliza_boosts_phone ON fuliza_boosts(phone_number);
CREATE INDEX IF NOT EXISTS idx_fuliza_boosts_status ON fuliza_boosts(status);
```

### Step 3: Get Intasend API Keys

1. Go to [Intasend Dashboard](https://dashboard.intasend.com)
2. Navigate to **Settings → API Keys**
3. Copy your keys:
   - `Public Key` → `NEXT_PUBLIC_INTASEND_PUBLIC_KEY`
   - `Secret Key` → `INTASEND_SECRET_KEY`

### Step 4: Add Environment Variables

In your project settings (top right → Settings → Vars), add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_INTASEND_PUBLIC_KEY=your_intasend_public_key
INTASEND_SECRET_KEY=your_intasend_secret_key
```

### Step 5: Run the Setup Script (Optional)

To verify your database connection:

```bash
pnpm run setup-db
```

---

## 📱 Features

✅ **Dynamic Activation Fee** - Changes based on selected limit tier
✅ **Green Toast Notifications** - Shows success message with masked phone number (top-right)
✅ **Intasend Integration** - M-Pesa STK push payment processing
✅ **Responsive Design** - Mobile, tablet, and desktop compatible
✅ **Form Validation** - ID number and M-Pesa phone number validation
✅ **New Dedicated Database** - No conflicts with existing projects

---

## 🎨 UI Updates

- **Toast Notifications**: Green background (#16a34a), white text, top-right position
- **Success Message Format**: `✓ [MASKED_PHONE] - Limit boosted to Ksh [AMOUNT]`
- **Activation Fee**: Now dynamically displays the fee of the selected tier (not hardcoded)

---

## 🔐 Security Notes

- Uses Supabase anonymous key (no service role key needed)
- Phone numbers are masked in success notifications
- All payment requests go through Intasend's secure infrastructure
- Form validation on both client and server

---

## ❓ Troubleshooting

**"Missing Supabase environment variables"**
- Ensure all 4 environment variables are added in project Settings → Vars

**"Table fuliza_boosts does not exist"**
- Create the table using the SQL provided in Step 2

**Payment not working**
- Verify Intasend API keys are correct
- Check that the phone number is in correct M-Pesa format (0712... or 254712...)

---

For support or issues, check your debug logs or create a support ticket.
