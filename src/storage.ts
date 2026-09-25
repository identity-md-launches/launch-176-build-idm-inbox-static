let available = true;
try { const probe='idm:storage-probe'; localStorage.setItem(probe,'1'); localStorage.removeItem(probe); } catch { available=false; }
if (location.pathname.startsWith('/ipfs/') || location.pathname.startsWith('/ipns/')) available=false;
export const isLocalStateAvailable = () => available;
export const safeStorage = {
  get(key:string):string|null { if(!available)return null;try { return localStorage.getItem(key); } catch { available=false;return null; } },
  set(key:string,value:string):void { if(!available)return;try { localStorage.setItem(key,value); } catch { available=false; } },
  remove(key:string):void { if(!available)return;try { localStorage.removeItem(key); } catch { available=false; } },
};
