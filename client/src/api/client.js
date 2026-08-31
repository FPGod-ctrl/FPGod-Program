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
  /**
   * POST that reads a newline-delimited JSON stream, calling `onEvent` for each
   * event as it arrives. Used for generations that run for minutes so the UI can
   * show real progress. Resolves with the final `done` event's payload.
   *
   * Note the buffering: a chunk can split a line anywhere, so only complete
   * lines are parsed and the remainder is carried to the next chunk.
   */
  async postStream(p, body, onEvent) {
    const res = await fetch(`${BASE}/api${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try { message = (await res.json())?.error?.message || message; } catch { /* non-JSON */ }
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let final = null;

    const handle = (line) => {
      if (!line.trim()) return;
      let evt;
      try { evt = JSON.parse(line); } catch { return; } // ignore a malformed line
      if (evt.type === 'error') throw new Error(evt.message || 'Generation failed');
      if (evt.type === 'done') final = evt;
      onEvent?.(evt);
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // last element is an incomplete line
      lines.forEach(handle);
    }
    handle(buffer); // flush whatever the stream ended on

    if (!final) throw new Error('The generation ended without returning a document');
    return final;
  },

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
