import React, { useState } from 'react';

function List({ items }) {
  if (!items || !items.length) return <p className="tbd">TBD</p>;
  return (
    <ul>
      {items.map((i, n) => (
        <li key={n}>{i}</li>
      ))}
    </ul>
  );
}

function Table({ cols, rows, cells }) {
  if (!rows || !rows.length) return <p className="tbd">TBD</p>;
  return (
    <table>
      <thead>
        <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, n) => (
          <tr key={n}>{cells(r).map((v, m) => <td key={m}>{v || 'TBD'}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TestPlanView({ plan, issue, markdown }) {
  const [raw, setRaw] = useState(false);

  return (
    <div className="plan">
      <div className="plan-head">
        <div>
          <h3>{plan.title}</h3>
          <p className="meta">
            <span>{plan.testPlanId}</span> · <span>{issue.issueType}</span> · <span>{issue.priority}</span> ·{' '}
            <span>{issue.status}</span>
          </p>
        </div>
        <button className="ghost" onClick={() => setRaw((r) => !r)}>
          {raw ? 'Formatted' : 'Markdown'}
        </button>
      </div>

      {raw ? (
        <pre className="md">{markdown}</pre>
      ) : (
        <div className="sections">
          <section>
            <h4>1. Objective</h4>
            <p>{plan.objective}</p>
          </section>
          <section>
            <h4>2. Scope</h4>
            <h5>In Scope</h5>
            <List items={plan.scope.inScope} />
            <h5>Out of Scope</h5>
            <List items={plan.scope.outOfScope} />
          </section>
          <section>
            <h4>3. Inclusions</h4>
            <List items={plan.inclusions} />
          </section>
          <section>
            <h4>4. Test Environments</h4>
            <List items={plan.testEnvironments} />
          </section>
          <section>
            <h4>5. Defect Reporting</h4>
            <p>{plan.defectReporting}</p>
          </section>
          <section>
            <h4>6. Test Strategy</h4>
            <List items={plan.testStrategy} />
          </section>
          <section>
            <h4>7. Schedule</h4>
            <Table
              cols={['Phase', 'Owner', 'Dates']}
              rows={plan.schedule}
              cells={(s) => [s.phase, s.owner, s.dates]}
            />
          </section>
          <section>
            <h4>8. Deliverables</h4>
            <List items={plan.deliverables} />
          </section>
          <section>
            <h4>9. Entry Criteria</h4>
            <List items={plan.entryCriteria} />
          </section>
          <section>
            <h4>10. Exit Criteria</h4>
            <List items={plan.exitCriteria} />
          </section>
          <section>
            <h4>11. Tools</h4>
            <List items={plan.tools} />
          </section>
          <section>
            <h4>12. Risks &amp; Mitigations</h4>
            <Table cols={['Risk', 'Mitigation']} rows={plan.risks} cells={(r) => [r.risk, r.mitigation]} />
          </section>
          <section>
            <h4>13. Approvals</h4>
            <Table cols={['Role', 'Name']} rows={plan.approvals} cells={(a) => [a.role, a.name]} />
          </section>
        </div>
      )}
    </div>
  );
}
