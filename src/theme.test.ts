import { describe, expect, it } from 'vitest';
import { theme } from './theme';
const lum=(hex:string)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const ratio=(a:string,b:string)=>{const [hi,lo]=[lum(a),lum(b)].sort((x,y)=>y-x);return(hi+.05)/(lo+.05)};
describe('theme contrast',()=>{it('keeps text pairs at AA contrast',()=>{for(const t of Object.values(theme)){expect(ratio(t.text,t.bg)).toBeGreaterThanOrEqual(4.5);expect(ratio(t.text,t.panel)).toBeGreaterThanOrEqual(4.5);expect(ratio(t.muted,t.bg)).toBeGreaterThanOrEqual(4.5);expect(ratio(t.accentText,t.accent)).toBeGreaterThanOrEqual(4.5);expect(ratio(t.danger,t.panel)).toBeGreaterThanOrEqual(4.5)}})});
