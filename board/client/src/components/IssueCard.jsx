import LabelChip from './LabelChip';

export default function IssueCard({ issue, labels, isDragging, onOpen, onDragStart, onDragEnd }) {
  const issueLabels = issue.labels.map((id) => labels.find((l) => l.id === id)).filter(Boolean);

  return (
    <article
      data-card
      className={`card ${isDragging ? 'is-dragging' : ''}`}
      draggable
      tabIndex={0}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`#${issue.number} ${issue.title}`}
    >
      <div className="card-meta">
        <span className="number">#{issue.number}</span>
        {issue.priority && <span className={`priority p-${issue.priority.toLowerCase()}`}>{issue.priority}</span>}
      </div>
      <h3 className="card-title">{issue.title}</h3>
      {(issueLabels.length > 0 || issue.assignee) && (
        <div className="card-foot">
          <div className="chips">{issueLabels.map((l) => <LabelChip key={l.id} label={l} />)}</div>
          {issue.assignee && (
            <span className="avatar" title={issue.assignee}>{issue.assignee.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      )}
    </article>
  );
}
