import { useState, useRef, useEffect } from "react";
import './App.css'

function App() {
  const [connection, setConnection] = useState({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "",
    database: "",
  });

  const [prompt, setPrompt] = useState("");
  const [responseData, setResponseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const scrollRef = useRef(null);

  // Auto-scroll to results when response changes
  useEffect(() => {
    if (responseData && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [responseData]);

  const handleConnectionChange = (e) => {
    const { name, value } = e.target;
    setConnection((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResponseData(null);

    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    if (
      !connection.host.trim() ||
      !connection.port.trim() ||
      !connection.user.trim() ||
      !connection.database.trim()
    ) {
      setError("Please fill all required DB connection fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          connection,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong.");
        setResponseData(null);
      } else {
        setResponseData(data);

        if (data.sql) {
          setHistory((prev) => [
            {
              id: Date.now(),
              prompt,
              sql: data.sql,
              time: new Date().toLocaleString(),
            },
            ...prev.slice(0, 9), // keep max 10 items
          ]);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Unable to reach backend. Is FastAPI running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryClick = (item) => {
    setPrompt(item.prompt);
    setResponseData({ sql: item.sql, data: [] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900 text-white flex flex-col items-center px-3 sm:px-4 py-6">
      {/* Top Glow Background Accent */}
      <div className="pointer-events-none fixed inset-x-0 -top-40 mx-auto h-80 w-80 rounded-full bg-green-500/10 blur-3xl" />

      {/* Main Container */}
      <div className="w-full max-w-9xl px-10 relative">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wide text-emerald-300 mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              GenAI · SQL Assistant
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              QueryGen <span className="text-emerald-400">AI</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base mt-1">
              Talk to your MySQL database using natural language. Generate safe,
              schema-aware SQL queries instantly.
            </p>
          </div>

          <div className="mt-3 md:mt-0 text-xs text-right space-y-1">
            <p className="text-gray-400">
              Backend: <span className="text-gray-200">FastAPI</span>
            </p>
            <p className="text-gray-400">
              LLM:{" "}
              <span className="font-mono text-emerald-300">
                OpenRouter · openai/gpt-4o-mini
              </span>
            </p>
            <p className="text-[0.65rem] text-gray-500">
              Mode: <span className="text-amber-300">Read-only · SELECT only</span>
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-col lg:flex-row gap-5 lg:gap-6">
          {/* LEFT: Connection + Prompt */}
          <section className="w-full lg:w-1/2">
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-black/70 to-slate-950/80 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* Subtle border glow */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl border border-emerald-500/10" />

              <form
                onSubmit={handleSubmit}
                className="relative z-10 p-4 sm:p-5 md:p-6 space-y-6"
              >
                {/* DB Connection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 text-xs">
                        1
                      </span>
                      Database Connection
                    </h2>
                    <span className="text-[0.65rem] uppercase tracking-wide text-gray-500">
                      MySQL only
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[0.7rem] uppercase text-gray-400 mb-1">
                        Host <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="host"
                        value={connection.host}
                        onChange={handleConnectionChange}
                        className="w-full bg-black/70 border border-gray-800/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400/80 focus:border-emerald-400/80 placeholder:text-gray-600"
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.7rem] uppercase text-gray-400 mb-1">
                        Port <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="port"
                        value={connection.port}
                        onChange={handleConnectionChange}
                        className="w-full bg-black/70 border border-gray-800/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400/80 focus:border-emerald-400/80 placeholder:text-gray-600"
                        placeholder="3306"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.7rem] uppercase text-gray-400 mb-1">
                        User <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="user"
                        value={connection.user}
                        onChange={handleConnectionChange}
                        className="w-full bg-black/70 border border-gray-800/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400/80 focus:border-emerald-400/80 placeholder:text-gray-600"
                        placeholder="root"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.7rem] uppercase text-gray-400 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={connection.password}
                        onChange={handleConnectionChange}
                        className="w-full bg-black/70 border border-gray-800/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400/80 focus:border-emerald-400/80 placeholder:text-gray-600"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[0.7rem] uppercase text-gray-400 mb-1">
                        Database <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="database"
                        value={connection.database}
                        onChange={handleConnectionChange}
                        className="w-full bg-black/70 border border-gray-800/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400/80 focus:border-emerald-400/80 placeholder:text-gray-600"
                        placeholder="Enter your Database Name"
                      />
                    </div>
                  </div>
                </div>

                {/* Prompt */}
                <div className="space-y-2 pt-2 border-t border-gray-800/60 mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 text-xs">
                        2
                      </span>
                      Ask your question
                    </h2>
                    <span className="text-[0.65rem] text-gray-500">
                      e.g. “Show all users”, “Total sales per product”
                    </span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full min-h-[120px] bg-black/70 border border-gray-800/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400/80 focus:border-emerald-400/80 placeholder:text-gray-600"
                    placeholder="Type your SQL-related prompt here..."
                  />
                </div>

                {/* Error + Actions */}
                {error && (
                  <div className="text-red-400 text-xs bg-red-950/40 border border-red-900/70 rounded-lg px-3 py-2 whitespace-pre-line">
                    {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                  >
                    {loading && (
                      <span className="mr-2 inline-flex h-3 w-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    )}
                    {loading ? "Running query..." : "Run Query"}
                  </button>
                  <p className="text-[0.7rem] text-gray-500 max-w-xs">
                    Your DB credentials stay on your machine. Only used to
                    connect directly from this app.
                  </p>
                </div>
              </form>
            </div>
          </section>

          {/* RIGHT: History + Results */}
          <section className="w-full lg:w-1/2 flex flex-col gap-4 lg:gap-5">
            {/* History */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-md p-4 shadow-[0_0_30px_rgba(0,0,0,0.7)] h-56 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Query History
                </h2>
                <span className="text-[0.65rem] text-gray-500">
                  Last {history.length || 0} runs
                </span>
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No history yet. Run a query and it will appear here.
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="border border-gray-800 rounded-lg p-2 hover:border-emerald-400/80 cursor-pointer transition bg-black/40 hover:bg-black/70"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <p className="text-[0.65rem] text-gray-500 mb-1">
                        {item.time}
                      </p>
                      <p className="line-clamp-2 text-gray-200 mb-1">
                        {item.prompt}
                      </p>
                      <p className="font-mono text-[0.65rem] text-emerald-300 line-clamp-1">
                        {item.sql}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Results */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-md p-4 shadow-[0_0_30px_rgba(0,0,0,0.7)] flex-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 text-[0.7rem]">
                    SQL
                  </span>
                  Result
                </h2>
                {loading && (
                  <span className="text-[0.65rem] text-emerald-300 animate-pulse">
                    Generating & executing...
                  </span>
                )}
              </div>

              {!responseData ? (
                <p className="text-xs text-gray-500">
                  Run a query to see generated SQL and table output here.
                </p>
              ) : (
                <div ref={scrollRef} className="space-y-3">
                  {/* SQL */}
                  {responseData.sql && (
                    <div>
                      <p className="font-semibold text-xs mb-1 text-gray-300">
                        Generated SQL
                      </p>
                      <div className="bg-black/80 text-emerald-300 border border-gray-800 rounded-lg p-3 text-[0.7rem] font-mono overflow-x-auto">
                        {responseData.sql}
                      </div>
                    </div>
                  )}

                  {/* Non-select / message */}
                  {responseData.message && (
                    <p className="text-[0.7rem] text-blue-300 bg-blue-950/40 border border-blue-900 rounded-lg px-3 py-2">
                      {responseData.message}
                    </p>
                  )}

                  {/* Table */}
                  {responseData.data && responseData.data.length > 0 ? (
                    <div className="mt-2 border border-gray-800 rounded-lg overflow-x-auto">
                      <table className="min-w-full text-[0.7rem]">
                        <thead className="bg-slate-900">
                          <tr>
                            {Object.keys(responseData.data[0]).map((key) => (
                              <th
                                key={key}
                                className="px-3 py-2 border-b border-gray-800 text-gray-300 text-center font-medium"
                              >
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {responseData.data.map((row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              className={
                                rowIndex % 2 === 0
                                  ? "bg-[#101010]"
                                  : "bg-black"
                              }
                            >
                              {Object.values(row).map((value, colIndex) => (
                                <td
                                  key={colIndex}
                                  className="px-3 py-2 border-b border-gray-900 text-center text-gray-200"
                                >
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    !responseData.message && (
                      <p className="text-[0.7rem] text-gray-500">
                        No rows returned for this query.
                      </p>
                    )
                  )}

                  {/* Loading skeleton when waiting */}
                  {loading && (
                    <div className="space-y-2">
                      <div className="h-3 w-24 bg-gray-800/60 rounded animate-pulse" />
                      <div className="h-28 w-full bg-gray-900/60 rounded-lg animate-pulse" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

        </main>
          <footer className="w-full py-4 mt-10 border-t border-gray-800 text-center text-xs">
  © {new Date().getFullYear()}
  <span className="text-emerald-400 font-medium hover:underline cursor-pointer">AskMyDB AI </span>
  — Built with ❤️ By Sharansidh.
</footer>

      </div>
    </div>
  );
}

export default App;
