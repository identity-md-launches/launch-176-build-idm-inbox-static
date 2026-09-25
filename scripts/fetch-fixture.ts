import { mkdir, writeFile } from 'node:fs/promises';
import { BLOCKSCOUT, DEV_BOARD, PAGE_BATCH, PAGE_SIZE } from '../src/config';
let next:Record<string,string|number>|null=null;const pages:unknown[]=[];
try {
  for(let i=0;i<PAGE_BATCH;i++){const q=new URLSearchParams({items_count:String(PAGE_SIZE)});Object.entries(next??{}).forEach(([k,v])=>q.set(k,String(v)));const r=await fetch(`${BLOCKSCOUT}/api/v2/addresses/${DEV_BOARD}/transactions?${q}`);if(!r.ok)throw new Error(String(r.status));const data=await r.json() as {items:unknown[];next_page_params:Record<string,string|number>|null};pages.push(data);next=data.next_page_params;if(!next)break;}
  await mkdir('fixtures',{recursive:true});await writeFile('fixtures/dev-board.json',JSON.stringify({live:true,fetchedAt:new Date().toISOString(),pages},null,2)+'\n');console.log(`Saved ${pages.length} live pages.`);
} catch(error){console.error('Fixture fetch failed; existing fixture was not changed.',error);process.exitCode=1;}

