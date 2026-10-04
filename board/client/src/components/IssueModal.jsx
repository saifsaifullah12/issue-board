import { useEffect, useRef, useState } from 'react';
import LabelChip from './LabelChip';

export default function IssueModal({ issue, columns, labels, onSave, onDelete, onClose }) {
  const ref = useRef(null);
  const [form, setForm] = useState(issue);

  useEffect(() => { ref.current?.showModal(); }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleLabel = (id) =>
    setForm((f) => ({ ...f, labels: f.labels.includes(id) ? f.labels.filter((l) => l !== id) : [...f.labels, id] }));

  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const patch = {};
    for (const k of ['title', 'body', 'assignee', 'priority', 'labels', 'columnId'])
      if (JSON.stringify(form[k]) !== JSON.stringify(issue[k])) patch[k] = form[k];
    if (Object.keys(patch).length) onSave(issue.id, patch);
    onClose();
  };

  return (
    <dialog ref={ref} className="modal" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <form onSubmit={save} className="modal-body">
        <div className="modal-head">
          <span className="number">#{issue.number}</span>
          <button type="button" className="icon" onClick={onClose} aria-label="Close">×</button>
        </div>

        <input className="title-input" value={form.title} onChange={set('title')} aria-label="Title" required />

        <div className="fields">
          <label>Status
            <select value={form.columnId} onChange={set('columnId')}>
              {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Assignee
            <input value={form.assignee} onChange={set('assignee')} placeholder="username" />
          </label>
          <label>Priority
            <select value={form.priority} onChange={set('priority')}>
              <option value="">None</option>
              <option>P0</option><option>P1</option><option>P2</option><option>P3</option>
            </select>
          </label>
        </div>

        <fieldset className="labels-field">
          <legend>Labels</legend>
          <div className="chips">
            {labels.map((l) => (
              <LabelChip key={l.id} label={l} active={form.labels.includes(l.id)} onClick={() => toggleLabel(l.id)} />
            ))}
          </div>
        </fieldset>

        <label className="body-field">Description
          <textarea rows={8} value={form.body} onChange={set('body')} placeholder="Add details, steps, links…" />
        </label>

        <div className="modal-actions">
          <button
            type="button"
            className="danger"
            onClick={() => { if (confirm(`Delete #${issue.number}?`)) { onDelete(issue.id); onClose(); } }}
          >
            Delete item
          </button>
          <span className="spacer" />
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Save changes</button>
        </div>
      </form>
    </dialog>
  );
}
