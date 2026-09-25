import { describe, expect, it, vi } from 'vitest';
import { stringToHex, type Address, type EIP1193Provider } from 'viem';
import { quoteFee } from './Composer';
import { sendTip } from './Tips';
import { TIP_TO } from './config';
import { requireMainnet, walletError } from './wallet';

const account='0x1111111111111111111111111111111111111111' as Address;
function provider(handler:(method:string,params?:unknown)=>unknown):EIP1193Provider{return{request:vi.fn(({method,params})=>Promise.resolve(handler(method,params))),on:vi.fn(),removeListener:vi.fn()} as EIP1193Provider}
describe('release transaction primitives',()=>{
 it('switches to mainnet before sending a tip with empty data',async()=>{const calls:string[]=[];const p=provider((method,params)=>{calls.push(method);if(method==='eth_chainId')return'0xaa36a7';if(method==='eth_sendTransaction'){const tx=(params as [{to:string;data:string}])[0];expect(tx.to).toBe(TIP_TO);expect(tx.data).toBe('0x');return'0xabc'}return null});await sendTip(p,account,'0.0001');expect(calls).toEqual(['eth_chainId','wallet_switchEthereumChain','eth_sendTransaction'])});
 it('uses gas × (2 × base fee + priority fee)',async()=>{const p=provider(method=>({eth_estimateGas:'0x5208',eth_getBlockByNumber:{baseFeePerGas:'0x3b9aca00'},eth_maxPriorityFeePerGas:'0x59682f00'}[method]));const fee=await quoteFee(p,{from:account,to:account,value:'0x0',data:'0x'});expect(fee).toBe(21000n*(2n*1_000_000_000n+1_500_000_000n))});
 it('preserves exact UTF-8 bytes and maps wallet errors',()=>{expect(stringToHex(' café\n')).toBe('0x20636166c3a90a');expect(walletError({code:4001,message:'denied'})).toBe('');expect(walletError({code:-32002})).toBe('Your wallet already has a request open')});
 it('reports a refused chain switch with required copy',async()=>{const p=provider(method=>{if(method==='eth_chainId')return'0x2';throw new Error('no')});await expect(requireMainnet(p)).rejects.toThrow('Switch to Ethereum mainnet to send')});
});
