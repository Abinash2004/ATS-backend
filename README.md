# Attendance & Payroll Tracking System (Backend)

A backend-only system for attendance, leave, and payroll processing.  
Built incrementally. Stress-tested by edge cases. Broken early. Fixed properly.

---

## What This Is

A backend that treats attendance and payroll as stateful systems, not CRUD screens.  
It models shifts, time, leaves, and compensation with rule-first logic, strict role separation, and no expectation of manual fixes.

Midnight shifts, fractional workdays, dynamic salary formulas, penalties, bonuses, advances, EPF policies, and custom payroll periods are first-class concerns, not afterthoughts.  
Payroll runs are deterministic, transactional, and queue-driven designed to complete once and remain correct.

---

## Tech Stack

- **Node.js + TypeScript**
- **Express**
- **MongoDB (Mongoose)**
- **Redis** (caching + queues)
- **BullMQ**
- **Socket.IO**
- **PDFKit** (pay silp generation)
- **XLSX** (attendance sheet generation)

---

## Core Features

- Shift-aware attendance lifecycle with midnight safety and idempotent regeneration
- Event-driven time tracking with second-level precision and rule enforcement
- Policy-first leave system with fractional support and time-bound limits
- Fully dynamic, formula-based salary templates with runtime validation
- Rule-driven penalties, bonuses, and advance payroll handling
- EPF calculation with caps, reconciliation, and visibility
- Queue-driven, transactional payroll execution with rollback safety
- Overtime and leave deductions synced to shifts and attendance fractions
- Deterministic payroll outputs with PDF slips and Excel reports
- Strict RBAC with role-scoped events and encrypted authentication
- Indexed queries and Redis caching for payroll-scale performance

---

## Scripts

```bash
npm run dev     # development
npm run build   # compile TypeScript
npm start       # run compiled build
