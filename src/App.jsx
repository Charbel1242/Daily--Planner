import { useState, useRef, useEffect } from "react";

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  ::-webkit-scrollbar{width:3px;height:3px;}
  ::-webkit-scrollbar-thumb{background:#ff6b2b33;border-radius:2px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
  @keyframes pop{0%{transform:scale(0.9);opacity:0;}100%{transform:scale(1);opacity:1;}}
  .fu{animation:fadeUp 0.28s ease both;}
  .fu2{animation:fadeUp 0.28s 0.06s ease both;}
  .fu3{animation:fadeUp 0.28s 0.12s ease both;}
`;

const DAYS   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DSHRT  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DMIN   = ['M','T','W','T','F','S','S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const CATS = {
  fitness:  { label:'Fitness',  color:'#ff6b2b' },
  study:    { label:'Study',    color:'#00c4ff' },
  school:   { label:'School',   color:'#a259ff' },
  work:     { label:'Work',     color:'#ffd60a' },
  personal: { label:'Personal', color:'#22d3a5' },
  other:    { label:'Other',    color:'#8888bb' },
};

let _n = 0;
const uid  = () => `tk${++_n}${Date.now()}`;
const tIdx = () => (new Date().getDay() + 6) % 7;

const fmt12 = t => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
};
const fmtHour = h => {
  const period = h >= 12 ? 'PM' : 'AM';
  const disp   = h % 12 || 12;
  return `${disp}${period}`;
};

const getWeekStart = (ref = new Date()) => {
  const d   = new Date(ref);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0,0,0,0);
  return d;
};

const EMPTY_TMPL = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };

export default function DailyPlanner() {
  const [tab,      setTab]      = useState('tracker');
  const [planDay,  setPlanDay]  = useState(tIdx());
  const [template, setTemplate] = useState(EMPTY_TMPL);
  const [extras,   setExtras]   = useState({});
  const [dones,    setDones]    = useState({});
  const [skips,    setSkips]    = useState({});
  const [addModal,   setAddModal]   = useState(null);
  const [skipModal,  setSkipModal]  = useState(null);
  const [skipReason, setSkipReason] = useState('');

  const today = tIdx();
  const K = (d,id) => `${d}|${id}`;
  const getDayTasks = d => [...(template[d]||[]), ...(extras[d]||[])];
  const isDone = (d,id) => !!dones[K(d,id)];
  const isSkip = (d,id) => !!skips[K(d,id)];

  const toggle = (d, task) => {
    const k = K(d, task.id);
    if (isSkip(d, task.id)) setSkips(p => { const n={...p}; delete n[k]; return n; });
    setDones(p => p[k] ? (({[k]:_,...r})=>r)(p) : {...p,[k]:true});
  };
  const openSkip = (d, taskId) => { setSkipReason(''); setSkipModal({d, taskId}); };
  const confirmSkip = () => {
    const k = K(skipModal.d, skipModal.taskId);
    setSkips(p => ({...p, [k]: skipReason||'No reason given'}));
    setDones(p => { const n={...p}; delete n[k]; return n; });
    setSkipModal(null);
  };

  const saveTask = data => {
    const { dayIdx, toTemplate, repeatDays, ...task } = data;
    const targetDays = repeatDays?.length > 0 ? repeatDays : [dayIdx];
    if (task.id) {
      if (template[dayIdx]?.find(t=>t.id===task.id))
        setTemplate(p=>({...p,[dayIdx]:p[dayIdx].map(t=>t.id===task.id?{...task,repeatDays}:t)}));
      else
        setExtras(p=>({...p,[dayIdx]:(p[dayIdx]||[]).map(t=>t.id===task.id?{...task,repeatDays}:t)}));
    } else {
      if (toTemplate) {
        setTemplate(p=>{ const n={...p}; targetDays.forEach(d=>{n[d]=[...(n[d]||[]),{...task,id:uid(),repeatDays:targetDays}];}); return n; });
      } else {
        setExtras(p=>{ const n={...p}; targetDays.forEach(d=>{n[d]=[...(n[d]||[]),{...task,id:uid(),repeatDays:targetDays}];}); return n; });
      }
    }
    setAddModal(null);
  };

  const deleteTask = (dayIdx, taskId) => {
    if (template[dayIdx]?.find(t=>t.id===taskId))
      setTemplate(p=>({...p,[dayIdx]:p[dayIdx].filter(t=>t.id!==taskId)}));
    else
      setExtras(p=>({...p,[dayIdx]:(p[dayIdx]||[]).filter(t=>t.id!==taskId)}));
  };

  const todayTasks   = getDayTasks(today);
  const todayDone    = todayTasks.filter(t=>isDone(today,t.id)).length;
  const todaySkipped = todayTasks.filter(t=>isSkip(today,t.id)).length;
  const todayPct     = todayTasks.length ? Math.round(todayDone/todayTasks.length*100) : 0;
  const pctColor     = todayPct>=80?'#22d3a5':todayPct>=40?'#ff6b2b':'#a259ff';

  const reflData = DSHRT.map((_,i)=>{
    const tasks=getDayTasks(i);
    return {label:DSHRT[i],total:tasks.length,done:tasks.filter(t=>isDone(i,t.id)).length,skip:tasks.filter(t=>isSkip(i,t.id)).length,isToday:i===today};
  });

  const TABS = [
    {id:'planner',   emoji:'📅', label:'Planner'},
    {id:'tracker',   emoji:'✅', label:'Today'},
    {id:'calendar',  emoji:'📆', label:'Calendar'},
    {id:'reflection',emoji:'📊', label:'Reflect'},
  ];

  return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',display:'flex',flexDirection:'column',background:'#09090f',color:'#eeeeff',fontFamily:"'DM Sans',sans-serif",position:'relative'}}>
      <style>{G}</style>

      {/* HEADER */}
      <div style={{padding:'24px 20px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
        <div>
          <div style={{fontFamily:'Syne',fontWeight:800,fontSize:26,letterSpacing:-1,background:'linear-gradient(135deg,#ffffff,#aaaacc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Daily Planner</div>
          <div style={{fontSize:13,color:'#7777aa',marginTop:2}}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
        {tab==='tracker' && (
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'Syne',fontWeight:800,fontSize:34,color:pctColor,lineHeight:1}}>{todayPct}%</div>
            <div style={{fontSize:11,color:'#7777aa',marginTop:2}}>today</div>
          </div>
        )}
        {tab==='planner' && <div style={{fontSize:13,color:'#7777aa',alignSelf:'center'}}>{getDayTasks(planDay).length} tasks</div>}
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px 110px'}}>
        {tab==='planner'    && <PlannerTab    planDay={planDay} setPlanDay={setPlanDay} getDayTasks={getDayTasks} onAdd={(d,t)=>setAddModal({dayIdx:d,toTemplate:t})} onEdit={(d,task)=>setAddModal({dayIdx:d,task,toTemplate:false})} onDelete={deleteTask}/>}
        {tab==='tracker'    && <TrackerTab    tasks={todayTasks} today={today} isDone={isDone} isSkip={isSkip} onToggle={toggle} onSkip={openSkip} done={todayDone} skipped={todaySkipped} pct={todayPct} pctColor={pctColor}/>}
        {tab==='calendar'   && <CalendarTab   getDayTasks={getDayTasks}/>}
        {tab==='reflection' && <ReflectionTab data={reflData} skips={skips} getDayTasks={getDayTasks}/>}
      </div>

      {/* TAB BAR */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:430,background:'rgba(18,18,31,0.97)',backdropFilter:'blur(12px)',borderTop:'1px solid #ffffff0e',display:'flex',padding:'10px 0 18px',zIndex:100}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,border:'none',background:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,color:tab===t.id?'#ff6b2b':'#555577',transition:'color 0.2s',padding:'4px 0'}}>
            <span style={{fontSize:18}}>{t.emoji}</span>
            <span style={{fontSize:10,fontWeight:tab===t.id?600:400}}>{t.label}</span>
            {tab===t.id && <div style={{width:16,height:2,borderRadius:1,background:'#ff6b2b',marginTop:1}}/>}
          </button>
        ))}
      </div>

      {/* SKIP MODAL */}
      {skipModal && (
        <Sheet onClose={()=>setSkipModal(null)}>
          <div style={{fontFamily:'Syne',fontWeight:800,fontSize:20,marginBottom:6}}>What got in the way?</div>
          <div style={{fontSize:13,color:'#7777aa',marginBottom:18,lineHeight:1.6}}>Be honest with yourself — recognising why you slipped is the first step to fixing it.</div>
          <textarea value={skipReason} onChange={e=>setSkipReason(e.target.value)} placeholder="I got distracted by… / I didn't have energy because… / Something came up…" autoFocus style={{width:'100%',background:'#1c1c2e',border:'1px solid #ffffff12',borderRadius:14,color:'#eeeeff',padding:'14px',fontSize:14,resize:'none',height:110,outline:'none',lineHeight:1.6}}/>
          <div style={{display:'flex',gap:10,marginTop:14}}>
            <Btn onClick={()=>setSkipModal(null)} bg='#1c1c2e' col='#7777aa' flex={1}>Cancel</Btn>
            <Btn onClick={confirmSkip} bg='#ff4747' col='#fff' flex={2}>Log & Skip</Btn>
          </div>
        </Sheet>
      )}
      {addModal && <AddTaskModal initial={addModal.task} dayIdx={addModal.dayIdx} initToTpl={addModal.toTemplate} onSave={saveTask} onClose={()=>setAddModal(null)}/>}
    </div>
  );
}

/* ── PLANNER TAB ─────────────────────────────────────────────────────────── */
function PlannerTab({planDay,setPlanDay,getDayTasks,onAdd,onEdit,onDelete}) {
  const tasks=getDayTasks(planDay);
  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:20,overflowX:'auto',paddingBottom:6,scrollbarWidth:'none'}}>
        {DSHRT.map((d,i)=>{
          const n=getDayTasks(i).length;
          return(
            <button key={i} onClick={()=>setPlanDay(i)} style={{flexShrink:0,padding:'7px 14px',borderRadius:20,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,transition:'all 0.2s',background:planDay===i?'#ff6b2b':'#1c1c2e',color:planDay===i?'#fff':'#7777aa',position:'relative'}}>
              {d}
              {n>0&&<span style={{position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:7,background:planDay===i?'#fff':'#ff6b2b',color:planDay===i?'#ff6b2b':'#fff',fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{n}</span>}
            </button>
          );
        })}
      </div>
      <div style={{fontFamily:'Syne',fontWeight:800,fontSize:20,marginBottom:4}} className="fu">{DAYS[planDay]}</div>
      <div style={{fontSize:12,color:'#7777aa',marginBottom:16}} className="fu">{tasks.length===0?'No tasks yet':`${tasks.length} task${tasks.length>1?'s':''} scheduled`}</div>
      {tasks.length===0&&<div style={{border:'1.5px dashed #ffffff12',borderRadius:16,padding:'36px',textAlign:'center',color:'#555577',fontSize:14,marginBottom:16,lineHeight:2}} className="fu2">Nothing here yet.<br/>Use the buttons below to add tasks.</div>}
      {tasks.map((task,i)=>(
        <div key={task.id} className="fu" style={{animationDelay:`${i*0.04}s`}}>
          <PlannerCard task={task} onEdit={()=>onEdit(planDay,task)} onDelete={()=>onDelete(planDay,task.id)}/>
        </div>
      ))}
      <div style={{display:'flex',gap:10,marginTop:20}} className="fu3">
        <button onClick={()=>onAdd(planDay,false)} style={{flex:1,padding:'12px',borderRadius:14,border:'1px solid #ffffff12',background:'#1c1c2e',color:'#aaaacc',cursor:'pointer',fontSize:13,fontWeight:600}}>+ This week</button>
        <button onClick={()=>onAdd(planDay,true)}  style={{flex:1,padding:'12px',borderRadius:14,border:'1px solid #ff6b2b44',background:'#ff6b2b14',color:'#ff6b2b',cursor:'pointer',fontSize:13,fontWeight:600}}>+ Template</button>
      </div>
    </div>
  );
}
function PlannerCard({task,onEdit,onDelete}) {
  const cat=CATS[task.category]||CATS.other;
  const emoji={fitness:'🏋️',study:'📖',school:'🎓',work:'💼',personal:'🌿',other:'📌'}[task.category]||'📌';
  return(
    <div style={{background:'#141422',borderRadius:16,padding:'14px 16px',marginBottom:10,display:'flex',alignItems:'center',gap:12,borderLeft:`3px solid ${cat.color}`}}>
      <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:`${cat.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{task.title}</div>
        <div style={{display:'flex',gap:8,marginTop:3,alignItems:'center'}}>
          <span style={{fontSize:11,color:cat.color,fontWeight:600}}>{cat.label}</span>
          <span style={{fontSize:11,color:'#555577'}}>·</span>
          <span style={{fontSize:11,color:'#555577'}}>{task.type==='time-block'?`${fmt12(task.startTime)} – ${fmt12(task.endTime)}`:'Flexible'}</span>
        </div>
        {task.repeatDays?.length>1&&(
          <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>
            {task.repeatDays.map(d=><span key={d} style={{fontSize:10,padding:'2px 6px',borderRadius:6,background:`${cat.color}22`,color:cat.color,fontWeight:600}}>{DSHRT[d]}</span>)}
          </div>
        )}
      </div>
      <button onClick={onEdit}   style={iBtn}>✏️</button>
      <button onClick={onDelete} style={iBtn}>🗑️</button>
    </div>
  );
}

/* ── TRACKER TAB ─────────────────────────────────────────────────────────── */
function TrackerTab({tasks,today,isDone,isSkip,onToggle,onSkip,done,skipped,pct,pctColor}) {
  const pending=tasks.length-done-skipped;
  const allDone=tasks.length>0&&(done+skipped)===tasks.length;
  return(
    <div>
      <div style={{background:'#141422',borderRadius:20,padding:'18px',marginBottom:20}} className="fu">
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <span style={{fontSize:13,color:'#7777aa',fontWeight:500}}>Daily progress</span>
          <span style={{fontFamily:'Syne',fontWeight:800,fontSize:15,color:pctColor}}>{pct}%</span>
        </div>
        <div style={{height:6,background:'#09090f',borderRadius:3,overflow:'hidden',marginBottom:14}}>
          <div style={{height:'100%',borderRadius:3,background:pctColor,width:`${pct}%`,transition:'width 0.6s cubic-bezier(0.34,1.56,0.64,1)'}}/>
        </div>
        <div style={{display:'flex',gap:20}}>
          <StatPill label="Done"    val={done}    color="#22d3a5"/>
          <StatPill label="Skipped" val={skipped} color="#ff4747"/>
          <StatPill label="Pending" val={pending} color="#555577"/>
        </div>
      </div>
      {tasks.length===0&&<div style={{textAlign:'center',padding:'48px 0',color:'#555577',fontSize:14,lineHeight:2}} className="fu2">No tasks for today yet.<br/><span style={{color:'#ff6b2b'}}>Add some in the Planner tab →</span></div>}
      {tasks.map((task,i)=>(
        <div key={task.id} className="fu" style={{animationDelay:`${i*0.04}s`}}>
          <TrackerCard task={task} done={isDone(today,task.id)} skipped={isSkip(today,task.id)} onToggle={()=>onToggle(today,task)} onSkip={()=>onSkip(today,task.id)}/>
        </div>
      ))}
      {allDone&&(
        <div style={{background:'linear-gradient(135deg,#ff6b2b18,#a259ff18)',border:'1px solid #ff6b2b2a',borderRadius:20,padding:'24px',textAlign:'center',marginTop:8,animation:'pop 0.3s ease'}}>
          <div style={{fontSize:32,marginBottom:8}}>{pct>=80?'🔥':'💪'}</div>
          <div style={{fontFamily:'Syne',fontWeight:800,fontSize:17,marginBottom:4}}>{pct>=80?"Day complete. You crushed it.":"Day wrapped up."}</div>
          <div style={{fontSize:13,color:'#7777aa',lineHeight:1.6}}>Head to <span style={{color:'#ff6b2b',fontWeight:600}}>Reflect</span> to see your week's patterns.</div>
        </div>
      )}
    </div>
  );
}
function TrackerCard({task,done,skipped,onToggle,onSkip}) {
  const cat=CATS[task.category]||CATS.other;
  const borderCol=done?'#22d3a5':skipped?'#ff4747':cat.color;
  return(
    <div style={{background:done?'#22d3a50c':skipped?'#ff47470c':'#141422',borderRadius:16,padding:'14px 16px',marginBottom:10,display:'flex',alignItems:'center',gap:12,borderLeft:`3px solid ${borderCol}`,opacity:skipped?0.65:1,transition:'all 0.3s'}}>
      <button onClick={onToggle} style={{width:26,height:26,borderRadius:8,border:`2px solid ${done?'#22d3a5':'#ffffff18'}`,background:done?'#22d3a5':'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#09090f',fontWeight:800,transition:'all 0.2s'}}>{done?'✓':''}</button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:14,textDecoration:skipped?'line-through':'none',color:skipped?'#555577':'#eeeeff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{task.title}</div>
        <div style={{fontSize:11,marginTop:3,color:skipped?'#ff6666':cat.color}}>{skipped?'⚠ Skipped':task.type==='time-block'?`${fmt12(task.startTime)} – ${fmt12(task.endTime)}`:`${cat.label} · Flexible`}</div>
      </div>
      {!done&&!skipped&&<button onClick={onSkip} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #ff474730',background:'#ff47470e',color:'#ff7777',fontSize:11,cursor:'pointer',fontWeight:600,flexShrink:0}}>Skip</button>}
      {skipped&&<button onClick={onToggle} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #ffffff12',background:'transparent',color:'#7777aa',fontSize:11,cursor:'pointer',flexShrink:0}}>Undo</button>}
    </div>
  );
}

/* ── CALENDAR TAB ─────────────────────────────────────────────────────────── */
function CalendarTab({getDayTasks}) {
  const [view,      setView]      = useState('week');
  const now = new Date();
  const [viewDate,  setViewDate]  = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedD, setSelectedD] = useState(now.getDate());
  const [weekStart, setWeekStart] = useState(getWeekStart());

  return (
    <div className="fu">
      {/* View toggle */}
      <div style={{display:'flex',gap:4,marginBottom:18,background:'#141422',borderRadius:14,padding:4}}>
        {[['week','Week View'],['month','Month View']].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{flex:1,padding:'9px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,transition:'all 0.2s',background:view===v?'#ff6b2b':'transparent',color:view===v?'#fff':'#7777aa'}}>
            {l}
          </button>
        ))}
      </div>

      {view==='week' && (
        <WeekView weekStart={weekStart} setWeekStart={setWeekStart} getDayTasks={getDayTasks}/>
      )}
      {view==='month' && (
        <MonthView viewDate={viewDate} setViewDate={setViewDate} selectedD={selectedD} setSelectedD={setSelectedD} getDayTasks={getDayTasks}/>
      )}
    </div>
  );
}

/* ── WEEK VIEW ────────────────────────────────────────────────────────────── */
function WeekView({weekStart, setWeekStart, getDayTasks}) {
  const HOUR_H  = 56; // px per hour
  const MIN_H   = 6;  // 6 AM
  const MAX_H   = 22; // 10 PM
  const GUTTER  = 38; // time label column width
  const now     = new Date();

  const scrollRef = useRef(null);

  // Scroll to current time or first task on mount
  useEffect(() => {
    if (scrollRef.current) {
      const nowH = now.getHours();
      const targetY = Math.max(0, (nowH - MIN_H - 1) * HOUR_H);
      scrollRef.current.scrollTop = targetY;
    }
  }, [weekStart]);

  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const isToday = d => d.toDateString() === now.toDateString();
  const hours   = Array.from({length: MAX_H - MIN_H + 1}, (_,i) => MIN_H + i);

  const timeToY  = t => { const [h,m]=t.split(':').map(Number); return (h - MIN_H + m/60) * HOUR_H; };
  const timeToPx = (s,e) => { const [sh,sm]=s.split(':').map(Number); const [eh,em]=e.split(':').map(Number); return (eh+em/60-sh-sm/60)*HOUR_H; };

  // Current time line position
  const nowY = (now.getHours() - MIN_H + now.getMinutes()/60) * HOUR_H;
  const showNowLine = now.getHours() >= MIN_H && now.getHours() < MAX_H;

  const prevWeek = () => setWeekStart(d => { const n=new Date(d); n.setDate(n.getDate()-7); return n; });
  const nextWeek = () => setWeekStart(d => { const n=new Date(d); n.setDate(n.getDate()+7); return n; });

  const weekLabel = () => {
    const end = new Date(weekStart); end.setDate(end.getDate()+6);
    const sm = MONTHS[weekStart.getMonth()].slice(0,3);
    const em = MONTHS[end.getMonth()].slice(0,3);
    if (sm===em) return `${sm} ${weekStart.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    return `${sm} ${weekStart.getDate()} – ${em} ${end.getDate()}, ${end.getFullYear()}`;
  };

  return (
    <div>
      {/* Navigation */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <NavBtn onClick={prevWeek}>‹</NavBtn>
        <div style={{fontFamily:'Syne',fontWeight:800,fontSize:15,textAlign:'center'}}>{weekLabel()}</div>
        <NavBtn onClick={nextWeek}>›</NavBtn>
      </div>

      {/* Day headers */}
      <div style={{display:'flex',marginBottom:4,paddingLeft:GUTTER}}>
        {weekDays.map((d,i)=>{
          const tod = isToday(d);
          return(
            <div key={i} style={{flex:1,textAlign:'center'}}>
              <div style={{fontSize:9,color:tod?'#ff6b2b':'#555577',fontWeight:700,letterSpacing:0.5,marginBottom:2}}>{DMIN[i]}</div>
              <div style={{
                width:26,height:26,borderRadius:13,margin:'0 auto',
                background:tod?'#ff6b2b':'transparent',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:'Syne',fontWeight:800,fontSize:13,
                color:tod?'#fff':'#eeeeff',
              }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Flexible tasks strip */}
      {Array.from({length:7}).some((_,i)=>getDayTasks(i).some(t=>t.type==='flexible')) && (
        <div style={{display:'flex',marginBottom:6,paddingLeft:GUTTER,gap:2}}>
          {weekDays.map((d,i)=>{
            const flex=getDayTasks(i).filter(t=>t.type==='flexible');
            return(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',gap:2}}>
                {flex.slice(0,2).map(t=>{
                  const col=(CATS[t.category]||CATS.other).color;
                  return <div key={t.id} style={{height:4,borderRadius:2,background:col,opacity:0.7}}/>;
                })}
                {flex.length>2&&<div style={{fontSize:8,color:'#555577',textAlign:'center'}}>+{flex.length-2}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Separator */}
      <div style={{height:1,background:'#ffffff10',marginBottom:0}}/>

      {/* Scrollable time grid */}
      <div ref={scrollRef} style={{overflowY:'auto',maxHeight:460,position:'relative'}}>
        <div style={{position:'relative',height:`${(MAX_H-MIN_H)*HOUR_H}px`}}>

          {/* Hour rows */}
          {hours.slice(0,-1).map((h,i)=>(
            <div key={h} style={{position:'absolute',top:i*HOUR_H,left:0,right:0,height:HOUR_H,display:'flex',alignItems:'flex-start'}}>
              <div style={{width:GUTTER,paddingRight:6,paddingTop:1,fontSize:9,color:'#555577',textAlign:'right',flexShrink:0,lineHeight:1}}>
                {fmtHour(h)}
              </div>
              <div style={{flex:1,borderTop:'1px solid #ffffff08',height:'100%',position:'relative'}}>
                {/* Half-hour line */}
                <div style={{position:'absolute',top:'50%',left:0,right:0,borderTop:'1px dashed #ffffff05'}}/>
              </div>
            </div>
          ))}

          {/* Day columns + tasks */}
          <div style={{position:'absolute',top:0,left:GUTTER,right:0,bottom:0,display:'flex'}}>
            {weekDays.map((d,i)=>{
              const timeTasks = getDayTasks(i).filter(t=>t.type==='time-block');
              const tod       = isToday(d);
              return(
                <div key={i} style={{flex:1,position:'relative',borderLeft:'1px solid #ffffff06',background:tod?'#ff6b2b04':'transparent'}}>
                  {/* Tasks */}
                  {timeTasks.map(task=>{
                    const [sh,sm]=task.startTime.split(':').map(Number);
                    const [eh,em]=task.endTime.split(':').map(Number);
                    if (sh < MIN_H || eh > MAX_H) return null;
                    const top    = timeToY(task.startTime);
                    const height = Math.max(timeToPx(task.startTime,task.endTime), 18);
                    const cat    = CATS[task.category]||CATS.other;
                    const short  = height < 32;
                    return(
                      <div key={task.id} style={{
                        position:'absolute',top,left:2,right:2,height,
                        background:`${cat.color}20`,
                        borderLeft:`2.5px solid ${cat.color}`,
                        borderRadius:6,padding:'3px 4px',
                        overflow:'hidden',cursor:'default',
                        zIndex:1,
                      }}>
                        <div style={{fontSize:9,fontWeight:700,color:cat.color,lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{task.title}</div>
                        {!short&&<div style={{fontSize:8,color:`${cat.color}99`,lineHeight:1.2,marginTop:1}}>{fmt12(task.startTime)}–{fmt12(task.endTime)}</div>}
                      </div>
                    );
                  })}
                  {/* Now line */}
                  {tod && showNowLine && (
                    <div style={{position:'absolute',top:nowY,left:-1,right:0,zIndex:2,display:'flex',alignItems:'center'}}>
                      <div style={{width:6,height:6,borderRadius:3,background:'#ff4747',flexShrink:0,marginLeft:-3}}/>
                      <div style={{flex:1,height:1.5,background:'#ff4747'}}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flexible tasks legend */}
      <div style={{marginTop:12,padding:'10px 12px',background:'#141422',borderRadius:12,fontSize:11,color:'#7777aa'}}>
        <span style={{fontWeight:600,color:'#aaaacc'}}>Coloured bars above grid</span> = flexible tasks (no fixed time)
      </div>
    </div>
  );
}

/* ── MONTH VIEW ───────────────────────────────────────────────────────────── */
function MonthView({viewDate, setViewDate, selectedD, setSelectedD, getDayTasks}) {
  const now = new Date();
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [];
  for (let i=0; i<startOffset; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);
  while (cells.length%7!==0) cells.push(null);

  const isToday  = d => d && year===now.getFullYear() && month===now.getMonth() && d===now.getDate();
  const dowOf    = d => (new Date(year,month,d).getDay()+6)%7;
  const selDow   = selectedD ? dowOf(selectedD) : null;
  const selTasks = selDow!==null ? getDayTasks(selDow) : [];
  const selDate  = selectedD ? new Date(year, month, selectedD) : null;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <NavBtn onClick={()=>{setViewDate(new Date(year,month-1,1));setSelectedD(null);}}>‹</NavBtn>
        <div style={{fontFamily:'Syne',fontWeight:800,fontSize:17}}>{MONTHS[month]} {year}</div>
        <NavBtn onClick={()=>{setViewDate(new Date(year,month+1,1));setSelectedD(null);}}>›</NavBtn>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {DMIN.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:10,color:'#555577',fontWeight:700,padding:'4px 0'}}>{d}</div>)}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const tasks=getDayTasks(dowOf(d));
          const tod=isToday(d);
          const sel=selectedD===d;
          return(
            <button key={i} onClick={()=>setSelectedD(sel?null:d)} style={{background:sel?'#ff6b2b':tod?'#ff6b2b1a':'#141422',borderRadius:10,border:sel?'1px solid #ff6b2b':tod?'1px solid #ff6b2b44':'1px solid #ffffff08',padding:'6px 4px 8px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,minHeight:52,transition:'all 0.15s'}}>
              <span style={{fontFamily:'Syne',fontWeight:tod||sel?800:500,fontSize:13,color:sel?'#fff':tod?'#ff6b2b':'#eeeeff'}}>{d}</span>
              {tasks.length>0&&(
                <div style={{display:'flex',gap:2,flexWrap:'wrap',justifyContent:'center',maxWidth:34}}>
                  {tasks.slice(0,4).map((t,ti)=><div key={ti} style={{width:5,height:5,borderRadius:'50%',background:sel?'rgba(255,255,255,0.8)':(CATS[t.category]||CATS.other).color}}/>)}
                  {tasks.length>4&&<div style={{fontSize:8,color:sel?'rgba(255,255,255,0.7)':'#555577'}}>+{tasks.length-4}</div>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Category legend */}
      <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>
        {Object.entries(CATS).map(([k,v])=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:v.color}}/>
            <span style={{fontSize:10,color:'#555577'}}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Selected day panel */}
      {selectedD&&(
        <div style={{marginTop:20,animation:'fadeUp 0.2s ease'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontFamily:'Syne',fontWeight:800,fontSize:16}}>{selDate?.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>
            <div style={{fontSize:12,color:'#7777aa'}}>{selTasks.length} task{selTasks.length!==1?'s':''}</div>
          </div>
          {selTasks.length===0?(
            <div style={{background:'#141422',borderRadius:14,padding:'20px',textAlign:'center',color:'#555577',fontSize:13,lineHeight:1.7}}>No tasks for {DAYS[selDow]}.<br/><span style={{color:'#ff6b2b'}}>Add some in the Planner tab.</span></div>
          ):(
            selTasks.map(task=>{
              const cat=CATS[task.category]||CATS.other;
              const emoji={fitness:'🏋️',study:'📖',school:'🎓',work:'💼',personal:'🌿',other:'📌'}[task.category]||'📌';
              return(
                <div key={task.id} style={{background:'#141422',borderRadius:14,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:10,borderLeft:`3px solid ${cat.color}`}}>
                  <div style={{width:32,height:32,borderRadius:9,flexShrink:0,background:`${cat.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{task.title}</div>
                    <div style={{fontSize:11,marginTop:2,color:cat.color}}>{task.type==='time-block'?`${fmt12(task.startTime)} – ${fmt12(task.endTime)}`:`${cat.label} · Flexible`}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ── REFLECTION TAB ──────────────────────────────────────────────────────── */
function ReflectionTab({data,skips,getDayTasks}) {
  const totalDone=data.reduce((s,d)=>s+d.done,0);
  const totalTasks=data.reduce((s,d)=>s+d.total,0);
  const pct=totalTasks?Math.round(totalDone/totalTasks*100):0;
  const bigCol=pct>=80?'#22d3a5':pct>=40?'#ff6b2b':'#a259ff';
  const skipEntries=[];
  data.forEach((_,i)=>{
    const tasks=getDayTasks(i);
    Object.entries(skips).forEach(([k,reason])=>{
      const [di,taskId]=k.split('|');
      if(Number(di)===i){const task=tasks.find(t=>t.id===taskId);if(task)skipEntries.push({day:DSHRT[i],task:task.title,reason});}
    });
  });
  return(
    <div>
      <div style={{background:'linear-gradient(160deg,#141422,#1a1a2e)',borderRadius:24,padding:'28px 24px',marginBottom:16,textAlign:'center',border:'1px solid #ffffff08'}} className="fu">
        <div style={{fontFamily:'Syne',fontWeight:800,fontSize:64,color:bigCol,lineHeight:1,letterSpacing:-2}}>{pct}%</div>
        <div style={{fontSize:13,color:'#555577',marginTop:6}}>weekly completion</div>
        <div style={{fontSize:14,color:'#aaaacc',marginTop:8,fontWeight:500}}>{totalDone} of {totalTasks} tasks completed</div>
        {totalTasks>0&&<div style={{display:'inline-block',marginTop:12,padding:'6px 16px',borderRadius:20,background:`${bigCol}18`,border:`1px solid ${bigCol}44`,fontSize:12,color:bigCol,fontWeight:600}}>{pct>=80?'🔥 Outstanding week!':pct>=60?'💪 Solid effort':pct>=40?'📈 Room to grow':'🎯 Keep pushing'}</div>}
      </div>
      <div style={{background:'#141422',borderRadius:20,padding:'18px',marginBottom:16}} className="fu2">
        <div style={{fontFamily:'Syne',fontWeight:800,fontSize:15,marginBottom:16}}>Daily Breakdown</div>
        <div style={{display:'flex',gap:8,alignItems:'flex-end',height:90}}>
          {data.map((d,i)=>{
            const dp=d.total?d.done/d.total:0,sp=d.total?d.skip/d.total:0;
            return(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                <div style={{width:'100%',height:70,display:'flex',flexDirection:'column-reverse',gap:1,borderRadius:6,overflow:'hidden',background:'#09090f'}}>
                  {dp>0&&<div style={{width:'100%',height:`${dp*100}%`,background:d.isToday?'#ff6b2b':'#22d3a5',transition:'height 0.5s ease'}}/>}
                  {sp>0&&<div style={{width:'100%',height:`${sp*100}%`,background:'#ff4747'}}/>}
                </div>
                <div style={{fontSize:10,color:d.isToday?'#ff6b2b':'#555577',fontWeight:d.isToday?700:400}}>{d.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:16,marginTop:12}}>
          <Legend color="#22d3a5" label="Done"/><Legend color="#ff4747" label="Skipped"/><Legend color="#ff6b2b" label="Today"/>
        </div>
      </div>
      {skipEntries.length>0&&(
        <div style={{background:'#141422',borderRadius:20,padding:'18px',marginBottom:16}} className="fu3">
          <div style={{fontFamily:'Syne',fontWeight:800,fontSize:15,marginBottom:14,display:'flex',alignItems:'center',gap:8}}><span>🔍</span> What you skipped & why</div>
          {skipEntries.map((e,i)=>(
            <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:i<skipEntries.length-1?'1px solid #ffffff08':'none'}}>
              <div style={{fontSize:14,fontWeight:600}}>{e.task}<span style={{color:'#555577',fontWeight:400,fontSize:12}}> · {e.day}</span></div>
              <div style={{fontSize:12,color:'#7777aa',marginTop:5,fontStyle:'italic',lineHeight:1.5}}>"{e.reason}"</div>
            </div>
          ))}
        </div>
      )}
      {totalTasks===0&&<div style={{textAlign:'center',padding:'32px 0',color:'#555577',fontSize:14,lineHeight:2}} className="fu3">Nothing tracked yet.<br/><span style={{color:'#ff6b2b'}}>Start in the Today tab to see your reflection.</span></div>}
    </div>
  );
}

/* ── ADD / EDIT MODAL ────────────────────────────────────────────────────── */
function AddTaskModal({initial,dayIdx,initToTpl,onSave,onClose}) {
  const [title,      setTitle]      = useState(initial?.title||'');
  const [type,       setType]       = useState(initial?.type||'flexible');
  const [startTime,  setStartTime]  = useState(initial?.startTime||'09:00');
  const [endTime,    setEndTime]    = useState(initial?.endTime||'10:00');
  const [category,   setCategory]   = useState(initial?.category||'study');
  const [toTpl,      setToTpl]      = useState(initToTpl??false);
  const [repeatDays, setRepeatDays] = useState(initial?.repeatDays??[dayIdx]);
  const toggleDay = i => setRepeatDays(p=>p.includes(i)?(p.length>1?p.filter(d=>d!==i):p):[...p,i].sort((a,b)=>a-b));
  const repeatLabel = repeatDays.length===7?'Every day':repeatDays.length===1?`${DAYS[repeatDays[0]]} only`:`${repeatDays.length} days`;
  const save = () => {
    if (!title.trim()) return;
    onSave({id:initial?.id,title:title.trim(),type,startTime:type==='time-block'?startTime:undefined,endTime:type==='time-block'?endTime:undefined,category,dayIdx,toTemplate:toTpl,repeatDays});
  };
  return(
    <Sheet onClose={onClose}>
      <div style={{fontFamily:'Syne',fontWeight:800,fontSize:20,marginBottom:18}}>{initial?'Edit Task':`Add to ${DAYS[dayIdx]}`}</div>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task title…" autoFocus style={{width:'100%',background:'#1c1c2e',border:'1px solid #ffffff12',borderRadius:12,color:'#eeeeff',padding:'13px 14px',fontSize:14,outline:'none',marginBottom:14}}/>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        {[['flexible','⚡ Flexible'],['time-block','⏰ Time Block']].map(([v,l])=>(
          <button key={v} onClick={()=>setType(v)} style={{flex:1,padding:'10px',borderRadius:12,cursor:'pointer',fontWeight:600,fontSize:13,border:`1px solid ${type===v?'#ff6b2b':'#ffffff12'}`,background:type===v?'#ff6b2b1a':'transparent',color:type===v?'#ff6b2b':'#7777aa'}}>{l}</button>
        ))}
      </div>
      {type==='time-block'&&(
        <div style={{display:'flex',gap:10,marginBottom:14}}>
          {[['Start',startTime,setStartTime],['End',endTime,setEndTime]].map(([lbl,val,set])=>(
            <div key={lbl} style={{flex:1}}>
              <div style={{fontSize:11,color:'#7777aa',marginBottom:5,fontWeight:500}}>{lbl}</div>
              <input type="time" value={val} onChange={e=>set(e.target.value)} style={{width:'100%',background:'#1c1c2e',border:'1px solid #ffffff12',borderRadius:12,color:'#eeeeff',padding:'11px 14px',fontSize:14,outline:'none'}}/>
            </div>
          ))}
        </div>
      )}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:'#7777aa',marginBottom:8,fontWeight:500}}>Category</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {Object.entries(CATS).map(([k,v])=>(
            <button key={k} onClick={()=>setCategory(k)} style={{padding:'6px 12px',borderRadius:10,cursor:'pointer',fontWeight:600,fontSize:12,border:`1px solid ${category===k?v.color:'#ffffff10'}`,background:category===k?`${v.color}1a`:'transparent',color:category===k?v.color:'#7777aa'}}>{v.label}</button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:14,paddingBottom:14,borderBottom:'1px solid #ffffff08'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div style={{fontSize:11,color:'#7777aa',fontWeight:500}}>Repeat on</div>
          <div style={{fontSize:11,color:'#ff6b2b',fontWeight:600}}>{repeatLabel}</div>
        </div>
        <div style={{display:'flex',gap:5}}>
          {DSHRT.map((d,i)=>{
            const active=repeatDays.includes(i);
            return(<button key={i} onClick={()=>toggleDay(i)} style={{flex:1,padding:'9px 2px',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:11,transition:'all 0.15s',border:`1px solid ${active?'#ff6b2b':'#ffffff12'}`,background:active?'#ff6b2b':'#1c1c2e',color:active?'#fff':'#555577'}}>{d}</button>);
          })}
        </div>
      </div>
      {!initial&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:16,borderBottom:'1px solid #ffffff08',marginBottom:16}}>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>Add to weekly template</div>
            <div style={{fontSize:11,color:'#555577',marginTop:2}}>Repeats automatically every week</div>
          </div>
          <div onClick={()=>setToTpl(p=>!p)} style={{width:42,height:24,borderRadius:12,cursor:'pointer',background:toTpl?'#ff6b2b':'#1c1c2e',border:'1px solid #ffffff12',position:'relative',transition:'background 0.25s',flexShrink:0}}>
            <div style={{width:18,height:18,borderRadius:9,background:'#fff',position:'absolute',top:2,left:toTpl?20:2,transition:'left 0.25s'}}/>
          </div>
        </div>
      )}
      <div style={{display:'flex',gap:10}}>
        <Btn onClick={onClose} bg='#1c1c2e' col='#7777aa' flex={1}>Cancel</Btn>
        <Btn onClick={save}    bg='#ff6b2b' col='#fff'    flex={2}>{initial?'Save Changes':'Add Task'}</Btn>
      </div>
    </Sheet>
  );
}

/* ── SHARED ──────────────────────────────────────────────────────────────── */
function Sheet({children,onClose}) {
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,backdropFilter:'blur(6px)',animation:'fadeIn 0.2s ease'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'#12121f',borderRadius:'24px 24px 0 0',padding:'24px 20px 32px',width:'100%',maxWidth:430,maxHeight:'92vh',overflowY:'auto',animation:'slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',border:'1px solid #ffffff08',borderBottom:'none'}}>
        {children}
      </div>
    </div>
  );
}
const NavBtn = ({onClick,children}) => (
  <button onClick={onClick} style={{width:34,height:34,borderRadius:10,border:'1px solid #ffffff12',background:'#141422',color:'#eeeeff',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{children}</button>
);
const Btn=({children,onClick,bg,col,flex})=>(<button onClick={onClick} style={{padding:'13px',borderRadius:14,border:'none',cursor:'pointer',background:bg,color:col,fontWeight:600,fontSize:14,flex}}>{children}</button>);
const StatPill=({label,val,color})=>(<div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:7,height:7,borderRadius:'50%',background:color}}/><span style={{fontSize:12,color:'#7777aa'}}>{label}</span><span style={{fontSize:13,fontWeight:700,color}}>{val}</span></div>);
const Legend=({color,label})=>(<div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:8,height:8,borderRadius:2,background:color}}/><span style={{fontSize:11,color:'#555577'}}>{label}</span></div>);
const iBtn={width:32,height:32,borderRadius:8,border:'none',background:'transparent',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0};
