/**
 * CRM vocabulary: pipeline stages and the kinds of contact that get logged.
 *
 * The stages follow the firm's own XPLAN "Review" thread (SharePoint:
 * Documents & Templates\Threads broken down.xlsx), in its order: research and
 * schedule, make contact, present initial findings / CvC, prepare the fact find,
 * start the SOA, peer review, present the SOA for signing, application and
 * submission checklist, underwriting (and amended terms), then the completion
 * checklist, XPLAN update and welcome letter. `xplan` records which thread tasks
 * each stage covers, so a stage can be checked against the thread.
 *
 * Kept here rather than as a database CHECK so the list can be renamed or
 * reordered without a migration. A contact whose stage is later removed keeps
 * its value and shows as "Unknown stage" until it is moved.
 */
export const STAGES = [
  { key: 'lead', label: 'New lead', open: true,
    xplan: 'New Prospect — referral or enquiry not yet worked' },
  { key: 'research', label: 'Research & schedule', open: true,
    xplan: 'Generate Schedule / Research' },
  { key: 'initial_meeting', label: 'Initial meeting & CVC', open: true,
    xplan: 'Make contact with Client; Present Initial findings/CvC' },
  { key: 'fact_find', label: 'Fact find', open: true,
    xplan: 'Prepare FF; Present FF for signing & start SOA' },
  { key: 'soa', label: 'SOA in progress', open: true,
    xplan: 'SOA being written' },
  { key: 'peer_review', label: 'Peer review', open: true,
    xplan: 'Present SOA for peer review' },
  { key: 'soa_presented', label: 'SOA presented', open: true,
    xplan: 'Present SOA to client for signing' },
  { key: 'application', label: 'Application', open: true,
    xplan: 'Application / Submission Checklist' },
  { key: 'underwriting', label: 'Underwriting', open: true,
    xplan: 'Underwriting; Amended Terms' },
  { key: 'completion', label: 'Completion', open: true,
    xplan: 'Checklist / update XP; Send welcome letter' },
  // Off the board: where a file ends up.
  { key: 'in_force', label: 'Cover in force', open: false, outcome: 'won',
    xplan: 'Thread complete — client on the books' },
  { key: 'on_hold', label: 'On hold', open: false },
  { key: 'not_proceeding', label: 'Not proceeding (NPW)', open: false, outcome: 'lost',
    xplan: 'NPW — not proceeding with' },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);
export const OPEN_STAGE_KEYS = STAGES.filter((s) => s.open).map((s) => s.key);
export const stageLabel = (key) => STAGES.find((s) => s.key === key)?.label || 'Unknown stage';

/**
 * What can be logged by hand. `stage` is written by the server when a contact
 * moves, never posted directly, so it is kept out of LOGGABLE_KINDS.
 *
 * Logging an email records that one was sent or received and what it said. The
 * CRM never reads, drafts or sends mail itself.
 */
export const ACTIVITY_KINDS = ['call', 'email', 'meeting', 'sms', 'letter', 'note', 'stage'];
export const LOGGABLE_KINDS = ACTIVITY_KINDS.filter((k) => k !== 'stage');
// Kinds that are an actual exchange with someone, and so count as "last contact".
// A note is the adviser writing to themselves; a stage change is bookkeeping.
export const CONTACT_KINDS = ['call', 'email', 'meeting', 'sms', 'letter'];
export const DIRECTIONS = ['outbound', 'inbound'];
export const CALL_OUTCOMES = ['Spoke', 'Left voicemail', 'No answer', 'Wrong number'];

// A contact in the pipeline with nothing logged for this long needs a nudge.
export const STALE_DAYS = 14;

export const CONTACT_STATUSES = ['prospect', 'active', 'inactive', 'archived'];
