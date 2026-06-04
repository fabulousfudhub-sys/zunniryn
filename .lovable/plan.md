# Zinnuryn Academy — Build Plan

A 22-module school management system is too large for a single turn. I'll ship it in 6 phases. Each phase ends with a working, testable slice. You approve once; we ship phases sequentially.

## Design system (applies to all phases)
- Palette: Emerald Prestige (deep emerald `#064e3b`, emerald `#0d7a5f`, gold `#c9a84c`, cream `#f5f0e0`)
- Typography: serif display (Playfair) + sans body (Inter)
- Generated placeholder logo (academic crest, emerald + gold)
- Sidebar shell layout for all authenticated pages

## Phase 1 — Foundation (this turn)
- Lovable Cloud enabled
- DB: `app_role` enum, `user_roles`, `profiles`, `sessions`, `terms`, `classes`, `arms`, `subjects`, `students`, `class_arms` (with RLS + grants)
- `has_role()`, `has_any_role()` security-definer functions
- Auto-create profile + default role on signup trigger
- Auth (email/password + Google) at `/auth`
- Authenticated layout with sidebar, role-aware nav
- Landing page (school hero, sections, CTA to portal)
- Dashboard stub (role-based welcome)
- Seed data: 3 sections (NUR/PRI/SEC), all classes, arms A–D, default subjects

## Phase 2 — People & academic structure
- Student registration with auto-generated admission number (ZAB/YY/SEC/####)
- Staff management (profile, qualification, employment date, multi-role assignment)
- Subject ↔ class assignment matrix
- Teacher ↔ subject ↔ class+arm assignment (many-to-many)
- Form master assignment
- Bulk teacher assignment

## Phase 3 — Results engine
- Score entry grid (CA1 / CA2 / CA3 / Exam) — teacher sees only their assignments
- Auto-compute total, grade, remark, average, class position
- Configurable grade scale (settings table)
- Result status workflow: draft → submitted → approved → published → locked
- Result locking with override (super admin / exam officer)
- Bulk score upload (Excel/CSV)

## Phase 4 — Output documents & parent access
- Report card (per student per term, PDF export)
- Broadsheet (class results table, PDF + Excel)
- Transcript (full academic history, PDF)
- Scratch card system: generate, list, mark used; parent result lookup by PIN
- Promotion history tracking

## Phase 5 — Operations
- Attendance (student + staff, daily entry, summaries on report card)
- Staff leave (apply / approve / reject)
- Notifications (in-app + result-publication trigger)
- Student documents upload (birth cert, admission letter, etc.) — storage bucket
- Audit log of sensitive actions (score edits, result approvals, unlocks)

## Phase 6 — Admin & analytics
- School settings module (name, acronym, logo, grading scale, scratch card rules)
- Role-based dashboards (Director, Principal, Admission, Exam Officer)
- Backup/restore (super admin)
- Bulk promotion engine (end-of-session)

## Technical notes
- Roles stored in separate `user_roles` table (never on profiles) — prevents privilege escalation
- All policies use `has_role()` security-definer to avoid RLS recursion
- A user can hold multiple roles simultaneously (teacher + form master + exam officer all possible)
- Server functions (`createServerFn`) for all writes; RLS as backstop
- Result locking enforced at both DB trigger and policy level

After you approve, I'll build Phase 1 and report back. Subsequent phases are one prompt each (e.g. "do phase 2").