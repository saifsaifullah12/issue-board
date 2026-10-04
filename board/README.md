# Issue board (React + Node)

A GitHub Projects–style board: columns, draggable issue cards, an item modal, labels, assignees, priority and a filter bar.

## Run it

```bash
npm run install:all
npm run dev
```

- Web: http://localhost:5173  (Vite proxies `/api` to the server)
- API: http://localhost:4000

Data is stored in `server/db.json` (created and seeded on first run). Delete it to reset.

## How it works

**Ordering.** Every issue has a `columnId` and a numeric `position`. Dropping a card between two others sets its position to the midpoint of its neighbours, so a move is a single `PATCH` — no renumbering. The server respreads a column if positions ever get too close.

**Drag and drop.** Native HTML5 drag events, no library. The column works out the drop index from the pointer's Y position against each card's midpoint and draws a line there. Moves update the UI immediately and roll back (by reloading) if the API call fails.

**Keyboard.** Tab to a card, press Enter to open it, and change **Status** in the modal to move it.

**Filter.** Free text, `#12`, `label:bug`, `@minhaj` / `assignee:minhaj`, `priority:P1`. Tokens combine with AND.

## API

| Method | Path | Body |
|---|---|---|
| GET | `/api/board` | — |
| POST | `/api/columns` | `{ name }` |
| PATCH | `/api/columns/:id` | `{ name?, position? }` |
| DELETE | `/api/columns/:id` | 409 if the column still has items |
| POST | `/api/issues` | `{ title, columnId, body?, labels?, assignee?, priority? }` |
| PATCH | `/api/issues/:id` | any of `title, body, labels, assignee, priority, columnId, position` |
| DELETE | `/api/issues/:id` | — |

## Next steps worth adding

- Swap the JSON file for Postgres (a `columns` and `issues` table map directly).
- Real-time sync between tabs/users with Socket.IO: broadcast after each write.
- Column drag-to-reorder (same midpoint trick on `column.position`).
- Auth and per-user assignees; comments and activity log per issue.
- Multiple views (table / roadmap) over the same issue data, like GitHub Projects.
