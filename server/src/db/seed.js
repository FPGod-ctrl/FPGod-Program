import { pool, withTransaction } from '../config/db.js';

/**
 * Seeds a realistic starter dataset:
 *  - one couple group with two clients
 *  - one individual client
 *  - current + recommended investments
 *  - a draft financial plan, a meeting transcript, a follow-up email
 *  - a batch of historical "training data" plans/emails
 */
async function seed() {
  await withTransaction(async (c) => {
    // Clean slate (FK cascades handle children).
    await c.query('TRUNCATE training_data, chat_messages RESTART IDENTITY CASCADE');
    await c.query(`TRUNCATE followup_emails, meeting_transcripts, recommended_investments,
                   current_investments, financial_plans, documents, clients, client_groups
                   RESTART IDENTITY CASCADE`);

    // ---- Group: the Harrisons (couple) ----
    const { rows: [group] } = await c.query(
      `INSERT INTO client_groups (name, group_type, notes)
       VALUES ($1,$2,$3) RETURNING id`,
      ['The Harrison Household', 'couple', 'Joint retirement planning, two dependents.']
    );

    const { rows: [alice] } = await c.query(
      `INSERT INTO clients
        (group_id, first_name, last_name, email, phone, date_of_birth, occupation,
         risk_profile, annual_income, net_worth, status)
       VALUES ($1,'Alice','Harrison','alice.h@example.com','+1-555-0101','1979-04-12',
               'Software Director','balanced',185000,920000,'active')
       RETURNING id`,
      [group.id]
    );
    const { rows: [bob] } = await c.query(
      `INSERT INTO clients
        (group_id, first_name, last_name, email, phone, date_of_birth, occupation,
         risk_profile, annual_income, net_worth, status)
       VALUES ($1,'Bob','Harrison','bob.h@example.com','+1-555-0102','1981-09-30',
               'Physician','growth',240000,920000,'active')
       RETURNING id`,
      [group.id]
    );

    // ---- Individual client ----
    const { rows: [carol] } = await c.query(
      `INSERT INTO clients
        (first_name, last_name, email, phone, date_of_birth, occupation,
         risk_profile, annual_income, net_worth, status)
       VALUES ('Carol','Nguyen','carol.n@example.com','+1-555-0103','1990-01-22',
               'Founder','aggressive',150000,610000,'prospect')
       RETURNING id`
    );

    // ---- Current investments ----
    const current = [
      [alice.id, 'Vanguard Total Stock Market', 'VTSAX', 'IRA', 220000, 45, 'equity', 'growth', 0.04],
      [alice.id, 'iShares Core Aggregate Bond', 'AGG', 'IRA', 120000, 25, 'bond', 'conservative', 0.03],
      [bob.id, 'Fidelity 500 Index', 'FXAIX', '401k', 180000, 40, 'equity', 'growth', 0.015],
      [bob.id, 'Cash Reserve', null, 'GIA', 60000, 10, 'cash', 'conservative', 0.0],
      [carol.id, 'ARK Innovation ETF', 'ARKK', 'GIA', 90000, 60, 'equity', 'aggressive', 0.75],
    ];
    for (const r of current) {
      await c.query(
        `INSERT INTO current_investments
          (client_id, fund_name, ticker, account_type, balance, allocation_pct,
           asset_class, risk_profile, fee_pct)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        r
      );
    }

    // ---- A financial plan for the group ----
    const { rows: [plan] } = await c.query(
      `INSERT INTO financial_plans
        (group_id, client_id, title, status, completeness, generated_by_ai, summary, content)
       VALUES ($1,$2,$3,'draft',95,true,$4,$5) RETURNING id`,
      [
        group.id,
        alice.id,
        'Harrison Household — Retirement & Education Plan',
        'Balanced glide-path toward retirement at 62 with a college funding sleeve.',
        '# Harrison Household Financial Plan\n\n## Objectives\n- Retire by age 62 with $2.4M portfolio\n- Fund two children\'s college (est. $320k)\n\n## Recommendations\n1. Shift 5% from cash into a diversified bond ladder.\n2. Consolidate IRA + 401k into a managed balanced model.\n3. Open 529 accounts funded at $1,500/mo each.\n',
      ]
    );

    // ---- Recommended investments linked to the plan ----
    const recommended = [
      [alice.id, plan.id, 'FPGod Balanced Model Portfolio', null, 'IRA', 340000, 60, 'multi-asset', 'balanced', 0.35, 'Lower blended fee, automated rebalancing.'],
      [bob.id, plan.id, 'FPGod Growth Model Portfolio', null, '401k', 240000, 55, 'multi-asset', 'growth', 0.40, 'Aligns to longer horizon and higher risk tolerance.'],
    ];
    for (const r of recommended) {
      await c.query(
        `INSERT INTO recommended_investments
          (client_id, plan_id, fund_name, ticker, account_type, target_amount,
           allocation_pct, asset_class, risk_profile, fee_pct, rationale)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        r
      );
    }

    // ---- Meeting transcript + follow-up email ----
    const { rows: [tr] } = await c.query(
      `INSERT INTO meeting_transcripts
        (group_id, client_id, title, meeting_date, content, summary)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [
        group.id,
        alice.id,
        'Q2 Review — Harrison Household',
        '2026-05-20',
        'Advisor: Thanks for joining. Alice: We are worried about the cash sitting idle. Bob: And we want to start the kids\' college funds this year. Advisor: Understood, I\'ll propose a bond ladder and two 529 plans.',
        'Couple wants idle cash deployed and college funds started this year.',
      ]
    );
    await c.query(
      `INSERT INTO followup_emails
        (group_id, client_id, transcript_id, subject, body, status, generated_by_ai)
       VALUES ($1,$2,$3,$4,$5,'draft',true)`,
      [
        group.id,
        alice.id,
        tr.id,
        'Following up on your Q2 review',
        'Hi Alice and Bob,\n\nGreat speaking with you. As discussed, I\'ll prepare a bond ladder to put your idle cash to work and set up two 529 college accounts. I\'ll send the paperwork this week.\n\nBest,\nYour Advisor',
      ]
    );

    // ---- Training data: historical plans + emails ----
    const strategies = [
      'tax-loss harvesting', 'Roth conversion ladder', 'bond tent glide path',
      'dividend growth tilt', 'factor diversification', 'liability-driven investing',
      'bucket strategy', 'dynamic withdrawal', 'estate gifting', 'HSA maximization',
    ];
    const values = [];
    const params = [];
    let i = 1;
    for (let n = 0; n < 80; n += 1) {
      const strat = strategies[n % strategies.length];
      const kind = n % 5 === 0 ? 'email' : 'plan';
      const title = `Historical ${kind} #${n + 1} — ${strat}`;
      const content =
        kind === 'plan'
          ? `# ${title}\n\nClient sought retirement readiness. Strategy applied: ${strat}. Outcome: improved after-tax return and clearer glide path.`
          : `Subject: Recap & next steps\n\nThank you for the meeting. As discussed we will apply ${strat} to improve your outcome. Next steps attached.`;
      values.push(`($${i},$${i + 1},$${i + 2},$${i + 3})`);
      params.push(kind, title, content, `{${strat.replace(/[^a-z ]/gi, '').split(' ').join(',')}}`);
      i += 4;
    }
    await c.query(
      `INSERT INTO training_data (kind, title, content, tags) VALUES ${values.join(',')}`,
      params
    );

    // eslint-disable-next-line no-console
    console.log('[seed] inserted: 1 group, 3 clients, investments, 1 plan, 1 transcript, 1 email, 80 training rows');
  });
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed:', err.message);
    pool.end();
    process.exit(1);
  });
