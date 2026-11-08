# Nexus Cyber & Tech Studio
> Production-ready multi-agent AI intelligence & engineering workspace

Nexus Cyber & Tech Studio is a unified professional workspace featuring five specialized AI engineering and cybersecurity personas, persistent PostgreSQL database storage with Drizzle ORM, real-time Server-Sent Events (SSE) streaming with Google Gemini (`gemini-3.8-flash`), global workspace context injection, and an interactive deliverable artifact workspace.

---

## 1. System Architecture & Features

### Core Principle
Build **one unified intelligent workspace with five specialized experts**, rather than five disconnected chatbots.

### The Five Embedded Personas
1. **SecOps (`secops`)** — Cyber Security & Digital Forensics Analyst
   - *Role*: Senior SOC Analyst and Digital Forensics Expert
   - *Base Directive*: Analyzes raw telemetry (Sysmon, PCAP, Auth logs), reverse-engineers threat behavior, discovers OWASP vulnerabilities, authors YARA/Snort rules, and structures Incident Response Reports adhering strictly to NIST SP 800-61 / ISO digital forensics standards.
   - *Accent*: Red (`#EF4444`)
2. **Coder (`coder`)** — Multi-Language Software Architect
   - *Role*: Principal Software Engineer
   - *Base Directive*: Writes production-grade, type-safe, secure code across Python, TypeScript/JavaScript, Go, Rust, C++, Swift, and Kotlin. Architects scalable microservices, schemas, and robust APIs.
   - *Accent*: Blue (`#3B82F6`)
3. **Data & PM (`data-pm`)** — Data Analyst & Systems Project Manager
   - *Role*: Lead Data Analyst and Technical Project Manager
   - *Base Directive*: Parses telemetry, cleans datasets, writes SQL/Pandas transformations, and converts specifications into actionable engineering backlogs and sprint milestones.
   - *Accent*: Violet (`#8B5CF6`)
4. **Writer (`writer`)** — Technical Copywriter & Documentation Specialist
   - *Role*: Senior Technical Writer and Copywriter
   - *Base Directive*: Produces world-class API documentation, architecture guides, client proposals, developer landing page copy, and polished technical articles.
   - *Accent*: Amber (`#F59E0B`)
5. **Researcher (`researcher`)** — Security & OSINT Researcher
   - *Role*: Senior Security & Technology Researcher
   - *Base Directive*: Performs deep CVE breakdowns, threat intelligence analysis, evaluates cloud/framework trade-offs, and synthesizes technical research into actionable briefs.
   - *Accent*: Cyan (`#06B6D4`)

---

## 2. 3-Pane Interface Design

- **Left Pane: Agent Control Center**
  - Instant switching between all 5 specialized personas with real-time role badges.
  - New conversation creation, session history, search filtering, and conversation renaming/deletion.
  - Quick modal triggers for Global Workspace Context and System Architecture settings.
  - Collapsible sidebar mode for high-focus work.
- **Center Pane: AI Conversation Engine**
  - Active persona banner, model indicator (`gemini-3.8-flash`), and conversation title.
  - Multi-turn conversation feed with differentiated user vs. AI bubbles.
  - Real-time incremental streaming over Server-Sent Events (SSE).
  - Clean technical Markdown rendering with syntax-highlighted code blocks, line numbers, and copy actions.
  - Direct "Promote to Artifact" action on any code block or deliverable.
  - Multiline composer with auto-grow, Enter to send, Shift+Enter for newlines, stop generation button, and character counter.
- **Right Pane: Artifact Workspace**
  - Dedicated code and deliverable editor supporting `.py`, `.ts`, `.tsx`, `.js`, `.json`, `.md`, `.sql`, `.html`, `.css`, `.yaml`, `.txt`.
  - Open tabs management, file naming, syntax line numbering, and live editing.
  - Immediate persistence to backend database.
  - Instant file download with valid extensions and MIME types.
  - Full-screen distraction-free editing mode.

---

## 3. Technology Stack

- **Frontend**: Next.js App Router compatible, React 19, TypeScript (strict mode), Tailwind CSS v4, Lucide React icons.
- **Backend**: Express + Node.js runtime with Next.js App Router compatible `/api/*` contracts (`/api/chat`, `/api/conversations`, `/api/context`, `/api/artifacts`).
- **AI Infrastructure**: Official `@google/genai` TypeScript SDK, configurable via `GEMINI_MODEL` (default: `gemini-3.8-flash`).
- **Persistence**: PostgreSQL with Drizzle ORM schemas, indexes, foreign keys, and migrations (`src/lib/database/migrations/0001_initial.sql`), coupled with automatic local file-backed persistence fallback when `DATABASE_URL` is pending.
- **Validation**: Zod schema validation on all API contracts.
- **Testing**: Native `node:test` runner with strict assertion testing executed via `tsx --test`.

---

## 4. Environment Configuration

Create a `.env` file based on `.env.example`:

```env
# Google Gemini API key (injected automatically in Google AI Studio)
GEMINI_API_KEY="your_gemini_api_key"

# Gemini model identifier (defaults to gemini-3.8-flash)
GEMINI_MODEL="gemini-3.8-flash"

# PostgreSQL connection string
# e.g., postgresql://postgres:password@localhost:5432/nexus_db
# If left empty, Nexus operates on high-performance local storage fallback
DATABASE_URL=""

# Server listening port
PORT=3000
```

---

## 5. Development & Testing Commands

```bash
# Install dependencies
npm install

# Start full-stack development server on port 3000
npm run dev

# Run automated unit tests
npm test

# Run TypeScript type-checking / linting
npm run lint

# Build production bundle
npm run build

# Start production server
npm start
```

---

## 6. Database Migration & Initialization

To run migrations against your PostgreSQL instance:

```bash
# Push schema directly with Drizzle
npx drizzle-kit push

# Or apply the SQL migration directly
psql "$DATABASE_URL" -f src/lib/database/migrations/0001_initial.sql
```

---

## 7. Transfer to GitHub & Import into Vercel v0

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Nexus Cyber & Tech Studio multi-agent workspace"
   git branch -M main
   git remote add origin https://github.com/<your-username>/nexus-cyber-tech-studio.git
   git push -u origin main
   ```
2. **Import into Vercel / v0**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your imported GitHub repository.
   - In **Environment Variables**, configure:
     - `GEMINI_API_KEY`
     - `GEMINI_MODEL` = `gemini-3.8-flash`
     - `DATABASE_URL` (from Neon, Supabase, or AWS RDS PostgreSQL)
   - Click **Deploy**.
