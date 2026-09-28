import { useState } from 'react';
import { Link } from 'react-router-dom';
import { daysAgo, relative, dayShort, tierOf, todayLocal, KIND_META } from '../../lib/crm.js';
import TierBadge from './TierBadge.jsx';

/**
 * The pipeline as columns, one per stage of the firm's review thread. Drag a
 * card to another column to move the client; click it to open their record.
 * Files that have finished (in force, on hold, not proceeding) sit under the
 * board as counts rather than columns.
 */
export default function PipelineBoard({ stages, contacts, meta, onMove, onShowStage }) {
  const [over, setOver] = useState('');
  const [dragging, setDragging] = useState('');
  const open = stages.filter((s) => s.open);
  const closed = stages.filter((s) => !s.open);
  const live = contacts.filter((c) => c.status !== 'archived');
  const today = todayLocal();

  const byStage = (key) =>
    live
      .filter((c) => c.crm_stage === key)
      // Anything needing attention first, then whoever has waited longest.
      .sort((a, b) =>
        (b.attention.length > 0) - (a.attention.length > 0)
        || new Date(a.crm_stage_changed_at || a.created_at) - new Date(b.crm_stage_changed_at || b.created_at));

  const drop = (e, key) => {
    e.preventDefault();
    setOver('');
    // dragend does not always fire once the drop re-renders the board.
    setDragging('');
    const id = e.dataTransfer.getData('text/plain');
    const c = live.find((x) => x.id === id);
    if (c && c.crm_stage !== key) onMove(c, key);
  };

  const unstaged = live.filter((c) => !c.crm_stage).length;

  return (
    <>
      <div className="board" role="list">
        {open.map((s) => {
          const cards = byStage(s.key);
          return (
            <section
              key={s.key}
              role="listitem"
              className={`board-col ${over === s.key ? 'over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(s.key); }}
              onDragLeave={() => setOver((o) => (o === s.key ? '' : o))}
              onDrop={(e) => drop(e, s.key)}
            >
              <header className="board-head" title={s.xplan ? `XPLAN: ${s.xplan}` : undefined}>
                <span className="board-title">{s.label}</span>
                <span className="board-count">{cards.length}</span>
              </header>
              <div className="board-cards">
                {cards.map((c) => {
                  const days = daysAgo(c.crm_stage_changed_at || c.created_at);
                  const next = c.next_task;
                  const overdue = next?.due && next.due < today;
                  return (
                    <Link
                      key={c.id}
                      to={`/crm/${c.id}`}
                      className={`board-card ${dragging === c.id ? 'dragging' : ''} ${c.attention.length ? 'warn' : ''}`}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); setDragging(c.id); }}
                      onDragEnd={() => setDragging('')}
                    >
                      <div className="bc-top">
                        <span className="bc-name">{c.display_name}</span>
                        <TierBadge tier={tierOf(meta, c.client_tier)} />
                      </div>
                      {c.crm_thread && <div className="bc-thread">{c.crm_thread}</div>}
                      {next && (
                        <div className={`bc-line ${overdue ? 'overdue' : ''}`}>
                          <span aria-hidden="true">☐</span> {next.task}
                          {next.due && <span className="bc-due"> · {overdue ? 'overdue ' : ''}{dayShort(next.due)}</span>}
                        </div>
                      )}
                      <div className="bc-foot">
                        <span>
                          {c.last_contact_at
                            ? <>{KIND_META[c.last_contact_kind]?.icon} {relative(c.last_contact_at)}</>
                            : 'No contact logged'}
                        </span>
                        <span title="Days in this stage">{days}d</span>
                      </div>
                    </Link>
                  );
                })}
                {!cards.length && <div className="board-empty">Drop a client here</div>}
              </div>
            </section>
          );
        })}
      </div>

      <div className="board-off">
        <span className="faint small">Off the board:</span>
        {closed.map((s) => (
          <button key={s.key} className="chip" onClick={() => onShowStage(s.key)}>
            {s.label} <span className="chip-n">{live.filter((c) => c.crm_stage === s.key).length}</span>
          </button>
        ))}
        <button className="chip" onClick={() => onShowStage('none')}>
          Not in the pipeline <span className="chip-n">{unstaged}</span>
        </button>
      </div>
    </>
  );
}
