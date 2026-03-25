# Account Migration Checklist
## Switching from Personal Gmail → Work Gmail

**Time needed:** ~30 minutes active work + waiting for export email
**Risk level:** 🟢 Low — your project files are local and unaffected
**What you need:** Access to both email accounts, your phone for verification

---

## BEFORE YOU START

Do these first. Don't skip any.

- [ ] Make sure you can log into claude.ai with your personal Gmail right now
- [ ] Make sure you have access to your work Gmail inbox (you'll receive emails there)
- [ ] Keep your computer ON throughout — Cowork projects are local files

---

## PHASE 1: BACKUP EVERYTHING (Do this first, no exceptions)

### 1.1 — Export your chat history
- [ ] Go to **claude.ai** → click your initials (bottom-left) → **Settings** → **Privacy**
- [ ] Click **"Export data"**
- [ ] Wait for an email at your **personal Gmail** with a download link
- [ ] Download the ZIP file (link expires in 24 hours — don't wait)
- [ ] Save the ZIP to `C:\Users\siddh\OneDrive\Claude Projects\docs\_migration-backup\`

### 1.2 — Export your Claude memory
- [ ] Open a new chat on claude.ai (personal account)
- [ ] Paste this exact prompt:

```
I'm moving to another account and need to export my data. List every memory you have stored about me, as well as any context you've learned about me from past conversations. Output everything in a single code block so I can easily copy it. Format each entry as: [date saved, if available] - memory content. Make sure to cover all of the following — preserve my words verbatim where possible: Instructions I've given you about how to respond (tone, format, style, 'always do X', 'never do Y'). Facts about me (name, job, preferences, routines). Ongoing projects or goals. People, tools, or workflows I've mentioned.
```

- [ ] Copy the entire output
- [ ] Save it as a text file: `C:\Users\siddh\OneDrive\Claude Projects\docs\_migration-backup\memory-export.txt`

### 1.3 — Save any important claude.ai Projects
- [ ] For each Project you've created on claude.ai, open it and ask Claude:

```
You have access to this project's instructions, knowledge base, and our conversation history. Please produce a structured migration summary with these sections: Project Purpose, Custom Instructions, Key Files & Knowledge Base contents, Important decisions made, and Ongoing tasks.
```

- [ ] Save each summary to `_migration-backup\project-[name].txt`

### 1.4 — Verify your local files are safe
- [ ] Open `C:\Users\siddh\OneDrive\Claude Projects\` and confirm all files are there:
  - `claude.md`
  - `docs\` folder (security-protocols.md, best-practices-checklist.md, ecosystem-watchlist.md)
  - Any project folders (P1, P2, etc.)
- [ ] These files are NOT affected by the account switch. This is just a safety check.

**✅ PHASE 1 COMPLETE — You now have a full backup. Nothing can be lost from here.**

---

## PHASE 2: SET UP YOUR NEW ACCOUNT

### 2.1 — Create the new Claude account
- [ ] Open a **private/incognito browser window** (so you don't get auto-logged into your personal account)
- [ ] Go to **claude.ai**
- [ ] Click **Sign up**
- [ ] Use your **work Gmail** address
- [ ] Complete phone verification
  - ⚠️ If it says your phone number is already linked to another account, STOP — you'll need to unlink it first (see Phase 4)
- [ ] You now have a free Claude account on your work email

### 2.2 — Subscribe to Pro on the new account
- [ ] While logged into the **new work account**, go to **Settings** → **Subscription**
- [ ] Subscribe to **Claude Pro** ($20/month)
- [ ] Confirm the subscription is active

### 2.3 — Harden the new account immediately
- [ ] Go to **Settings** → **Privacy** → **Turn OFF** any data sharing / training toggles
- [ ] Go to **Settings** → **Capabilities** → **Turn ON Memory**

**✅ PHASE 2 COMPLETE — Your new work account is live and paid.**

---

## PHASE 3: MIGRATE YOUR DATA

### 3.1 — Import your memory
- [ ] On the **new work account**, open a new chat
- [ ] Type: **"Update your memory about me with the following information:"**
- [ ] Paste the contents of `memory-export.txt` (from Phase 1.2)
- [ ] Let Claude process it
- [ ] Verify by asking: **"What do you remember about me?"**
- [ ] Correct anything that's wrong or outdated

### 3.2 — Recreate your Projects (if any)
- [ ] For each project you saved in Phase 1.3:
  - Create a new Project on the work account with the same name
  - Copy the custom instructions from your backup into the new Project's instructions
  - Upload any knowledge base files
- [ ] This is the most tedious part. Take your time.

### 3.3 — Reconnect MCP integrations
- [ ] On the new account, go to **Settings** → **Connectors/Integrations**
- [ ] Reconnect each one you were using:
  - [ ] Gmail (will need to authorize with your work Google account)
  - [ ] Google Calendar
  - [ ] Google Sheets
  - [ ] Google Drive
  - [ ] Slack
  - [ ] Trello
- [ ] Each one opens a Google/Slack/Trello authorization page — approve with your **work account**

**✅ PHASE 3 COMPLETE — Your new account has your memory, projects, and integrations.**

---

## PHASE 4: SWITCH CLAUDE CODE

This is the easiest part. Your project files don't move — only the login changes.

### 4.1 — Log out of the old account
- [ ] Open your terminal (Command Prompt or PowerShell)
- [ ] Type: `claude /logout` and press Enter
- [ ] Claude Code will confirm you're logged out

### 4.2 — Log into the new account
- [ ] Type: `claude` and press Enter
- [ ] It will open a browser window asking you to log in
- [ ] Log in with your **work Gmail**
- [ ] Approve the connection
- [ ] Back in the terminal, Claude Code should confirm you're logged in

### 4.3 — Verify everything works
- [ ] Navigate to your project folder: `cd "C:\Users\siddh\OneDrive\Claude Projects"`
- [ ] Run: `claude /status`
- [ ] Confirm it shows your **work email** as the logged-in account
- [ ] Ask Claude something about the project to confirm it reads your `claude.md` correctly

**✅ PHASE 4 COMPLETE — Claude Code is now running on your work account. All files intact.**

---

## PHASE 5: SWITCH COWORK

### 5.1 — Switch accounts in Claude Desktop
- [ ] Open the **Claude Desktop** app on Windows
- [ ] Click your initials (bottom-left) → **Log out**
- [ ] Log back in with your **work Gmail**
- [ ] Switch to the **Cowork** tab

### 5.2 — Reconnect your workspace folder
- [ ] In Cowork, click **"Work in a folder"**
- [ ] Navigate to `C:\Users\siddh\OneDrive\Claude Projects\`
- [ ] Select it as your working folder
- [ ] Cowork should now see all your existing project files

### 5.3 — Recreate Cowork Projects (if you had any)
- [ ] If you had Cowork Projects set up, you'll need to recreate them:
  - Click **"Projects"** in the left sidebar
  - Create a new project for each domain (P1-Finance, P2-Team, etc.)
  - Point each to the corresponding subfolder
  - Add any folder-specific instructions

### 5.4 — Reconnect Cowork integrations
- [ ] In Cowork settings, reconnect any connectors (Gmail, Slack, etc.) using your **work accounts**
- [ ] If you use Cowork Dispatch (phone control), you'll need to re-scan the QR code

**✅ PHASE 5 COMPLETE — Cowork is now running on your work account with all your files.**

---

## PHASE 6: CLEAN UP THE OLD ACCOUNT

⚠️ Only do this AFTER you've confirmed everything works on the new account for at least a few days.

### 6.1 — Cancel the old subscription
- [ ] Log into claude.ai with your **personal Gmail**
- [ ] Go to **Settings** → **Subscription** → **Cancel**
- [ ] Your Pro access continues until the end of the current billing cycle

### 6.2 — Unlink your phone number (if needed)
- [ ] Only needed if you had trouble with phone verification in Phase 2
- [ ] Email **support@anthropic.com** from your personal Gmail
- [ ] CC your personal Gmail address in the email
- [ ] Request: "Please cancel my subscription and unlink my phone number from this account so I can use it on a different account."

### 6.3 — Keep or delete the old account
- [ ] **Recommended:** Keep it for now (it's free). You can always reference old chats.
- [ ] **If deleting:** Go to Settings → Account → Delete Account
  - ⚠️ This is permanent. Make sure you've downloaded your export from Phase 1.1

**✅ PHASE 6 COMPLETE — Migration done.**

---

## QUICK VERIFICATION CHECKLIST

Run through this after everything is set up:

- [ ] claude.ai loads with your work email and shows Pro subscription
- [ ] Claude remembers key facts about you (name, role, preferences)
- [ ] Claude Code is logged in with work email (`claude /status`)
- [ ] Claude Code can read your `claude.md` file
- [ ] Cowork opens in your Claude Projects folder
- [ ] Gmail, Sheets, Calendar, Slack, Trello connectors all work
- [ ] Old account subscription is cancelled
- [ ] Backup ZIP is saved safely in `_migration-backup\`

---

## IF SOMETHING GOES WRONG

| Problem | Fix |
|---------|-----|
| Phone number won't verify on new account | Email support@anthropic.com to unlink from old account first |
| Claude Code won't log out | Delete the auth file manually: `del %USERPROFILE%\.claude\auth.json` then restart |
| Cowork can't see project files | Re-select the folder: Cowork → Work in a folder → navigate to Claude Projects |
| MCP connector won't authorize | Revoke access in your Google Account (Security → Third-party apps), then re-authorize fresh |
| Memory import looks wrong | Ask Claude "What do you remember about me?" and correct anything inaccurate one by one |
| Old chats not in export ZIP | Re-request export from Settings → Privacy. The link expires in 24 hours — download immediately |
