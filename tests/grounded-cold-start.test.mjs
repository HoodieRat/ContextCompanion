import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {Grounded} from '../dist/grounded.js';import {fixture,addProject,addSource} from './helpers.mjs';

test('read-only semantic and keyword searches avoid compilation-cache I/O without changing retrieval config',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code),c=addSource(f.store,p);const entry=path.join(f.home,'runtime/docs/node_modules/@arabold/docs-mcp-server/dist/index.js');fs.mkdirSync(path.dirname(entry),{recursive:true});fs.writeFileSync(entry,'// controlled availability only');
 const connection={baseUrl:'http://127.0.0.1:12345/v1',token:'local-test-token',model:'fixture-model',dimensions:384};const grounded=new Grounded(f.home,{connection:async()=>connection});
 const semantic=await grounded.options(c,c.active,true),keyword=await grounded.options(c,c.active,true,true);
 for(const options of [semantic,keyword]){assert.equal(options.env.NODE_DISABLE_COMPILE_CACHE,'1');assert.equal(options.env.NODE_COMPILE_CACHE,undefined);const config=JSON.parse(fs.readFileSync(options.config));assert.equal(config.app.readOnly,true);assert.equal(config.app.storePath,options.env.DOCS_MCP_STORE_PATH);assert.equal(config.embeddings.requestTimeoutMs,120000);assert.equal(options.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD,'1');}
 assert.equal(semantic.env.OPENAI_API_BASE,connection.baseUrl);assert.equal(semantic.env.DOCS_MCP_EMBEDDING_MODEL,connection.model);assert.equal(keyword.env.OPENAI_API_BASE,undefined);
});

test('indexing retains its private compilation cache and original worker identity',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code),c=addSource(f.store,p);const entry=path.join(f.home,'runtime/docs/node_modules/@arabold/docs-mcp-server/dist/index.js');fs.mkdirSync(path.dirname(entry),{recursive:true});fs.writeFileSync(entry,'// controlled availability only');
 const connection={baseUrl:'http://127.0.0.1:12345/v1',token:'local-test-token',model:'fixture-model',dimensions:384};const grounded=new Grounded(f.home,{connection:async()=>connection});const index=await grounded.options(c,c.active,false);
 assert.equal(index.env.NODE_DISABLE_COMPILE_CACHE,undefined);assert.equal(index.env.NODE_COMPILE_CACHE,path.join(f.home,'runtime','node-compile-cache'));assert.equal(index.env.OPENAI_API_BASE,connection.baseUrl);assert.equal(index.env.DOCS_MCP_EMBEDDINGS_VECTOR_DIMENSION,'384');assert.equal(JSON.parse(fs.readFileSync(index.config)).app.readOnly,false);
});
