// Thin fetch wrapper around the FPGod API.
const BASE = import.meta.env.VITE_API_URL || '';

async function request(method, path, body, isForm = false) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    if (isForm) {
      opts.body = body; // FormData — let the browser set the boundary header
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE}/api${path}`, opts);
  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.details = data?.error?.details;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, body) => request('POST', p, body),
  put: (p, body) => request('PUT', p, body),
  del: (p) => request('DELETE', p),
  upload: (p, formData) => request('POST', p, formData, true),
  // Direct download URL (for links / window.open).
  downloadUrl: (docId) => `${BASE}/api/documents/${docId}/download`,
  // POST that returns a binary Blob (e.g. a generated .docx) for download.
  async postForBlob(p, body) {
    const res = await fetch(`${BASE}/api${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try { message = (await res.json())?.error?.message || message; } catch { /* non-JSON */ }
      throw new Error(message);
    }
    return res.blob();
  },
};

export default api;
