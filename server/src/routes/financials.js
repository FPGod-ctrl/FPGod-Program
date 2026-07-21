import { Router } from 'express';
import { crudRouter } from './crudFactory.js';

/**
 * REST routers for the client financial breakdown: assets, liabilities, income,
 * expenses, insurance and goals. Each is a standard crudRouter filtered by
 * client_id/group_id. Estate planning is a one-row-per-client upsert handled in
 * routes/clients.js, not here.
 */
const router = Router();

router.use('/assets', crudRouter({
  table: 'assets',
  columns: ['client_id', 'group_id', 'category', 'name', 'value', 'owner', 'notes'],
  required: ['name'],
  orderBy: 'value DESC',
  filters: ['client_id', 'group_id'],
}));

router.use('/liabilities', crudRouter({
  table: 'liabilities',
  columns: ['client_id', 'group_id', 'liability_type', 'name', 'balance',
    'interest_rate', 'monthly_payment', 'lender', 'owner', 'notes'],
  required: ['name'],
  orderBy: 'balance DESC',
  filters: ['client_id', 'group_id'],
}));

router.use('/income', crudRouter({
  table: 'income_sources',
  columns: ['client_id', 'group_id', 'income_type', 'name', 'amount', 'frequency', 'owner', 'notes'],
  required: ['name'],
  orderBy: 'amount DESC',
  filters: ['client_id', 'group_id'],
}));

router.use('/expenses', crudRouter({
  table: 'expenses',
  columns: ['client_id', 'group_id', 'category', 'name', 'amount', 'frequency', 'notes'],
  required: ['name'],
  orderBy: 'amount DESC',
  filters: ['client_id', 'group_id'],
}));

router.use('/insurance', crudRouter({
  table: 'insurance_policies',
  columns: ['client_id', 'group_id', 'policy_type', 'provider', 'cover_amount',
    'premium', 'frequency', 'policy_number', 'notes'],
  required: ['policy_type'],
  orderBy: 'cover_amount DESC NULLS LAST',
  filters: ['client_id', 'group_id'],
}));

router.use('/goals', crudRouter({
  table: 'financial_goals',
  columns: ['client_id', 'group_id', 'name', 'target_amount', 'current_amount',
    'target_date', 'priority', 'notes'],
  required: ['name'],
  orderBy: 'target_date ASC NULLS LAST',
  filters: ['client_id', 'group_id'],
}));

export default router;
