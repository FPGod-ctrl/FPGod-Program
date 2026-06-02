import { crudRouter } from './crudFactory.js';

const router = crudRouter({
  table: 'meeting_transcripts',
  columns: [
    'client_id', 'group_id', 'title', 'meeting_date', 'content', 'summary', 'action_items',
  ],
  required: ['content'],
  orderBy: 'meeting_date DESC NULLS LAST, created_at DESC',
  filters: ['client_id', 'group_id'],
});

export default router;
