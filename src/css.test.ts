import { readFileSync } from 'node:fs';import { describe,expect,it } from 'vitest';
const css=['styles.css','review.css','ui.css'].map(file=>readFileSync(`${process.cwd()}/src/${file}`,'utf8')).join('');
describe('responsive CSS contract',()=>{it('has focus, sizing and overflow protections',()=>{expect(css).toContain(':focus-visible');expect(css).toContain('outline:3px');expect(css).toContain('100dvh');expect(css).toContain('min-height:44px');expect(css).toMatch(/html,body\{overflow-x:hidden\}/);expect(css).not.toMatch(/(?<!max-)width:\s*(?:36[1-9]|3[7-9]\d|[4-9]\d\d)px/)})});
