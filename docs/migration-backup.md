# Migration Backup — Claude Memory & Session Export
## Exported: 2026-03-21
## Source: Personal Gmail account (pre-migration)

---

## SECTION 1: CLAUDE'S MEMORY OF SIDDHARTH

### Identity & Role
- Name: Siddharth
- Lives in: Noida, India
- CEO of Max Level, SVP at NODWIN Gaming
- Co-founded AFK Gaming and Max Level — both acquired by NODWIN Gaming in Jan 2025
- Team size ~20 at Max Level
- Key clients: ASUS, OnePlus, Red Bull, EWCF
- Mission: building one of the largest gaming/youth entertainment companies globally
- Responsible for revenue building and growth strategy

### Family
- Married, lives with wife, mother, sister, and a golden retriever
- Father lives in a different city (parents divorced 2012) — relationship is distant, fulfills financial/health duties only
- Core value: family above all

### Financial Goals
- Big house on owned land
- Spectacular wedding for sister
- Comfortable retirement for both parents
- Frequent vacations with wife
- Financial safety net corpus
- Funds for future children
- Spender by nature, actively working on financial discipline

### Personality & Working Style
- Big picture thinker, gut-first decision maker who validates with data
- Not detail-oriented — relies on team for execution
- Thinks/communicates better in writing
- Prefers bullet points, concise briefs, no fluff
- Lead with the answer, then explain
- Treat as an equal — sharp, self-aware, no hand-holding on decisions
- Has acknowledged having an ego — became aware post-acquisition
- Navigating corporate politics and establishing himself in NODWIN ecosystem as SVP
- NOT a coder — doesn't understand technical jargon, terminal commands, or code syntax
- Instinctively approves technical prompts without reading them (acknowledged risk)

### Primary Motivation
- Money and financial security (humble background, wants luxury life for family)
- Secondary: genuine love for the hustle
- Pragmatic about money, honest and direct, rock-solid boundaries
- No moralizing needed — he's self-aware

### Interests
- Gaming: CS, Valorant, Mobile Legends, BGMI, indie mobile games (Monument Valley)
- Tech/gadgets (guilty pleasure)
- AI: learning Claude Code + BMAD stack, wants AI-dependent systems
- Home automation, world politics
- Comfort food: pasta, momos, rajma rice
- Unwinds with friends daily, trips with family/friends

### Communication Preferences
- Bullet points, concise briefs, no fluff
- Lead with the answer, then explain
- Help build systems, not just answers
- Wants regular curated industry briefings: gaming, esports, youth entertainment, creator economy, AI trends
- Info diet currently via network, Instagram, LinkedIn — acknowledges it's insufficient

### 5-Year Vision
- Mature, professionally driven, commands respect, no-BS
- Superficially knowledgeable on most topics + deeply on some
- Ocean of love for friends/family
- Working on: daily routine/discipline, work-life separation, deep AI integration, managing ego, financial discipline

---

## SECTION 2: ENVIRONMENT & TOOLS

| Category | Tool |
|----------|------|
| OS | Windows (personal + work) |
| Mobile | Android |
| Email | Gmail (work/NODWIN) |
| Calendar | Google Calendar |
| Spreadsheets | Google Sheets (manual finance tracking) |
| Chat (work) | Slack |
| Chat (informal) | WhatsApp |
| Project management | Trello |
| Content | LinkedIn, pitch decks, internal briefs |
| Finance | Mix of UPI, cards, cash, bank transfers |
| Automation level | Zero — everything is manual (starting from scratch) |

---

## SECTION 3: WHAT WE BUILT IN THIS SESSION

### Files Created (all in C:\Users\siddh\OneDrive\Claude Projects\)

1. **claude.md** — Master automation foundation file (115 lines, optimized for <200 line limit)
   - Identity, environment, security rules, approval explainer protocol
   - Project structure, automation domains P1-P5, MCP connector list
   - Documentation rules, ecosystem awareness, rollout plan

2. **docs/security-protocols.md** — Detailed security & compliance reference
   - Known attack vectors (prompt injection, Chrome extension, MCP supply chain CVEs)
   - Cowork hardening checklist
   - Data storage rules, API/credential management
   - MCP vetting process, input validation rules
   - Incident response protocol, pre-launch security checklist

3. **docs/best-practices-checklist.md** — 23-item research-backed checklist
   - 8 categories: Cowork security, MCP safety, CLAUDE.md optimization, context management, project structure, BMAD integration, backup/recovery, cost management
   - Prioritized: 🔴 MUST IMPLEMENT / 🟡 DURING SETUP / 🟢 NICE TO HAVE

4. **docs/ecosystem-watchlist.md** — Plugin & tool evaluation tracker
   - 5 tools on watchlist: BMAD Method v6, Inbox Zero MCP, qmd, Cowork Projects, Cowork Dispatch
   - Discovery sources documented (mcp.so, awesome-mcp-servers, Smithery, etc.)

5. **docs/account-migration-checklist.md** — 6-phase migration guide
   - Phase 1: Backup, Phase 2: New account, Phase 3: Migrate data
   - Phase 4: Switch Claude Code, Phase 5: Switch Cowork, Phase 6: Cleanup
   - Troubleshooting table included

### Key Decisions Made

1. **Architecture**: 4-layer automation system (Data Sources → Engine → Domains → Outputs)
2. **Priority order**: P1 Financial Tracking → P2 Team Management → P3 Content → P4 Email → P5 Intelligence
3. **Google ecosystem first**: Default to Google Workspace tools for persistence
4. **Build full, ship together**: Not incremental — build complete system then launch
5. **Claude does all work**: Siddharth reviews and approves, never codes or configures
6. **Progressive disclosure for CLAUDE.md**: Lean core file (<200 lines) + @imported detailed docs
7. **Dedicated workspace**: Cowork only accesses `C:\Users\siddh\OneDrive\Claude Projects\`
8. **Approval Explainer Protocol**: Every action explained in plain English with traffic-light risk levels before approval
9. **Financial data via Google Sheets (cloud, restricted)**: Not local files, to reduce Cowork attack surface
10. **10-week phased rollout**: Foundation → Finance → Team → Content/Email → Intelligence

### What's Still Pending

- [ ] Complete account migration (personal → work Gmail) — IN PROGRESS
- [ ] Phase 1: Connect MCP connectors (Gmail, Sheets, Calendar, Slack, Trello, Drive)
- [ ] Phase 1: Set up Cowork on Windows with Projects per domain
- [ ] Phase 1: Install and configure Claude Code
- [ ] Phase 1: Set up master Google Sheet as data hub
- [ ] Phase 2: Build P1 Financial Tracking system
- [ ] Install BMAD Method for structured project planning
- [ ] Create Cowork Projects for each domain (P1-P5)
- [ ] Set up Git version control for automation-projects folder

---

## SECTION 4: INSTRUCTIONS FOR CLAUDE (Import into new account)

Paste the following into a new chat on the work account to restore context:

```
Update your memory about me with the following:

- My name is Siddharth. I live in Noida, India. Married, live with wife, mother, sister, and golden retriever. Father lives separately (divorced 2012).
- I'm CEO of Max Level and SVP at NODWIN Gaming. Team of ~20. Key clients: ASUS, OnePlus, Red Bull, EWCF. Mission: building one of the largest gaming/youth entertainment companies globally.
- Primary motivation: money and financial security. Humble background, want luxury life for family. Secondary: love for the hustle.
- I am NOT a coder. I don't understand technical jargon. Everything must be explained in plain English. I instinctively approve technical prompts without reading them — Claude must use the Approval Explainer Protocol (plain English, traffic-light risk levels) for every action needing approval.
- Communication style: bullet points, no fluff, lead with the answer. I think better in writing. Build me systems, not one-off answers. Treat me as an equal — sharp and self-aware.
- Financial goals: big house on owned land, sister's wedding, parent retirement funds, vacations with wife, safety net corpus, future children funds. Spender by nature, working on discipline.
- Interests: gaming (CS, Valorant, BGMI, Mobile Legends), tech/gadgets, AI (learning Claude Code + BMAD), home automation, world politics, comfort food (pasta, momos, rajma rice).
- I want regular curated industry briefings: gaming, esports, youth entertainment, creator economy, AI trends.
- Environment: Windows, Android, Gmail (work), Google Calendar, Google Sheets, Slack, Trello, WhatsApp.
- I'm building a full automation system using Claude Code + Cowork. All project files are in C:\Users\siddh\OneDrive\Claude Projects\ with a claude.md master file. 5 automation domains: P1 Financial Tracking, P2 Team Management, P3 Content Creation, P4 Email & Comms, P5 Industry Intelligence.
- Everything is strictly confidential. Nothing gets shared or published without my explicit permission.
- 5-year vision: mature, professionally driven, commands respect, superficially knowledgeable on most topics + deeply on some, ocean of love for family/friends. Working on: daily routine, work-life separation, deep AI integration, managing ego, financial discipline.
```

---

*This file was auto-generated during the migration session on 2026-03-21. Store permanently in C:\Users\siddh\OneDrive\Claude Projects\docs\_migration-backup\*
