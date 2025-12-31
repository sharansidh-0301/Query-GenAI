# QUERY GEN AI - Talk to your Database

<img width="1523" height="969" alt="Screenshot 2025-11-30 152828" src="https://github.com/user-attachments/assets/494be08a-63b0-42b6-8b01-3f2268174cf2" />


AskMyDB AI (a.k.a. AskMyDB AI) is an intelligent database assistant that lets users ask questions in plain English and get fast, safe responses from a MySQL database — without writing SQL. It’s built to empower business analysts, product managers, and non-technical users to explore and analyze structured data quickly, while providing developers with a secure, production-ready integration of GenAI and data access.

This README explains what the project does, how it works, how to run it locally, and important security considerations.

---

## Key ideas

- Translate natural language prompts into safe, optimized SELECT SQL using an LLM (OpenRouter).
- Validate queries using live database schema metadata to prevent invalid or unsafe access.
- Enforce safeguards (read-only mode, SQL cleaning, banned statements) and show results in a responsive UI.
- Keep a query history for re-run and auditing.

---

## Highlighted capabilities

- Natural language queries (e.g., "Show users from Chennai older than 30")
- Automatic translation to optimized SELECT statements
- Live schema inspection & table/column validation
- Read-only execution with blocking of DDL/DML like DELETE / DROP
- Result rendering in a responsive React + Tailwind UI
- Configurable LLM model (via OpenRouter) and runtime limits (row cap, timeouts)

---

## Architecture overview

- Frontend: React + Tailwind CSS — interactive query input, results table, filters, history
- Backend: FastAPI (Python) — translates prompts to SQL, validates and executes queries, returns results
- LLM: OpenRouter API (configurable models such as gpt-4o-mini)
- Database: MySQL — connected dynamically per user (or by a configured connection)
- Communication: REST API between frontend and backend

Flow:
1. User enters a natural-language query.
2. Backend fetches schema metadata for target DB (tables, columns, types).
3. Backend calls the LLM with a prompt that includes schema context and constraints.
4. LLM returns a candidate SQL SELECT; backend cleans and validates it.
5. If safe and valid, backend executes the query (read-only) and returns results to the frontend.
6. Query and result metadata are stored in history for re-execution and auditing.

---

## Security & safety features

- Read-only enforcement: by default, only SELECT statements are permitted; DDL/DML are blocked.
- SQL cleaning & parsing: candidate SQL is scanned and sanitized before execution.
- Table & column validation: generated SQL must reference tables/columns present in the live schema.
- Row / time limits: configurable max-rows and execution timeouts to avoid heavy queries.
- Least-privilege DB credentials: use a database user with only the SELECT permission.
- Audit log: store queries and their results (or metadata) to track usage and spot anomalies.

Note: These protections reduce risk but do not eliminate it — treat production DBs carefully. Use a staging replica or readonly views when possible.

---

## Quickstart — Local development

Prerequisites:
- Node 18+ and npm/yarn
- Python 3.10+
- MySQL instance (or a connection string to an accessible MySQL DB)
- OpenRouter API key (or other LLM gateway if configured)

1) Clone repository (if not already):
   ```bash
   git clone https://github.com/sharansidh-0301/SaaS.git
   cd SaaS/querygenai
   ```

2) Backend — create a virtual environment and install:
   ```bash
   cd querygenai/backend
   python -m venv .venv
   source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

3) Frontend — install dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

4) Environment variables

Create a `.env` file in the backend folder (example below):

```env
# OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=gpt-4o-mini

# MySQL (example)
DATABASE_URL=mysql+pymysql://readonly_user:password@host:3306/dbname

# Server limits and safety
READ_ONLY=true
MAX_ROWS=500
QUERY_TIMEOUT_SECONDS=10
```

Important:
- Use a MySQL user with SELECT-only permissions.
- Never commit `.env` or secrets to source control.

5) Run services

Backend:
```bash
cd querygenai/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd querygenai/frontend
npm run dev
# or: npm start (depends on package.json)
```

Open the UI at http://localhost:3000 (or the port configured by frontend dev server) and connect to the backend API.

---

## Example queries

- "Show total sales by region for the last 6 months"
- "List customers from Chennai with more than 2 orders"
- "Compare monthly revenue between product A and product B"
- "Top 10 users by last login date"

The system will attempt to generate an optimized SELECT that uses appropriate JOINs and aggregations if needed. If a requested table or column is missing, it will respond with an informative warning.

---

## Configuration & extensibility

- LLM provider: OpenRouter is the default; you can replace or extend to other providers by changing the integration layer.
- Model selection: configure model via OPENROUTER_MODEL environment variable for cost/latency tradeoffs.
- Safety rules: SQL sanitizer and allowlist/denylist can be extended to meet your security policy.
- UI: easily add custom visualizations (charts, pivots) by extending the frontend results renderer.

---

## Troubleshooting

- "Generated query was blocked" — check logs to see which safety rule triggered; ensure your prompt is supported or adapt allowed operations.
- "Schema not found" — ensure DATABASE_URL points to the correct database and backend can connect (network/firewall).
- "LLM errors or quota" — verify OPENROUTER_API_KEY, model selection and your OpenRouter plan/quota.

---

## Development notes

- Keep the schema payload minimal when sending to the LLM to reduce token usage (include only relevant tables/columns).
- Cache schema metadata for short intervals to avoid frequent introspection calls — but refresh when users connect to a different DB.
- Add role-based access controls in front of the API for multi-user deployments.

---

## Testing

- Add unit tests for:
  - SQL parser / sanitizer
  - Table/column validation logic
  - Backend endpoints (mock LLM responses)
- Add integration tests that use a test MySQL instance (or Docker) with sample data.

---

## Contribution & license

Contributions welcome — please open issues or PRs in the repository. Check the repo root for a LICENSE file; if none exists add one appropriate to your needs (MIT is common for sample projects).

---

## Acknowledgements

- Built with FastAPI and React
- LLM access via OpenRouter
- Inspired by the need to democratize data access for non-technical users

---
