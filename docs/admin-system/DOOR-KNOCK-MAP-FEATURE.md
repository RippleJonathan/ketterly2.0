Agent Prompt: Full-Stack Door-Knocking Feature (CRM Add-On)
Objective: Develop a complete, full-stack "Door-Knocking" module as a premium, toggleable add-on feature for the existing CRM. The solution must integrate seamlessly with the existing architecture and database hosted on Vercel/Supabase.

1. Technology and Environment:

Front-end: React, styled with Tailwind CSS.

Back-end: Node.js/Express conventions, optimized for Vercel deployment.

Database: PostgreSQL (Supabase). Must use the PostGIS extension for spatial queries (territories).

Mapping: Google Maps API for display, Geo-coding, and drawing tools (for admin territory management).

2. Architecture and Data Integration (Refer to Migration Files):

Schema Discovery: CRITICAL: Analyze the provided migration files to determine the exact names for:

User Table: Determine the table name and the column used for identifying roles (rep, admin).

Company Table: Determine the table name.

Lead/Prospect Table: Determine the table name and the existing lead_source column name.

Feature Flag: Add a boolean column named door_knock_enabled to the Company Table (discovered above).

User Assignment: When a pin is dropped, the current authenticated user's ID must be automatically linked to the new pin/lead.

3. New Database Schemas (PostgreSQL/PostGIS):

territories Table:

id (PK), company_id (FK to Company Table), name (text), rep_id (FK to User Table for assignment), polygon (GEOMETRY type for PostGIS).

pins Table:

id (PK), company_id (FK), rep_id (FK), lead_id (FK to the new Lead/Prospect record), latitude (float), longitude (float), pin_color_code (text), creation_date (timestamp with timezone).

4. Backend API Endpoints (Node.js/Express):

Territory Management (Admin Only): CRUD endpoints for territories. Must include a service layer that uses PostGIS spatial functions to check if a pin is within a territory.

Pin Management (All Users): Endpoints to create, retrieve, and filter pins.

Leads/Data: Endpoint to create a new Lead/Prospect record, automatically using the Geo-coded address, assigning the current rep, and linking it to the newly created pin record.

5. Front-End Feature Implementation (React/Tailwind):

Feature Gating: Only render the "Door-Knocking Map" route/component if the user's Company record has door_knock_enabled set to true.

Map View UI:

Display all relevant pins and territory boundaries for the current user/company.

Toggle: Implement a button to switch the map view between Satellite and Roadmap modes.

Search/Pin Creation: Allow users to type an address in a search bar to Geo-code the address and drop a pin at that location.

Filtering: Implement UI controls (buttons/dropdowns) to filter pins by: Company-wide vs. User-Specific, and Timeframe (Today, This Week, This Month, Last 3 Months, This Year, All Time).

Legend: Display a clear legend linking pin_color_code to the relevant project/lead stages (e.g., Prospect, Sold, Production).

New Lead Modal:

Appears when a map pin is dropped or clicked.

Fields: Name, Address (auto-populated from Geo-sync), Phone, Email, Notes, Lead Source (using existing column name).

Automation: The user is automatically assigned as the lead owner.

6. Security and Add-On Logic:

Supabase RLS: Propose and define the necessary Row-Level Security policies for the new pins and territories tables to ensure:

Reps only see data associated with their company_id and their own rep_id.

Admins only see data associated with their company_id.

Territory Assignment Logic: When a pin/lead is created, the system must perform a spatial query to see if the pin falls within an assigned territory. If so, assign the territory's dedicated rep to the lead, otherwise assign the rep who dropped the pin.

Deliverable: A series of files and instructions detailing the database migration, backend API routes, and React components necessary to implement this feature.