# Best Practices & Gotchas for Working with the Claude Ecosystem
## Compiled from community learnings, official docs, security research, and real-world failures

*Siddharth — review this list and tell me which ones you want to implement. I've marked each with a priority recommendation and flagged the ones that are critical for your specific setup (Cowork on Windows + financial data + business automation).*

---

## SECTION A: COWORK-SPECIFIC SECURITY (CRITICAL FOR YOU)

These are not theoretical — real exploits have been demonstrated.

### A1. Prompt injection via files — THE #1 RISK
**What happened:** Two days after Cowork launched (Jan 2026), security researchers showed that a Word document with hidden 1-point white text could trick Cowork into uploading sensitive files — including financial documents with partial SSNs — to an attacker's Anthropic account. The attack worked because Cowork's VM whitelists Anthropic's own API.
**Why it matters for you:** You'll be processing bank statements, tax docs, pitch decks, and client briefs.
**Action:** NEVER let Cowork process files from untrusted sources (random email attachments, downloaded PDFs from unknown senders). Create a dedicated "Claude_Workbench" folder and only copy files you trust into it.
**My recommendation:** 🔴 MUST IMPLEMENT

### A2. Create a dedicated working folder — never give broad access
**What it means:** Don't point Cowork at your Documents, Desktop, or Downloads folder. Create a specific folder like `C:\Claude_Workbench\` and copy only the files you want to work on.
**Why:** Cowork can read, write, and permanently delete files in any folder you grant access to. A single bad file in a broad folder can compromise everything else.
**Action:** Create separate sub-folders: `Claude_Workbench\Finance\`, `Claude_Workbench\Work\`, `Claude_Workbench\Content\`
**My recommendation:** 🔴 MUST IMPLEMENT

### A3. Opt out of model training
**What it means:** By default, your data may be used for training unless you opt out. Go to Settings > Privacy in Claude Desktop and toggle off data sharing.
**Why:** Your financial data and business strategy should never train anyone's model.
**Action:** Settings > Privacy > Opt out immediately after installing Claude Desktop.
**My recommendation:** 🔴 MUST IMPLEMENT

### A4. Don't use Chrome extension with sensitive data
**What it means:** The Claude in Chrome extension, when connected to Cowork, can access web content. Web content is the primary vector for prompt injection attacks.
**Official advice:** Anthropic themselves say "we strongly advise against using Claude in Chrome to manage or take actions involving sensitive information."
**Action:** Keep Chrome extension disabled for financial and confidential work. Only enable for low-risk browsing/research tasks.
**My recommendation:** 🔴 MUST IMPLEMENT

### A5. Review Cowork actions — don't auto-approve everything
**What it means:** Cowork shows what it's doing and asks for confirmation before significant actions. Don't just click "Allow" reflexively.
**Why:** The "click Yes to approve" model is the last line of defense. Research shows most users stop reading after the first few prompts.
**Action:** For financial and business tasks, always read the action summary before approving. Watch for: unexpected file access, network requests, or actions you didn't ask for.
**My recommendation:** 🔴 MUST IMPLEMENT

### A6. Be cautious with scheduled tasks
**What it means:** Scheduled tasks run while your desktop is on, but you may not be watching. A prompt injection loop in a scheduled task could run for hours.
**Action:** Start with manual tasks. Only schedule after you've verified a task runs safely multiple times. Never schedule tasks that access financial data unattended.
**My recommendation:** 🟡 IMPLEMENT AFTER INITIAL SETUP

---

## SECTION B: MCP CONNECTOR SAFETY

### B1. Vet every MCP server before connecting
**What it means:** MCP servers are third-party code that runs with system-level access. Two real CVEs (CVE-2025-59536 and CVE-2026-21852) have been patched — one allowed remote code execution, the other API key theft.
**Action:** Before connecting any MCP server: check if it's official (from the tool vendor), check GitHub stars/maintenance, read the permissions it requests.
**My recommendation:** 🔴 MUST IMPLEMENT

### B2. Maintain an MCP allowlist
**What it means:** Only use MCP servers you've explicitly approved. Don't install random community MCPs just because they look useful.
**Action:** Our `_ecosystem-watchlist.md` already handles this. Stick to it.
**My recommendation:** 🔴 MUST IMPLEMENT

### B3. Use minimal scopes on API connections
**What it means:** When connecting Gmail, Sheets, Calendar — request read-only access first. Only add write permissions when a specific automation needs it.
**Why:** If a token is compromised, read-only limits the damage.
**Action:** Start every integration in read-only mode. Upgrade scope per-project as needed.
**My recommendation:** 🟡 IMPLEMENT DURING SETUP

---

## SECTION C: CLAUDE.MD FILE OPTIMIZATION

These are about making Claude work better, not just safer.

### C1. Keep CLAUDE.md under 200 lines
**What the research says:** Frontier models can follow ~150-200 instructions consistently. Claude Code's own system prompt already uses ~50 of those slots. Your CLAUDE.md gets roughly 100-150 slots before compliance drops.
**Why it matters:** Our current claude.md is comprehensive but long. As we add projects, we need to keep the main file lean.
**Action:** Keep the root `claude.md` concise with core principles only. Use `@imports` to link to detailed project docs that load on demand.
**My recommendation:** 🟡 IMPLEMENT WHEN USING CLAUDE CODE

### C2. Use progressive disclosure — don't front-load everything
**What it means:** Instead of putting all instructions in CLAUDE.md, tell Claude how to find information when it needs it. Use `@path/to/file` references.
**Example:** Instead of pasting the entire financial tracker spec in claude.md, write: `For P1 financial tracking details, see @P1-financial-tracking/prd.md`
**Action:** Restructure our claude.md to use @imports for each project domain.
**My recommendation:** 🟡 IMPLEMENT WHEN USING CLAUDE CODE

### C3. Use emphasis for critical rules
**What it means:** Adding "IMPORTANT" or "MUST" or "NEVER" actually improves compliance on critical instructions. Don't overuse it — if everything is important, nothing is.
**Action:** Reserve emphasis for security rules and non-negotiable constraints.
**My recommendation:** 🟢 ALREADY DONE in security section

### C4. CLAUDE.md is advisory, hooks are mandatory
**What it means:** CLAUDE.md instructions are "suggestions" that Claude tries to follow. Hooks are scripts that run automatically at specific points — they're guaranteed to execute regardless of what Claude decides.
**Action:** For must-happen actions (like running security checks, backing up before edits), use hooks instead of relying on CLAUDE.md instructions.
**My recommendation:** 🟡 IMPLEMENT WHEN USING CLAUDE CODE

---

## SECTION D: CONTEXT & TOKEN MANAGEMENT

### D1. One task per session — don't kitchen-sink
**What it means:** Starting with one task, then asking something unrelated, then going back pollutes the context window. Performance degrades.
**Action:** Use `/clear` between unrelated tasks. Keep sessions focused on one domain (finance OR content OR team mgmt, not all three).
**My recommendation:** 🟡 GOOD HABIT TO BUILD

### D2. Plan before executing
**What the data says:** Unguided Claude Code attempts succeed ~33% of the time. Planning first cuts token consumption by ~38% and dramatically improves output quality.
**Action:** Always start complex tasks with "create a plan first, don't implement yet." Review the plan, annotate corrections, then let Claude execute.
**My recommendation:** 🔴 MUST IMPLEMENT for all projects

### D3. Use /compact wisely
**What it means:** When context fills up, Claude auto-summarizes (compacts) past exchanges. But compaction loses nuance. Without CLAUDE.md, your guidelines disappear after compaction.
**Action:** For long sessions, manually trigger `/compact` with specific instructions: `/compact "Preserve the financial tracker architecture decisions and the Google Sheets schema"`
**My recommendation:** 🟡 GOOD HABIT TO BUILD

### D4. Keep sessions under 45 minutes
**What the research says:** 30-45 minute focused sessions produce better results than marathon sessions. Beyond 80% context fill, response quality drops steeply — 45% coherence loss between 80-95% saturation.
**Action:** Break work into focused sprints. Don't try to build an entire automation in one session.
**My recommendation:** 🟡 GOOD HABIT TO BUILD

---

## SECTION E: COWORK PROJECT STRUCTURE

### E1. Use Cowork Projects (just launched) for each domain
**What it is:** Cowork now supports "Projects" — persistent workspaces with their own files, instructions, and memory.
**Action:** Create one Cowork Project per automation domain: P1-Finance, P2-Team, P3-Content, P4-Email, P5-Intel. Each gets its own folder, instructions, and context.
**My recommendation:** 🔴 MUST IMPLEMENT

### E2. Write folder-specific instructions
**What it means:** Each Cowork project folder can have its own instruction file that loads automatically when you work in that folder.
**Action:** Create a `COWORK_INSTRUCTIONS.md` in each project folder with domain-specific rules (e.g., the finance folder gets extra security rules about data handling).
**My recommendation:** 🟡 IMPLEMENT DURING SETUP

### E3. Use SKILL.md files for reusable workflows
**What it means:** Skills are reusable instruction sets that Claude applies automatically when relevant. Instead of re-explaining how to format a pitch deck every time, create a skill for it.
**Action:** As we build automations, extract repeating patterns into skills: `pitch-deck-creator`, `expense-parser`, `linkedin-post-drafter`, etc.
**My recommendation:** 🟡 IMPLEMENT AS WE BUILD

---

## SECTION F: BMAD METHOD INTEGRATION

### F1. Use BMAD for structured project planning
**What it means:** Instead of ad-hoc "build me a thing" prompts, use BMAD's structured flow: Business Analyst → Product Manager → Architect → Scrum Master → Developer.
**Why for you:** You want PRDs and architecture docs for every project. BMAD generates these as part of its workflow.
**Action:** Install BMAD (`npx bmad-method install`), use the `/product-brief` and `/prd` commands to kick off each project.
**My recommendation:** 🟡 IMPLEMENT FOR P1 PROJECT

### F2. Use BMAD's scale-adaptive intelligence
**What it means:** BMAD auto-adjusts planning depth based on project complexity. A simple automation gets a lightweight tech spec. A complex system gets a full PRD + architecture.
**Action:** Let BMAD assess each project's complexity level before deciding documentation depth.
**My recommendation:** 🟢 NICE TO HAVE

---

## SECTION G: BACKUP & RECOVERY

### G1. Keep backups of everything Cowork touches
**What it means:** Cowork can modify and delete files. Always maintain backups outside the working folder.
**Action:** Set up a simple backup routine: before any major Cowork task, copy the working folder to a `_backups/` directory with a date stamp.
**My recommendation:** 🔴 MUST IMPLEMENT

### G2. Use Git for version control on scripts and configs
**What it means:** Every script, automation config, and template should be version-controlled so you can roll back if something breaks.
**Action:** Initialize a private Git repo for the automation-projects folder. Commit after every successful change.
**My recommendation:** 🟡 IMPLEMENT DURING SETUP

### G3. Keep Claude Desktop updated
**What it means:** Multiple high-severity CVEs have been patched in 2025-2026. Running outdated versions means running with known vulnerabilities.
**Action:** Enable auto-updates on Claude Desktop. Check for updates weekly.
**My recommendation:** 🔴 MUST IMPLEMENT

---

## SECTION H: COST MANAGEMENT

### H1. Understand what costs what
**What it means:** Cowork consumes more usage than standard chat. Complex multi-step tasks burn through your allocation fast.
**Current pricing:** Pro ($20/mo) has lower limits. Max ($100-200/mo) gives more headroom. Output tokens cost 5x more than input tokens.
**Action:** Start on Pro, monitor usage for 2 weeks, upgrade to Max if hitting limits regularly.
**My recommendation:** 🟡 MONITOR AND DECIDE

### H2. Use Plan mode to reduce token waste
**What it means:** Having Claude plan before executing saves ~38% tokens. Each rejected-and-retried implementation burns 2,000-5,000 tokens.
**Action:** For any task involving multiple files or steps, always start with: "Plan this out first, don't implement yet."
**My recommendation:** 🔴 MUST IMPLEMENT

---

## SUMMARY — QUICK REFERENCE

### 🔴 MUST IMPLEMENT (do before building anything)
1. Create dedicated Claude_Workbench folder with sub-folders per domain
2. Opt out of model training (Settings > Privacy)
3. Never process untrusted files through Cowork
4. Disable Chrome extension for sensitive work
5. Read Cowork action summaries before approving
6. Vet every MCP server before connecting
7. Always plan before executing
8. Keep backups of everything Cowork touches
9. Keep Claude Desktop updated
10. Use Plan mode to save tokens

### 🟡 IMPLEMENT DURING SETUP
11. Set up Cowork Projects per domain
12. Write folder-specific instructions
13. Use minimal API scopes (read-only first)
14. Restructure claude.md with @imports for progressive disclosure
15. Use hooks for mandatory actions
16. Set up Git version control
17. Build one-task-per-session habit
18. Use /compact with specific preservation instructions
19. Install BMAD for P1 project

### 🟢 NICE TO HAVE / AS WE BUILD
20. Extract reusable Skills from repeated workflows
21. Use BMAD's scale-adaptive planning
22. Keep sessions under 45 minutes
23. Monitor usage and optimize subscription tier
