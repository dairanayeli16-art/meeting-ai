# DDC Global Technology — Diagnosis Form + Supabase Integration

## ✅ What's been done

1. **Installed Supabase** (`@supabase/supabase-js`) in `/web`
2. **Created Supabase client** at `web/src/lib/supabaseClient.js` (reads from environment variables)
3. **Enhanced DDCLandingPage.jsx** with:
   - **DiagnosisForm component** (3-step form)
   - **Form state management** (all fields from your database table)
   - **Supabase integration** on submit
   - **Validation & error handling** with user feedback
   - **Success confirmation screen** (auto-redirects)
   - **Navbar link** to the diagnosis form

4. **Created .env.example** with required variables

---

## 🔧 Setup Instructions

### Step 1: Add Environment Variables

Create a `.env.local` file in `/web` folder:

```bash
cd /Users/dairadedios/meeting-ai/web
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
EOF
```

**Get these values from Supabase:**
- Go to https://supabase.com → your project → Settings → API
- Copy:
  - `Project URL` → `VITE_SUPABASE_URL`
  - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### Step 2: Test Locally

```bash
cd /Users/dairadedios/meeting-ai/web
npm run dev
```

Visit `http://localhost:5173` → Click **"Diagnóstico"** or **"Diagnosis"** in navbar

### Step 3: Submit a Test Form

1. Fill in all fields (Step 1)
2. Select options (Step 2)
3. Check automation goals (Step 3)
4. Click **"Enviar diagnóstico"** / **"Submit diagnosis"**

Check browser console (F12) for logs:
- `📝 Submitting diagnosis form:` — data being sent
- `✅ Supabase insert success:` — saved to DB
- `❌ Supabase insert error:` — debug any issues

### Step 4: Verify in Supabase

Open Supabase → SQL Editor → Run:

```sql
SELECT
  created_at,
  business_name,
  email,
  full_phone,
  main_problem,
  automation_goals,
  lead_score,
  status
FROM public.personalised_diagnosis_submissions
ORDER BY created_at DESC
LIMIT 5;
```

You should see your test submission.

---

## 📋 Form Fields Mapped to Database

| Form Field | Database Column | Type | Required |
|---|---|---|---|
| Business Name | `business_name` | text | ✅ Yes |
| Your Name | `contact_name` | text | ❌ No |
| Email | `email` | text | ❌ No |
| Phone Country Code | `phone_country_code` | text | ✅ Yes |
| Phone Number | `phone_number` | text | ✅ Yes |
| Full Phone (auto-combined) | `full_phone` | text | ✅ Auto |
| Website | `website` | text | ❌ No |
| Main Problem | `main_problem` | text | ✅ Yes |
| Current Process | `current_process` | text | ✅ Yes |
| Response Time | `response_time` | text | ❌ No |
| Missed Leads | `missed_leads_estimate` | number | ❌ No |
| Automation Goals (checkboxes) | `automation_goals` | jsonb | ✅ Yes (≥1) |
| Preferred Contact | `preferred_contact_method` | text | ❌ No |
| Language | `language` | text | ✅ Auto (es/en) |
| Lead Score | `lead_score` | number | ✅ Auto (0-10) |
| Status | `status` | text | ✅ Auto ("new") |
| Raw Answers (full form JSON) | `raw_answers` | jsonb | ✅ Auto |
| Timestamp | `created_at` | timestamp | ✅ Auto |

---

## 🔍 Troubleshooting

### Form submissions not saving?

**Check 1:** Environment variables set correctly?
```bash
cat web/.env.local
```

**Check 2:** Supabase credentials valid?
- Open browser console (F12)
- Look for error messages starting with `❌`
- Check if Supabase URL/key are accessible

**Check 3:** Database table exists?
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'personalised_diagnosis_submissions';
```

**Check 4:** Row-level security (RLS)?
- Go to Supabase → Auth → Policies
- Ensure `personalised_diagnosis_submissions` table allows **anon inserts**
- Add policy if needed:
  ```sql
  CREATE POLICY "Allow anonymous inserts" ON personalised_diagnosis_submissions
  FOR INSERT WITH CHECK (true);
  ```

### Validation errors?

The form checks:
- **Step 1:** Business name & phone must be filled
- **Step 2:** Main problem & current process must be selected
- **Step 3:** At least 1 automation goal must be checked

### Success but no data in DB?

1. Check `raw_answers` column — full form data is stored there
2. Run the SELECT query above with `ORDER BY created_at DESC`
3. Open the `raw_answers` JSON to see full submission

---

## 🚀 Deployment to Lovable

1. Copy the entire `/DDCLandingPage.jsx` file content
2. In Lovable editor:
   - Replace `App.jsx` with the code
   - Make sure Tailwind CSS is enabled (it should be by default)
3. Add environment variables in Lovable settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## 📊 Browser Console Debugging

The form logs everything:

```js
// Step 1: Form submitted
console.log("📝 Submitting diagnosis form:", submissionData);

// Step 2: Success
console.log("✅ Supabase insert success:", data);

// Step 3: Error
console.error("❌ Supabase insert error:", error);
console.error("💥 Form submission error:", err);
```

Monitor these in DevTools (F12 → Console) while testing.

---

## 🔐 Security Notes

✅ **Done correctly:**
- Only **anon key** used in frontend (not service role key)
- Environment variables never committed to git
- Supabase client validates credentials on load

✅ **Add to .gitignore** (already should be):
```
web/.env.local
web/.env
```

---

## 📝 Files Modified/Created

- ✅ `DDCLandingPage.jsx` — Enhanced with DiagnosisForm component
- ✅ `web/src/lib/supabaseClient.js` — New Supabase client
- ✅ `web/.env.example` — Example environment variables
- ✅ `web/package.json` — Updated (Supabase added)

---

## ✨ Next Steps

1. Set `.env.local` with your Supabase credentials
2. Test locally (`npm run dev`)
3. Submit a test form and verify it appears in Supabase
4. Deploy to Lovable with the same `.env` values
5. Share the diagnosis form link with visitors

---

## 💬 Form Features

- ✅ **Bilingual** (Spanish/English toggle in navbar)
- ✅ **3-step flow** with progress bar
- ✅ **Form validation** with error messages
- ✅ **Auto-phone formatting** (combines country code + number)
- ✅ **Auto-lead-scoring** (0-10 based on answers)
- ✅ **Success confirmation** (5-second display before reset)
- ✅ **Full data capture** (all answers stored in `raw_answers` JSON)
- ✅ **Error handling** (shows user-friendly messages + console logs)

---

Questions? Check the console logs first — they tell you exactly what went wrong.
