import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { crudRouter } from './crudFactory.js';

const current = crudRouter({
  table: 'current_investments',
  columns: [
    'client_id', 'group_id', 'fund_name', 'ticker', 'account_type', 'balance',
    'allocation_pct', 'asset_class', 'risk_profile', 'fee_pct', 'provider', 'notes',
  ],
  required: ['fund_name'],
  orderBy: 'balance DESC',
  filters: ['client_id', 'group_id'],
});

const recommended = crudRouter({
  table: 'recommended_investments',
  columns: [
    'client_id', 'group_id', 'plan_id', 'fund_name', 'ticker', 'account_type',
    'target_amount', 'allocation_pct', 'asset_class', 'risk_profile', 'fee_pct',
    'provider', 'rationale',
  ],
  required: ['fund_name'],
  orderBy: 'target_amount DESC NULLS LAST',
  filters: ['client_id', 'group_id', 'plan_id'],
});

const router = Router();
router.use('/current', current);
router.use('/recommended', recommended);

// Side-by-side comparison + computed totals for a client.
router.get(
  '/comparison/:clientId',
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const [{ rows: cur }, { rows: rec }] = await Promise.all([
      query('SELECT * FROM current_investments WHERE client_id = $1 ORDER BY balance DESC', [clientId]),
      query('SELECT * FROM recommended_investments WHERE client_id = $1 ORDER BY target_amount DESC NULLS LAST', [clientId]),
    ]);

    const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);
    const weightedFee = (rows, balKey) => {
      const total = sum(rows, balKey);
      if (!total) return 0;
      return rows.reduce((s, r) => s + Number(r[balKey] || 0) * Number(r.fee_pct || 0), 0) / total;
    };

    res.json({
      current: cur,
      recommended: rec,
      totals: {
        currentBalance: sum(cur, 'balance'),
        recommendedTarget: sum(rec, 'target_amount'),
        currentWeightedFee: Number(weightedFee(cur, 'balance').toFixed(3)),
        recommendedWeightedFee: Number(weightedFee(rec, 'target_amount').toFixed(3)),
      },
    });
  })
);

export default router;
