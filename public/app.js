'use strict';
const $ = id => document.getElementById(id);
const titles = { overview: 'Overview', sources: 'Knowledge sources', retrieval: 'Search & evidence', memory: 'Development memory', activity: 'Activity & tests', settings: 'Settings & recovery' };
let state = null, selected = localStorage.getItem('cc-project') || '', tab = 'overview', busy = false, lastSearch = null, lastQuery = '', lastFilters = {};
const fragment = new URLSearchParams(location.hash.slice(1));
let token = fragment.get('token') || sessionStorage.getItem('cc-token') || '';
if (fragment.has('token')) {
    sessionStorage.setItem('cc-token', token);
    history.replaceState(null, '', location.pathname + location.search);
}
function node(tag, text = '', className = '') { const el = document.createElement(tag); if (text !== undefined)
    el.textContent = String(text); if (className)
    el.className = className; return el; }
function append(parent, ...children) { for (const child of children.flat())
    if (child !== null && child !== undefined)
        parent.append(child); return parent; }
function button(label, action, style = '') { const b = node('button', label, style); b.type = 'button'; b.addEventListener('click', () => perform(action, b)); return b; }
function pill(text, kind = '') { return node('span', text, `pill ${kind}`); }
function message(text, error = false) { $('notice').hidden = false; $('notice').textContent = text; $('notice').className = 'notice' + (error ? ' error' : ''); }
function json(value) { return node('pre', typeof value === 'string' ? value : JSON.stringify(value, null, 2)); }
function details(title, value) { const d = node('details'); append(d, node('summary', title), json(value)); return d; }
function link(value) { try {
    const u = new URL(value);
    if (['http:', 'https:'].includes(u.protocol)) {
        const a = node('a', value, 'source-link');
        a.href = u.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        return a;
    }
}
catch { } return node('span', value, 'source-link'); }
function project() { return state?.projects.find(p => p.id === selected); }
function date(value) { return value ? new Date(value).toLocaleString() : 'Not yet'; }
function projectUrl(suffix = '') { if (!project())
    throw new Error('Add or select a project first.'); return `/api/projects/${selected}${suffix}`; }
async function request(url, method = 'GET', data) { const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) }); const value = await res.json(); if (!res.ok)
    throw new Error(value.error || `Request failed (${res.status})`); return value; }
async function perform(action, b) { if (b)
    b.disabled = true; try {
    await action();
}
catch (error) {
    message(error.message, true);
}
finally {
    if (b)
        b.disabled = false;
} }
async function reload(renderView = true) { try {
    const next = await request('/api/status');
    state = next;
    $('connection').textContent = 'Local controller connected';
    $('connection').className = 'pill';
    $('runtime-label').textContent = `${state.version} • ${state.node} • ${state.platform}`;
    const old = selected;
    if (!state.projects.some(p => p.id === selected))
        selected = state.projects[0]?.id || '';
    const select = $('project-select');
    select.replaceChildren();
    if (!state.projects.length)
        append(select, node('option', 'No project registered'));
    for (const p of state.projects) {
        const o = node('option', p.name);
        o.value = p.id;
        append(select, o);
    }
    select.value = selected;
    $('connect-codex').disabled = !project();
    $('connect-codex').textContent = project()?.linked ? 'Reconnect Codex' : 'Connect Codex';
    $('project-path').textContent = project()?.root || 'Add any project folder to get started.';
    if (old !== selected) {
        lastSearch = null;
        localStorage.setItem('cc-project', selected);
    }
    if (renderView)
        render();
}
catch (error) {
    $('connection').textContent = 'Connection unavailable';
    $('connection').className = 'pill bad';
    throw error;
} }
function empty(title, body, action) { const e = node('div', '', 'empty'); append(e, node('h2', title), node('p', body, 'subtle')); if (action)
    append(e, action); return e; }
function heading(title, ...actions) { return append(node('div', '', 'section-head'), node('h2', title), append(node('div', '', 'actions'), actions)); }
function card(title, body) { return append(node('article', '', 'card'), node('h3', title), typeof body === 'string' ? node('p', body) : body); }
function field(parent, id, label, type = 'text', value = '', hint = '') { const box = node('div', '', 'field'), lab = node('label', label); lab.htmlFor = id; let input; if (type === 'textarea') {
    input = node('textarea');
    input.rows = 5;
}
else if (Array.isArray(type)) {
    input = node('select');
    for (const option of type) {
        const o = node('option', Array.isArray(option) ? option[1] : option);
        o.value = Array.isArray(option) ? option[0] : option;
        append(input, o);
    }
}
else {
    input = node('input');
    input.type = type;
} input.id = id; input.name = id; if (type === 'checkbox') {
    input.checked = !!value;
    lab.className = 'checklabel';
    lab.prepend(input);
    append(box, lab);
}
else {
    input.value = value === undefined ? '' : value;
    append(box, lab, input);
} if (hint)
    append(box, node('small', hint)); append(parent, box); return input; }
const value = id => $(id)?.value || '';
const checked = id => !!$(id)?.checked;
const lines = id => value(id).split(/[\n,]/).map(s => s.trim()).filter(Boolean);
function parse(text, fallback) { if (!text.trim())
    return fallback; try {
    return JSON.parse(text);
}
catch {
    throw new Error('Advanced JSON is invalid. Correct it before saving.');
} }
function dialog(title, build, save, label = 'Save') { const fields = $('dialog-fields'); fields.replaceChildren(); $('dialog-title').textContent = title; $('dialog-error').hidden = true; $('dialog-submit').textContent = label; $('dialog-submit').hidden = !save; build(fields); $('dialog-form').onsubmit = async (event) => { event.preventDefault(); $('dialog-submit').disabled = true; try {
    await save();
    $('dialog').close();
    await reload();
}
catch (error) {
    $('dialog-error').hidden = false;
    $('dialog-error').textContent = error.message;
}
finally {
    $('dialog-submit').disabled = false;
} }; $('dialog').showModal(); }
function show(title, content) { dialog(title, p => append(p, typeof content === 'string' ? json(content) : json(content)), null); }
function newProject() { dialog('Add a project', p => { field(p, 'project-name', 'Display name', 'text', '', 'Optional. The folder name is used by default.'); const root = field(p, 'project-root', 'Project folder', 'text', '', 'Use an existing absolute folder path. Empty projects and unknown stacks are supported.'); append(p, button('Browse folders', async () => { const r = await request('/api/pick-folder', 'POST', {}); if (r.path)
    root.value = r.path; })); field(p, 'project-index', 'Index eligible project files', 'checkbox', true, 'Secrets, generated folders and symbolic links are excluded.'); field(p, 'project-connect', 'Connect Codex and add project instructions', 'checkbox', true, 'Existing unrelated configuration is preserved. Review new hooks in Codex before trusting them.'); }, async () => { const r = await request('/api/projects', 'POST', { name: value('project-name'), root: value('project-root'), connect: checked('project-connect'), indexProject: checked('project-index') }); selected = r.project.id; localStorage.setItem('cc-project', selected); message((r.warnings || []).join('\n') || 'Project registered.'); }, 'Add project'); }
async function connect() { const r = await request(projectUrl('/link'), 'POST', { enable: true }); message(r.warnings.join('\n') || 'Project configuration updated.'); await reload(); }
function render() { const view = $('view'); view.replaceChildren(); $('page-title').textContent = titles[tab]; document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); if (!state)
    return; if (!project() && !['activity', 'settings'].includes(tab)) {
    append(view, empty('One library. Any project.', 'Register a folder, add knowledge, and let Codex retrieve focused evidence.', button('Add your first project', newProject, 'primary')));
    return;
} ({ overview: overview, sources: sources, retrieval: retrieval, memory: memories, activity: activity, settings: settings })[tab](view); }
function overview(view) {
    const p = project(), attached = state.collections.filter(c => p.collections.includes(c.id)), ready = attached.filter(c => c.active && !c.needsRefresh && c.enabled !== false);
    const grid = node('div', '', 'grid');
    for (const [label, note, num] of [['Attached sources', 'Private or explicitly shared', attached.length], ['Searchable generations', 'Successfully published; inspect live verification', ready.length], ['Development records', 'Decisions, tasks and discoveries', state.memories.filter(m => m.projectId === p.id).length]])
        append(grid, card(label, append(node('div'), node('div', num, 'metric'), node('p', note, 'subtle'))));
    append(view, grid);
    const missing = Object.entries(state.installed).filter(([, ok]) => !ok).map(([name]) => name);
    if (missing.length)
        append(view, node('p', `Not installed: ${missing.join(', ')}. Run Install.bat from this package. Dashboard availability does not mean upstream integrations are verified.`, 'warning spaced'));
    append(view, heading('Your workflow'), card('Add once. Retrieve when useful.', 'Attach versioned references, browse the retrieved evidence, then open the same project in Codex. Your existing Codex login, model selection, approvals and editing workflow stay in place.'));
    append(view, heading('Detected project context', button('Refresh detection', async () => { await request(projectUrl('/detect'), 'POST', {}); await reload(); }), button('Edit project', editProject)), card('Stack & compatibility', append(node('div'), node('p', p.profileManual ? 'Manual profile overrides are active.' : 'Observed from manifests and source files. Declared dependencies are not proof of installed versions.', 'subtle'), details('Inspect language, platform and dependency evidence', p.profile || {}))));
    append(view, card('Knowledge does not decide what is possible', append(node('div'), node('p', 'The stored catalogue is incomplete and may be stale. Codex should compare better approaches when useful, consult primary sources, validate discoveries, and save findings with limitations.'), button('Inspect current handoff', async () => show('Project handoff', await request(projectUrl('/handoff')))))));
}
function editProject() { const p = project(); dialog('Project settings', box => { field(box, 'edit-name', 'Name', 'text', p.name); field(box, 'edit-budget', 'Context budget units', 'number', p.budget, 'Hard serialized response cap = units × 3 UTF-8 bytes. The token display is an estimate, not a model tokenizer count.'); field(box, 'edit-max', 'Maximum sources per search', 'number', p.maxSources); field(box, 'edit-hooks', 'Automatic context hooks', 'checkbox', p.hooks); field(box, 'edit-profile', 'Manual compatibility profile (JSON)', 'textarea', JSON.stringify(p.profile || { languages: [], platforms: [], dependencies: [], apiFamily: '' }, null, 2), 'Saving this field creates a manual override. Refresh detection restores automatic mode.'); }, async () => { await request(projectUrl(), 'PUT', { name: value('edit-name'), budget: Number(value('edit-budget')), maxSources: Number(value('edit-max')), hooks: checked('edit-hooks'), profile: parse(value('edit-profile'), {}) }); message('Project updated. Restart Codex and review changed hooks.'); }); }
function sourceMetadata(box, meta = {}) { const d = node('details'); append(d, node('summary', 'Compatibility & reliability (recommended for API documentation)')); const f = node('div', '', 'field-group'); append(d, f); append(box, d); field(f, 'meta-kind', 'Content kind', ['guide', 'api', 'example', 'project_context'], meta.kind || 'guide'); field(f, 'meta-library', 'Library/package name', 'text', meta.library || ''); field(f, 'meta-ecosystem', 'Ecosystem', 'text', meta.ecosystem || 'generic', 'npm, pypi, cargo, nuget, go, or any custom value.'); field(f, 'meta-languages', 'Languages, comma separated', 'text', (meta.languages || []).join(', ')); field(f, 'meta-platforms', 'Platforms, comma separated', 'text', (meta.platforms || []).join(', ')); field(f, 'meta-api', 'API family', 'text', meta.apiFamily || ''); field(f, 'meta-range', 'Compatible version range', 'text', meta.versionRange || '', 'npm ranges use semver. Other ecosystems use exact labels conservatively.'); field(f, 'meta-reliability', 'Source reliability', ['unknown', 'official', 'maintainer', 'community', 'user'], meta.reliability || 'unknown'); field(f, 'meta-evidence', 'Why this reliability label applies', 'text', meta.reliabilityEvidence || '', 'A label is your metadata assertion, not independent proof.'); field(f, 'meta-license', 'Source license', 'text', meta.license || 'unknown'); }
function getMetadata() { return { kind: value('meta-kind'), library: value('meta-library'), ecosystem: value('meta-ecosystem'), languages: lines('meta-languages'), platforms: lines('meta-platforms'), apiFamily: value('meta-api'), versionRange: value('meta-range'), reliability: value('meta-reliability'), reliabilityEvidence: value('meta-evidence'), license: value('meta-license') }; }
function addSource() { dialog('Add knowledge', box => { field(box, 'source-name', 'Source name'); field(box, 'source-kind', 'Source type', [['url', 'Documentation website'], ['git', 'Public Git repository'], ['local', 'Local folder or file'], ['upload', 'Upload a document'], ['note', 'Paste knowledge']]); const conditional = node('div'); append(box, conditional); const change = () => { conditional.replaceChildren(); const kind = value('source-kind'); if (kind === 'url' || kind === 'git')
    field(conditional, 'source-url', kind === 'git' ? 'Public HTTPS repository URL' : 'Documentation URL'); if (kind === 'git')
    field(conditional, 'source-ref', 'Branch, tag or commit', 'text', 'HEAD'); if (kind === 'local') {
    const root = field(conditional, 'source-path', 'Absolute file or folder path');
    append(conditional, button('Browse folders', async () => { const r = await request('/api/pick-folder', 'POST', {}); if (r.path)
        root.value = r.path; }));
} if (kind === 'note')
    field(conditional, 'source-content', 'Knowledge text', 'textarea'); if (kind === 'upload')
    field(conditional, 'source-file', 'Document (up to 10 MiB)', 'file'); }; $('source-kind').onchange = change; change(); field(box, 'source-version', 'Documentation version', 'text', 'unversioned', 'Use an exact label for API docs. Unverified API compatibility is excluded by default; generic guidance remains usable.'); field(box, 'source-shared', 'Make this library reusable by other registered projects', 'checkbox', false, 'Other projects must explicitly attach it. Private files stay on this machine unless included in Codex context.'); sourceMetadata(box); const more = node('details'); append(more, node('summary', 'Indexing controls')); const f = node('div', '', 'field-group'); append(more, f); append(box, more); field(f, 'source-pages', 'Maximum pages/files', 'number', 1000); field(f, 'source-depth', 'Maximum crawl depth', 'number', 4); field(f, 'source-refresh', 'Refresh interval (hours, 0 disables)', 'number', 24); field(f, 'source-mode', 'Web rendering', ['fetch', 'playwright'], 'fetch', 'Playwright needs its optional Chromium installation.'); field(f, 'source-excludes', 'Excluded paths/URLs (one per line)', 'textarea', '', 'Exclusions and safe file rules are enforced before indexing.'); field(f, 'source-partial', 'Allow a visibly labeled partial local import', 'checkbox', false); }, async () => { const kind = value('source-kind'), data = { projectId: selected, name: value('source-name'), kind, version: value('source-version'), shared: checked('source-shared'), metadata: getMetadata(), maxPages: Number(value('source-pages')), maxDepth: Number(value('source-depth')), refreshHours: Number(value('source-refresh')), scrapeMode: value('source-mode'), exclusions: value('source-excludes').split('\n').filter(Boolean), allowPartial: checked('source-partial') }; if (kind === 'url' || kind === 'git')
    data.url = value('source-url'); if (kind === 'git')
    data.ref = value('source-ref'); if (kind === 'local')
    data.path = value('source-path'); if (kind === 'note')
    data.content = value('source-content'); if (kind === 'upload') {
    const file = $('source-file').files[0];
    if (!file)
        throw new Error('Choose a document.');
    if (file.size > 10 * 1024 * 1024)
        throw new Error('The file exceeds 10 MiB.');
    data.filename = file.name;
    data.contentBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Could not read the file.')); reader.readAsDataURL(file); });
} await request('/api/collections', 'POST', data); message('Knowledge source added. Watch Activity for actual indexing results.'); }, 'Add & index'); }
function editSource(c) { dialog('Source settings', box => { field(box, 'source-edit-name', 'Display name', 'text', c.name); field(box, 'source-edit-allowed', 'Allow Codex to retrieve this source', 'checkbox', c.agentAllowed !== false); field(box, 'source-edit-enabled', 'Enable source and scheduled refresh', 'checkbox', c.enabled !== false); sourceMetadata(box, c.metadata); field(box, 'source-edit-excludes', 'Excluded paths/URLs (one per line)', 'textarea', (c.exclusions || []).join('\n')); field(box, 'source-edit-pages', 'Maximum pages/files', 'number', c.maxPages); field(box, 'source-edit-depth', 'Maximum depth', 'number', c.maxDepth); field(box, 'source-edit-refresh', 'Refresh hours', 'number', c.refreshHours); field(box, 'source-edit-mode', 'Web rendering', ['fetch', 'playwright'], c.scrapeMode); field(box, 'source-edit-partial', 'Allow explicitly partial local imports', 'checkbox', c.allowPartial === true); }, async () => { await request(`/api/collections/${c.id}`, 'PUT', { name: value('source-edit-name'), agentAllowed: checked('source-edit-allowed'), enabled: checked('source-edit-enabled'), metadata: getMetadata(), exclusions: value('source-edit-excludes').split('\n').filter(Boolean), maxPages: Number(value('source-edit-pages')), maxDepth: Number(value('source-edit-depth')), refreshHours: Number(value('source-edit-refresh')), scrapeMode: value('source-edit-mode'), allowPartial: checked('source-edit-partial') }); message('Source settings saved. Changed ingestion policies require refresh before old chunks are exposed again.'); }); }
function attachSource() { const choices = state.collections.filter(c => c.ownerProjectId === null && !project().collections.includes(c.id)); if (!choices.length) {
    message('No unattached shared sources are available. Add a source with sharing enabled first.');
    return;
} dialog('Attach shared knowledge', box => field(box, 'attach-id', 'Library', choices.map(c => [c.id, `${c.name} · ${c.version}`])), async () => { await request(projectUrl('/attach'), 'POST', { sourceId: value('attach-id') }); message('Shared library attached to this project.'); }); }
function sources(view) { append(view, heading('Project libraries', button('Attach shared library', attachSource), button('Add knowledge', addSource, 'primary'))); const rows = state.collections.filter(c => project().collections.includes(c.id)); if (!rows.length) {
    append(view, empty('Add some useful knowledge', 'Use a documentation URL, repository, folder, document, or pasted note.'));
    return;
} for (const c of rows) {
    const status = c.enabled === false ? 'Disabled' : c.needsRefresh ? 'Refresh required' : c.active ? 'Indexed' : 'Not indexed', box = node('article', '', 'card');
    append(box, append(node('div', '', 'row'), node('h3', c.name), pill(status, c.needsRefresh || !c.active ? 'warn' : '')), node('div', `${c.version} · ${c.ownerProjectId === null ? 'Shared library' : 'Private project'} · ${c.agentAllowed === false ? 'Agent access disabled' : c.metadata?.kind || 'guide'}`, 'meta'), link(c.source.url || c.source.path || ''), node('p', `Last good index: ${date(c.active?.createdAt)}. Refresh: ${c.refreshHours ? c.refreshHours + ' hours while the controller is running' : 'manual only'}.`, 'subtle'));
    if (c.lastError)
        append(box, node('p', c.lastError, 'warning'));
    append(box, append(node('div', '', 'actions'), button('Refresh / retry', async () => { await request(`/api/collections/${c.id}/refresh`, 'POST', {}); await reload(); }), button('Edit settings', () => editSource(c)), button('Inspect provenance', () => show(c.name, { source: c.source, metadata: c.metadata, active: c.active, previous: c.previous })), button('Import report', async () => show('Import report', await request(`/api/collections/${c.id}/report`))), button('Detach', async () => { await request(projectUrl('/attach'), 'POST', { sourceId: c.id, attach: false }); await reload(); })), details('Advanced actions', `Source ID: ${c.id}\nDeletion removes this source from all attached projects. Unpublished files remain until pruning.`));
    const d = box.querySelector('details');
    append(d, append(node('div', '', 'actions spaced'), button('Roll back index', async () => { if (confirm('Restore the prior successfully indexed generation?')) {
        await request(`/api/collections/${c.id}/rollback`, 'POST', {});
        await reload();
    } }), button('Remove library', async () => { if (confirm('Remove this library from every attached project? User source files are not deleted.')) {
        await request(`/api/collections/${c.id}`, 'DELETE');
        await reload();
    } }, 'danger')));
    append(view, box);
} }
function retrieval(view) { append(view, node('p', 'Inspect the exact evidence Codex can receive. Searches filter the indexed catalogue; they do not prohibit outside research.', 'subtle')); const form = node('form', '', 'search-form'), q = node('input'); q.placeholder = 'Describe the task, API, exact symbol, or question'; q.value = lastQuery; q.setAttribute('aria-label', 'Search query'); const submit = node('button', 'Search', 'primary'); submit.type = 'submit'; append(form, q, submit); append(view, form); const filters = node('div', '', 'filters'); for (const key of ['library', 'version', 'language', 'platform', 'apiFamily'])
    field(filters, 'filter-' + key, key === 'apiFamily' ? 'API family' : key[0].toUpperCase() + key.slice(1), 'text', lastFilters[key] || ''); append(view, filters); field(view, 'filter-unverified', 'Include unknown compatibility, explicitly labeled', 'checkbox', lastFilters.includeUnverified === true); const resultBox = node('div'); append(view, append(node('div', '', 'toolbar'), button('Inspect last automatic retrieval', async () => show('Last project retrieval', await request(projectUrl('/last-retrieval'))))), resultBox); const display = () => { resultBox.replaceChildren(); if (!lastSearch)
    return; append(resultBox, node('p', `${lastSearch.hits.length} passage(s) · ${lastSearch.serializedBytes || 0} serialized bytes · ${lastSearch.omittedSources || 0} additional sources not searched`, 'meta')); for (const warning of lastSearch.warnings)
    append(resultBox, node('p', warning, 'warning')); if (!lastSearch.hits.length)
    append(resultBox, empty('No matching stored evidence', 'This does not mean no solution exists. Check filters, inspect indexed sources, or investigate external authoritative material.')); for (const h of lastSearch.hits) {
    const box = card(h.collection, append(node('div'), node('p', `${h.version} · rank ${h.rank} · ${h.compatibility?.status || 'unclassified'}`, 'meta'), link(h.url), node('div', h.content, 'excerpt'), details('Ranking, compatibility & original source', { score: h.score, reasons: h.scoreReasons, metadata: h.metadata, provenance: h.provenance, compatibility: h.compatibility }), button('Read continuation', () => readContinuation(h))));
    append(resultBox, box);
} append(resultBox, details('Exact bounded evidence packet sent through MCP', parse(lastSearch.packet, {}))); }; form.onsubmit = async (e) => { e.preventDefault(); submit.disabled = true; try {
    lastQuery = q.value;
    lastFilters = { includeUnverified: checked('filter-unverified') };
    for (const key of ['library', 'version', 'language', 'platform', 'apiFamily'])
        if (value('filter-' + key))
            lastFilters[key] = value('filter-' + key);
    lastSearch = await request(projectUrl('/search'), 'POST', { query: lastQuery, filters: lastFilters });
    display();
}
catch (error) {
    message(error.message, true);
}
finally {
    submit.disabled = false;
} }; display(); }
async function readContinuation(hit) { let offset = 0; dialog('Source passage', box => { const pre = json('Loading…'), controls = node('div', '', 'actions'); append(box, pre, controls); const load = async () => { const r = await request(`/api/mcp/${selected}`, 'POST', { name: 'context_read', arguments: { hitId: hit.id, offset, length: 4000 } }); if (r.isError)
    throw new Error(r.content[0].text); const item = JSON.parse(r.content[0].text); pre.textContent = item.content; controls.replaceChildren(node('p', `${item.offset}–${item.nextOffset ?? item.totalCharacters} of ${item.totalCharacters} characters · ${item.readScope}`, 'subtle')); if (item.nextOffset !== null)
    append(controls, button('Next passage', async () => { offset = item.nextOffset; await load(); })); }; perform(load); }, null); }
function memoryEditor(old) { dialog(old ? 'Edit development record' : 'Preserve useful knowledge', box => { field(box, 'memory-title', 'Title', 'text', old?.title || ''); field(box, 'memory-kind', 'Kind', ['decision', 'objective', 'constraint', 'architecture', 'task', 'blocker', 'attempt', 'discovery', 'solution', 'test_run', 'handoff'], old?.kind || 'discovery'); field(box, 'memory-body', 'Finding, decision, or task', 'textarea', old?.body || ''); field(box, 'memory-status', 'Status', ['draft', 'proposed', 'accepted', 'rejected', 'archived'], ['superseded'].includes(old?.status) ? 'archived' : old?.status || 'accepted'); field(box, 'memory-task', 'Task progress', ['todo', 'in_progress', 'blocked', 'done'], old?.taskStatus || 'todo'); field(box, 'memory-outcome', 'Outcome', ['unknown', 'successful', 'failed', 'mixed'], old?.outcome || 'unknown'); field(box, 'memory-refs', 'Project-relative evidence files (one per line)', 'textarea', (old?.references || []).map(r => r.path).join('\n'), 'Files are hashed, so changed evidence is marked stale.'); field(box, 'memory-sources', 'External source URLs (one per line)', 'textarea', (old?.discoverySources || []).map(r => r.url).join('\n'), 'References are preserved without automatically crawling or trusting them.'); field(box, 'memory-validation', 'Validation performed', 'textarea', old?.validationNotes || '', 'Describe what was actually inspected or run, versions, and results.'); field(box, 'memory-limits', 'Limitations / uncertainty', 'textarea', old?.limitations || ''); field(box, 'memory-tests', 'Successful recorded check IDs (one per line)', 'textarea', (old?.testRunIds || []).join('\n')); field(box, 'memory-evidence', 'Evidence classification', ['user_stated', 'unverified', 'observed', 'tested'], old?.evidenceLevel || 'user_stated', 'Tested requires an intact successful check log. User-stated task completion is not a test pass.'); field(box, 'memory-deps', 'Depends on memory IDs (comma separated)', 'text', (old?.dependsOn || []).join(', ')); field(box, 'memory-supersedes', 'Supersedes memory ID', 'text', old?.supersedes || ''); field(box, 'memory-allowed', 'Allow Codex to retrieve this record', 'checkbox', old?.agentAllowed !== false); }, async () => { const urls = lines('memory-sources'), data = { title: value('memory-title'), kind: value('memory-kind'), body: value('memory-body'), status: value('memory-status'), taskStatus: value('memory-task'), outcome: value('memory-outcome'), references: lines('memory-refs'), discoverySources: urls.map(url => (old?.discoverySources || []).find(x => x.url === url) || { url }), validationNotes: value('memory-validation'), limitations: value('memory-limits'), testRunIds: lines('memory-tests'), evidenceLevel: value('memory-evidence'), dependsOn: lines('memory-deps'), supersedes: value('memory-supersedes'), agentAllowed: checked('memory-allowed') }; if (old)
    data.expectedRevision = old.revision; await request(projectUrl('/memories' + (old ? '/' + old.id : '')), old ? 'PUT' : 'POST', data); message('Development record preserved with provenance and evidence labels.'); }); }
function memories(view) { append(view, heading('Decisions, progress & discoveries', button('Current handoff', async () => show('Current handoff', await request(projectUrl('/handoff')))), button('Add record', () => memoryEditor(), 'primary'))); const box = node('div'); append(view, box); perform(async () => { const rows = await request(projectUrl('/memories') + '?history=true'); if (tab !== 'memory')
    return; if (!rows.length) {
    append(box, empty('Preserve what you learn', 'Record successful solutions, failed attempts, decisions, sources, test evidence, and handoffs.'));
    return;
} for (const m of rows.slice().reverse()) {
    const b = card(m.title, append(node('div'), append(node('div', '', 'chips'), pill(m.kind), pill(m.status, m.status === 'proposed' ? 'warn' : ''), pill(m.stale ? 'Stale evidence' : m.effectiveEvidence, m.stale ? 'warn' : '')), node('div', m.body, 'excerpt'), node('p', `Revision ${m.revision} · ${m.actor} · ${date(m.updatedAt)} · ${m.id}`, 'meta'), append(node('div', '', 'actions'), button(m.status === 'proposed' ? 'Review proposal' : 'Edit record', () => memoryEditor(m)), button('Full evidence & revision history', () => show(m.title, m)))));
    append(box, b);
} }); }
function editChecks() { const p = project(); dialog('Approved quality checks', box => { field(box, 'checks-json', 'Check commands (JSON array)', 'textarea', JSON.stringify(p.checks, null, 2), 'Each entry: name, command, args (array), timeoutSeconds. Commands run only in this project when you click Run checks. Prefer explicit executables; .cmd shell scripts are rejected. npm is resolved to npm-cli.js.'); field(box, 'checks-approve', 'I reviewed and approve these commands', 'checkbox', false, 'These are real local commands, not safe merely because they are called tests.'); }, async () => { await request(projectUrl(), 'PUT', { checks: parse(value('checks-json'), []), approveCommands: checked('checks-approve') }); }); }
function activity(view) { append(view, heading('Jobs & execution evidence', ...(project() ? [button('Configure checks', editChecks), button('Run project checks', async () => { await request(projectUrl('/checks'), 'POST', {}); await reload(); })] : []), button('Verify installed integrations', async () => { await request('/api/verify', 'POST', {}); await reload(); }, 'primary'))); append(view, node('p', 'A green job means that operation succeeded. It does not certify native Windows installation, the whole project, or an actual Codex session. Test logs and live verification are separate.', 'subtle')); if (state.verification)
    append(view, card('Latest live integration report', append(node('div'), pill(state.verification.passed ? 'Smoke checks passed' : 'Checks failed or unavailable', state.verification.passed ? '' : 'warn'), details('Recorded execution results', state.verification)))); const rows = state.jobs.slice().reverse(); if (!rows.length)
    append(view, empty('No jobs yet', 'Index a source or run verification to collect execution evidence.')); for (const j of rows.slice(0, 100)) {
    const target = state.collections.find(c => c.id === j.targetId)?.name || state.projects.find(p => p.id === j.targetId)?.name || j.targetId;
    const b = card(`${j.type} · ${target}`, append(node('div'), pill(j.state, j.state === 'failed' ? 'bad' : ['queued', 'running', 'interrupted'].includes(j.state) ? 'warn' : ''), node('p', j.message), node('p', `${date(j.createdAt)} · ${j.id}`, 'meta'), append(node('div', '', 'actions'), button('Read log', async () => show('Job log', await request(`/api/jobs/${j.id}/log`))), ['running', 'queued'].includes(j.state) ? button('Cancel', async () => { await request(`/api/jobs/${j.id}/cancel`, 'POST', {}); await reload(); }) : button('Retry', async () => { await request(`/api/jobs/${j.id}/retry`, 'POST', {}); await reload(); }))));
    b.classList.add('job', j.state);
    append(view, b);
} }
function embeddingSettings() { const profile = state.settings.embedding; dialog('Embedding configuration', box => { field(box, 'emb-kind', 'Mode', [['local', 'Managed CPU embeddings'], ['external', 'Existing local embedding server'], ['off', 'Keyword only']], profile.kind); field(box, 'emb-model', 'Model identifier', 'text', profile.model); field(box, 'emb-dim', 'Vector dimensions', 'number', profile.dimensions); field(box, 'emb-url', 'Local OpenAI-compatible base URL', 'text', profile.baseUrl || 'http://127.0.0.1:1234/v1'); field(box, 'emb-revision', 'Managed model revision (installer-pinned SHA)', 'text', profile.revision, 'Keep the installed revision unless deliberately migrating. Old generations keep their original vector identity.'); field(box, 'emb-offline', 'Managed model: use cached files only', 'checkbox', profile.offline === true); }, async () => { await request('/api/settings', 'PUT', { embedding: { kind: value('emb-kind'), model: value('emb-model'), dimensions: Number(value('emb-dim')), baseUrl: value('emb-url'), revision: value('emb-revision'), offline: checked('emb-offline') } }); message('Embedding settings saved. Refresh sources to publish new vectors; existing generations keep their original configuration.'); }); }
function settings(view) {
    append(view, heading('Local services'), card('Embedding service', append(node('div'), node('p', `${state.settings.embedding.kind} · ${state.settings.embedding.model} · ${state.settings.embedding.dimensions} dimensions`), node('p', 'Managed CPU embeddings do not require LM Studio or a chat model. External endpoints must be loopback. The first managed model use downloads its pinned files unless cached-only is enabled.', 'subtle'), append(node('div', '', 'actions'), button('Configure embeddings', embeddingSettings), button('Run real embedding probe', async () => show('Embedding probe', await request('/api/embedding/probe', 'POST', {})))), details('Installation presence (not execution proof)', state.installed), details('Worker status', state.embeddingWorkers))));
    append(view, heading('Backup & recovery', button('Create verified backup', async () => { const r = await request('/api/backups', 'POST', {}); message(`Backup ${r.id} created with ${r.files.length} verified files. Restore only while stopped, using Restore-Backup.bat.`); await reload(); }, 'primary')), node('p', 'Backups remain private on this computer. They include app-owned sources, published indexes, memory and execution evidence, not your runtime downloads or external project folders. A restore is offline and never rewrites your code.', 'subtle'));
    const backups = node('div');
    append(view, backups);
    perform(async () => { const rows = await request('/api/backups'); if (tab !== 'settings')
        return; if (!rows.length) {
        append(backups, node('p', 'No application-data snapshot has been created.', 'subtle'));
        return;
    } for (const b of rows)
        append(backups, card(b.id, append(node('div'), node('p', `${date(b.createdAt)} · ${b.files || 0} files`, 'meta'), button('Verify all checksums', async () => { await request(`/api/backups/${b.id}/inspect`, 'POST', {}); message(`Backup ${b.id} checksums and registry references passed.`); })))); });
    append(view, heading('Maintenance'), append(node('div', '', 'toolbar'), button('Prune unretained generations', async () => { if (confirm('Remove index generations other than the current and previous versions? User source folders and backups are not deleted.')) {
        const r = await request('/api/prune', 'POST', {});
        message(`${r.removed} retained-data directories removed.`);
    } }), ...(project() ? [button('Disconnect current project', async () => { const r = await request(projectUrl('/link'), 'POST', { enable: false }); show('Configuration changes', r); await reload(); }), button('Unregister current project', async () => { if (confirm('Unregister this project? Its code will not be deleted. Private app memory is removed from the registry.')) {
            await request(projectUrl(), 'DELETE');
            await reload();
        } }, 'danger')] : [])), card('Private data location', node('p', state.home, 'inline-code')), card('Safety boundaries', 'The dashboard is loopback-only and token authenticated. Retrieved content is rendered as text. Credential scanning is heuristic, not a guarantee, and local processes running as your user are not sandboxed from one another. Codex may send retrieved excerpts to its configured model provider.'));
}
$('add-project').onclick = newProject;
$('dialog-close').onclick = $('dialog-cancel').onclick = () => $('dialog').close();
$('refresh').onclick = () => perform(() => reload());
$('connect-codex').onclick = () => perform(connect);
$('project-select').onchange = e => { selected = e.target.value; localStorage.setItem('cc-project', selected); lastSearch = null; lastQuery = ''; lastFilters = {}; reload().catch(e => message(e.message, true)); };
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
if (!token)
    message('Open Start.bat to get an authenticated local dashboard. The access token is kept in this browser tab, not placed in requests to outside websites.', true);
else
    perform(() => reload());
setInterval(async () => { if (busy || !token || $('dialog').open || document.hidden)
    return; busy = true; try {
    await reload(['overview', 'sources', 'activity'].includes(tab));
}
catch (error) {
    message(error.message, true);
}
finally {
    busy = false;
} }, 5000);
