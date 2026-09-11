"""Self-contained interactive HTML report for a suite run.

Produces a single .html file (no CDN/network dependencies) that can be
emailed or dropped in a shared drive: summary cards, per-metric averages,
filters/search, and expandable per-test-case detail.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from .report import METRIC_DISPLAY_ORDER, TestCaseResult

# All current metrics score higher = better, including DeepEval's
# HallucinationMetric (it reports factual alignment with the context).
_LOWER_IS_BETTER = set()


def _metric_payload(result: TestCaseResult) -> list:
    out = []
    for key, label in METRIC_DISPLAY_ORDER:
        outcome = result.metric_outcomes.get(key)
        if outcome is None:
            out.append({"key": key, "label": label, "state": "na", "detail": "Not applicable to this test case"})
        elif outcome.skipped_reason:
            out.append({"key": key, "label": label, "state": "na", "detail": outcome.skipped_reason})
        elif outcome.error:
            out.append({"key": key, "label": label, "state": "error", "detail": outcome.error})
        else:
            out.append(
                {
                    "key": key,
                    "label": label,
                    "state": "pass" if outcome.success else "fail",
                    "score": outcome.score,
                    "detail": outcome.reason or "",
                    "lowerIsBetter": key in _LOWER_IS_BETTER,
                }
            )
    return out


def _averages(results: List[TestCaseResult]) -> list:
    out = []
    for key, label in METRIC_DISPLAY_ORDER:
        scores = [
            r.metric_outcomes[key].score
            for r in results
            if key in r.metric_outcomes and r.metric_outcomes[key].score is not None
        ]
        out.append(
            {
                "key": key,
                "label": label,
                "average": (sum(scores) / len(scores)) if scores else None,
                "evaluated": len(scores),
                "lowerIsBetter": key in _LOWER_IS_BETTER,
            }
        )
    return out


def build_report_data(results: List[TestCaseResult], title: str) -> dict:
    cases = []
    for index, r in enumerate(results, start=1):
        tc = r.test_case
        cases.append(
            {
                "index": index,
                "question": tc.question,
                "expected": tc.expected_answer or "",
                "actual": r.actual_answer or "",
                "apiError": r.api_error,
                "retrievedContext": r.retrieved_context or [],
                "expectedContext": tc.expected_context or [],
                "category": tc.metadata.get("category", "uncategorized"),
                "difficulty": tc.metadata.get("difficulty", ""),
                "testType": tc.metadata.get("test_type", ""),
                "pass": r.overall_pass,
                "metrics": _metric_payload(r),
            }
        )

    passed = sum(1 for c in cases if c["pass"])
    return {
        "title": title,
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total": len(cases),
        "passed": passed,
        "failed": len(cases) - passed,
        "apiErrors": sum(1 for c in cases if c["apiError"]),
        "averages": _averages(results),
        "cases": cases,
    }


def render_html_report(results: List[TestCaseResult], title: str = "Unica MaxAI DeepEval Report") -> str:
    data = build_report_data(results, title)
    # Escaping '<' prevents a '</script>' inside any answer from breaking out.
    payload = json.dumps(data).replace("<", "\\u003c")
    return _TEMPLATE.replace("__TITLE__", title).replace("/*__DATA__*/null", payload)


def write_html_report(results: List[TestCaseResult], path: str, title: str = "Unica MaxAI DeepEval Report") -> str:
    html = render_html_report(results, title)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(html)
    return path


_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
  :root {
    --bg:#0f1420; --panel:#171d2c; --panel2:#1e2536; --line:#2a3348;
    --text:#e6eaf3; --muted:#95a0b8; --pass:#2ecc71; --fail:#ff5f6d;
    --warn:#f5b342; --na:#6b7690; --accent:#4c9aff;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg:#f5f7fb; --panel:#ffffff; --panel2:#f0f3f9; --line:#dde3ee;
      --text:#131824; --muted:#5a6580; --na:#98a1b5;
    }
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
    font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .wrap { max-width:1200px; margin:0 auto; padding:28px 20px 60px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--muted); font-size:13px; margin-bottom:22px; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:22px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px 16px; }
  .card .n { font-size:26px; font-weight:600; }
  .card .l { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.4px; }
  .pass { color:var(--pass); } .fail { color:var(--fail); } .warnc { color:var(--warn); }
  .panel { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:16px; margin-bottom:22px; }
  .panel h2 { font-size:15px; margin:0 0 12px; }
  .avg { display:grid; grid-template-columns:190px 1fr 70px; gap:10px; align-items:center; margin-bottom:8px; }
  .bar { background:var(--panel2); border-radius:99px; height:8px; overflow:hidden; }
  .bar > i { display:block; height:100%; border-radius:99px; background:var(--accent); }
  .muted { color:var(--muted); }
  .controls { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
  input[type=search], select { background:var(--panel); color:var(--text); border:1px solid var(--line);
    border-radius:8px; padding:9px 11px; font-size:13px; outline:none; }
  input[type=search] { flex:1; min-width:220px; }
  input[type=search]:focus, select:focus { border-color:var(--accent); }
  .row { background:var(--panel); border:1px solid var(--line); border-radius:10px; margin-bottom:8px; overflow:hidden; }
  .rowhead { display:flex; gap:12px; align-items:flex-start; padding:12px 14px; cursor:pointer; }
  .rowhead:hover { background:var(--panel2); }
  .badge { flex:none; font-size:11px; font-weight:700; padding:3px 9px; border-radius:99px; letter-spacing:.4px; }
  .b-pass { background:rgba(46,204,113,.15); color:var(--pass); }
  .b-fail { background:rgba(255,95,109,.15); color:var(--fail); }
  .q { flex:1; font-weight:500; }
  .tags { color:var(--muted); font-size:12px; margin-top:3px; font-weight:400; }
  .chev { flex:none; color:var(--muted); transition:transform .15s; }
  .row.open .chev { transform:rotate(90deg); }
  .body { display:none; padding:0 14px 16px; border-top:1px solid var(--line); }
  .row.open .body { display:block; }
  .sec { margin-top:14px; }
  .sec h4 { margin:0 0 6px; font-size:12px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); }
  .txt { background:var(--panel2); border:1px solid var(--line); border-radius:8px; padding:10px 12px;
    white-space:pre-wrap; word-break:break-word; }
  table { width:100%; border-collapse:collapse; margin-top:6px; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; font-size:13px; }
  th { color:var(--muted); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.4px; }
  .s-pass { color:var(--pass); font-weight:600; } .s-fail { color:var(--fail); font-weight:600; }
  .s-na { color:var(--na); } .s-error { color:var(--warn); font-weight:600; }
  .err { background:rgba(255,95,109,.12); border:1px solid rgba(255,95,109,.35); color:var(--fail);
    border-radius:8px; padding:10px 12px; }
  .empty { text-align:center; color:var(--muted); padding:30px; }
  ul.ctx { margin:0; padding-left:18px; } ul.ctx li { margin-bottom:5px; }
  @media print { .controls, .chev { display:none; } .body { display:block !important; } body { background:#fff; } }
</style>
</head>
<body>
<div class="wrap">
  <h1 id="title"></h1>
  <div class="sub" id="sub"></div>

  <div class="cards" id="cards"></div>

  <div class="panel">
    <h2>Average scores</h2>
    <div id="avgs"></div>
  </div>

  <div class="controls">
    <input type="search" id="q" placeholder="Search question, answer or reason...">
    <select id="status"><option value="">All results</option><option value="pass">Passed only</option><option value="fail">Failed only</option></select>
    <select id="cat"></select>
    <select id="type"></select>
  </div>

  <div id="list"></div>
  <div class="empty" id="empty" style="display:none">No test cases match these filters.</div>
</div>

<script id="data" type="application/json">/*__DATA__*/null</script>
<script>
(function () {
  var D = JSON.parse(document.getElementById('data').textContent);
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  };
  var fmt = function (n) { return n == null ? 'N/A' : n.toFixed(3); };

  document.title = D.title;
  document.getElementById('title').textContent = D.title;
  document.getElementById('sub').textContent =
    'Generated ' + D.generatedAt + ' \\u00b7 ' + D.total + ' test cases';

  var rate = D.total ? Math.round(D.passed / D.total * 100) : 0;
  document.getElementById('cards').innerHTML = [
    ['Total', D.total, ''],
    ['Passed', D.passed, 'pass'],
    ['Failed', D.failed, 'fail'],
    ['Pass rate', rate + '%', rate >= 80 ? 'pass' : (rate >= 50 ? 'warnc' : 'fail')],
    ['API errors', D.apiErrors, D.apiErrors ? 'fail' : '']
  ].map(function (c) {
    return '<div class="card"><div class="n ' + c[2] + '">' + c[1] + '</div><div class="l">' + c[0] + '</div></div>';
  }).join('');

  document.getElementById('avgs').innerHTML = D.averages.map(function (a) {
    var pct = a.average == null ? 0 : Math.round(a.average * 100);
    var label = esc(a.label) + (a.lowerIsBetter ? ' <span class="muted">(lower is better)</span>' : '');
    var note = a.evaluated ? '' : ' <span class="muted">&mdash; not evaluated</span>';
    return '<div class="avg"><div>' + label + note + '</div>' +
           '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
           '<div style="text-align:right">' + fmt(a.average) + '</div></div>';
  }).join('');

  var fill = function (id, values, allLabel) {
    var el = document.getElementById(id);
    el.innerHTML = '<option value="">' + allLabel + '</option>' + values.map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
    }).join('');
  };
  var uniq = function (key) {
    return D.cases.map(function (c) { return c[key]; })
      .filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
  };
  fill('cat', uniq('category'), 'All products');
  fill('type', uniq('testType'), 'All test types');

  var metricRows = function (c) {
    return c.metrics.map(function (m) {
      var cls = 's-' + m.state;
      var val = m.state === 'pass' || m.state === 'fail' ? fmt(m.score)
              : (m.state === 'error' ? 'ERROR' : 'N/A');
      var status = m.state === 'pass' ? 'PASS' : m.state === 'fail' ? 'FAIL' : '';
      return '<tr><td>' + esc(m.label) + (m.lowerIsBetter ? ' <span class="muted">(lower is better)</span>' : '') +
             '</td><td class="' + cls + '">' + val + '</td><td class="' + cls + '">' + status +
             '</td><td class="muted">' + esc(m.detail) + '</td></tr>';
    }).join('');
  };

  var ctxList = function (items) {
    return '<ul class="ctx">' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  };

  var render = function (cases) {
    document.getElementById('empty').style.display = cases.length ? 'none' : 'block';
    document.getElementById('list').innerHTML = cases.map(function (c) {
      var tags = [c.category, c.difficulty, c.testType].filter(Boolean).map(esc).join(' \\u00b7 ');
      var body = '';
      if (c.apiError) {
        body += '<div class="sec"><h4>API error</h4><div class="err">' + esc(c.apiError) + '</div></div>';
      }
      body += '<div class="sec"><h4>Expected answer</h4><div class="txt">' + esc(c.expected || '(none)') + '</div></div>';
      body += '<div class="sec"><h4>Actual answer</h4><div class="txt">' + esc(c.actual || '(none)') + '</div></div>';
      body += '<div class="sec"><h4>Metrics</h4><table><tr><th>Metric</th><th>Score</th><th>Result</th><th>Reason</th></tr>' +
              metricRows(c) + '</table></div>';
      if (c.retrievedContext.length) {
        body += '<div class="sec"><h4>Retrieved context</h4>' + ctxList(c.retrievedContext) + '</div>';
      }
      if (c.expectedContext.length) {
        body += '<div class="sec"><h4>Ground-truth context</h4>' + ctxList(c.expectedContext) + '</div>';
      }
      return '<div class="row"><div class="rowhead"><span class="chev">&#9656;</span>' +
             '<span class="badge ' + (c.pass ? 'b-pass">PASS' : 'b-fail">FAIL') + '</span>' +
             '<span class="q">' + c.index + '. ' + esc(c.question) +
             '<div class="tags">' + tags + '</div></span></div>' +
             '<div class="body">' + body + '</div></div>';
    }).join('');
  };

  var apply = function () {
    var q = document.getElementById('q').value.toLowerCase();
    var st = document.getElementById('status').value;
    var cat = document.getElementById('cat').value;
    var ty = document.getElementById('type').value;
    render(D.cases.filter(function (c) {
      if (st === 'pass' && !c.pass) return false;
      if (st === 'fail' && c.pass) return false;
      if (cat && c.category !== cat) return false;
      if (ty && c.testType !== ty) return false;
      if (!q) return true;
      var hay = [c.question, c.expected, c.actual, c.apiError || ''].join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) return true;
      return c.metrics.some(function (m) { return (m.detail || '').toLowerCase().indexOf(q) !== -1; });
    }));
  };

  ['q', 'status', 'cat', 'type'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', apply);
  });

  document.getElementById('list').addEventListener('click', function (e) {
    var head = e.target.closest('.rowhead');
    if (head) head.parentNode.classList.toggle('open');
  });

  apply();
})();
</script>
</body>
</html>
"""
