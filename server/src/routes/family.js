import { crudRouter } from './crudFactory.js';

// Family members / dependents (children and other people on a client's file).
const family = crudRouter({
  table: 'family_members',
  columns: [
    'client_id', 'group_id', 'first_name', 'last_name',
    'relationship', 'date_of_birth', 'is_dependent', 'notes',
  ],
  required: ['first_name'],
  orderBy: 'date_of_birth ASC NULLS LAST, created_at ASC',
  filters: ['client_id', 'group_id'],
});

export default family;
