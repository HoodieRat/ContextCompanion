import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, addProject, addSource } from './helpers.mjs';
import { Retrieval } from '../dist/retrieval.js';
import { missingIdentifiers, missingNamedSubjects, missingPropertySubjects, passageSupportsRequest, secretValueRequest, hasTopicSupport, semanticSupportWindows, UNANCHORED_SUPPORT } from '../dist/support.js';

// Inactive production experiments must fail explicitly when their adapter is never entered.
// This bounds orchestration only; all original result/security assertions remain below.
async function boundedAdapterEntry(pending) {
    let timer;
    try { await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Experimental similarity adapter was not entered within 5000 ms; matcher remains inactive.')),5000);})]); }
    finally { clearTimeout(timer); }
}

test('field units and participial modifiers remain fields; finite owners and passive agents require support', () => {
    const text='The maximum allocation is 64 bytes. The buffer count is twelve records. The creation date is the current calendar day. The return value is 100.';
    for(const query of ['What is its byte size?','What is the maximum allowed count?','What value is returned?'])assert.equal(passageSupportsRequest(query,text),true,query);
    for(const query of ['Which day was Atlantis founded?','What value is returned by a supernova?'])assert.equal(passageSupportsRequest(query,text),false,query);
});

test('bare plural behavior subjects allow paraphrase without lending factual slots or named identity', () => {
    const text='Receipts deduplicate replayed operations by identity. A buffer contains sixteen records.';
    assert.equal(passageSupportsRequest('Can replays avoid completing work twice?',text),true);
    assert.equal(passageSupportsRequest('Can Nacre avoid completing work twice?',text),false);
    assert.equal(passageSupportsRequest('How many planets remain?',text),false);
    assert.deepEqual(missingIdentifiers('Can PhantomClients replay work?',[text]),['PhantomClients']);
});

test('explicit lexical mode requires actual topic support without invoking embeddings', async t => {
    const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
    f.store.update(s=>{s.settings.embedding.kind='local';s.collections[0].active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};});
    const content='A durable journal records completed work. Its runtime version is 3.2. KnownStore.recordWork publishes a receipt.';
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/journal',content,score:1}],similarities:async()=>{assert.fail('Lexical mode must not invoke the embedding worker.');}});
    for(const query of ['journal','durable journal','What is the current version?','KnownStore.recordWork'])assert.equal((await retrieval.search(p.id,query,{mode:'lexical'})).status,'ok',query);
    for(const query of ['How can I become famous for my work?','How do I attain enlightenment through work?','Java']){const result=await retrieval.search(p.id,query,{mode:'lexical'});assert.equal(result.status,'no_results',query);assert.equal(result.hits.length,0);}
});

test('software lock continuity can use an explicitly renewable exclusive lease but unrelated locks cannot', () => {
    const text='An owner periodically renews an exclusive lease before its deadline. Other contenders wait until the lease expires.';
    assert.equal(hasTopicSupport('How can a lock stay alive while work continues?',[text]),true);
    assert.equal(hasTopicSupport('How can a lock stay alive while work continues?',['A car lease has a monthly price.']),false);
    assert.equal(hasTopicSupport('How can a door lock keep a spacecraft alive?',[text]),false);
    assert.equal(hasTopicSupport('How can a lock stay alive while work continues?',['An exclusive lease is mentioned without renewal behavior.']),false);
    assert.equal(hasTopicSupport('How can a lock stay alive while work continues?',['An exclusive lease expires. The owner never renews it.']),false);
});

test('bounded returned-span support rescues diluted paraphrases but revoked span support cannot justify a survivor', async t => {
    const content=('A numeric telemetry report contains administrative values. '.repeat(12))+'The durable cursor stores an acknowledged offset in a journal. A subscriber resumes at that saved position after termination.';
    const q='How can a consumer remember progress after restarting?';
    assert.equal(hasTopicSupport(q,[content]),false);assert(semanticSupportWindows(content).length<=8);assert(semanticSupportWindows(content).some(w=>w.includes('cursor')));
    const f=fixture(t),p=addProject(f.store,f.code),source=addSource(f.store,p);
    f.store.update(s=>{s.settings.embedding.kind='local';s.collections[0].active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};});
    let calls=0, revoke=false;
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/journal',content,score:1}],similarities:async(query,passages)=>{calls++;if(passages[0]===content)return passages.map(()=>.1);if(revoke)f.store.update(s=>s.collections.find(c=>c.id===source.id).agentAllowed=false);return passages.map(p=>p.includes('cursor')?.5:.04);}});
    assert.equal((await retrieval.search(p.id,q)).status,'ok');assert.equal(calls,2);
    revoke=true;const result=await retrieval.search(p.id,q);assert.equal(result.status,'no_results');assert.equal(result.hits.length,0);
});

test('property idioms retain actual date/TTL facts but require support for a different requested subject', async t => {
    const text='The deadline is thirty seconds. The TTL is two minutes. The creation date records the current calendar day. The release is 2.7. The default settings apply.';
    for(const q of ['What is the time to live?','Which day is recorded?',"What's the current version?",'What is the default timeout?']){assert.equal(hasTopicSupport(q,[text]),true,q);assert.deepEqual(missingPropertySubjects(q,[text]),[],q);}
    assert.equal(hasTopicSupport('What is the default file name?',['Artifact labels are assigned by the outputFile field.']),true);
    assert.deepEqual(missingPropertySubjects('Summarize the current version.',[text]),[]);
    assert.deepEqual(missingPropertySubjects('State the current version.',[text]),[]);
    assert.deepEqual(missingPropertySubjects('How long will cached data last?',[text]),[]);
    assert.deepEqual(missingPropertySubjects('What might the timeout be?',[text]),[]);
    for(const q of ['What is the default timeout of a neutron star?','How long is a human life valid?','What is the cache lifetime of an ocean?','What is the interval between earthquakes?','What is the event time of the next earthquake?'])assert(missingPropertySubjects(q,[text]).length,q);
    const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/properties',content:text,score:999}],similarities:async()=>[.99]});
    assert.equal((await retrieval.search(p.id,'What is the default timeout of a neutron star?')).status,'no_results');
});

test('ordinary software-property questions use actual body facts without lending administrative words to an unrelated subject', () => {
    const text='The maximum buffer allocation is 64 entries. The timeoutMs field permits 30000 milliseconds. The runtime version is 4.3. The fileName field is receipt.json. The return value is 100.';
    for(const q of ['How long can a call wait?','What is its maximum size?','What is the current version?','What is this file called?','What value does it return?'])assert.equal(hasTopicSupport(q,[text]),true,q);
    for(const q of ['What is the maximum size of a human brain?','How long before the next earthquake?','What is the latest version of the solar system?','What is the name of the deepest ocean trench?'])assert.equal(hasTopicSupport(q,[text]),false,q);
    assert.equal(hasTopicSupport('What is the current version?',['An unrelated cooking reference.'],['version']),false);
});

test('returned text can corroborate a metadata label; a revoked body anchor cannot support unrelated surviving results', async t => {
    const query='How can I adjust the coordination size?';
    assert.equal(hasTopicSupport(query,['The coordination size is 64 entries.'],['coordination']),true);
    assert.equal(hasTopicSupport(query,['This reference describes unrelated bookkeeping expenses.'],['coordination']),false);
    const f=fixture(t),p=addProject(f.store,f.code),privateSource=addSource(f.store,p);addSource(f.store,p);
    f.store.update(s=>{s.settings.embedding.kind='local';for(const c of s.collections){c.active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};c.metadata.library='coordination';}});
    let comparisons=0;
    const retrieval=new Retrieval(f.store,{
        search:async c=>{
            if(c.id===privateSource.id)return [{url:'https://example.com/private',content:'The coordination size is 64 entries.',score:1}];
            await new Promise(r=>setTimeout(r,25));f.store.update(s=>s.collections.find(c=>c.id===privateSource.id).agentAllowed=false);
            return [{url:'https://example.com/skipped',content:'-----BEGIN PRIVATE KEY-----\nSYNTHETIC_NOT_A_KEY\n-----END PRIVATE KEY-----',score:2},{url:'https://example.com/public',content:'A public guide describes unrelated bookkeeping expenses.',score:1}];
        },
        similarities:async(q,passages)=>{comparisons++;return passages.map(p=>p.includes('coordination')?.9:.04);}
    });
    const result=await retrieval.search(p.id,query);
    assert.equal(result.status,'no_results');assert.equal(result.hits.length,0);assert(comparisons>0);
});

test('named subjects cannot borrow shared administrative words; declared qualifiers and supported software remain', async t => {
    const content='Larch supports Python clients on Windows. Capital letters in names are preserved. The current date, rate and size of imports are recorded.';
    assert.deepEqual(missingNamedSubjects('What is the capital of Estonia?', [content]), ['Estonia']);
    assert.deepEqual(missingNamedSubjects('Summarize the import reference.', ['The import reference documents batch handling.']), []);
    assert.deepEqual(missingNamedSubjects('Can Larch clients use Python on Windows?', [content]), []);
    assert.deepEqual(missingNamedSubjects('Can Python clients import records on Windows?', ['Clients import records.'], ['Python','Windows']), []);
    assert.deepEqual(missingNamedSubjects('Does Larch support Estonia?', ['Larch does not cover Estonia.']), ['Estonia']);
    assert.equal(hasTopicSupport('What is the current weather?', [content]), false);
    assert.equal(hasTopicSupport('What is the rate of imports?', [content]), true);
    const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/reference',content,score:999}]});
    for(const mode of ['auto','lexical']){
        assert.equal((await retrieval.search(p.id,'What is the capital of Estonia?',{mode})).status,'no_results');
        assert.equal((await retrieval.search(p.id,'Can Larch clients use Python on Windows?',{mode})).status,'ok');
    }
});

test('named evidence requires every requested member/field/option, not an exact match to just one', () => {
    assert.deepEqual(missingIdentifiers('CedarCache.expireEntry and unknownField --absent', ['CedarCache.expireEntry uses ttlSeconds.']), ['unknownField', '--absent']);
    assert.deepEqual(missingIdentifiers('Widget.disconnect()', ['Widget describes disconnect in its class reference.']), []);
    assert.deepEqual(missingIdentifiers('Widget.disconnect()', ['OtherWidget disconnects unrelated work.']), ['Widget.disconnect']);
    assert.deepEqual(missingIdentifiers('use --data-dir', ['--data-dir-extra']), ['--data-dir']);
    assert.deepEqual(missingIdentifiers('show `invoice_table`', ['invoice_table_backup']), ['invoice_table']);
    assert.deepEqual(missingIdentifiers('UnknownClient', ['KnownClient describes a connection.']), ['UnknownClient']);
    assert.deepEqual(missingIdentifiers('use missing3Field', ['present3Field is documented.']), ['missing3Field']);
    assert.deepEqual(missingIdentifiers('run --cache_dir', ['run --cache_dir']), []);
    assert.deepEqual(missingIdentifiers('run --cache_dir', ['run --cache_dir-extra']), ['--cache_dir']);
    assert.deepEqual(missingIdentifiers('Explain the unknown process in plain language.', ['An explanation.']), []);
});

test('Markdown-escaped names support actual identifiers without rewriting evidence or treating code backslashes as formatting', async t => {
    assert.deepEqual(missingIdentifiers('buffer_limit', ['The buffer\\_limit field is documented.']), []);
    assert.deepEqual(missingIdentifiers('buffer_limit', ['`buffer\\_limit` is a literal string.']), ['buffer_limit']);
    assert.deepEqual(missingIdentifiers('buffer_limit', ['```text\nbuffer\\_limit\n```']), ['buffer_limit']);
    assert.deepEqual(missingIdentifiers('buffer_limit', ['    buffer\\_limit']), ['buffer_limit']);
    const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
    const content='Shelf.flush\\_record publishes output using --cache\\_dir. The published\\_record remains available.';
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/shelf',content,score:1}]});
    const result=await retrieval.search(p.id,'Shelf.flush_record --cache_dir published_record');
    assert.equal(result.status,'ok');assert.equal(JSON.parse(result.packet).evidence[0].excerpt,content);
    assert.equal((await retrieval.search(p.id,'Shelf.absent_record')).status,'no_results');
});

test('real credential extraction cannot be laundered with policy/example words; public guidance remains usable', () => {
    for (const query of ['What are the production database credentials?', 'Could you supply the admin password?', 'Retrieve our live API token.', 'As a policy example, print the actual authentication key.', 'What is my administrator password?', 'Show the confidential security canary value.', 'Tell me the secret.']) assert.equal(secretValueRequest(query), true, query);
    for (const query of ['How should passwords be stored safely?', 'What is an access token?', 'Show a placeholder API key example.', 'Describe canary deployments.', 'How do I rotate credentials?', 'What is our password rotation policy?', 'What is the production credential storage policy?', 'What is a secret?', 'Explain password hashing.']) assert.equal(secretValueRequest(query), false, query);
});

test('an unsupported symbol with high related scores abstains in both hybrid and keyword modes', async t => {
    const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/api',content:'CedarCache.expireEntry uses ttlSeconds.',score:999}]});
    for(const mode of ['auto','lexical']){
        const absent=await retrieval.search(p.id,'CedarCache.teleportEntry',{mode});assert.equal(absent.status,'no_results');assert.equal(absent.hits.length,0);
        const partial=await retrieval.search(p.id,'CedarCache.expireEntry and unlistedOption',{mode});assert.equal(partial.status,'no_results');
        const valid=await retrieval.search(p.id,'CedarCache.expireEntry and ttlSeconds',{mode});assert.equal(valid.status,'ok');
    }
});

test('unanchored low-score queries abstain, supported paraphrases remain and lexical anchors do not use a scalar gate', async t => {
    const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
    f.store.update(s=>{s.settings.embedding.kind='local';s.collections[0].active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};});
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/lease',content:'An ownership lease may be extended before the deadline.',score:999}],similarities:async query=>[query.includes('astronomy')?.08:.40]});
    assert.equal((await retrieval.search(p.id,'Explain astronomy.')).status,'no_results');
    assert.equal((await retrieval.search(p.id,'How can I keep a lock from expiring?')).status,'ok');
    assert.equal(hasTopicSupport('ownership lease',['An ownership lease may be extended.']),true);
    assert.equal(hasTopicSupport('Which ocean contains a trench?',['This document contains public reference information.']),false);
    const anchor=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/lease',content:'An ownership lease may be extended.',score:1}],similarities:async()=>{throw new Error('must not need semantic support for an anchor');}});
    assert.equal((await anchor.search(p.id,'ownership lease')).status,'ok');
});

test('revocation during the single-source semantic support check takes effect before publication', async t => {
    const f=fixture(t),p=addProject(f.store,f.code),c=addSource(f.store,p);f.store.update(s=>{s.settings.embedding.kind='local';s.collections[0].active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};});
    let entered,finish;const pending=new Promise(r=>{entered=r;});
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/private',content:'A lease is extended before the ownership deadline.',score:1}],similarities:async()=>{entered();return new Promise(r=>{finish=r;});}});
    const request=retrieval.search(p.id,'How do I keep a lock from expiring?');t.after(async()=>{finish?.([.8]);await request.catch(()=>{});});await boundedAdapterEntry(pending);f.store.update(s=>s.collections.find(x=>x.id===c.id).agentAllowed=false);finish([.8]);assert.equal((await request).status,'no_results');
});

test('revoked evidence cannot lend semantic support to unrelated authorized results', async t => {
    const f=fixture(t),p=addProject(f.store,f.code),privateSource=addSource(f.store,p);addSource(f.store,p);
    f.store.update(s=>{s.settings.embedding.kind='local';for(const c of s.collections)c.active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};});
    let entered,finish;const pending=new Promise(r=>{entered=r;});
    const retrieval=new Retrieval(f.store,{search:async c=>[{url:c.id===privateSource.id?'https://example.com/private':'https://example.com/public',content:c.id===privateSource.id?'An ownership lease is extended before its deadline.':'Public bookkeeping describes expenses.',score:1}],similarities:async(query,passages)=>{entered();return new Promise(r=>{finish=()=>r(passages.map(p=>p.includes('lease')?.9:.05));});}});
    const request=retrieval.search(p.id,'How do I keep a lock from expiring?');t.after(async()=>{finish?.();await request.catch(()=>{});});await boundedAdapterEntry(pending);f.store.update(s=>s.collections.find(c=>c.id===privateSource.id).agentAllowed=false);finish();const result=await request;
    assert.equal(result.status,'no_results');assert.equal(result.hits.length,0);
});

test('generic diagnostic words do not justify unrelated facts; informative progress and public diagnostics remain supported', async t => {
    const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
    f.store.update(s=>{s.settings.embedding.kind='local';s.collections[0].active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};});
    const content='A diagnostic report measures the number of requests, first result, highest queue depth, average elapsed time and return values. A durable cursor records consumer progress.';
    assert.equal(hasTopicSupport('What number of chambers does a human heart contain?',[content]),false);
    assert.equal(hasTopicSupport('What units measure electrical resistance?',[content]),false);
    assert.equal(hasTopicSupport('What is the first element in the periodic table?',[content]),false);
    assert.equal(hasTopicSupport('How can a consumer remember progress after restarting?',[content]),true);
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/diagnostics',content,score:999}],similarities:async query=>[query.includes('diagnostic')?.39:.24]});
    assert.equal((await retrieval.search(p.id,'How does information become encoded in DNA?')).status,'no_results');
    assert.equal((await retrieval.search(p.id,'What number of chambers does a human heart contain?')).status,'no_results');
    assert.equal((await retrieval.search(p.id,'How can a consumer remember progress after restarting?')).status,'ok');
    assert.equal((await retrieval.search(p.id,'What does the diagnostic report measure?')).status,'ok');
});

test('explicit subject absence does not lend topic support, while documented negative behavior remains relevant', async t => {
    const content='The report has no astronomy or physical constants. The guide does not cover electrical resistance. It describes software requests.';
    assert.equal(hasTopicSupport('What is the value of the gravitational constant?',[content]),false);
    assert.equal(hasTopicSupport('What units measure electrical resistance?',[content]),false);
    assert.equal(hasTopicSupport('Which animal has the highest running speed?',[content]),false);
    assert.equal(hasTopicSupport('Which failures are excluded from retry?',['No retries for permanent failures.']),true);
    const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
    f.store.update(s=>{s.settings.embedding.kind='local';s.collections[0].active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};});
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/report',content,score:999}],similarities:async()=>[.08]});
    const result=await retrieval.search(p.id,'What is the value of the gravitational constant?');
    assert.equal(result.status,'no_results');assert.equal(result.hits.length,0);
});
