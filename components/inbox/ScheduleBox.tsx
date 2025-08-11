"use client"
export function ScheduleBox({ schedule, onGenerate, onBook }: { schedule?: any; onGenerate:()=>void; onBook:(start:string,end:string)=>void }) {
  if (!schedule || !schedule.proposedWindows?.length) {
    return <button onClick={onGenerate} className="px-2 py-1 border rounded text-xs">Generate Proposals</button>;
  }
  return (
    <div className="schedule-box space-y-2">
      {schedule.proposedWindows.map((w:any, i:number)=> (
        <div key={i} className="flex items-center justify-between text-xs border rounded px-2 py-1">
          <span>{new Date(w.start).toLocaleString()} – {new Date(w.end).toLocaleTimeString()}</span>
          <button onClick={()=>onBook(w.start,w.end)} className="px-2 py-0.5 border rounded">Send & Invite</button>
        </div>
      ))}
    </div>
  );
}


