export default function LabelChip({ label, active = true, onClick }) {
  const style = { color: label.color, background: `${label.color}1A`, borderColor: `${label.color}55` };
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`chip ${active ? '' : 'chip-off'}`}
      style={active ? style : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
    >
      {label.name}
    </Tag>
  );
}
