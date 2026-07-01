export async function uploadPdf(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  return res.json();
}

export async function fetchDocs() {
  const res = await fetch('/api/docs');
  const data = await res.json();
  return data.docs;
}

export async function deleteDoc(docName) {
  await fetch(`/api/docs/${encodeURIComponent(docName)}`, { method: 'DELETE' });
}

export async function fetchAgents() {
  const res = await fetch('/api/agents');
  const data = await res.json();
  return data.agents;
}

export async function fetchTools() {
  const res = await fetch('/api/agents/tools');
  const data = await res.json();
  return data.tools;
}

export async function createAgent(body) {
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()).agent;
}

export async function updateAgent(id, body) {
  const res = await fetch(`/api/agents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()).agent;
}

export async function deleteAgent(id) {
  await fetch(`/api/agents/${id}`, { method: 'DELETE' });
}
