import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES = ['إبل','بقر','خيل','حمير','خراف','ماعز']
const T_ICON = {'إبل':'🐪','بقر':'🐄','خراف':'🐑','ماعز':'🐐','خيل':'🐎','حمير':'🫏'}

const SUB_TYPES = {
  'خراف': ['أبو بلة','بربر','تشاد','حري','خاوي','دمنة','رحيلي','سواكني','شمبة','صفراء','عربي','عواسي','قصيمي','كوشن','محلي','مقطع الذيل','منشي','نجدي','هجين'],
  'إبل':  ['بيضاء','حمراء','زرقاء','شعل','عمانية','مجاهيم','مغاتير','وضح'],
  'بقر':  ['أنقولي','براهمان','بلدي','فريزيان','هولشتاين'],
  'ماعز': ['بلدي','جبلي','شامي','عربي','مصري'],
  'خيل':  ['أصيل','إنجليزي','بلدي','عربي'],
  'حمير': ['بلدي','صومالي'],
}

const STATUSES = ['صحية','مريضة','حامل','للبيع','متوفاة']
const S_COLOR = {
  'صحية':   {bg:'#d1fae5',text:'#065f46',dot:'#10b981'},
  'مريضة':  {bg:'#fee2e2',text:'#991b1b',dot:'#ef4444'},
  'حامل':   {bg:'#fef3c7',text:'#92400e',dot:'#f59e0b'},
  'للبيع':  {bg:'#ede9fe',text:'#5b21b6',dot:'#8b5cf6'},
  'متوفاة': {bg:'#f3f4f6',text:'#374151',dot:'#9ca3af'},
}

const EVENT_TYPES = ['مرض','تطعيم','ولادة']
const EVENT_ICON  = {'مرض':'🏥','تطعيم':'💉','ولادة':'🐣'}

const TAG_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#06b6d4','#f97316','#84cc16','#ffffff',
]

const PLANS = [
  {id:'free',name:'المجاني',price:0,color:'#6b7280',limit:10},
  {id:'pro',name:'المزرعة',price:49,color:'#10b981',limit:100},
  {id:'enterprise',name:'المزرعة الكبرى',price:149,color:'#f59e0b',limit:999},
]

function today() { return new Date().toISOString().split('T')[0] }
function sortAZ(arr) { return [...arr].sort((a,b)=>a.localeCompare(b,'ar')) }

function genTag(type, serial) {
  const p={'بقر':'BQ','إبل':'CA','خراف':'SH','ماعز':'GT','خيل':'HR','حمير':'DN'}
  return `${p[type]||'AN'}-${String(serial||Math.floor(Math.random()*9000)+1000).padStart(4,'0')}`
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const INP = {
  background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',
  borderRadius:10,color:'#e8f5e9',fontFamily:"'Cairo',sans-serif",
  padding:'10px 13px',width:'100%',outline:'none',fontSize:14,
}
const OVERLAY = {
  position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',
  backdropFilter:'blur(6px)',zIndex:300,
  display:'flex',alignItems:'center',justifyContent:'center',padding:16,
}
const MODAL = {
  background:'#0b1a10',border:'1px solid rgba(45,122,79,0.4)',
  borderRadius:20,padding:24,width:'100%',maxWidth:480,
  maxHeight:'92vh',overflowY:'auto',
}

// ─── Components ───────────────────────────────────────────────────────────────
function Badge({status}) {
  const c = S_COLOR[status]||S_COLOR['صحية']
  return (
    <span style={{background:c.bg,color:c.text,padding:'3px 10px',borderRadius:20,
      fontSize:12,fontWeight:700,display:'inline-flex',alignItems:'center',gap:5}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:c.dot,display:'inline-block'}}/>
      {status}
    </span>
  )
}

function Btn({children,onClick,variant='green',disabled,full,style:sx={}}) {
  const base={cursor:disabled?'not-allowed':'pointer',border:'none',borderRadius:10,
    fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:14,
    padding:'10px 18px',transition:'all .18s',opacity:disabled?0.6:1,
    width:full?'100%':'auto'}
  const v={
    green:  {background:'linear-gradient(135deg,#2d7a4f,#4ade80)',color:'#0a1a0e'},
    ghost:  {background:'rgba(255,255,255,0.07)',color:'#e8f5e9',border:'1px solid rgba(255,255,255,0.13)'},
    danger: {background:'rgba(239,68,68,0.12)',color:'#f87171',border:'1px solid rgba(239,68,68,0.28)'},
    blue:   {background:'rgba(96,165,250,0.12)',color:'#60a5fa',border:'1px solid rgba(96,165,250,0.28)'},
  }
  return <button style={{...base,...v[variant],...sx}} onClick={onClick} disabled={disabled}>{children}</button>
}

function Lbl({children}) {
  return <div style={{fontSize:12,color:'#86c99a',marginBottom:5,fontWeight:700}}>{children}</div>
}

function Toast({toast}) {
  if(!toast) return null
  return (
    <div style={{position:'fixed',top:18,left:'50%',transform:'translateX(-50%)',zIndex:999,
      background:toast.type==='err'?'#450a0a':'#052e16',
      border:`1px solid ${toast.type==='err'?'#ef4444':'#10b981'}`,
      borderRadius:12,padding:'11px 24px',fontWeight:700,fontSize:14,color:'#fff',
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)',whiteSpace:'nowrap',
      fontFamily:"'Cairo',sans-serif"}}>
      {toast.msg}
    </div>
  )
}

function Counter({value,onChange,min=0,max=999}) {
  return (
    <div style={{display:'flex',alignItems:'center',background:'rgba(255,255,255,0.07)',
      border:'1px solid rgba(255,255,255,0.15)',borderRadius:10,overflow:'hidden',height:44}}>
      <button onClick={()=>onChange(Math.max(min,value-1))}
        style={{width:44,height:'100%',background:'rgba(239,68,68,0.15)',border:'none',
          color:'#f87171',fontSize:22,cursor:'pointer',fontWeight:700,flexShrink:0}}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.3)'}
        onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.15)'}>−</button>
      <input type="number" value={value}
        onChange={e=>onChange(Math.max(min,Math.min(max,Number(e.target.value)||0)))}
        style={{flex:1,background:'none',border:'none',color:'#e8f5e9',textAlign:'center',
          fontSize:18,fontWeight:700,outline:'none',fontFamily:"'Cairo',sans-serif",padding:'0 4px'}}/>
      <button onClick={()=>onChange(Math.min(max,value+1))}
        style={{width:44,height:'100%',background:'rgba(74,222,128,0.15)',border:'none',
          color:'#4ade80',fontSize:22,cursor:'pointer',fontWeight:700,flexShrink:0}}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(74,222,128,0.3)'}
        onMouseLeave={e=>e.currentTarget.style.background='rgba(74,222,128,0.15)'}>＋</button>
    </div>
  )
}

// Combo = dropdown + free text
function Combo({value, onChange, options, placeholder=''}) {
  const sorted = sortAZ(options)
  return (
    <div style={{position:'relative'}}>
      <input
        list={`combo-${placeholder}`}
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={INP}
      />
      <datalist id={`combo-${placeholder}`}>
        {sorted.map(o=><option key={o} value={o}/>)}
      </datalist>
    </div>
  )
}

// Color picker row
function ColorPicker({value, onChange}) {
  return (
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
      {TAG_COLORS.map(c=>(
        <div key={c} onClick={()=>onChange(c)} style={{
          width:26,height:26,borderRadius:'50%',background:c,cursor:'pointer',
          border:value===c?'3px solid #fff':'2px solid rgba(255,255,255,0.2)',
          transition:'all .15s',transform:value===c?'scale(1.2)':'scale(1)',
          flexShrink:0,
        }}/>
      ))}
      <input type="color" value={value} onChange={e=>onChange(e.target.value)}
        style={{width:26,height:26,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.2)',
          background:'none',cursor:'pointer',padding:0,outline:'none'}}
        title="لون مخصص"/>
    </div>
  )
}

// Tag badge with custom color
function TagBadge({tag, color}) {
  const c = color||'#10b981'
  const isDark = c==='#ffffff'||c==='#fff'
  return (
    <span style={{fontFamily:'monospace',background:`${c}22`,color:c,
      border:`1px solid ${c}55`,padding:'2px 8px',borderRadius:7,
      fontSize:11,fontWeight:700,display:'inline-flex',alignItems:'center',gap:5}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:c,flexShrink:0,display:'inline-block'}}/>
      {tag}
    </span>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const [tab,setTab]=useState('login')
  const [email,setEmail]=useState('')
  const [pass,setPass]=useState('')
  const [name,setName]=useState('')
  const [msg,setMsg]=useState('')
  const [loading,setLoading]=useState(false)
  const isReg=tab==='register'
  const isReset=tab==='reset'

  async function submit() {
    setLoading(true);setMsg('')
    try {
      if(isReset) {
        if(!email){setMsg('أدخل بريدك الإلكتروني');setLoading(false);return}
        const{error}=await supabase.auth.resetPasswordForEmail(email,{
          redirectTo: window.location.origin
        })
        if(error) throw error
        setMsg('✅ تم إرسال رابط إعادة التعيين لبريدك!')
      } else if(isReg) {
        if(!email||!pass||!name){setMsg('يرجى تعبئة جميع الحقول');setLoading(false);return}
        const{error}=await supabase.auth.signUp({email,password:pass,options:{data:{name}}})
        if(error) throw error
        setMsg('✅ تم! سجّل دخولك الآن.');setTab('login')
      } else {
        if(!email||!pass){setMsg('يرجى تعبئة جميع الحقول');setLoading(false);return}
        const{error}=await supabase.auth.signInWithPassword({email,password:pass})
        if(error) throw error
      }
    } catch(e){setMsg(e.message.includes('Invalid')?'بريد أو كلمة مرور خاطئة':e.message)}
    setLoading(false)
  }

  return (
    <div dir="rtl" style={{fontFamily:"'Cairo',sans-serif",minHeight:'100vh',
      background:'radial-gradient(ellipse at 50% 0%,#0d2b19 0%,#060f09 70%)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap')`}</style>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:80,height:80,background:'linear-gradient(135deg,#2d7a4f,#4ade80)',
            borderRadius:22,display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:40,margin:'0 auto 14px',boxShadow:'0 0 50px rgba(74,222,128,0.3)'}}>🐄</div>
          <h1 style={{fontSize:30,fontWeight:900,color:'#4ade80',margin:'0 0 4px'}}>مواشي</h1>
          <p style={{color:'#86c99a',fontSize:13,margin:0}}>نظام إدارة المواشي الذكي</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:22,padding:26}}>
          <div style={{display:'flex',background:'rgba(0,0,0,0.35)',borderRadius:12,padding:4,marginBottom:22,gap:4}}>
            {[['login','دخول'],['register','حساب جديد'],['reset','نسيت كلمة السر']].map(([t,lb])=>(
              <button key={t} onClick={()=>{setTab(t);setMsg('')}} style={{flex:1,padding:'8px 4px',border:'none',
                borderRadius:9,fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:12,cursor:'pointer',
                background:tab===t?'linear-gradient(135deg,#2d7a4f,#4ade80)':'none',
                color:tab===t?'#0a1a0e':'#86c99a'}}>
                {lb}
              </button>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:13}}>
            {isReg&&<div><Lbl>الاسم</Lbl><input style={INP} placeholder="اسمك الكامل" value={name} onChange={e=>setName(e.target.value)}/></div>}
            <div><Lbl>البريد الإلكتروني</Lbl><input style={INP} type="email" placeholder="example@email.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
            {!isReset&&<div><Lbl>كلمة المرور</Lbl><input style={INP} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/></div>}
            {msg&&<div style={{background:msg.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',
              border:`1px solid ${msg.startsWith('✅')?'#10b981':'#ef4444'}`,
              color:msg.startsWith('✅')?'#34d399':'#f87171',borderRadius:9,padding:'10px 13px',fontSize:13}}>{msg}</div>}
            <button onClick={submit} disabled={loading} style={{background:'linear-gradient(135deg,#2d7a4f,#4ade80)',
              color:'#0a1a0e',border:'none',borderRadius:10,padding:12,fontSize:15,
              fontFamily:"'Cairo',sans-serif",fontWeight:800,cursor:'pointer',opacity:loading?0.7:1}}>
              {loading?'جاري...':{login:'🔐 دخول',register:'🚀 إنشاء الحساب',reset:'📧 إرسال رابط التعيين'}[tab]}
            </button>
          </div>
          {!isReset&&<div style={{textAlign:'center',marginTop:14,padding:10,background:'rgba(45,122,79,0.1)',borderRadius:10}}>
            <div style={{fontSize:12,color:'#4ade80',fontWeight:700}}>ابدأ مجاناً — بدون بطاقة ائتمان</div>
          </div>}
        </div>
      </div>
    </div>
  )
}

// ─── Excel Import Modal ───────────────────────────────────────────────────────
function ExcelImport({onClose, onImport}) {
  const [preview,setPreview]=useState([])
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const fileRef=useRef()

  function parseCSV(text) {
    const lines=text.split('\n').filter(l=>l.trim())
    if(lines.length<2){setError('الملف فارغ أو غير صحيح');return}
    const headers=lines[0].split(',').map(h=>h.replace(/"/g,'').trim())
    const rows=lines.slice(1).map(line=>{
      const vals=line.split(',').map(v=>v.replace(/"/g,'').trim())
      const obj={}
      headers.forEach((h,i)=>obj[h]=vals[i]||'')
      return obj
    }).filter(r=>r['النوع']||r['type'])
    setPreview(rows.slice(0,5))
    return rows
  }

  async function handleFile(e) {
    const file=e.target.files[0]
    if(!file){return}
    setError('');setPreview([])
    if(!file.name.endsWith('.csv')&&!file.name.endsWith('.xlsx')){
      setError('يرجى رفع ملف CSV فقط في الوقت الحالي. لتحويل Excel: افتح الملف وأحفظه كـ CSV');
      return
    }
    const text=await file.text()
    parseCSV(text)
  }

  async function doImport() {
    const file=fileRef.current?.files[0]
    if(!file){setError('اختر ملفاً أولاً');return}
    setLoading(true)
    const text=await file.text()
    const rows=parseCSV(text)
    if(!rows?.length){setLoading(false);return}
    onImport(rows)
    setLoading(false)
  }

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={{...MODAL,maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h3 style={{fontWeight:900,fontSize:17,color:'#4ade80'}}>📥 رفع من Excel / CSV</h3>
          <Btn variant="ghost" onClick={onClose} style={{padding:'4px 10px',fontSize:16}}>✕</Btn>
        </div>

        <div style={{background:'rgba(96,165,250,0.08)',border:'1px solid rgba(96,165,250,0.25)',
          borderRadius:10,padding:14,marginBottom:16,fontSize:12,color:'#86c99a',lineHeight:1.8}}>
          <div style={{color:'#60a5fa',fontWeight:700,marginBottom:6}}>📋 تنسيق الملف المطلوب:</div>
          <div>الأعمدة: <span style={{color:'#4ade80'}}>النوع، النوع الفرعي، الجنس، العمر، الوزن، الحالة، الحظيرة، ملاحظات</span></div>
          <div style={{marginTop:6}}>مثال للصف: <span style={{fontFamily:'monospace',color:'#fbbf24'}}>خراف، نجدي، ذكر، 2، 45، صحية، الحظيرة الرئيسية، </span></div>
        </div>

        <div style={{border:'2px dashed rgba(45,122,79,0.4)',borderRadius:12,padding:24,
          textAlign:'center',marginBottom:14,cursor:'pointer',background:'rgba(45,122,79,0.05)'}}
          onClick={()=>fileRef.current?.click()}>
          <div style={{fontSize:32,marginBottom:8}}>📂</div>
          <div style={{color:'#4ade80',fontWeight:700,marginBottom:4}}>اضغط لاختيار الملف</div>
          <div style={{color:'#86c99a',fontSize:12}}>CSV أو Excel (محوّل لـ CSV)</div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={handleFile} style={{display:'none'}}/>
        </div>

        {error&&<div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',
          color:'#f87171',borderRadius:9,padding:'10px 13px',fontSize:13,marginBottom:12}}>{error}</div>}

        {preview.length>0&&(
          <div style={{marginBottom:14}}>
            <div style={{color:'#4ade80',fontWeight:700,fontSize:13,marginBottom:8}}>
              معاينة أول {preview.length} صفوف:
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:160,overflowY:'auto'}}>
              {preview.map((r,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,0.04)',borderRadius:8,
                  padding:'8px 12px',fontSize:12,color:'#86c99a',display:'flex',gap:10,flexWrap:'wrap'}}>
                  <span style={{color:'#4ade80'}}>{r['النوع']||r['type']||'—'}</span>
                  <span>{r['النوع الفرعي']||r['sub_type']||''}</span>
                  <span>{r['الجنس']||r['gender']||''}</span>
                  <span>{r['العمر']||r['age']||0} سنة</span>
                  <span>{r['الوزن']||r['weight']||0} كغ</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:10}}>
          <Btn onClick={doImport} disabled={loading||!preview.length} full style={{padding:12,fontSize:14}}>
            {loading?'جاري الاستيراد...':`📥 استيراد ${preview.length>0?'الملف':''}`}
          </Btn>
          <Btn variant="ghost" onClick={onClose} style={{padding:'12px 16px'}}>إلغاء</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,setSession]=useState(null)
  const [booting,setBooting]=useState(true)
  const [animals,setAnimals]=useState([])
  const [pens,setPens]=useState([])
  const [events,setEvents]=useState([])
  const [plan,setPlan]=useState('free')
  const [view,setView]=useState('dashboard')
  const [modal,setModal]=useState(null)
  const [selId,setSelId]=useState(null)
  const [form,setForm]=useState({})
  const [penForm,setPenForm]=useState({name:'',description:''})
  const [eventForm,setEventForm]=useState({type:'مرض',title:'',medicine:'',cost:0,event_date:today()})
  const [search,setSearch]=useState('')
  const [fType,setFType]=useState('الكل')
  const [fStatus,setFStatus]=useState('الكل')
  const [fPen,setFPen]=useState('الكل')
  const [toast,setToast]=useState(null)
  const [saving,setSaving]=useState(false)
  const [animalEvents,setAnimalEvents]=useState([])
  const [eventsTab,setEventsTab]=useState('مرض')

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setBooting(false)})
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s))
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(session) fetchAll() },[session])

  async function fetchAll() {
    const[a,p,e]=await Promise.all([
      supabase.from('animals').select('*').order('serial_number',{ascending:true}),
      supabase.from('pens').select('*').order('name',{ascending:true}),
      supabase.from('events').select('*').order('event_date',{ascending:false}),
    ])
    if(!a.error) setAnimals(a.data||[])
    if(!p.error) setPens(p.data||[])
    if(!e.error) setEvents(e.data||[])
  }

  function showToast(msg,type='ok'){setToast({msg,type});setTimeout(()=>setToast(null),3000)}

  const planCfg=PLANS.find(p=>p.id===plan)
  const sel=animals.find(a=>a.id===selId)

  const filtered=animals.filter(a=>
    (a.tag?.toLowerCase().includes(search.toLowerCase())||
     a.type?.includes(search)||a.sub_type?.includes(search)||
     String(a.serial_number).includes(search))&&
    (fType==='الكل'||a.type===fType)&&
    (fStatus==='الكل'||a.status===fStatus)&&
    (fPen==='الكل'||a.pen_id===fPen||(fPen==='بدون حظيرة'&&!a.pen_id))
  )

  const stats={
    total:animals.length,
    healthy:animals.filter(a=>a.status==='صحية').length,
    sick:animals.filter(a=>a.status==='مريضة').length,
    pregnant:animals.filter(a=>a.status==='حامل').length,
    forSale:animals.filter(a=>a.status==='للبيع').length,
    totalWeight:animals.reduce((s,a)=>s+Number(a.weight||0),0),
  }

  const nextSerial=()=>(animals.length>0?Math.max(...animals.map(a=>a.serial_number||0))+1:1)

  function openQuickAdd() {
    if(animals.length>=planCfg.limit){setModal('pricing');return}
    setForm({type:'خراف',sub_type:'',gender:'ذكر',status:'صحية',
      pen_id:'',count:1,weight:'',age:'',vaccinated:false,tag_color:'#10b981'})
    setModal('quickadd')
  }

  async function saveQuickAdd() {
    const cnt=Number(form.count)||1
    if(animals.length+cnt>planCfg.limit){setModal('pricing');return}
    setSaving(true)
    const start=nextSerial()
    const rows=Array.from({length:cnt},(_,i)=>{
      const serial=start+i
      return {
        serial_number:serial,
        tag:genTag(form.type,serial),
        tag_color:form.tag_color||'#10b981',
        type:form.type,sub_type:form.sub_type||'',
        gender:form.gender,status:form.status,
        age:Number(form.age)||0,weight:Number(form.weight)||0,
        vaccinated:!!form.vaccinated,notes:'',
        last_checkup:today(),pen_id:form.pen_id||null,
        user_id:session.user.id,
      }
    })
    const{error}=await supabase.from('animals').insert(rows)
    if(error) showToast('خطأ في الإضافة ❌','err')
    else{showToast(`تمت إضافة ${cnt} رأس 🐄`);await fetchAll()}
    setSaving(false);setModal(null)
  }

  function openAdd() {
    if(animals.length>=planCfg.limit){setModal('pricing');return}
    const serial=nextSerial()
    setForm({serial_number:serial,tag:genTag('خراف',serial),tag_color:'#10b981',
      type:'خراف',sub_type:'',age:0,weight:0,status:'صحية',
      gender:'ذكر',notes:'',last_checkup:today(),vaccinated:false,pen_id:''})
    setSelId(null);setModal('form')
  }

  function openEdit(a){
    setForm({...a,pen_id:a.pen_id||''})
    setSelId(a.id);setModal('form')
  }

  async function saveAnimal() {
    setSaving(true)
    const payload={
      tag:form.tag,tag_color:form.tag_color||'#10b981',
      type:form.type,sub_type:form.sub_type||'',
      gender:form.gender,age:Number(form.age)||0,
      weight:Number(form.weight)||0,status:form.status,
      vaccinated:!!form.vaccinated,notes:form.notes||'',
      last_checkup:form.last_checkup,pen_id:form.pen_id||null,
    }
    if(selId){
      const{error}=await supabase.from('animals').update(payload).eq('id',selId)
      if(error) showToast('خطأ ❌','err')
      else{showToast('تم التحديث ✅');await fetchAll()}
    } else {
      const{error}=await supabase.from('animals').insert([{
        ...payload,serial_number:form.serial_number||nextSerial(),user_id:session.user.id
      }])
      if(error) showToast('خطأ ❌','err')
      else{showToast('تمت الإضافة 🐄');await fetchAll()}
    }
    setSaving(false);setModal(null)
  }

  async function deleteAnimal(id) {
    const{error}=await supabase.from('animals').delete().eq('id',id)
    if(error) showToast('خطأ ❌','err')
    else{showToast('تم الحذف','err');await fetchAll();setModal(null);setSelId(null)}
  }

  async function savePen() {
    if(!penForm.name){showToast('أدخل اسم الحظيرة','err');return}
    setSaving(true)
    const{error}=await supabase.from('pens').insert([{...penForm,user_id:session.user.id}])
    if(error) showToast('خطأ ❌','err')
    else{showToast('تمت إضافة الحظيرة ✅');setPenForm({name:'',description:''});await fetchAll()}
    setSaving(false);setModal(null)
  }

  async function deletePen(id) {
    await supabase.from('pens').delete().eq('id',id)
    showToast('تم الحذف','err');await fetchAll()
  }

  async function openAnimalDetail(a) {
    setSelId(a.id)
    const{data}=await supabase.from('events').select('*').eq('animal_id',a.id).order('event_date',{ascending:false})
    setAnimalEvents(data||[])
    setModal('detail')
  }

  async function saveEvent() {
    if(!eventForm.title){showToast('أدخل العنوان','err');return}
    setSaving(true)
    const{error}=await supabase.from('events').insert([{
      ...eventForm,cost:Number(eventForm.cost)||0,
      animal_id:selId,user_id:session.user.id
    }])
    if(error) showToast('خطأ ❌','err')
    else{
      showToast('تم التسجيل ✅')
      const{data}=await supabase.from('events').select('*').eq('animal_id',selId).order('event_date',{ascending:false})
      setAnimalEvents(data||[])
      setEventForm({type:eventsTab,title:'',medicine:'',cost:0,event_date:today()})
      await fetchAll()
    }
    setSaving(false)
  }

  async function deleteEvent(id) {
    await supabase.from('events').delete().eq('id',id)
    const{data}=await supabase.from('events').select('*').eq('animal_id',selId).order('event_date',{ascending:false})
    setAnimalEvents(data||[])
    showToast('تم الحذف','err')
  }

  // Excel Import
  async function handleExcelImport(rows) {
    setSaving(true)
    let serial=nextSerial()
    const mapped=rows.map((r,i)=>{
      const type=r['النوع']||r['type']||'خراف'
      const s=serial+i
      return {
        serial_number:s,
        tag:genTag(type,s),
        tag_color:'#10b981',
        type,
        sub_type:r['النوع الفرعي']||r['sub_type']||'',
        gender:r['الجنس']||r['gender']||'ذكر',
        age:Number(r['العمر']||r['age'])||0,
        weight:Number(r['الوزن']||r['weight'])||0,
        status:r['الحالة']||r['status']||'صحية',
        vaccinated:false,
        notes:r['ملاحظات']||r['notes']||'',
        last_checkup:today(),
        pen_id:null,
        user_id:session.user.id,
      }
    })
    const{error}=await supabase.from('animals').insert(mapped)
    if(error) showToast('خطأ في الاستيراد ❌','err')
    else{showToast(`تم استيراد ${mapped.length} رأس 🎉`);await fetchAll()}
    setSaving(false);setModal(null)
  }

  function exportCSV() {
    const h=['#','التاج','النوع','النوع الفرعي','الجنس','العمر','الوزن','الحالة','الحظيرة','محصّن','آخر فحص','ملاحظات']
    const rows=animals.map(a=>{
      const pen=pens.find(p=>p.id===a.pen_id)
      return[a.serial_number,a.tag,a.type,a.sub_type||'',a.gender,a.age,a.weight,
        a.status,pen?.name||'',a.vaccinated?'نعم':'لا',a.last_checkup,a.notes||'']
    })
    const csv='\uFEFF'+[h,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob)
    const link=document.createElement('a');link.href=url;link.download=`مواشي_${today()}.csv`;link.click()
    URL.revokeObjectURL(url);showToast('تم التصدير 📊')
  }

  if(booting) return(
    <div style={{minHeight:'100vh',background:'#060f09',display:'flex',alignItems:'center',
      justifyContent:'center',fontFamily:"'Cairo',sans-serif",color:'#4ade80',fontSize:20}}>
      🐄 جاري التحميل...
    </div>
  )
  if(!session) return <LoginScreen/>

  const NAV=[['dashboard','📊','الرئيسية'],['animals','🐄','المواشي'],['pens','🏠','الحظائر'],['reports','📈','التقارير']]

  // Form helpers
  const subTypes=SUB_TYPES[form.type]||[]

  return (
    <div dir="rtl" style={{fontFamily:"'Cairo',sans-serif",minHeight:'100vh',
      background:'radial-gradient(ellipse at 50% -20%,#0d2b19 0%,#060f09 60%)',color:'#e8f5e9'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#2d7a4f;border-radius:3px}
        button:hover{filter:brightness(1.1)}button:active{transform:scale(.97)}
        select option,datalist option{background:#0b1a10}
        .row:hover{background:rgba(45,122,79,0.12)!important;border-color:rgba(45,122,79,0.35)!important}
        input[type=number]::-webkit-inner-spin-button{opacity:0}
      `}</style>
      <Toast toast={toast}/>

      {/* Header */}
      <div style={{background:'rgba(0,0,0,0.45)',borderBottom:'1px solid rgba(45,122,79,0.2)',
        position:'sticky',top:0,zIndex:100,backdropFilter:'blur(14px)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 16px',display:'flex',
          alignItems:'center',justifyContent:'space-between',height:54}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:30,height:30,background:'linear-gradient(135deg,#2d7a4f,#4ade80)',
              borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🐄</div>
            <span style={{fontWeight:900,fontSize:16,color:'#4ade80'}}>مواشي</span>
          </div>
          <div style={{display:'flex',gap:2}}>
            {NAV.map(([v,ic,lb])=>(
              <button key={v} onClick={()=>setView(v)} style={{cursor:'pointer',border:'none',borderRadius:8,
                fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:12,padding:'7px 11px',
                background:view===v?'rgba(45,122,79,0.28)':'none',
                color:view===v?'#4ade80':'#86c99a',
                outline:view===v?'1px solid rgba(45,122,79,0.4)':'none'}}>
                {ic} {lb}
              </button>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>setModal('pricing')} style={{cursor:'pointer',
              background:`${planCfg.color}18`,color:planCfg.color,
              border:`1px solid ${planCfg.color}40`,borderRadius:8,
              fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:11,padding:'5px 10px'}}>
              👑 {planCfg.name}
            </button>
            <div onClick={()=>supabase.auth.signOut()} title="خروج"
              style={{width:28,height:28,background:'linear-gradient(135deg,#2d7a4f,#4ade80)',
                borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',
                fontWeight:900,color:'#0a1a0e',fontSize:12,cursor:'pointer'}}>
              {session.user.email[0].toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'18px 16px'}}>

        {/* ══ DASHBOARD ══ */}
        {view==='dashboard'&&<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:18,flexWrap:'wrap',gap:10}}>
            <div>
              <h2 style={{fontSize:20,fontWeight:900,color:'#4ade80'}}>لوحة التحكم 👋</h2>
              <p style={{color:'#86c99a',fontSize:12}}>{new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <Btn variant="ghost" onClick={()=>setModal('import')} style={{fontSize:12,padding:'8px 12px'}}>📥 استيراد Excel</Btn>
              <Btn variant="ghost" onClick={openQuickAdd} style={{fontSize:12,padding:'8px 12px'}}>⚡ إضافة سريعة</Btn>
              <Btn onClick={openAdd} style={{fontSize:13,padding:'8px 15px'}}>＋ إضافة رأس</Btn>
            </div>
          </div>

          {plan==='free'&&<div onClick={()=>setModal('pricing')} style={{cursor:'pointer',
            background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.28)',
            borderRadius:12,padding:'10px 16px',marginBottom:16,
            display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:13,color:'#fbbf24'}}>⚡ الخطة المجانية — {animals.length}/10 رؤوس</span>
            <span style={{color:'#f59e0b',fontWeight:700,fontSize:13}}>ترقّ الآن ←</span>
          </div>}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:18}}>
            {[['الرأس',stats.total,'🐄','#4ade80'],['صحية',stats.healthy,'✅','#34d399'],
              ['مريضة',stats.sick,'🏥','#f87171'],['حوامل',stats.pregnant,'🌸','#fbbf24'],
              ['للبيع',stats.forSale,'💰','#a78bfa'],['الوزن كغ',stats.totalWeight,'⚖️','#60a5fa'],
            ].map(([lb,val,ic,color],i)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:12,padding:'14px 8px',textAlign:'center'}}>
                <div style={{fontSize:22,marginBottom:4}}>{ic}</div>
                <div style={{fontSize:20,fontWeight:900,color}}>{val}</div>
                <div style={{fontSize:11,color:'#86c99a',marginTop:2}}>{lb}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:18}}>
              <div style={{fontWeight:800,color:'#4ade80',marginBottom:12}}>📋 الأنواع</div>
              {TYPES.filter(t=>animals.some(a=>a.type===t)).map(t=>{
                const cnt=animals.filter(a=>a.type===t).length
                return(
                  <div key={t} style={{marginBottom:9}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:3}}>
                      <span>{T_ICON[t]} {t}</span><span style={{color:'#4ade80',fontWeight:700}}>{cnt}</span>
                    </div>
                    <div style={{height:5,background:'rgba(255,255,255,0.07)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${stats.total?(cnt/stats.total*100):0}%`,background:'linear-gradient(90deg,#2d7a4f,#4ade80)',borderRadius:3}}/>
                    </div>
                  </div>
                )
              })}
              {!animals.length&&<div style={{color:'#86c99a',fontSize:13,textAlign:'center',padding:14}}>لا توجد مواشي بعد</div>}
            </div>
            <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:18}}>
              <div style={{fontWeight:800,color:'#4ade80',marginBottom:12}}>💊 الحالة الصحية</div>
              {STATUSES.map(s=>{
                const cnt=animals.filter(a=>a.status===s).length
                if(!cnt) return null
                return(
                  <div key={s} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    <span style={{flex:1,fontSize:13}}>{s}</span>
                    <Badge status={s}/>
                    <span style={{fontWeight:800,color:S_COLOR[s].dot,minWidth:16,textAlign:'center',fontSize:13}}>{cnt}</span>
                  </div>
                )
              })}
              {stats.sick>0&&<div style={{marginTop:10,background:'rgba(239,68,68,0.09)',border:'1px solid rgba(239,68,68,0.25)',
                borderRadius:8,padding:'7px 12px',fontSize:12,color:'#f87171',fontWeight:700}}>
                ⚠️ {stats.sick} رأس تحتاج عناية
              </div>}
              {!animals.length&&<div style={{color:'#86c99a',fontSize:13,textAlign:'center',padding:14}}>لا توجد مواشي بعد</div>}
            </div>
          </div>
        </>}

        {/* ══ ANIMALS ══ */}
        {view==='animals'&&<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
            <div>
              <h2 style={{fontSize:20,fontWeight:900,color:'#4ade80'}}>سجل المواشي</h2>
              <p style={{color:'#86c99a',fontSize:12}}>{filtered.length} من {animals.length} رأس</p>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <Btn variant="ghost" onClick={()=>setModal('import')} style={{fontSize:12,padding:'7px 11px'}}>📥 Excel</Btn>
              <Btn variant="ghost" onClick={openQuickAdd}            style={{fontSize:12,padding:'7px 11px'}}>⚡ سريعة</Btn>
              <Btn variant="blue"  onClick={exportCSV}               style={{fontSize:12,padding:'7px 11px'}}>📊 CSV</Btn>
              <Btn onClick={openAdd} style={{fontSize:13,padding:'7px 15px'}}>＋ إضافة</Btn>
            </div>
          </div>

          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="🔍 بحث بالرقم أو النوع..." style={{...INP,flex:1,minWidth:150,padding:'8px 12px'}}/>
            <select value={fType} onChange={e=>setFType(e.target.value)} style={{...INP,width:110,padding:'8px 10px',cursor:'pointer'}}>
              <option>الكل</option>{sortAZ(TYPES).map(t=><option key={t}>{t}</option>)}
            </select>
            <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{...INP,width:105,padding:'8px 10px',cursor:'pointer'}}>
              <option>الكل</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <select value={fPen} onChange={e=>setFPen(e.target.value)} style={{...INP,width:125,padding:'8px 10px',cursor:'pointer'}}>
              <option>الكل</option>
              <option value="بدون حظيرة">بدون حظيرة</option>
              {pens.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {filtered.length===0?(
              <div style={{textAlign:'center',padding:50,color:'#86c99a'}}>
                <div style={{fontSize:44,marginBottom:10}}>🐄</div>
                <div style={{fontWeight:700,marginBottom:10}}>لا توجد نتائج</div>
                <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                  <Btn onClick={()=>setModal('import')} variant="ghost" style={{fontSize:12}}>📥 استيراد Excel</Btn>
                  <Btn onClick={openQuickAdd} variant="ghost" style={{fontSize:12}}>⚡ إضافة سريعة</Btn>
                </div>
              </div>
            ):filtered.map(a=>{
              const pen=pens.find(p=>p.id===a.pen_id)
              const aEventsCount=events.filter(e=>e.animal_id===a.id).length
              return(
                <div key={a.id} className="row" onClick={()=>openAnimalDetail(a)}
                  style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',
                    borderRadius:11,padding:'11px 14px',cursor:'pointer',transition:'all .18s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:11}}>
                    <div style={{width:36,height:36,background:'rgba(45,122,79,0.2)',borderRadius:9,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                      {T_ICON[a.type]||'🐄'}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:3}}>
                        <span style={{fontWeight:800,fontSize:13,color:'#9ca3af'}}>#{a.serial_number}</span>
                        <TagBadge tag={a.tag} color={a.tag_color}/>
                        {a.sub_type&&<span style={{fontSize:11,background:'rgba(255,255,255,0.07)',color:'#d1d5db',padding:'1px 7px',borderRadius:6}}>{a.sub_type}</span>}
                        {pen&&<span style={{fontSize:11,background:'rgba(96,165,250,0.1)',color:'#60a5fa',padding:'1px 7px',borderRadius:6}}>🏠 {pen.name}</span>}
                        {aEventsCount>0&&<span style={{fontSize:11,background:'rgba(239,68,68,0.1)',color:'#f87171',padding:'1px 7px',borderRadius:6}}>📋 {aEventsCount}</span>}
                      </div>
                      <div style={{fontSize:11,color:'#86c99a'}}>
                        {a.type} · {a.gender} · {a.age} سنة · {a.weight} كغ
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
                      <Badge status={a.status}/>
                      <Btn variant="blue"   onClick={e=>{e.stopPropagation();openEdit(a)}}                       style={{padding:'5px 9px',fontSize:11}}>✏️</Btn>
                      <Btn variant="danger" onClick={e=>{e.stopPropagation();setSelId(a.id);setModal('delete')}} style={{padding:'5px 9px',fontSize:11}}>🗑️</Btn>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>}

        {/* ══ PENS ══ */}
        {view==='pens'&&<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
            <div>
              <h2 style={{fontSize:20,fontWeight:900,color:'#4ade80'}}>الحظائر 🏠</h2>
              <p style={{color:'#86c99a',fontSize:12}}>{pens.length} حظيرة</p>
            </div>
            <Btn onClick={()=>{setPenForm({name:'',description:''});setModal('addpen')}} style={{fontSize:13,padding:'8px 15px'}}>＋ حظيرة جديدة</Btn>
          </div>
          {pens.length===0?(
            <div style={{textAlign:'center',padding:60,color:'#86c99a'}}>
              <div style={{fontSize:48,marginBottom:12}}>🏠</div>
              <div style={{fontWeight:700,marginBottom:10}}>لا توجد حظائر بعد</div>
              <Btn onClick={()=>setModal('addpen')} style={{fontSize:13}}>+ أضف حظيرة</Btn>
            </div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
              {pens.map(pen=>{
                const cnt=animals.filter(a=>a.pen_id===pen.id).length
                return(
                  <div key={pen.id} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:13,padding:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:14}}>🏠 {pen.name}</div>
                        {pen.description&&<div style={{fontSize:11,color:'#86c99a',marginTop:2}}>{pen.description}</div>}
                      </div>
                      <Btn variant="danger" onClick={()=>deletePen(pen.id)} style={{padding:'4px 8px',fontSize:11}}>🗑️</Btn>
                    </div>
                    <div style={{background:'rgba(74,222,128,0.08)',borderRadius:8,padding:'8px',textAlign:'center'}}>
                      <div style={{fontSize:20,fontWeight:900,color:'#4ade80'}}>{cnt}</div>
                      <div style={{fontSize:11,color:'#86c99a'}}>رأس</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>}

        {/* ══ REPORTS ══ */}
        {view==='reports'&&<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:10}}>
            <h2 style={{fontSize:20,fontWeight:900,color:'#4ade80'}}>التقارير 📈</h2>
            <Btn onClick={exportCSV} style={{fontSize:13,padding:'8px 15px',background:'linear-gradient(135deg,#1d4ed8,#60a5fa)',color:'#fff'}}>📊 تصدير CSV</Btn>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
            {[
              {title:'📊 ملخص',rows:[['الإجمالي',`${stats.total} رأس`],['متوسط الوزن',`${stats.total?Math.round(stats.totalWeight/stats.total):0} كغ`],['معدل الصحة',`${stats.total?Math.round(stats.healthy/stats.total*100):0}%`],['الأحداث الطبية',`${events.length}`]]},
              {title:'🏥 الصحة',rows:STATUSES.map(s=>[s,`${animals.filter(a=>a.status===s).length} رأس`])},
              {title:'🐄 الأنواع',rows:sortAZ(TYPES.filter(t=>animals.some(a=>a.type===t))).map(t=>[`${T_ICON[t]} ${t}`,`${animals.filter(a=>a.type===t).length} رأس`])},
              {title:'🏠 الحظائر',rows:[...pens.map(p=>[p.name,`${animals.filter(a=>a.pen_id===p.id).length} رأس`]),['بدون حظيرة',`${animals.filter(a=>!a.pen_id).length} رأس`]]},
            ].map((sec,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:13,padding:18}}>
                <div style={{fontWeight:800,color:'#4ade80',marginBottom:12,fontSize:14}}>{sec.title}</div>
                {sec.rows.map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:13}}>
                    <span style={{color:'#86c99a'}}>{k}</span><span style={{fontWeight:700}}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>}
      </div>

      {/* ══ MODALS ══ */}

      {/* QUICK ADD */}
      {modal==='quickadd'&&(
        <div style={OVERLAY} onClick={()=>setModal(null)}>
          <div style={MODAL} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h3 style={{fontWeight:900,fontSize:17,color:'#4ade80'}}>⚡ إضافة سريعة</h3>
              <Btn variant="ghost" onClick={()=>setModal(null)} style={{padding:'4px 10px',fontSize:15}}>✕</Btn>
            </div>
            <div style={{marginBottom:18}}>
              <Lbl>عدد الرؤوس</Lbl>
              <Counter value={Number(form.count)||1} onChange={v=>setForm({...form,count:v})} min={1} max={planCfg.limit-animals.length}/>
              <div style={{fontSize:11,color:'#86c99a',marginTop:4,textAlign:'center'}}>متبقي: {planCfg.limit-animals.length} رأس</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11}}>
              <div>
                <Lbl>النوع</Lbl>
                <Combo value={form.type||'خراف'} onChange={v=>setForm({...form,type:v,sub_type:''})} options={TYPES} placeholder="النوع"/>
              </div>
              <div>
                <Lbl>النوع الفرعي</Lbl>
                <Combo value={form.sub_type||''} onChange={v=>setForm({...form,sub_type:v})} options={SUB_TYPES[form.type]||[]} placeholder="اختر أو اكتب"/>
              </div>
              <div>
                <Lbl>الجنس</Lbl>
                <select style={{...INP,cursor:'pointer'}} value={form.gender||'ذكر'} onChange={e=>setForm({...form,gender:e.target.value})}>
                  <option>ذكر</option><option>أنثى</option>
                </select>
              </div>
              <div>
                <Lbl>الحالة</Lbl>
                <Combo value={form.status||'صحية'} onChange={v=>setForm({...form,status:v})} options={STATUSES} placeholder="الحالة"/>
              </div>
              <div>
                <Lbl>الحظيرة</Lbl>
                <select style={{...INP,cursor:'pointer'}} value={form.pen_id||''} onChange={e=>setForm({...form,pen_id:e.target.value})}>
                  <option value="">بدون حظيرة</option>
                  {pens.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Lbl>الوزن كغ</Lbl>
                <input style={INP} type="number" placeholder="0" value={form.weight||''} onChange={e=>setForm({...form,weight:e.target.value})}/>
              </div>
            </div>
            <div style={{marginTop:14}}>
              <Lbl>لون التاق</Lbl>
              <ColorPicker value={form.tag_color||'#10b981'} onChange={c=>setForm({...form,tag_color:c})}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'12px 0'}}
              onClick={()=>setForm({...form,vaccinated:!form.vaccinated})}>
              <input type="checkbox" checked={!!form.vaccinated} readOnly style={{width:17,height:17,accentColor:'#4ade80'}}/>
              <span style={{fontSize:13}}>محصّن ✅</span>
            </div>
            <div style={{display:'flex',gap:10}}>
              <Btn onClick={saveQuickAdd} disabled={saving} full style={{padding:12,fontSize:14}}>
                {saving?'جاري الإضافة...':`⚡ إضافة ${form.count||1} رأس`}
              </Btn>
              <Btn variant="ghost" onClick={()=>setModal(null)} style={{padding:'12px 14px'}}>إلغاء</Btn>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE FORM */}
      {modal==='form'&&(
        <div style={OVERLAY} onClick={()=>setModal(null)}>
          <div style={MODAL} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h3 style={{fontWeight:900,fontSize:17,color:'#4ade80'}}>{selId?'✏️ تعديل':'➕ إضافة رأس'}</h3>
              <Btn variant="ghost" onClick={()=>setModal(null)} style={{padding:'4px 10px',fontSize:15}}>✕</Btn>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11}}>
              <div>
                <Lbl>النوع</Lbl>
                <Combo value={form.type||'خراف'} onChange={v=>setForm({...form,type:v,sub_type:'',tag:genTag(v,form.serial_number)})} options={TYPES} placeholder="النوع"/>
              </div>
              <div>
                <Lbl>النوع الفرعي</Lbl>
                <Combo value={form.sub_type||''} onChange={v=>setForm({...form,sub_type:v})} options={SUB_TYPES[form.type]||[]} placeholder="اختر أو اكتب"/>
              </div>
              <div>
                <Lbl>الجنس</Lbl>
                <select style={{...INP,cursor:'pointer'}} value={form.gender||'ذكر'} onChange={e=>setForm({...form,gender:e.target.value})}>
                  <option>ذكر</option><option>أنثى</option>
                </select>
              </div>
              <div>
                <Lbl>الحالة</Lbl>
                <Combo value={form.status||'صحية'} onChange={v=>setForm({...form,status:v})} options={STATUSES} placeholder="الحالة"/>
              </div>
              <div>
                <Lbl>العمر (سنة)</Lbl>
                <Counter value={Number(form.age)||0} onChange={v=>setForm({...form,age:v})} max={50}/>
              </div>
              <div>
                <Lbl>الوزن (كغ)</Lbl>
                <Counter value={Number(form.weight)||0} onChange={v=>setForm({...form,weight:v})} max={2000}/>
              </div>
              <div>
                <Lbl>الحظيرة</Lbl>
                <select style={{...INP,cursor:'pointer'}} value={form.pen_id||''} onChange={e=>setForm({...form,pen_id:e.target.value})}>
                  <option value="">بدون حظيرة</option>
                  {pens.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Lbl>آخر فحص</Lbl>
                <input style={INP} type="date" value={form.last_checkup||''} onChange={e=>setForm({...form,last_checkup:e.target.value})}/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <Lbl>رقم التاق</Lbl>
                <input style={INP} value={form.tag||''} onChange={e=>setForm({...form,tag:e.target.value})}/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <Lbl>لون التاق</Lbl>
                <ColorPicker value={form.tag_color||'#10b981'} onChange={c=>setForm({...form,tag_color:c})}/>
              </div>
              <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'4px 0'}}
                onClick={()=>setForm({...form,vaccinated:!form.vaccinated})}>
                <input type="checkbox" checked={!!form.vaccinated} readOnly style={{width:17,height:17,accentColor:'#4ade80'}}/>
                <span style={{fontSize:13}}>محصّن ✅</span>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <Lbl>ملاحظات</Lbl>
                <textarea style={{...INP,resize:'none'}} rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <Btn onClick={saveAnimal} disabled={saving} full style={{padding:12,fontSize:14}}>
                {saving?'جاري الحفظ...':selId?'💾 حفظ':'✅ إضافة'}
              </Btn>
              <Btn variant="ghost" onClick={()=>setModal(null)} style={{padding:'12px 14px'}}>إلغاء</Btn>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL + EVENTS */}
      {modal==='detail'&&sel&&(
        <div style={OVERLAY} onClick={()=>setModal(null)}>
          <div style={{...MODAL,maxWidth:540}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,paddingBottom:14,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{fontSize:38}}>{T_ICON[sel.type]||'🐄'}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                  <span style={{color:'#9ca3af',fontSize:13,fontWeight:700}}>#{sel.serial_number}</span>
                  <TagBadge tag={sel.tag} color={sel.tag_color}/>
                  {sel.sub_type&&<span style={{fontSize:12,background:'rgba(255,255,255,0.07)',color:'#d1d5db',padding:'2px 8px',borderRadius:6}}>{sel.sub_type}</span>}
                </div>
                <div style={{fontSize:12,color:'#86c99a'}}>{sel.type} · {sel.gender} · {sel.age} سنة · {sel.weight} كغ</div>
                <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
                  <Badge status={sel.status}/>
                  {pens.find(p=>p.id===sel.pen_id)&&
                    <span style={{fontSize:12,background:'rgba(96,165,250,0.1)',color:'#60a5fa',padding:'2px 8px',borderRadius:20}}>
                      🏠 {pens.find(p=>p.id===sel.pen_id)?.name}
                    </span>}
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <Btn variant="blue" onClick={()=>openEdit(sel)} style={{padding:'6px 10px',fontSize:12}}>✏️</Btn>
                <Btn variant="ghost" onClick={()=>setModal(null)} style={{padding:'6px 10px',fontSize:12}}>✕</Btn>
              </div>
            </div>

            <div style={{fontWeight:800,color:'#e8f5e9',marginBottom:10,fontSize:13}}>📋 السجلات الطبية</div>
            <div style={{display:'flex',gap:4,marginBottom:12,background:'rgba(0,0,0,0.3)',borderRadius:10,padding:4}}>
              {EVENT_TYPES.map(t=>(
                <button key={t} onClick={()=>{setEventsTab(t);setEventForm({...eventForm,type:t,title:'',medicine:'',cost:0})}}
                  style={{flex:1,padding:'7px',border:'none',borderRadius:7,
                    fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:12,cursor:'pointer',
                    background:eventsTab===t?'linear-gradient(135deg,#2d7a4f,#4ade80)':'none',
                    color:eventsTab===t?'#0a1a0e':'#86c99a'}}>
                  {EVENT_ICON[t]} {t}
                </button>
              ))}
            </div>

            <div style={{background:'rgba(255,255,255,0.04)',borderRadius:11,padding:12,marginBottom:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:9}}>
                <div style={{gridColumn:'1/-1'}}>
                  <Lbl>{eventsTab==='مرض'?'اسم المرض':eventsTab==='تطعيم'?'نوع التطعيم':'تفاصيل الولادة'} *</Lbl>
                  <input style={{...INP,padding:'8px 11px'}}
                    placeholder={eventsTab==='مرض'?'حمى، إسهال...':eventsTab==='تطعيم'?'تطعيم الجدري...':'ولدت 2 صغار...'}
                    value={eventForm.title} onChange={e=>setEventForm({...eventForm,title:e.target.value})}/>
                </div>
                {eventsTab==='مرض'&&<div style={{gridColumn:'1/-1'}}>
                  <Lbl>الدواء / العلاج</Lbl>
                  <input style={{...INP,padding:'8px 11px'}} placeholder="اسم الدواء..." value={eventForm.medicine} onChange={e=>setEventForm({...eventForm,medicine:e.target.value})}/>
                </div>}
                <div><Lbl>التكلفة (ر.س)</Lbl>
                  <input style={{...INP,padding:'8px 11px'}} type="number" placeholder="0" value={eventForm.cost||''} onChange={e=>setEventForm({...eventForm,cost:e.target.value})}/></div>
                <div><Lbl>التاريخ</Lbl>
                  <input style={{...INP,padding:'8px 11px'}} type="date" value={eventForm.event_date} onChange={e=>setEventForm({...eventForm,event_date:e.target.value})}/></div>
              </div>
              <Btn onClick={saveEvent} disabled={saving} full style={{padding:'9px',fontSize:13}}>
                {saving?'جاري الحفظ...':`${EVENT_ICON[eventsTab]} تسجيل ${eventsTab}`}
              </Btn>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:7,maxHeight:200,overflowY:'auto'}}>
              {animalEvents.filter(e=>e.type===eventsTab).length===0?(
                <div style={{textAlign:'center',padding:16,color:'#86c99a',fontSize:13}}>لا يوجد سجل {eventsTab}</div>
              ):animalEvents.filter(e=>e.type===eventsTab).map(e=>(
                <div key={e.id} style={{background:'rgba(255,255,255,0.04)',borderRadius:9,
                  padding:'9px 13px',display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{EVENT_ICON[e.type]} {e.title}</div>
                    {e.medicine&&<div style={{fontSize:11,color:'#86c99a',marginTop:2}}>💊 {e.medicine}</div>}
                    <div style={{fontSize:11,color:'#86c99a',marginTop:2,display:'flex',gap:10}}>
                      <span>📅 {e.event_date}</span>
                      {Number(e.cost)>0&&<span>💰 {e.cost} ر.س</span>}
                    </div>
                  </div>
                  <Btn variant="danger" onClick={()=>deleteEvent(e.id)} style={{padding:'3px 7px',fontSize:11}}>🗑️</Btn>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD PEN */}
      {modal==='addpen'&&(
        <div style={OVERLAY} onClick={()=>setModal(null)}>
          <div style={{...MODAL,maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontWeight:900,fontSize:17,color:'#4ade80',marginBottom:18}}>🏠 إضافة حظيرة</h3>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><Lbl>اسم الحظيرة *</Lbl>
                <input style={INP} placeholder="مثال: الحظيرة الرئيسية" value={penForm.name} onChange={e=>setPenForm({...penForm,name:e.target.value})}/></div>
              <div><Lbl>الوصف (اختياري)</Lbl>
                <input style={INP} placeholder="وصف..." value={penForm.description} onChange={e=>setPenForm({...penForm,description:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <Btn onClick={savePen} disabled={saving} full style={{padding:12}}>✅ إضافة</Btn>
              <Btn variant="ghost" onClick={()=>setModal(null)} style={{padding:'12px 14px'}}>إلغاء</Btn>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT */}
      {modal==='import'&&<ExcelImport onClose={()=>setModal(null)} onImport={handleExcelImport}/>}

      {/* DELETE */}
      {modal==='delete'&&(
        <div style={OVERLAY} onClick={()=>setModal(null)}>
          <div style={{...MODAL,maxWidth:320,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:42,marginBottom:10}}>⚠️</div>
            <h3 style={{fontWeight:900,color:'#f87171',marginBottom:8}}>تأكيد الحذف</h3>
            <p style={{color:'#86c99a',fontSize:13,marginBottom:18}}>
              هل أنت متأكد من حذف الرأس رقم <strong style={{color:'#e8f5e9'}}>#{sel?.serial_number}</strong>؟
            </p>
            <div style={{display:'flex',gap:10}}>
              <Btn onClick={()=>deleteAnimal(selId)} full style={{padding:11,background:'linear-gradient(135deg,#7f1d1d,#ef4444)',color:'#fff',fontSize:13}}>نعم، احذف</Btn>
              <Btn variant="ghost" onClick={()=>setModal(null)} full style={{padding:11,fontSize:13}}>إلغاء</Btn>
            </div>
          </div>
        </div>
      )}

      {/* PRICING */}
      {modal==='pricing'&&(
        <div style={OVERLAY} onClick={()=>setModal(null)}>
          <div style={{...MODAL,maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',marginBottom:18}}>
              <div style={{fontSize:34,marginBottom:6}}>👑</div>
              <h2 style={{fontSize:19,fontWeight:900,color:'#4ade80',marginBottom:4}}>اختر خطتك</h2>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              {PLANS.map(p=>(
                <div key={p.id} onClick={()=>{setPlan(p.id);setModal(null);showToast(`تم الترقي إلى ${p.name} 🎉`)}}
                  style={{border:plan===p.id?`2px solid ${p.color}`:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:11,padding:'13px 16px',cursor:'pointer',
                    background:plan===p.id?`${p.color}14`:'rgba(255,255,255,0.03)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontWeight:800,fontSize:14,color:plan===p.id?p.color:'#e8f5e9'}}>{p.name}</div>
                    <div style={{fontWeight:900,color:p.color,fontSize:17}}>{p.price===0?'مجاني':`${p.price} ر.س`}</div>
                  </div>
                  {plan===p.id&&<div style={{color:p.color,fontSize:11,fontWeight:700,marginTop:5}}>✅ خطتك الحالية</div>}
                </div>
              ))}
            </div>
            <Btn variant="ghost" onClick={()=>setModal(null)} full style={{marginTop:12,padding:10}}>إغلاق</Btn>
          </div>
        </div>
      )}
    </div>
  )
}
