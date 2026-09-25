import { BLOCKSCOUT, DEFAULT_RETRY_MS, FALLBACK_INDEXER, HISTORY_LIMIT, MAX_429_WAIT_MS, MAX_CONCURRENT, PAGE_BATCH, PAGE_SIZE } from './config';
import type { Transaction } from './types';

type Fetcher = typeof fetch;
type Page = { items?: Record<string, any>[]; next_page_params?: Record<string, string | number> | null };
export interface ClientState { transactions: Transaction[]; loading: boolean; error: string | null; retryInMs: number; usingFallback: boolean; partial: boolean; historyLimit: boolean }
const emptyState = (): ClientState => ({ transactions: [], loading: false, error: null, retryInMs: 0, usingFallback: false, partial: false, historyLimit: false });
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function mapBlockscout(row: Record<string, any>): Transaction {
  return { hash:String(row.hash), block_number:Number(row.block_number), timestamp:String(row.timestamp), result:String(row.result ?? ''), value:String(row.value ?? '0'), raw_input:String(row.raw_input ?? '0x'), from:{hash:String(row.from?.hash ?? ''),ens_domain_name:row.from?.ens_domain_name ?? null}, to:row.to ? {hash:String(row.to.hash),ens_domain_name:row.to.ens_domain_name ?? null,is_contract:Boolean(row.to.is_contract)} : null, successful:String(row.result).toLowerCase() === 'success' };
}
export function mapFallback(row: Record<string, any>): Transaction {
  const success = String(row.isError) === '0' && String(row.txreceipt_status) !== '0';
  return { hash:String(row.hash), block_number:Number(row.blockNumber), timestamp:new Date(Number(row.timeStamp) * 1000).toISOString(), result:success?'success':'error', value:String(row.value ?? '0'), raw_input:String(row.input ?? '0x'), from:{hash:String(row.from ?? '')}, to:row.to ? {hash:String(row.to)} : null, successful:success };
}

export class BlockscoutClient {
  state = emptyState();
  private next: Record<string,string|number> | null = null;
  private fallbackPage = 1;
  private failures = 0;
  private active = 0;
  private queued: (() => void)[] = [];
  constructor(private address: string, private fetcher: Fetcher = fetch) {}
  private async limited(url: string): Promise<Response> {
    if (this.active >= MAX_CONCURRENT) await new Promise<void>((resolve) => this.queued.push(resolve));
    this.active++;
    try { return await this.fetcher(url); } finally { this.active--; this.queued.shift()?.(); }
  }
  private merge(rows: Transaction[]) {
    const map = new Map(this.state.transactions.map((tx) => [tx.hash.toLowerCase(), tx]));
    rows.forEach((tx) => map.set(tx.hash.toLowerCase(), tx));
    this.state.transactions = [...map.values()].sort((a,b) => b.block_number-a.block_number).slice(0,HISTORY_LIMIT);
    this.state.historyLimit = map.size >= HISTORY_LIMIT;
  }
  private async blockPage(params: Record<string,string|number> = {}): Promise<{rows:Transaction[];next:Record<string,string|number>|null}> {
    const query = new URLSearchParams({items_count:String(PAGE_SIZE)}); Object.entries(params).forEach(([k,v])=>query.set(k,String(v)));
    const response = await this.limited(`${BLOCKSCOUT}/api/v2/addresses/${this.address}/transactions?${query}`);
    if (response.status === 429) {
      const raw = Number(response.headers.get('x-ratelimit-reset')); const ms = Number.isFinite(raw) && raw > 0 ? (raw < 1000 ? raw * 1000 : raw) : DEFAULT_RETRY_MS;
      this.state.retryInMs = ms; if (ms > MAX_429_WAIT_MS) throw new Error('Blockscout rate limit'); await wait(ms); this.state.retryInMs = 0; return this.blockPage(params);
    }
    if (!response.ok) throw new Error(`Blockscout ${response.status}`);
    const data = await response.json() as Page;
    return { rows:(data.items ?? []).map(mapBlockscout), next:data.next_page_params ?? null };
  }
  private async fallback(page: number) {
    const query = new URLSearchParams({module:'account',action:'txlist',address:this.address,page:String(page),offset:'1000',sort:'desc'});
    const response = await this.limited(`${FALLBACK_INDEXER}?${query}`); if (!response.ok) throw new Error(`Fallback ${response.status}`);
    const data = await response.json() as {result?: Record<string, any>[]}; this.merge((Array.isArray(data.result)?data.result:[]).map(mapFallback)); this.state.usingFallback = true;
  }
  private fail(error: unknown) { this.state.error = error instanceof Error ? error.message : 'Could not load transactions'; }
  async loadInitial() { this.next=null; this.fallbackPage=1; await this.load(false); }
  async loadOlder() { if (this.state.historyLimit) return; if (this.state.usingFallback) { try { await this.fallback(++this.fallbackPage); } catch(e){this.fail(e);} return; } await this.load(true); }
  private async load(older: boolean) {
    this.state.loading=true; this.state.error=null;
    try { let next = older ? this.next : null; for(let i=0;i<PAGE_BATCH;i++){ const page=await this.blockPage(next ?? {}); this.merge(page.rows); next=page.next; if(!next||this.state.historyLimit) break; } this.next=next; this.failures=0; }
    catch(e){ this.failures++; if(this.failures>=2){try{await this.fallback(this.fallbackPage);this.state.error=null;}catch(f){this.fail(f);}}else this.fail(e); }
    finally { this.state.loading=false; }
  }
  async refresh() {
    if(this.state.usingFallback){try{await this.fallback(1);}catch(e){this.fail(e);}return;}
    const cached=new Set(this.state.transactions.map(t=>t.hash.toLowerCase())); this.state.partial=false;
    try { let next:Record<string,string|number>|null=null, found=false; for(let i=0;i<PAGE_BATCH;i++){const page=await this.blockPage(next??{}); found=page.rows.some(t=>cached.has(t.hash.toLowerCase()));this.merge(page.rows);next=page.next;if(found||!next)break;}if(!found&&next)this.state.partial=true;this.failures=0; } catch(e){this.failures++;if(this.failures>=2){try{await this.fallback(1);}catch(f){this.fail(f);}}else this.fail(e);}
  }
  async retry(){this.state.usingFallback=false;this.failures=0;await this.loadInitial();}
}
