# Constants & Configuration

This document lists constants and configuration values. Files should live under `src/lib/constants/` and include `admin.ts`, `leads.ts`, `quotes.ts`, `projects.ts`, `invoicing.ts`, `notifications.ts`, `ui.ts`, `materials.ts`, and `index.ts`.

Examples:

ADMIN_ROUTES, PAGINATION, DATE_FORMATS, CURRENCY, PHONE_FORMAT, DEBOUNCE_DELAY.

LEAD_DEFAULTS, LEAD_SCORING_WEIGHTS, LEAD_PIPELINE_STAGES.

QUOTE_DEFAULTS, QUOTE_NUMBER_FORMAT, QUOTE_LINE_ITEM_CATEGORIES, QUOTE_TEMPLATES.

PROJECT_DEFAULTS, PROJECT_NUMBER_FORMAT, PROJECT_MILESTONES, PROJECT_TASK_TEMPLATES.

INVOICE_DEFAULTS, PAYMENT_NUMBER_FORMAT, INVOICE_REMINDERS.

Notification templates and UI constants.

Environment config should be validated in `src/lib/config/env.ts`.

Last Updated: November 14, 2025
Version: 1.0
Status: Complete constants definition
