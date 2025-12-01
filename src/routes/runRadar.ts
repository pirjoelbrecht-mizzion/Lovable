// src/routes/runRadar.ts
export type RunCard = { id:string; title:string; region:string; km:number; surface:"trail"|"road"|"mixed"; scenicScore:number };

const MOCK:RunCard[] = [
  { id:"r1", title:"Ridge & Pines", region:"Local Hills", km:12, surface:"trail", scenicScore:9 },
  { id:"r2", title:"River Loop", region:"City Park", km:8, surface:"mixed", scenicScore:7 },
  { id:"r3", title:"Sunset Promenade", region:"Waterfront", km:5, surface:"road", scenicScore:8 },
  { id:"r4", title:"Peak Traverse", region:"Highland", km:18, surface:"trail", scenicScore:10 }
];

const KEY = "cache.runRadar";

export async function getRunRadar(_lat:number,_lon:number):Promise<RunCard[]>{
  // simulate fetch + cache
  try {
    await new Promise(r=>setTimeout(r,150));
    // in real life: fetch() → store on success
    const data = MOCK;
    localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data }));
    return data;
  } catch {
    // offline / failure → return cached if present, otherwise fallback MOCK
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { return JSON.parse(raw).data as RunCard[]; } catch {}
    }
    return MOCK;
  }
}
