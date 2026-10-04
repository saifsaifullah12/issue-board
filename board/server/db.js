import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

// neon() uses HTTPS fetch over port 443 — rock solid, no connection drops or timeouts!
export const sql = neon(process.env.DATABASE_URL);

export async function initDb() {
  // 1. Create Tables
  await sql`
    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS columns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      position DOUBLE PRECISION NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS issues (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      number SERIAL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
      position DOUBLE PRECISION NOT NULL,
      labels JSONB DEFAULT '[]',
      assignee TEXT DEFAULT '',
      priority TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // 2. Default Labels
  const labelCount = await sql`SELECT COUNT(*) FROM labels`;
  if (parseInt(labelCount[0].count, 10) === 0) {
    await sql`
      INSERT INTO labels (id, name, color) VALUES
      ('bug', 'bug', '#C2410C'),
      ('feature', 'feature', '#2563EB'),
      ('design', 'design', '#BE185D'),
      ('docs', 'docs', '#7C3AED'),
      ('chore', 'chore', '#475569');
    `;
  }

  // 3. Default Columns & Issues (Seed if empty)
  const colCount = await sql`SELECT COUNT(*) FROM columns`;
  if (parseInt(colCount[0].count, 10) === 0) {
    const todoRows = await sql`INSERT INTO columns (name, position) VALUES ('Todo', 1024) RETURNING id;`;
    const doingRows = await sql`INSERT INTO columns (name, position) VALUES ('In progress', 2048) RETURNING id;`;
    const doneRows = await sql`INSERT INTO columns (name, position) VALUES ('Done', 3072) RETURNING id;`;

    const todoId = todoRows[0].id;
    const doingId = doingRows[0].id;
    const doneId = doneRows[0].id;

    await sql`
      INSERT INTO issues (title, body, column_id, position, labels, assignee, priority) VALUES
      ('Set up CI pipeline', '', ${todoId}, 1024, '["chore"]'::jsonb, 'minhaj', 'P2'),
      ('Login page crashes on empty password', 'Steps:\n1. Open /login\n2. Submit with empty password', ${todoId}, 2048, '["bug"]'::jsonb, '', 'P1'),
      ('Board drag and drop', '', ${doingId}, 1024, '["feature", "design"]'::jsonb, 'minhaj', 'P1'),
      ('Write API docs', '', ${doneId}, 1024, '["docs"]'::jsonb, '', 'P3');
    `;
  }
}
