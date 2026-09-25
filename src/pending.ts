import { createPublicClient, fallback, http, type Address, type EIP1193Provider, type Hash } from 'viem';
import { mainnet } from 'viem/chains';
import { DROP_AFTER_MS, RECEIPT_POLL_MS, RPCS } from './config';
import { safeStorage } from './storage';

export type PendingTx={hash:Hash;nonce?:number;created:number;status:'Pending'|'Sent'|'Dropped or replaced - check your wallet';lastMissingBlock?:bigint;missingChecks:number};
const key='idm:pending';
export function loadPending():PendingTx[]{try{return JSON.parse(safeStorage.get(key)??'[]') as PendingTx[]}catch{return[]}}
export function savePending(items:PendingTx[]){safeStorage.set(key,JSON.stringify(items,(k,v)=>typeof v==='bigint'?v.toString():v))}
const rpc=createPublicClient({chain:mainnet,transport:fallback(RPCS.map(x=>http(x))),ccipRead:false});
export async function pollPending(tx:PendingTx,provider:EIP1193Provider,now=Date.now()):Promise<PendingTx>{
 let receipt:unknown=null;try{receipt=await provider.request({method:'eth_getTransactionReceipt',params:[tx.hash]})}catch{/* try public RPC */}if(!receipt)try{receipt=await rpc.getTransactionReceipt({hash:tx.hash})}catch{/* still pending */}if(receipt)return{...tx,status:'Sent'};
 let found:unknown=null;try{found=await provider.request({method:'eth_getTransactionByHash',params:[tx.hash]})}catch{/* try public RPC */}if(!found)try{found=await rpc.getTransaction({hash:tx.hash})}catch{/* not found anywhere */}if(found)return{...tx,missingChecks:0};
 const block=await rpc.getBlockNumber().catch(()=>tx.lastMissingBlock??0n);const distinct=tx.lastMissingBlock===undefined||block>BigInt(tx.lastMissingBlock);const checks=distinct?tx.missingChecks+1:tx.missingChecks;
 let replaced=false;if(tx.nonce!==undefined)try{const account=(await provider.request({method:'eth_accounts'} ) as string[])[0] as Address;const count=await rpc.getTransactionCount({address:account,blockTag:'latest'});replaced=count>tx.nonce}catch{/* cannot establish replacement */}
 const aged=now-tx.created>=DROP_AFTER_MS;return{...tx,lastMissingBlock:block,missingChecks:checks,status:checks>=2&&(aged||replaced)?'Dropped or replaced - check your wallet':'Pending'};
}
export function watchPending(tx:PendingTx,provider:EIP1193Provider,onChange:(x:PendingTx)=>void){let active=true;const run=async()=>{const next=await pollPending(tx,provider);if(!active)return;tx=next;onChange(next);if(next.status==='Pending')setTimeout(()=>void run(),RECEIPT_POLL_MS)};void run();return()=>{active=false}}
