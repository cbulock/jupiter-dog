'use client';

import { useCallback, useEffect, useState } from 'react';
import { photoDate, photoUrl } from '@/state';
import styles from './admin.module.css';

const endpoint = '/.netlify/functions/photo-admin';
async function api(action, data, method = data === undefined ? 'GET' : 'POST', query = '') {
  const response = await fetch(`${endpoint}?action=${action}${query}`, {
    method, credentials: 'same-origin', cache: 'no-store',
    ...(data !== undefined ? { headers: { 'Content-Type': data instanceof Blob ? 'application/octet-stream' : 'application/json' },
      body: data instanceof Blob ? data : JSON.stringify(data) } : {}),
  });
  let result;
  try { result = await response.json(); } catch { throw new Error('The photo service is unavailable. Please retry.'); }
  if (!response.ok) {
    const error = new Error(result.error || 'The request failed. Please retry.');
    error.status = response.status; throw error;
  }
  return result;
}
const sourceLabels = { 'exif-original': 'Camera date', 'exif-created': 'Camera creation date',
  'dropbox-client': 'Dropbox file date', 'dropbox-server': 'Dropbox save date', 'file-modified': 'File date',
  imported: 'Date added', legacy: 'Existing photo date' };

function PhotoEditor({ photo, onSaved, onError }) {
  const [saving, setSaving] = useState(false);
  async function save(value) {
    setSaving(true);
    try { await api('date', { fileName: photo.fileName, date: value }); await onSaved('Photo date saved.'); }
    catch (error) { onError(error); } finally { setSaving(false); }
  }
  return <article className={styles.photo}>
    {/* A plain image avoids the image optimizer retaining private manager previews. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photoUrl(photo)} alt={`Jupiter, ${photoDate(photo.createdDate)}`} loading="lazy" />
    <div className={styles.photoBody}>
      <h3 title={photo.displayName}>{photo.displayName}</h3>
      <p className={styles.caption}>{photo.source === 'admin' ? 'Uploaded here' : photo.source === 'dropbox' ? 'Dropbox' : 'Existing collection'} · {photo.manualDate ? 'Corrected date' : photo.estimated ? 'Estimated date' : 'Camera date'}</p>
      <form onSubmit={(event) => { event.preventDefault(); save(new FormData(event.currentTarget).get('date')); }}>
        <label>Photo date<input key={photo.createdDate} name="date" type="date" required min="1900-01-01" max="2100-12-31" defaultValue={photo.createdDate.slice(0, 10)} /></label>
        <div className={styles.actions}><button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save date'}</button>
          {photo.manualDate && <button type="button" className={styles.secondary} disabled={saving} onClick={() => save(null)}>Use automatic date</button>}</div>
      </form>
      <p className={styles.caption}>{sourceLabels[photo.dateSource] || 'Automatic date'}: {photoDate(photo.automaticDate)}</p>
    </div>
  </article>;
}

export default function PhotoManager() {
  const [session, setSession] = useState(null);
  const [password, setPassword] = useState('');
  const [photos, setPhotos] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');
  const [estimated, setEstimated] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState([]);
  const [report, setReport] = useState(null);
  const onError = useCallback((problem) => {
    setError(problem.message);
    if (problem.status === 401) setSession({ configured: true, authenticated: false });
  }, []);
  const refresh = useCallback(async (notice) => {
    const data = await api('photos'); setPhotos(data.photos); setJobs(data.jobs);
    setProgress((rows) => rows.map((row) => {
      const job = data.jobs.find((item) => item.id === row.id);
      return job?.status === 'published' ? { ...row, status: 'Published' }
        : job?.status === 'error' ? { ...row, status: job.error || 'Processing failed. Retry below.' } : row;
    }));
    if (notice) setMessage(notice);
  }, []);
  useEffect(() => { api('session').then(setSession).catch(onError); }, [onError]);
  useEffect(() => {
    if (!session?.authenticated) return;
    refresh().catch(onError);
    const interval = setInterval(() => { if (!document.hidden) refresh().catch(onError); }, 5000);
    return () => clearInterval(interval);
  }, [session?.authenticated, refresh, onError]);

  async function signIn(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('login', { password }); setPassword(''); setSession({ configured: true, authenticated: true }); }
    catch (problem) { onError(problem); } finally { setBusy(false); }
  }
  async function action(fn) {
    setBusy(true); setError(''); setMessage('');
    try { await fn(); } catch (problem) { onError(problem); } finally { setBusy(false); }
  }
  async function sync(repair = false) {
    await api('sync', { repair });
    setMessage(repair ? 'Repair started. Results will appear below.' : 'Dropbox sync started. Results will appear below.');
  }
  async function uploadFiles(files) {
    setUploading(true); setError(''); setMessage('');
    const selected = Array.from(files);
    setProgress(selected.map((file) => ({ name: file.name, status: 'Waiting' })));
    const update = (index, status, id) => setProgress((rows) => rows.map((row, i) => i === index ? { ...row, status, ...(id ? { id } : {}) } : row));
    for (const [index, file] of selected.entries()) {
      let resumeKey;
      try {
        if (!/\.(jpe?g|png|gif|webp)$/i.test(file.name) || file.size > 50 * 1024 * 1024 || !file.size) throw new Error('Choose a JPEG, PNG, GIF, or WebP photo up to 50 MiB.');
        update(index, 'Preparing…');
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))).map((b) => b.toString(16).padStart(2, '0')).join('');
        const storageKey = `jupiter-upload-${digest}-${file.name}-${file.lastModified}`;
        resumeKey = storageKey;
        let saved;
        try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* Start a new upload. */ }
        const id = saved?.expiresAt > Date.now() ? saved.id : crypto.randomUUID();
        update(index, 'Uploading…', id);
        localStorage.setItem(storageKey, JSON.stringify({ id, expiresAt: Date.now() + 86400000 }));
        const state = await api('upload-start', { id, name: file.name, size: file.size, lastModified: file.lastModified, digest });
        localStorage.setItem(storageKey, JSON.stringify({ id, expiresAt: state.expiresAt }));
        if (state.job?.status === 'published') { update(index, 'Already published'); continue; }
        if (['queued', 'processing'].includes(state.job?.status)) { update(index, 'Processing'); continue; }
        const received = new Set(state.received);
        for (let part = 0; part < state.chunks; part++) {
          if (!received.has(part)) await api('upload-chunk', file.slice(part * state.chunkBytes, Math.min((part + 1) * state.chunkBytes, file.size)), 'PUT', `&id=${id}&index=${part}`);
          update(index, `Uploading ${Math.round((part + 1) / state.chunks * 100)}%`);
        }
        await api('upload-complete', { id }); update(index, 'Processing');
      } catch (problem) {
        if (resumeKey && [404, 410].includes(problem.status)) localStorage.removeItem(resumeKey);
        update(index, problem.message); if (problem.status === 401) onError(problem);
      }
    }
    setUploading(false);
    refresh().catch(onError);
  }
  const filtered = photos.filter((photo) => (!estimated || photo.estimated) && photo.displayName.toLowerCase().includes(query.toLowerCase()));
  return <section className={styles.manager} aria-labelledby="manager-title">
    <div className={styles.heading}><div><p className={styles.eyebrow}>Jupiter’s camera roll</p><h1 id="manager-title">Photo manager<span>.</span></h1></div>
      {session?.authenticated && <button className={styles.secondary} disabled={busy || uploading} onClick={() => action(async () => { await api('logout', {}); setSession({ configured: true, authenticated: false }); setPhotos([]); setJobs([]); setReport(null); })}>Sign out</button>}</div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.notice} role="status">{message}</p>}
    {!session ? <p>Connecting to the photo service…</p> : !session.configured ? <p className={styles.panel}>Photo administration has not been enabled yet.</p> : !session.authenticated ?
      <form onSubmit={signIn} className={`${styles.panel} ${styles.login}`}><h2>Welcome back</h2><p>Sign in to add photos and update their dates.</p>
        <label>Admin password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form> : <>
        <section className={styles.panel} aria-labelledby="upload-title"><h2 id="upload-title">Add a little more Jupiter</h2><p>Choose photos from your phone or computer. They’ll appear in the gallery when processing finishes.</p>
          <label className={styles.fileLabel}>Choose photos<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple disabled={uploading} onChange={(event) => { uploadFiles(event.target.files); event.target.value = ''; }} /></label>
          <p className={styles.caption}>JPEG, PNG, GIF, or WebP · Up to 50 MiB each. Interrupted upload? Select the same file again within 24 hours to resume.</p>
          {progress.length > 0 && <ul className={styles.progress} aria-live="polite">{progress.map((item, index) => <li key={index}><span>{item.name}</span><strong>{item.status}</strong></li>)}</ul>}
        </section>
        <section className={styles.panel} aria-labelledby="collection-title"><h2 id="collection-title">Collection tools</h2>
          <div className={styles.actions}><button disabled={busy} onClick={() => action(() => sync())}>Sync Dropbox</button>
            <button className={styles.secondary} disabled={busy} onClick={() => action(async () => setReport(await api('audit')))}>Check collection</button>
            <button className={styles.secondary} disabled={busy} onClick={() => action(() => sync(true))}>Repair missing photos</button></div>
          {report && <div className={styles.audit}><p>{report.complete.length} complete · {report.missingMetadata.length} missing photo records · {report.missingImages.length} missing images · {report.fallbackDates.length} estimated dates</p>
            <details><summary>View collection report</summary><pre>{JSON.stringify(report, null, 2)}</pre></details></div>}
          {jobs.length > 0 && <details className={styles.activity}><summary>Recent activity ({jobs.length})</summary><ul>{jobs.map((job) => <li key={job.id}><div><strong>{job.name || 'Dropbox sync'}</strong><span>{job.status}{job.kind === 'sync' && ` · ${job.added || 0} added, ${job.updated || 0} updated`}</span>
            {job.error && <p>{job.error}</p>}{job.errors?.map((failure, index) => <p key={index}>{failure.name}: {failure.error}</p>)}</div>
            {['error', 'partial', 'pending', 'queued', 'processing'].includes(job.status) && <button className={styles.secondary} disabled={busy} onClick={() => action(async () => { if (job.kind === 'upload') await api('upload-complete', { id: job.id }); else await sync(true); await refresh('Retry requested.'); })}>Retry</button>}</li>)}</ul></details>}
        </section>
        <div className={styles.filters}><label>Find a photo<input type="search" placeholder="Search filenames" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className={styles.checkbox}><input type="checkbox" checked={estimated} onChange={(event) => setEstimated(event.target.checked)} />Estimated dates only</label><span>{filtered.length} photos</span></div>
        <div className={styles.grid}>{filtered.map((photo) => <PhotoEditor key={photo.fileName} photo={photo} onSaved={refresh} onError={onError} />)}</div>
        {!filtered.length && <p className={styles.panel}>{photos.length ? 'No photos match this search.' : 'Your photos will appear here after they are imported.'}</p>}
      </>}
  </section>;
}
