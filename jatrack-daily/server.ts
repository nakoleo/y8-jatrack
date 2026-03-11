import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("reports.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'morning' or 'evening'
    name TEXT NOT NULL,
    gender TEXT, -- 'male' or 'female'
    date TEXT NOT NULL,
    check_in_time TEXT,
    focus TEXT,
    routine TEXT,
    results TEXT,
    next_move TEXT,
    issues TEXT,
    issue_status TEXT, -- 'resolved' or 'unresolved'
    issue_detail TEXT,
    issue_next_step TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/reports", (req, res) => {
    try {
      const reports = db.prepare("SELECT * FROM reports ORDER BY created_at DESC").all();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.delete("/api/reports/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM reports WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete report" });
    }
  });

  app.post("/api/reports", (req, res) => {
    const { 
      type, name, gender, date, check_in_time, focus, routine, results, next_move, 
      issues, issue_status, issue_detail, issue_next_step 
    } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO reports (
          type, name, gender, date, check_in_time, focus, routine, results, next_move, 
          issues, issue_status, issue_detail, issue_next_step
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        type, name, gender || null, date, check_in_time || null, focus || null, 
        routine || null, results || null, next_move || null, issues || null,
        issue_status || null, issue_detail || null, issue_next_step || null
      );
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save report" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
