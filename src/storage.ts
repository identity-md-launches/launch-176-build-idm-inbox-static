const memory = new Map<string,string>();
export const safeStorage = {
  get(key:string):string|null { try { return localStorage.getItem(key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; } },
  set(key:string,value:string):void { memory.set(key,value); try { localStorage.setItem(key,value); } catch { /* memory is the fallback */ } },
  remove(key:string):void { memory.delete(key); try { localStorage.removeItem(key); } catch { /* memory is the fallback */ } },
};

