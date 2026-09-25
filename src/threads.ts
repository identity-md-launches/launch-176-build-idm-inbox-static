import { DEV_BOARD } from './config';
import { decodeInput, type DecodedMessage } from './decode';
import { safeStorage } from './storage';
import type { Transaction } from './types';

export interface Message extends DecodedMessage { tx:Transaction; sent:boolean; date:Date }
export interface Thread { counterparty:string; label:string; messages:Message[]; newest:Date; sent:number; received:number; request:boolean; unread:boolean; post:boolean }
const low=(s:string)=>s.toLowerCase();
const key=(kind:string,owner:string,party?:string)=>`idm:${kind}:${low(owner)}${party?`:${low(party)}`:''}`;
export function acceptRequest(owner:string,party:string){safeStorage.set(key('accepted',owner,party),'1');}
export function openThread(owner:string,party:string,at=Date.now()){safeStorage.set(key('opened',owner,party),String(at));}
export function beginInbox(owner:string,at=Date.now()):number { const k=key('baseline',owner); const old=safeStorage.get(k); if(old)return Number(old);safeStorage.set(k,String(at));return at; }

export function buildThreads(owner:string,txs:Transaction[],now=Date.now()):Thread[] {
  const ownerId=low(owner), baseline=beginInbox(owner,now), groups=new Map<string,Message[]>();
  for(const tx of txs){if(!tx.to)continue;const decoded=decodeInput(tx.raw_input,tx.successful);if(!decoded)continue;const from=low(tx.from.hash),to=low(tx.to.hash);if(from!==ownerId&&to!==ownerId)continue;const sent=from===ownerId;const post=from===ownerId&&to===ownerId;const party=post?ownerId:(sent?to:from);const list=groups.get(party)??[];list.push({...decoded,tx,sent,date:new Date(tx.timestamp)});groups.set(party,list);}
  return [...groups.entries()].map(([party,messages])=>{
    messages.sort((a,b)=>a.date.getTime()-b.date.getTime());const newest=messages.at(-1)!.date;const sent=messages.filter(m=>m.sent).length;const received=messages.length-sent;const post=party===ownerId;const accepted=safeStorage.get(key('accepted',owner,party))==='1';const request=!post&&sent===0&&!accepted&&ownerId!==low(DEV_BOARD);const newestReceived=[...messages].reverse().find(m=>!m.sent)?.date.getTime()??0;const opened=Number(safeStorage.get(key('opened',owner,party))??0);const unread=newestReceived>Math.max(baseline,opened);const named=messages.at(-1)!.tx[sent?'to':'from'];return {counterparty:party,label:post?'Posts':named?.ens_domain_name||party,messages,newest,sent,received,request,unread,post};
  }).sort((a,b)=>b.newest.getTime()-a.newest.getTime());
}

