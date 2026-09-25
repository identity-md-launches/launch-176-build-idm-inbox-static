/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAddress, type Address, type EIP1193Provider } from 'viem';
import { WALLET_DISCOVERY_MS } from './config';

type Announce={info:{uuid:string;name:string;icon:string;rdns:string};provider:EIP1193Provider};
declare global {interface Window {ethereum?:EIP1193Provider}}
type WalletState={provider?:EIP1193Provider;account?:Address;connecting:boolean;connect:()=>Promise<void>};
const WalletContext=createContext<WalletState>({connecting:false,connect:async()=>undefined});

export function WalletProvider({children}:{children:ReactNode}){
 const [providers,setProviders]=useState<EIP1193Provider[]>([]),[provider,setProvider]=useState<EIP1193Provider>(),[account,setAccount]=useState<Address>(),[connecting,setConnecting]=useState(false);
 useEffect(()=>{const found=(event:Event)=>{const detail=(event as CustomEvent<Announce>).detail;if(detail?.provider)setProviders(p=>p.includes(detail.provider)?p:[...p,detail.provider])};addEventListener('eip6963:announceProvider',found);dispatchEvent(new Event('eip6963:requestProvider'));const id=setTimeout(()=>setProviders(p=>p.length?p:window.ethereum?[window.ethereum]:[]),WALLET_DISCOVERY_MS);return()=>{clearTimeout(id);removeEventListener('eip6963:announceProvider',found)}},[]);
 const connect=useCallback(async()=>{const chosen=providers[0]??window.ethereum;if(!chosen)return;setConnecting(true);try{const result=await chosen.request({method:'eth_requestAccounts'}) as string[];if(result[0]){setProvider(chosen);setAccount(getAddress(result[0]))}}finally{setConnecting(false)}},[providers]);
 useEffect(()=>{if(!provider)return;const changed=(xs:unknown)=>{const a=(xs as string[])[0];setAccount(a?getAddress(a):undefined)};provider.on?.('accountsChanged',changed);return()=>provider.removeListener?.('accountsChanged',changed)},[provider]);
 const value=useMemo(()=>({provider:provider??providers[0],account,connecting,connect}),[provider,providers,account,connecting,connect]);return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
export const useWallet=()=>useContext(WalletContext);

export async function requireMainnet(provider:EIP1193Provider){const chain=await provider.request({method:'eth_chainId'});if(chain!=='0x1')try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x1'}]})}catch{throw new Error('Switch to Ethereum mainnet to send')}}
export function walletError(error:unknown){const e=error as {code?:number;message?:string};if(e.code===4001)return '';if(e.code===-32002)return 'Your wallet already has a request open';return e.message??'Transaction could not be sent'}
