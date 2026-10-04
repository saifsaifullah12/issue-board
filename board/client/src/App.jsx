import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { makeMatcher } from './filter';
import Column from './components/Column';
import IssueModal from './components/IssueModal';

const byPosition = (a, b) => a.position - b.position;

export default function App() {
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [newColumn, setNewColumn] = useState(null);

  const reload = useCallback(() => api.getBoard().then(setBoard).catch((e) => setError(e.message)), []);
  useEffect(() => { reload(); }, [reload]);

  const fail = (e) => { setError(e.message); reload(); };
  const replaceIssue = (issue) =>
    setBoard((b) => ({ ...b, issues: b.issues.map((i) => (i.id === issue.id ? issue : i)) }));

  // ----- issue actions -----
  const moveIssue = (id, columnId, position) => {
    setBoard((b) => ({ ...b, issues: b.issues.map((i) => (i.id === id ? { ...i, columnId, position } : i)) }));
    api.updateIssue(id, { columnId, position }).then(replaceIssue).catch(fail);
  };
  const createIssue = (columnId, title) =>
    api.createIssue({ columnId, title })
      .then((issue) => setBoard((b) => ({ ...b, issues: [...b.issues, issue] })))
      .catch(fail);
  const saveIssue = (id, patch) => api.updateIssue(id, patch).then(replaceIssue).catch(fail);
  const deleteIssue = (id) => {
    setBoard((b) => ({ ...b, issues: b.issues.filter((i) => i.id !== id) }));
    api.deleteIssue(id).catch(fail);
  };

  // ----- column actions -----
  const addColumn = async () => {
    const name = (newColumn || '').trim();
    setNewColumn(null);
    if (!name) return;
    try {
      const column = await api.createColumn(name);
      setBoard((b) => ({ ...b, columns: [...b.columns, column] }));
    } catch (e) { fail(e); }
  };
  const renameColumn = (id, name) => {
    setBoard((b) => ({ ...b, columns: b.columns.map((c) => (c.id === id ? { ...c, name } : c)) }));
    api.updateColumn(id, { name }).catch(fail);
  };
  const deleteColumn = (id) =>
    api.deleteColumn(id)
      .then(() => setBoard((b) => ({ ...b, columns: b.columns.filter((c) => c.id !== id) })))
      .catch((e) => setError(e.message));

  const matches = useMemo(() => makeMatcher(query), [query]);

  if (!board) return <div className="state">{error ? `Couldn't load the board: ${error}` : 'Loading board…'}</div>;

  const columns = [...board.columns].sort(byPosition);
  const openIssue = board.issues.find((i) => i.id === openId);
  const shown = board.issues.filter(matches).length;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Product board</h1>
        <input
          className="filter"
          type="search"
          placeholder="Filter: text, #12, label:bug, @minhaj, priority:P1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter items"
        />
        {query && <span className="filter-count">{shown} of {board.issues.length}</span>}
      </header>

      {error && (
        <div className="toast" role="alert">
          {error}
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      <main className="board">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            issues={board.issues.filter((i) => i.columnId === column.id && matches(i)).sort(byPosition)}
            labels={board.labels}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
            onMove={moveIssue}
            onCreate={createIssue}
            onOpen={setOpenId}
            onRename={renameColumn}
            onDelete={deleteColumn}
          />
        ))}

        <div className="add-column">
          {newColumn === null ? (
            <button className="ghost" onClick={() => setNewColumn('')}>+ Add column</button>
          ) : (
            <input
              autoFocus
              placeholder="Column name"
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
              onBlur={addColumn}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addColumn();
                if (e.key === 'Escape') setNewColumn(null);
              }}
            />
          )}
        </div>
      </main>

      {openIssue && (
        <IssueModal
          issue={openIssue}
          columns={columns}
          labels={board.labels}
          onSave={saveIssue}
          onDelete={deleteIssue}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
