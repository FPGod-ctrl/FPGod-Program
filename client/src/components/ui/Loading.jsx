export function Spinner() {
  return <span className="spinner" />;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="center-load">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function Empty({ icon = '📭', title = 'Nothing here yet', children }) {
  return (
    <div className="empty">
      <div className="e-ico">{icon}</div>
      <h3 style={{ marginTop: 12 }}>{title}</h3>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}

export default Loading;
