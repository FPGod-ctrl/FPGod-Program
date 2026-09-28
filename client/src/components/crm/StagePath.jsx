/**
 * Where the file is up to, as a row of steps — the firm's XPLAN review thread in
 * order. Click a step to move the client there; the outcomes at the end take the
 * file off the board.
 */
export default function StagePath({ stages, current, onChange, busy }) {
  const open = stages.filter((s) => s.open);
  const closed = stages.filter((s) => !s.open);
  const idx = open.findIndex((s) => s.key === current);
  // Every step is behind a file whose cover went in force — not one on hold or dropped.
  const won = closed.find((s) => s.key === current)?.outcome === 'won';

  return (
    <div className="stage-path-wrap">
      <ol className="stage-path" aria-label="Pipeline stage">
        {open.map((s, i) => {
          const state = s.key === current ? 'current' : (won || (idx >= 0 && i < idx)) ? 'done' : '';
          return (
            <li key={s.key} className={`path-step ${state}`}>
              <button
                type="button"
                disabled={busy}
                title={s.xplan ? `XPLAN: ${s.xplan}` : s.label}
                aria-current={s.key === current ? 'step' : undefined}
                onClick={() => s.key !== current && onChange(s.key)}
              >
                {state === 'done' && <span aria-hidden="true">✓ </span>}
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="path-outcomes" role="group" aria-label="Outcome">
        <span className="path-outcomes-label">Close the file</span>
        {closed.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={busy}
            className={`path-out o-${s.key} ${current === s.key ? 'on' : ''}`}
            title={s.xplan || s.label}
            onClick={() => onChange(current === s.key ? null : s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
