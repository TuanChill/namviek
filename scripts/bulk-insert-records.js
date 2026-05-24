const DB_ID = '26053ee7-c165-4a66-8f11-eba47e727ed9';
const BASE = 'http://localhost:4001/api';
const API_KEY = process.env.MCP_API_KEY || 'namviek-mcp-dev-key';

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${res.statusText} ${path}: ${txt}`);
  }

  return res.json();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateISO(startYear = 2022, endYear = 2026) {
  const start = new Date(`${startYear}-01-01T00:00:00.000Z`).getTime();
  const end = new Date(`${endYear}-12-31T23:59:59.999Z`).getTime();
  const t = start + Math.floor(Math.random() * (end - start));
  return new Date(t).toISOString();
}

function titleFor(i) {
  const themes = ['Growth', 'Launch', 'Insights', 'Guide', 'Update', 'Checklist', 'Story', 'Deep Dive', 'Trends', 'Playbook'];
  const topics = ['AI', 'Product', 'Marketing', 'Design', 'Sales', 'DevOps', 'Analytics', 'Mobile', 'Web', 'Data'];
  return `${pick(themes)}: ${pick(topics)} #${i + 1}`;
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const fields = await api(`/databases/${DB_ID}/fields`);
  const users = await api('/users');

  const byName = new Map(fields.map((f) => [normalizeName(f.name), f]));

  const contentTitleField = byName.get('content title');
  const platformField = byName.get('plantform') || byName.get('platform');
  const publishDateField = byName.get('publish datae') || byName.get('publish date');
  const authorField = byName.get('author');
  const statusField = byName.get('status');

  const missing = [
    ['Content Title', contentTitleField],
    ['Plantform/Platform', platformField],
    ['Publish datae/Publish date', publishDateField],
    ['Author', authorField],
    ['Status', statusField],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(`Missing fields: ${missing.join(', ')}`);
  }

  if (!platformField.options?.length) throw new Error('Platform field has no options');
  if (!statusField.options?.length) throw new Error('Status field has no options');
  if (!users.length) throw new Error('No users found for Person field');

  const TOTAL = 5020;
  let created = 0;

  for (let i = 0; i < TOTAL; i += 1) {
    const rec = await api(`/databases/${DB_ID}/records`, { method: 'POST', body: '{}' });

    await Promise.all([
      api(`/records/${rec.id}/values/${contentTitleField.id}`, {
        method: 'PUT',
        body: JSON.stringify({ databaseId: DB_ID, textValue: titleFor(i) }),
      }),
      api(`/records/${rec.id}/values/${platformField.id}`, {
        method: 'PUT',
        body: JSON.stringify({ databaseId: DB_ID, selectValue: pick(platformField.options).id }),
      }),
      api(`/records/${rec.id}/values/${publishDateField.id}`, {
        method: 'PUT',
        body: JSON.stringify({ databaseId: DB_ID, dateValue: randomDateISO() }),
      }),
      api(`/records/${rec.id}/values/${authorField.id}`, {
        method: 'PUT',
        body: JSON.stringify({ databaseId: DB_ID, personValue: [pick(users).id] }),
      }),
      api(`/records/${rec.id}/values/${statusField.id}`, {
        method: 'PUT',
        body: JSON.stringify({ databaseId: DB_ID, selectValue: pick(statusField.options).id }),
      }),
    ]);

    created += 1;

    if ((i + 1) % 25 === 0) {
      console.log(`Created ${i + 1}/${TOTAL}`);
    }
  }

  const page = await api(`/databases/${DB_ID}/records/page?limit=1`);
  console.log(`Done. Inserted ${created} records. Total records now: ${page.total}`);
}

main().catch((err) => {
  console.error('Bulk insert failed:', err.message);
  process.exit(1);
});
