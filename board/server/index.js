import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sql, initDb } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const GAP = 1024;

const app = express();
app.use(cors());
app.use(express.json());

const mapIssue = (row) => ({
  id: row.id,
  number: row.number,
  title: row.title,
  body: row.body || '',
  columnId: row.column_id,
  position: Number(row.position),
  labels: Array.isArray(row.labels) ? row.labels : (typeof row.labels === 'string' ? JSON.parse(row.labels) : []),
  assignee: row.assignee || '',
  priority: row.priority || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapColumn = (row) => ({
  id: row.id,
  name: row.name,
  position: Number(row.position),
});

// 1. Get Board Data
app.get('/api/board', async (_req, res) => {
  try {
    const [columns, labels, issues] = await Promise.all([
      sql`SELECT * FROM columns ORDER BY position ASC`,
      sql`SELECT * FROM labels ORDER BY name ASC`,
      sql`SELECT * FROM issues ORDER BY position ASC`,
    ]);

    res.json({
      columns: columns.map(mapColumn),
      labels: labels,
      issues: issues.map(mapIssue),
    });
  } catch (err) {
    console.error('Error fetching board:', err);
    res.status(500).json({ error: 'Failed to fetch board data' });
  }
});

// 2. Create Column
app.post('/api/columns', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Column name is required' });

    const maxPosRes = await sql`SELECT COALESCE(MAX(position), 0) as max_pos FROM columns`;
    const position = Number(maxPosRes[0].max_pos) + GAP;

    const result = await sql`
      INSERT INTO columns (name, position)
      VALUES (${name}, ${position})
      RETURNING *
    `;

    res.status(201).json(mapColumn(result[0]));
  } catch (err) {
    console.error('Error creating column:', err);
    res.status(500).json({ error: 'Failed to create column' });
  }
});

// 3. Update Column
app.patch('/api/columns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await sql`SELECT * FROM columns WHERE id = ${id}`;
    if (!existing.length) return res.status(404).json({ error: 'Column not found' });

    const col = existing[0];
    const newName = req.body.name !== undefined ? String(req.body.name).trim() : col.name;
    const newPos = req.body.position !== undefined ? Number(req.body.position) : Number(col.position);

    const result = await sql`
      UPDATE columns
      SET name = ${newName}, position = ${newPos}
      WHERE id = ${id}
      RETURNING *
    `;

    res.json(mapColumn(result[0]));
  } catch (err) {
    console.error('Error updating column:', err);
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// 4. Delete Column
app.delete('/api/columns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const countRes = await sql`SELECT COUNT(*) as cnt FROM issues WHERE column_id = ${id}`;
    if (parseInt(countRes[0].cnt, 10) > 0) {
      return res.status(409).json({ error: 'Move or delete the items in this column first' });
    }

    const result = await sql`DELETE FROM columns WHERE id = ${id} RETURNING id`;
    if (!result.length) return res.status(404).json({ error: 'Column not found' });
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting column:', err);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// 5. Create Issue
app.post('/api/issues', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const columnId = req.body.columnId;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const colCheck = await sql`SELECT 1 FROM columns WHERE id = ${columnId}`;
    if (!colCheck.length) return res.status(400).json({ error: 'Unknown column' });

    const maxPosRes = await sql`SELECT COALESCE(MAX(position), 0) as max_pos FROM issues WHERE column_id = ${columnId}`;
    const position = Number(maxPosRes[0].max_pos) + GAP;
    const labels = JSON.stringify(req.body.labels || []);
    const assignee = req.body.assignee || '';
    const priority = req.body.priority || '';
    const body = req.body.body || '';

    const result = await sql`
      INSERT INTO issues (title, body, column_id, position, labels, assignee, priority)
      VALUES (${title}, ${body}, ${columnId}, ${position}, ${labels}::jsonb, ${assignee}, ${priority})
      RETURNING *
    `;

    res.status(201).json(mapIssue(result[0]));
  } catch (err) {
    console.error('Error creating issue:', err);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// 6. Update Issue
app.patch('/api/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await sql`SELECT * FROM issues WHERE id = ${id}`;
    if (!existing.length) return res.status(404).json({ error: 'Issue not found' });

    const current = existing[0];
    let newTitle = req.body.title !== undefined ? req.body.title : current.title;
    let newBody = req.body.body !== undefined ? req.body.body : current.body;
    let newColumnId = req.body.columnId !== undefined ? req.body.columnId : current.column_id;
    let newAssignee = req.body.assignee !== undefined ? req.body.assignee : current.assignee;
    let newPriority = req.body.priority !== undefined ? req.body.priority : current.priority;
    let newLabels = req.body.labels !== undefined ? JSON.stringify(req.body.labels) : JSON.stringify(current.labels);
    let newPosition = req.body.position;

    if (req.body.columnId && req.body.columnId !== current.column_id) {
      const colCheck = await sql`SELECT 1 FROM columns WHERE id = ${req.body.columnId}`;
      if (!colCheck.length) return res.status(400).json({ error: 'Unknown column' });

      if (newPosition === undefined) {
        const maxPosRes = await sql`SELECT COALESCE(MAX(position), 0) as max_pos FROM issues WHERE column_id = ${req.body.columnId}`;
        newPosition = Number(maxPosRes[0].max_pos) + GAP;
      }
    } else if (newPosition === undefined) {
      newPosition = current.position;
    }

    const result = await sql`
      UPDATE issues
      SET title = ${newTitle},
          body = ${newBody},
          column_id = ${newColumnId},
          position = ${newPosition},
          labels = ${newLabels}::jsonb,
          assignee = ${newAssignee},
          priority = ${newPriority},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // Rebalance if cards are too close
    const list = await sql`SELECT id, position FROM issues WHERE column_id = ${newColumnId} ORDER BY position ASC`;
    const tooClose = list.some((it, idx) => idx > 0 && Number(it.position) - Number(list[idx - 1].position) < 1e-6);
    if (tooClose) {
      for (let idx = 0; idx < list.length; idx++) {
        await sql`UPDATE issues SET position = ${(idx + 1) * GAP} WHERE id = ${list[idx].id}`;
      }
    }

    res.json(mapIssue(result[0]));
  } catch (err) {
    console.error('Error updating issue:', err);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// 7. Delete Issue
app.delete('/api/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sql`DELETE FROM issues WHERE id = ${id} RETURNING id`;
    if (!result.length) return res.status(404).json({ error: 'Issue not found' });
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting issue:', err);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

// Start Server
async function start() {
  try {
    await initDb();
    console.log('✅ Connected to Neon PostgreSQL (HTTPS) & tables initialized!');
    app.listen(PORT, () => console.log(`🚀 API ready on http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
}

start();
