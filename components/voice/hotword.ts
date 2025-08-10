export async function loadHotword(): Promise<{ listen: (cb: ()=>void)=>()=>void; ready: boolean; error?: string }>{
  try {
    // TODO: integrate Porcupine web worker; for now, fallback to no-op and let UI rely on button.
    const resp = await fetch('/hotwords/hey_castra.ppn', { method: 'HEAD' })
    if (!resp.ok) throw new Error('Hotword file missing')
    return { listen: () => { return () => {} }, ready: false, error: 'Porcupine not integrated yet. Using button.' }
  } catch (e: any) {
    return { listen: () => { return () => {} }, ready: false, error: e?.message || 'Hotword load failed' }
  }
}
