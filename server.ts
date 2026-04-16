import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { eq, and } from "drizzle-orm";
import multer from "multer";

// --- Schema ---
export const imagesTable = sqliteTable("images", {
  id: text("id").primaryKey(),
  weekStart: text("week_start").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  imageUrl: text("image_url").notNull(), // using base64 for simplicity
  createdAt: integer("created_at").notNull(),
});

export const termsTable = sqliteTable("terms", {
  id: text("id").primaryKey(),
  imageId: text("image_id").notNull(),
  term: text("term").notNull(),
});

export const notesTable = sqliteTable("notes", {
  weekStart: text("week_start").primaryKey(),
  content: text("content").notNull(),
});

// --- DB Initialization ---
const sqlite = new Database(".data.sqlite");
const db = drizzle(sqlite);

// Create tables if not exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    week_start TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS terms (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL,
    term TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    week_start TEXT PRIMARY KEY,
    content TEXT NOT NULL
  );
`);


// --- Express Server Setup ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get data for a week
  app.get("/api/week/:weekStart", (req, res) => {
    const { weekStart } = req.params;
    try {
      const images = db.select().from(imagesTable).where(eq(imagesTable.weekStart, weekStart)).all();
      const terms = db.select().from(termsTable).all(); // in a real app, query by imageId
      // filtering terms in memory for simplicity given the scale
      const imageIds = images.map(i => i.id);
      const relatedTerms = terms.filter(t => imageIds.includes(t.imageId));
      
      const notesRecord = db.select().from(notesTable).where(eq(notesTable.weekStart, weekStart)).get();

      res.json({
        images,
        terms: relatedTerms,
        notes: notesRecord?.content || ""
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Upload an image and save it along with generated terms
  // Note: Gemini API is called from the frontend, then the result is passed here
  app.post("/api/images", (req, res) => {
    const { id, weekStart, dayOfWeek, imageUrl, generatedTerms } = req.body;
    try {
      db.insert(imagesTable).values({
        id,
        weekStart,
        dayOfWeek,
        imageUrl,
        createdAt: Date.now()
      }).run();

      if (generatedTerms && generatedTerms.length > 0) {
        generatedTerms.forEach((termStr: string, idx: number) => {
          db.insert(termsTable).values({
            id: `${id}-term-${idx}`,
            imageId: id,
            term: termStr
          }).run();
        });
      }

      const savedTerms = db.select().from(termsTable).where(eq(termsTable.imageId, id)).all();
      res.json({ success: true, terms: savedTerms });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Delete a term label
  app.delete("/api/terms/:id", (req, res) => {
     try {
       db.delete(termsTable).where(eq(termsTable.id, req.params.id)).run();
       res.json({ success: true });
     } catch (e) {
       console.error(e);
       res.status(500).json({ error: "Failed to delete" });
     }
  });

  app.delete("/api/images/:id", (req, res) => {
     try {
       db.delete(imagesTable).where(eq(imagesTable.id, req.params.id)).run();
       db.delete(termsTable).where(eq(termsTable.imageId, req.params.id)).run();
       res.json({ success: true });
     } catch (e) {
       console.error(e);
       res.status(500).json({ error: "Failed to delete image" });
     }
  });

  // Save notes
  app.post("/api/notes", (req, res) => {
    const { weekStart, content } = req.body;
    try {
      const existing = db.select().from(notesTable).where(eq(notesTable.weekStart, weekStart)).get();
      if (existing) {
        db.update(notesTable).set({ content }).where(eq(notesTable.weekStart, weekStart)).run();
      } else {
        db.insert(notesTable).values({ weekStart, content }).run();
      }
      res.json({ success: true });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: "Internal Server Error" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Provide a fallback for React Router if needed
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
