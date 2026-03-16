let activeTab = 'url';
let lastResult = null;

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.etab').forEach((t, i) => t.classList.toggle('active', ['url','message'][i] === tab));
  document.getElementById('input-url').style.display = tab === 'url' ? 'block' : 'none';
  document.getElementById('input-message').style.display = tab === 'message' ? 'block' : 'none';
  document.getElementById('result').classList.remove('show');
}

async function runScan() {
  const input = activeTab === 'url'
    ? document.getElementById('url-input').value.trim()
    : document.getElementById('msg-input').value.trim();

  if (!input) { alert('Please enter something to scan.'); return; }

  const btn = document.getElementById('scan-btn');
  btn.disabled = true;
  document.getElementById('loading').style.display = 'block';
  document.getElementById('result').classList.remove('show');

  const userContent = activeTab === 'url'
    ? [{ type: 'text', text: `Analyse this URL for scam risk: ${input}` }]
    : [{ type: 'text', text: `Analyse this message for scam risk:\n\n${input}` }];

  const sys = `You are DivoX Trust, an AI scam detection expert. Analyse the content and respond ONLY with valid JSON — no markdown, no extra text.

{"score":<0-100>,"label":"<SAFE|LOW RISK|MEDIUM RISK|HIGH RISK|DANGER>","riskClass":"<risk-safe|risk-low|risk-medium|risk-high>","summary":"<2-3 sentences, plain English, specific and human>","verdict":"<1 strong closing sentence>"}

Scoring: 0-15 safe, 16-35 minor concerns, 36-60 suspicious, 61-85 high risk, 86-100 almost certainly a scam.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://divoxtrust.vercel.app/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openrouter/auto',
        max_tokens: 400,
        system: sys,
        messages: [{ role: 'user', content: userContent }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await res.json();
    const raw = data.content.map(b => b.text || '').join('');
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid response received.');
    const parsed = JSON.parse(jsonMatch[0]);
    lastResult = parsed;
    renderResult(parsed);
  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    if (err.name === 'AbortError') {
      alert('Taking too long. Please try again.');
    } else {
      alert('Error: ' + err.message);
    }
  } finally {
    btn.disabled = false;
  }
}

function renderResult(d) {
  document.getElementById('loading').style.display = 'none';
  const el = document.getElementById('result');
  el.className = 'result show ' + d.riskClass;
  document.getElementById('risk-label').textContent = d.label;
  document.getElementById('risk-pct').textContent = d.score + '%';
  document.getElementById('summary').textContent = d.summary;
  document.getElementById('verdict').textContent = d.verdict || '';
}

function shareResult() {
  if (!lastResult) return;
  const text = `I just scanned something with DivoX Trust — ${lastResult.score}% risk (${lastResult.label}).\n\n"${lastResult.summary}"\n\nCheck it yourself: https://divoxtrust.vercel.app`;
  navigator.clipboard.writeText(text).then(() => alert('Copied! Paste it anywhere to share.'));
}

// Auto-fill if triggered from right-click context menu
chrome.storage.local.get('pendingScan', (data) => {
  if (data.pendingScan) {
    const { type, data: content } = data.pendingScan;
    if (type === 'url') {
      document.getElementById('url-input').value = content;
    } else {
      switchTab('message');
      document.getElementById('msg-input').value = content;
    }
    chrome.storage.local.remove('pendingScan');
    runScan();
  }
});
