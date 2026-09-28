import { isOpenTask as isOpen } from '../lib/taskNotes.js';
import { todayLocal as today } from '../lib/crm.js';

/** Overdue and due-today are the only date states worth colouring. */
function dueTone(due, status) {
  if (!due || !isOpen({ status })) return '';
  if (due < today()) return 'overdue';
  if (due === today()) return 'today';
  return '';
}

/** Where the date came from, so an assumed turnaround is not mistaken for a deadline. */
const DUE_ORIGIN = {
  email: 'Deadline stated in the email',
  user: 'You set this date',
  default: 'Assumed 24-hour turnaround — no deadline was given',
};

/**
 * Editable due date. A native date input keeps the keyboard and picker behaviour
 * without a dependency, and the tone class carries the overdue/today colouring
 * that the read-only badge used to.
 */
export default function DueCell({ task, disabled, onChange }) {
  const tone = dueTone(task.due, task.status);
  return (
    <input
      type="date"
      className={`task-date ${tone} ${task.dueSource === 'default' ? 'assumed' : ''}`}
      value={task.due || ''}
      disabled={disabled}
      title={DUE_ORIGIN[task.dueSource] || 'No due date'}
      aria-label={`Due date for ${task.task}`}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
