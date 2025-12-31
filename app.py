import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
import httpx
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# OpenRouter configuration
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "openai/gpt-4o-mini"  # change to any other OpenRouter model if you want

app = FastAPI()

# Allow frontend from localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create engine from user's connection details
def create_dynamic_engine(conn):
    try:
        db_url = (
            f"mysql+pymysql://{conn['user']}:{conn['password']}"
            f"@{conn['host']}:{conn['port']}/{conn['database']}"
        )
        return create_engine(db_url)
    except Exception as e:
        raise ValueError(f"Invalid connection: {e}")




async def call_openrouter(messages):
    """
    Helper function to call OpenRouter chat completions.
    `messages` should be a list of {role, content} dicts.
    """
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not set. Please add it to your .env file.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        # Optional but recommended by OpenRouter:
        # "HTTP-Referer": "http://localhost:5173",
        # "X-Title": "Talk to DB",
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
    }

#Async API call to OpenRouter
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(OPENROUTER_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()

    # Same response shape as OpenAI's chat/completions
    return data["choices"][0]["message"]["content"]

def clean_sql_output(raw_sql: str) -> str:
    """
    Cleans LLM output to extract a plain SQL string:
    - Removes ``` ``` code fences and language hints like ```sql
    - If extra text is present, keeps only from the first SELECT/UPDATE/etc.
    """
    if not raw_sql:
        return ""

    sql = raw_sql.strip()

    # Remove code fences like ```sql ... ```
    if sql.startswith("```"):
        # remove starting ``` or ```sql
        sql = re.sub(r"^```[a-zA-Z0-9]*\s*", "", sql)
        # cut off everything after closing ```
        if "```" in sql:
            sql = sql.split("```", 1)[0]

    # If there's any explanation text, try to keep from first keyword
    lower = sql.lower()
    for kw in ["select", "update", "insert", "delete", "create", "drop", "alter", "truncate"]:
        if kw in lower:
            idx = lower.index(kw)
            sql = sql[idx:]
            break

    return sql.strip()

@app.post("/query")
async def query_db(request: Request):
    body = await request.json()
    prompt = body.get("prompt", "")
    conn_info = body.get("connection", {})

    if not prompt or not conn_info:
        return {"error": "Prompt or DB connection details missing."}

    try:
        engine = create_dynamic_engine(conn_info)

        dangerous_words = ["delete", "drop", "remove", "truncate", "update"]
        if any(word in prompt.lower() for word in dangerous_words):
            return {
                "error": "⚠️ Dangerous intent detected in prompt. "
                         "Data modification is not allowed."
            }



        # 1) Ask OpenRouter to extract table names
        # Fetch existing tables from DB
        with engine.begin() as conn:
            existing_tables = [row[0] for row in conn.execute(text("SHOW TABLES")).fetchall()]

        print("Existing tables:", existing_tables)  # Debug log

        # 1) Ask OpenRouter to extract valid table names
        table_names_content = await call_openrouter([
            {
                "role": "system",
                "content": (
                    "You are an expert database assistant.\n"
                    f"Valid tables: {existing_tables}\n"
                    "Extract ONLY relevant table names from the list above.\n"
                    "Return only the table names, comma-separated.\n"
                    "Do NOT guess or invent tables.\n"
                )
            },
            {"role": "user", "content": prompt}
        ])

        print("Raw table_names_content:", table_names_content)

        tables = [t.strip() for t in table_names_content.split(",") if t.strip()]
        tables = [t for t in tables if t in existing_tables]  # Strict validation

        print("Validated tables:", tables)

        if not tables:
            return {"error": "No valid tables found in prompt."}

        # 2) Get schema from MySQL
        schema_parts = []
        with engine.begin() as conn:
            for table in tables:
                try:
                    rows = conn.execute(text(f"DESCRIBE {table}")).fetchall()
                    columns = [f"{row[0]} {row[1]}" for row in rows]
                    schema_parts.append(f"{table}({', '.join(columns)})")
                except Exception as e:
                    return {"error": f"Schema error for '{table}': {e}"}

        schema = "\n".join(schema_parts)

        # 3) Ask OpenRouter to generate SQL using schema
        system_prompt = f"""You are a MySQL expert.
        Use the schema below to write a valid SQL query for the user's prompt.

        {schema}

        Rules:
        - Only generate SELECT queries.
        - Do NOT generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or TRUNCATE.
        - Never modify or remove data — only read.
        - Return only SQL. No markdown. No explanations.
        """
        raw_sql = (await call_openrouter([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]))

        sql = clean_sql_output(raw_sql)

        # 🚫 Enforce Read-only SQL (Select-only)
        sql_lower = sql.lower().strip()

        blocked_keywords = ["insert", "update", "delete", "drop", "alter", "truncate", "create"]

        if any(sql_lower.startswith(keyword) for keyword in blocked_keywords):
            return {
                "sql": sql,
                "error": (
                    "⚠️ Unsafe SQL blocked: Only read-only SELECT queries are allowed.\n"
                    "Your prompt requested a modification."
                )
            }

        print("Raw SQL from model:", raw_sql)  # optional for debugging
        print("Cleaned SQL:", sql)

        if not sql:
            return {"error": "Model did not return any SQL."}

        # 4) Execute the SQL query
        with engine.begin() as conn:
            result = conn.execute(text(sql))
            if sql.strip().lower().startswith("select"):
                rows = [dict(row._mapping) for row in result]
                return {"sql": sql, "data": rows}
            else:
                # For non-SELECT queries, just return rowcount
                return {"sql": sql, "message": f"{result.rowcount} rows affected."}

    except httpx.HTTPStatusError as e:
        # Explicit error if OpenRouter returns an error
        return {"error": f"OpenRouter API error: {e.response.text}"}
    except Exception as e:
        return {"error": f"Server error: {e}"}
