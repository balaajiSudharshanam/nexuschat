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
