import { useRef, useState } from 'react';
import IssueCard from './IssueCard';
import { positionBetween } from '../filter';

export default function Column({
  column, issues, labels, draggingId, setDraggingId,
  onMove, onCreate, onOpen, onRename, onDelete,
}) {
  const listRef = useRef(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editingName, setEditingName] = useState(false);

  // Cards other than the one being dragged, in display order
  const others = issues.filter((i) => i.id !== draggingId);

  const indexFromPointer = (clientY) => {
    const cards = [...listRef.current.querySelectorAll('[data-card]:not(.is-dragging)')];
    const i = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return clientY < r.top + r.height / 2;
    });
    return i === -1 ? cards.length : i;
  };

  const handleDragOver = (e) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIndex(indexFromPointer(e.clientY));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/issue-id');
    const idx = dropIndex ?? others.length;
    setDropIndex(null);
    setDraggingId(null);
    if (!id) return;
    const position = positionBetween(others[idx - 1], others[idx]);
    onMove(id, column.id, position);
  };

  const submitDraft = () => {
    const title = (draft || '').trim();
    if (title) onCreate(column.id, title);
    setDraft(title ? '' : null); // stays open for quick entry of the next one
  };

  const commitName = (value) => {
    setEditingName(false);
    const name = value.trim();
    if (name && name !== column.name) onRename(column.id, name);
  };

  let k = 0; // index among non-dragged cards, used to place the drop line
  return (
    <section
      className={`column ${dropIndex !== null ? 'is-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropIndex(null); }}
      onDrop={handleDrop}
      aria-label={column.name}
    >
      <header className="column-head">
        {editingName ? (
          <input
            className="column-name-input"
            autoFocus
            defaultValue={column.name}
            onBlur={(e) => commitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setEditingName(false);
            }}
          />
        ) : (
          <button className="column-name" onClick={() => setEditingName(true)} title="Rename column">
            {column.name}
          </button>
        )}
        <span className="count">{issues.length}</span>
        <button
          className="icon"
          aria-label={`Delete column ${column.name}`}
          onClick={() => { if (confirm(`Delete "${column.name}"?`)) onDelete(column.id); }}
        >
          ×
        </button>
      </header>

      <div className="cards" ref={listRef}>
        {issues.map((issue) => {
          const isDragged = issue.id === draggingId;
          const showLine = !isDragged && dropIndex === k;
          if (!isDragged) k++;
          return (
            <div key={issue.id}>
              {showLine && <div className="drop-line" />}
              <IssueCard
                issue={issue}
                labels={labels}
                isDragging={isDragged}
                onOpen={() => onOpen(issue.id)}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/issue-id', issue.id);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggingId(issue.id);
                }}
                onDragEnd={() => { setDraggingId(null); setDropIndex(null); }}
              />
            </div>
          );
        })}
        {dropIndex === others.length && <div className="drop-line" />}
        {issues.length === 0 && dropIndex === null && <p className="empty">Drop items here or add one below.</p>}
      </div>

      {draft === null ? (
        <button className="ghost add-item" onClick={() => setDraft('')}>+ Add item</button>
      ) : (
        <textarea
          className="draft"
          autoFocus
          rows={2}
          placeholder="Title, then Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (!draft.trim()) setDraft(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDraft(); }
            if (e.key === 'Escape') setDraft(null);
          }}
        />
      )}
    </section>
  );
}
