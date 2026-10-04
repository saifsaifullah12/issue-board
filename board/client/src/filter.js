// Supports: free text, #12, label:bug, assignee:minhaj (or @minhaj), priority:P1
export function makeMatcher(query) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return () => true;
  return (issue) =>
    tokens.every((t) => {
      if (t.startsWith('label:')) return issue.labels.some((l) => l.toLowerCase() === t.slice(6));
      if (t.startsWith('assignee:')) return issue.assignee.toLowerCase() === t.slice(9);
      if (t.startsWith('@')) return issue.assignee.toLowerCase() === t.slice(1);
      if (t.startsWith('priority:')) return (issue.priority || '').toLowerCase() === t.slice(9);
      if (/^#\d+$/.test(t)) return String(issue.number) === t.slice(1);
      return issue.title.toLowerCase().includes(t) || issue.body.toLowerCase().includes(t);
    });
}

// Position between two neighbours; keeps ordering without renumbering the whole column
export function positionBetween(before, after) {
  if (before && after) return (before.position + after.position) / 2;
  if (before) return before.position + 1024;
  if (after) return after.position - 1024;
  return 1024;
}
