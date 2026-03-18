# 🛡️ COPS Platform: The Ultimate Blueprint
**Community Oriented Policing System | Comprehensive Architecture & Implementation Guide**

This document serves as the master specification for the COPS Platform. It contains every detail necessary to understand, maintain, or recreate the entire project from scratch using Next.js and Supabase.

---

## 1. Project Essence
**Goal:** To bridge the gap between Indian citizens and law enforcement through a secure, transparent, and efficient digital platform.
**Philosophy:** Separation of concerns between public service and police operations, with high-security standards for sensitive data (ID proofs, evidence).

---

## 2. Technology Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS (Modern aesthetics: Glassmorphism, Dark mode default).
- **Backend/BaaS:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Icons:** Lucide React.
- **Data Handling:** React Hook Form (Validation), Zod.
- **Security:** Row Level Security (RLS) policies, Middleware-based route protection.

---

## 3. Database Architecture (Supabase/PostgreSQL)

### 3.1. Enums & Types
- `user_role`: citizen, constable, si, sho, dsp, admin, oversight.
- `incident_status`: reported, under_investigation, fir_lodged, charge_sheeted, closed, rejected, draft.
- `item_status`: lost, found, claimed, returned.

### 3.2. Core Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `profiles` | Extended user data | `id` (references auth.users), `role`, `full_name`, `phone`, `id_proof_url`, `pincode`, etc. |
| `officer_profiles` | Police-specific data | `id`, `badge_number`, `rank`, `is_verified`, `is_active`. |
| `incidents` | Crime/Incident reports | `id`, `reporter_id`, `type`, `status`, `description`, `location_gps`, `evidence_urls`. |
| `lost_found_items` | Lost/Found registry | `id`, `reporter_id`, `type` (lost/found), `category`, `photos`, `matching_id`. |
| `fir_records` | Official FIR documents | `id`, `incident_id`, `fir_number`, `document_url`, `lodged_by`. |
| `alerts` | Public crime/safety alerts | `id`, `severity`, `message`, `area_pincode`, `created_by`. |
| `sos_events` | Emergency SOS triggers | `id`, `user_id`, `location`, `status`, `duration`. |

### 3.3. Key Triggers & Procedures
- **`handle_new_user`**: Automatically inserts a row into `public.profiles` when a user signs up via Supabase Auth.
- **`match_lost_found`**: Logic to automatically find matches between "Lost" and "Found" items based on category and description keywords.

---

## 4. Storage Infrastructure
Five primary buckets are configured with granular RLS policies:

1.  **`avatars`**: Publicly readable (authenticated), owner-writable.
2.  **`id-proofs`**: **PRIVATE**. Only the owner and Police (SI/SHO/DSP) can select. This protects PII.
3.  **`incident-evidence`**: Only the reporter and investigating officers can view/upload.
4.  **`fir-documents`**: Publicly readable by the reporter; writable only by Police (SI and above).
5.  **`lost-found-media`**: Publicly readable within the community to facilitate identification.

---

## 5. Security & Access Control

### 5.1. RLS (Row Level Security)
- **Citizens**: Can only see their own reports and profile. Can see public alerts and forum posts.
- **Police**: Can see all reports within their jurisdiction. Verification required by SHO/Admin.
- **Admin**: Full system management, user verification, and audit logs.

### 5.2. Middleware (`middleware.ts`)
The middleware enforces strict route protection:
- Paths starting with `/citizen`, `/officer`, `/admin` require authentication.
- Authenticated users are redirected from `/login` to their respective dashboards based on their role.
- Roles are verified against the database `profiles` table before allowing access to role-specific prefixes (e.g., a citizen cannot access `/officer/*`).

---

## 6. Major Features & Workflows

### 6.1. Incident Reporting (Draft Logic)
- Users can save reports as "Draft".
- **Logic**: Reports in draft status are excluded from the Police verification queue.
- **Logic**: Once submitted, the report becomes non-editable by the citizen to preserve evidence integrity.

### 6.2. SOS System
- Floating button available on all citizen pages.
- Triggers an event in `sos_events`, logs GPS location, and (conceptually) sends SMS/Alerts to the nearest station.

### 6.3. Lost & Found Matching
- When a user adds a "Found" item, the system scans "Lost" items in the same category.
- Uses Postgres text search or simple keyword matching to suggest potential owners.

### 6.4. Separate Auth Portals
- **Citizen Portal**: Focuses on ease of use, safety tips, and reporting.
- **Officer Portal**: High-contrast, dark-themed command center. Requires official badge verification. Terminology used: "Enter Command Center", "Active Duty", "Verification Queue".

---

## 7. Recreation Checklist (For AI/Engineers)

### Step 1: Initialize Project
```bash
npx create-next-app@latest ./
# Install dependencies: @supabase/ssr, lucide-react, date-fns, react-hot-toast
```

### Step 2: Database Setup
Apply migrations in numerical order (`001_enums.sql` through `022_storage_revisions.sql`).
- Ensure `auth.users` trigger is active.
- Run `seed.sql` for initial location data and stations.

### Step 3: Environment Variables
Create `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Used in `api/auth/signup` to bypass RLS during registration)

### Step 4: Storage Setup
Create the 5 buckets listed in Section 4. Apply policies from `022_storage_revisions.sql`.

### Step 5: Middleware & Types
Copy `middleware.ts` and define `UserRole` union type in `lib/types/index.ts`.

---

## 8. Directory Guide
- `app/(auth)`: Shared auth layouts but separate login/signup pages.
- `app/citizen`: Citizen-facing dashboard and modules.
- `app/officer`: Highly branched by rank (`/constable`, `/si`, `/sho`, `/dsp`).
- `lib/data/indian-locations.ts`: The source of truth for cascading dropdowns (States -> Districts -> Thanas).
- `supabase/migrations`: The complete evolution of the database schema.

---
**Document Status:** Final Authority
**Revision:** v1.2 (Police Portal Separation Update)
