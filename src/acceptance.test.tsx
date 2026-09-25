import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BlockscoutClient } from './blockscout';
import { DataState, FollowButton, MessageBody, ThreadList } from './App';
import type { Message } from './threads';

const owner='0x200E710aCAA6A93bbc77146026328C40F1d60fB1';
const message=(text:string):Message=>({text,tags:[],urls:[],sent:false,date:new Date('2026-01-01T00:00:00Z'),tx:{hash:`0x${'1'.repeat(64)}`,block_number:1,timestamp:'2026-01-01T00:00:00Z',result:'success',value:'0',raw_input:'0x',successful:true,from:{hash:`0x${'2'.repeat(40)}`},to:{hash:owner}}});

describe('read-only UI states',()=>{
 it('renders untrusted markup and URLs only as text',()=>{const {container,rerender}=render(<MessageBody message={message('<img src=x onerror=alert(1)>')}/>);expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();expect(container.querySelector('img')).toBeNull();rerender(<MessageBody message={message('see https://example.test/phish')}/>);expect(screen.getByText(/https:\/\/example\.test/).closest('a')).toBeNull();expect(screen.getByRole('button',{name:'Copy'})).toBeInTheDocument();expect(screen.getByText('Links in messages may be scams.')).toBeInTheDocument()});
 it('shows the empty mailbox',()=>{render(<ThreadList owner={owner} threads={[]}/>);expect(screen.getByText('No messages yet')).toBeInTheDocument()});
 it('shows rate limit, fallback, and unavailable states',()=>{const client=new BlockscoutClient(owner);client.state.retryInMs=4000;const {rerender}=render(<DataState owner={owner} client={client} redraw={()=>{}}/>);expect(screen.getByText('Rate-limited, retrying in 4s')).toBeInTheDocument();client.state.retryInMs=0;client.state.usingFallback=true;rerender(<DataState owner={owner} client={client} redraw={()=>{}}/>);expect(screen.getByText('Using backup data source')).toBeInTheDocument();client.state.usingFallback=false;client.state.error='offline';rerender(<DataState owner={owner} client={client} redraw={()=>{}}/>);expect(screen.getByText('Data source unavailable')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Retry'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Open on Etherscan'})).toHaveAttribute('href',`https://etherscan.io/address/${owner}`)});
 it('enforces the 20-address follow cap',()=>{localStorage.setItem('idm:follows',JSON.stringify(Array.from({length:20},(_,i)=>`0x${i.toString(16).padStart(40,'0')}`)));render(<FollowButton owner={owner} onChange={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:new RegExp(`Follow ${owner}`)}));expect(screen.getByText('You can follow up to 20 addresses')).toBeInTheDocument()});
});
