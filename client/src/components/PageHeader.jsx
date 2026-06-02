// Sticky page top bar. Pages render <PageHeader/> then their own <div className="content">.
export default function PageHeader({ title, sub, actions }) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {sub && <div className="topbar-sub">{sub}</div>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
