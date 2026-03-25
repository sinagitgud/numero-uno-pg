# Security Protocols & Compliance — Detailed Reference

*This document is @imported by claude.md when security context is needed. It contains the full security framework, compliance requirements, and checklists.*

---

## Compliance Frameworks

| Framework | Applicability | Key Requirements |
|-----------|--------------|------------------|
| India IT Act (2000) + DPDP Act (2023) | Primary — India-based | Lawful processing, purpose limitation, data minimization, consent, breach notification |
| GDPR (EU) | If EU data subjects involved | Consent, right to erasure, data portability, breach notification within 72 hours |
| Global best practices | All projects | Encryption at rest/in transit, access control, audit trails, data retention limits |

---

## Cowork-Specific Security

### Known Attack Vectors (as of March 2026)
- **Prompt injection via files**: Hidden text in Word/PDF docs can instruct Cowork to exfiltrate files via Anthropic's whitelisted API. Partially patched Feb 2026, core issue remains.
- **Chrome extension manipulation**: Web content can inject prompts when Chrome extension is connected to Cowork.
- **MCP supply chain**: CVE-2025-59536 (RCE via malicious hooks, CVSS 8.7) and CVE-2026-21852 (API key theft, CVSS 5.3) both patched, but pattern persists.
- **Session memory exposure**: Long-running sessions accumulate sensitive data that could be extracted if compromised.
- **Approval blindness**: Non-technical users instinctively approve all actions to make progress. This bypasses every other security layer. Mitigated by the Approval Explainer Protocol in claude.md — Claude must explain every action in plain English with risk level before requesting approval.

### Cowork Hardening Checklist
- [ ] Settings > Privacy > Opt out of training data
- [ ] Workspace limited to `C:\Users\siddh\OneDrive\Claude Projects\` only
- [ ] Chrome extension disabled for financial/business work
- [ ] Auto-updates enabled for Claude Desktop
- [ ] No scheduled tasks touching financial data without prior manual verification
- [ ] All file processing limited to trusted, known-source files only
- [ ] Approval Explainer Protocol active in claude.md (never approve without understanding)

---

## Data Storage Rules

- Financial data, passwords, API keys, tokens: NEVER in plaintext
- Google Sheets/Docs with financial or business data: "Restricted" sharing only (Siddharth's account, no link sharing)
- Financial documents processed locally via Cowork, not uploaded to cloud unless encrypted
- Bank account numbers, PAN, Aadhaar, credit card numbers, passwords: NEVER in Claude conversations — use masked references

---

## API & Credential Management

- API keys/tokens: `.env` files (gitignored) or Google Apps Script PropertiesService
- Every integration starts read-only; write access added per-project with documented justification
- Token expiry dates documented; calendar reminders for rotation
- Tokens revoked immediately when a tool is decommissioned

---

## MCP Server Vetting Process

Before connecting ANY new MCP server:
1. Document: what data it accesses, permissions required, maintainer, official vs community
2. Check: GitHub stars, last update date, open issues, known CVEs
3. Assess: Does data leave India? What's the fallback if it breaks?
4. Log in `ecosystem-watchlist.md` with full assessment
5. Siddharth approves before connection

---

## Input Validation & Code Safety

- All external input (email parsing, form submissions, webhooks) must be sanitized and validated
- Bank SMS/email parsing: strict regex pattern matching only — never execute or eval message content
- Scripts NEVER use `eval()`, `Function()`, or any dynamic code execution on external data
- All npm/pip/GAS dependencies checked for known vulnerabilities before adoption
- All automations fail safely — failed API calls never expose credentials in error messages or logs

---

## Audit & Monitoring

- Every automated action logged: timestamp, action type, trigger source
- Weekly security review flags: new permissions, unexpected data access, failed auth attempts
- Each project's `changelog.md` serves as audit trail (append-only, dated, attributed)

---

## Incident Response

If unauthorized access, data exposure, or suspicious tool behavior occurs:
1. **Immediate**: Revoke affected API tokens/permissions
2. **Document**: Log in project `changelog.md` with full details
3. **Assess**: Scope of affected data
4. **Notify**: Alert Siddharth with plain-language summary + recommended actions
5. **Remediate**: Fix vulnerability, update protocols, document lessons learned

---

## Pre-Launch Security Checklist

Every project MUST pass before going live:

```
[ ] No hardcoded credentials in any file
[ ] All sensitive data storage is restricted/encrypted
[ ] API permissions are minimal (read-only where possible)
[ ] Input validation on all external data
[ ] Error messages don't expose sensitive info
[ ] Google Workspace files set to restricted sharing
[ ] MCP connectors reviewed and approved
[ ] Third-party dependencies audited
[ ] Logging active for all automated actions
[ ] Incident response plan documented
[ ] Backups created before launch
[ ] Siddharth has reviewed and approved
```
