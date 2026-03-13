import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   SUPABASE
───────────────────────────────────────────────────────────────────────────── */
const SB = "https://agapaabzdbznfibnxrxd.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYXBhYWJ6ZGJ6bmZpYm54cnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjA5NjQsImV4cCI6MjA4ODMzNjk2NH0.ZqkQZsk-m0PnZAQZGf4wvSePVuls6cSt9fUl73lqthw";
const SUPA_URL = SB;
const SUPA_KEY = SK;
const SH = {"Content-Type":"application/json","x-api-key":"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","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true",apikey:SK,Authorization:`Bearer ${SK}`,Prefer:"return=representation"};
function getAuthHeaders(){const s=loadSession();const token=s?.access_token||SK;return{"Content-Type":"application/json",apikey:SK,Authorization:`Bearer ${token}`,Prefer:"return=representation"};}
async function db(p,o={}){const r=await fetch(`${SB}/rest/v1/${p}`,{headers:getAuthHeaders(),...o});if(r.status===204)return null;const j=await r.json();if(!r.ok)throw new Error(j?.message||"err");return j;}

/* ─────────────────────────────────────────────────────────────────────────────
   SUPABASE AUTH
───────────────────────────────────────────────────────────────────────────── */
const AH = {"Content-Type":"application/json","x-api-key":"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","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true",apikey:SK};
async function authSignIn(email,password){
  const r=await fetch(`${SB}/auth/v1/token?grant_type=password`,{method:"POST",headers:AH,body:JSON.stringify({email,password})});
  const j=await r.json();if(!r.ok)throw new Error(j?.error_description||j?.msg||"Invalid email or password.");
  return j;
}
async function authSignUp(email,password){
  const r=await fetch(`${SB}/auth/v1/signup`,{method:"POST",headers:AH,body:JSON.stringify({email,password})});
  const j=await r.json();if(!r.ok)throw new Error(j?.error_description||j?.msg||"Signup failed.");
  return j;
}
async function authSignOut(token){
  await fetch(`${SB}/auth/v1/logout`,{method:"POST",headers:{...AH,Authorization:`Bearer ${token}`}});
}
async function authResetPassword(email){
  const r=await fetch(`${SB}/auth/v1/recover`,{method:"POST",headers:AH,body:JSON.stringify({email})});
  return r.ok;
}
async function authGetUser(token){
  const r=await fetch(`${SB}/auth/v1/user`,{headers:{...AH,Authorization:`Bearer ${token}`}});
  if(!r.ok)return null;return r.json();
}
// Session helpers — localStorage with expiry
const SESSION_KEY="vf_session";
function saveSession(s){try{localStorage.setItem(SESSION_KEY,JSON.stringify({...s,saved_at:Date.now()}));}catch(_){}}
function loadSession(){
  try{
    const raw=localStorage.getItem(SESSION_KEY);
    if(!raw)return null;
    const s=JSON.parse(raw);
    // Expire after 8 hours
    if(Date.now()-s.saved_at>30*24*60*60*1000){localStorage.removeItem(SESSION_KEY);return null;}
    return s;
  }catch(_){return null;}
}
function clearSession(){try{localStorage.removeItem(SESSION_KEY);}catch(_){}}

/* ─────────────────────────────────────────────────────────────────────────────
   MANAGER LOGIN PAGE
───────────────────────────────────────────────────────────────────────────── */
function ManagerLogin({onSuccess,onBack}) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [companyName,setCompanyName]=useState("");
  const [contactName,setContactName]=useState("");
  const [phone,setPhone]=useState("");
  const [err,setErr]=useState("");
  const [msg,setMsg]=useState("");
  const [loading,setLoading]=useState(false);
  const [showPw,setShowPw]=useState(false);

  const submit=async()=>{
    setErr("");setMsg("");
    if(!email.trim()){setErr("Email is required.");return;}
    if(mode!=="reset"&&!password){setErr("Password is required.");return;}
    if(mode==="signup"&&!companyName.trim()){setErr("Company or association name is required.");return;}
    if(mode==="signup"&&!contactName.trim()){setErr("Your full name is required.");return;}
    if(mode==="signup"&&!phone.trim()){setErr("Phone number is required.");return;}
    if(mode==="signup"&&password!==confirm){setErr("Passwords do not match.");return;}
    if(mode==="signup"&&password.length<8){setErr("Password must be at least 8 characters.");return;}
    setLoading(true);
    try{
      if(mode==="login"){
        const r=await fetch(`${SB}/auth/v1/token?grant_type=password`,{method:"POST",headers:AH,body:JSON.stringify({email:email.trim(),password})});
        const j=await r.json();
        if(!r.ok){setErr(`Error ${r.status}: ${j?.error_description||j?.error||j?.message||j?.msg||JSON.stringify(j)}`);setLoading(false);return;}
        if(!j.access_token){setErr("No token received.");setLoading(false);return;}
        // Load full company record including role and status
        const comp=await fetch(`${SB}/rest/v1/companies?owner_email=eq.${encodeURIComponent(email.trim())}&select=id,name,role,status,phone,contact_name`,{headers:{...AH,Authorization:`Bearer ${j.access_token}`}});
        const compData=await comp.json();
        const company=Array.isArray(compData)&&compData.length?compData[0]:null;
        saveSession({access_token:j.access_token,refresh_token:j.refresh_token,user:j.user,company});
        onSuccess({...j,company});
      } else if(mode==="signup"){
        const r=await fetch(`${SB}/auth/v1/signup`,{method:"POST",headers:AH,body:JSON.stringify({email:email.trim(),password})});
        const j=await r.json();
        if(!r.ok){setErr(`Signup error ${r.status}: ${j?.error_description||j?.error||j?.message||JSON.stringify(j)}`);setLoading(false);return;}
        // Create company record with pending status
        await fetch(`${SB}/rest/v1/companies`,{method:"POST",headers:{...AH,"Prefer":"return=minimal"},body:JSON.stringify({name:companyName.trim(),owner_email:email.trim(),contact_name:contactName.trim(),phone:phone.trim(),status:"pending",role:"manager"})});
        // Notify admin via leads table
        await fetch(`${SB}/rest/v1/leads`,{method:"POST",headers:{...AH,"Prefer":"return=minimal"},body:JSON.stringify({name:contactName.trim(),email:email.trim(),company:companyName.trim(),role:"manager_signup",message:`New manager signup: ${contactName} from ${companyName} (${phone})`,source:"signup"})});
        setMsg("Application submitted! We'll review your account and notify you by email within 24 hours.");
        setMode("login");setPassword("");setConfirm("");setCompanyName("");setContactName("");setPhone("");
      } else {
        const r=await fetch(`${SB}/auth/v1/recover`,{method:"POST",headers:AH,body:JSON.stringify({email:email.trim()})});
        if(r.ok){setMsg("Password reset email sent! Check your inbox.");}
        else{const j=await r.json();setErr(`Reset error: ${j?.error||JSON.stringify(j)}`);}
      }
    }catch(e){setErr("Network error: "+e.message);}
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Inter',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{STYLES}</style>
      <MeshBG/>
      <Stars/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:440}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={onBack}>
            <ScaleLogo size={40} gold/>
            <span style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:24,fontWeight:800,color:T.text}}>Violation<span style={{background:"linear-gradient(90deg,#a78bfa,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Flow</span></span>
          </div>
          <div style={{marginTop:12}}>
            <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:4}}>
              {mode==="login"&&"Manager Sign In"}
              {mode==="signup"&&"Create Manager Account"}
              {mode==="reset"&&"Reset Your Password"}
            </div>
            <div style={{fontSize:13,color:T.muted}}>
              {mode==="login"&&"Access your ViolationFlow dashboard"}
              {mode==="signup"&&"Get started with ViolationFlow"}
              {mode==="reset"&&"We'll email you a reset link"}
            </div>
          </div>
        </div>

        {/* Card */}
        <GlassCard style={{padding:36}} hover={false}>
          {/* Error */}
          {err&&<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:10,padding:"12px 16px",marginBottom:20,color:"#f87171",fontSize:13,display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{flexShrink:0}}>⚠</span>{err}
          </div>}
          {/* Success */}
          {msg&&<div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:10,padding:"12px 16px",marginBottom:20,color:"#34d399",fontSize:13,display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{flexShrink:0}}>✓</span>{msg}
          </div>}

          {/* Signup extra fields */}
          {mode==="signup"&&(<>
            <Fld label="Company / Association Name" req>
              <DarkInp value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="e.g. ABC Property Management"/>
            </Fld>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <Fld label="Your Full Name" req>
                <DarkInp value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="John Smith"/>
              </Fld>
              <Fld label="Phone Number" req>
                <DarkInp value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(312) 555-0000"/>
              </Fld>
            </div>
          </>)}

          {/* Email */}
          <Fld label="Email Address" req>
            <DarkInp type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="manager@yourcompany.com" onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </Fld>

          {/* Password */}
          {mode!=="reset"&&(
            <Fld label="Password" req>
              <div style={{position:"relative"}}>
                <DarkInp type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"Min. 8 characters":"Your password"} onKeyDown={e=>e.key==="Enter"&&submit()} style={{paddingRight:44}}/>
                <button onClick={()=>setShowPw(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:16,lineHeight:1}}>{showPw?"🙈":"👁"}</button>
              </div>
            </Fld>
          )}

          {/* Confirm password for signup */}
          {mode==="signup"&&(
            <Fld label="Confirm Password" req>
              <DarkInp type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter your password" onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </Fld>
          )}

          {/* Forgot password link */}
          {mode==="login"&&(
            <div style={{textAlign:"right",marginTop:-8,marginBottom:20}}>
              <button onClick={()=>{setMode("reset");setErr("");setMsg("");}} style={{background:"none",border:"none",color:"#a78bfa",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Forgot password?</button>
            </div>
          )}

          <VBtn onClick={submit} disabled={loading} style={{width:"100%",justifyContent:"center",padding:"14px",fontSize:15,marginTop:8}}>
            {loading?(
              <span style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>
                {mode==="login"?"Signing in...":mode==="signup"?"Creating account...":"Sending reset email..."}
              </span>
            ):(
              mode==="login"?"Sign In":mode==="signup"?"Create Account":"Send Reset Email"
            )}
          </VBtn>

          {/* Mode switcher */}
          <div style={{marginTop:24,textAlign:"center",fontSize:13,color:T.muted}}>
            {mode==="login"&&<>Don't have an account? <button onClick={()=>{setMode("signup");setErr("");setMsg("");}} style={{background:"none",border:"none",color:"#a78bfa",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>Sign up</button></>}
            {mode==="signup"&&<>Already have an account? <button onClick={()=>{setMode("login");setErr("");setMsg("");}} style={{background:"none",border:"none",color:"#a78bfa",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>Sign in</button></>}
            {mode==="reset"&&<>Remember it? <button onClick={()=>{setMode("login");setErr("");setMsg("");}} style={{background:"none",border:"none",color:"#a78bfa",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>Back to sign in</button></>}
          </div>
        </GlassCard>

        {/* Back link */}
        <div style={{textAlign:"center",marginTop:20}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Back to ViolationFlow.com</button>
        </div>

        {/* Legal note */}
        <p style={{textAlign:"center",fontSize:11,color:"rgba(100,116,139,0.5)",marginTop:16,lineHeight:1.6}}>
          By signing in you agree to our Terms of Service and Privacy Policy.<br/>
          Manager access only. Questions? <a href="mailto:support@violationflow.com" style={{color:"rgba(167,139,250,0.6)",textDecoration:"none"}}>support@violationflow.com</a>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────────────────────── */
const T = {
  bg:       "#050508",
  bg2:      "#08090E",
  bg3:      "#0E0F18",
  violet:   "#6D28D9",
  indigo:   "#4338CA",
  vivid:    "#8B5CF6",
  gold:     "#F59E0B",
  border:   "rgba(255,255,255,0.06)",
  border2:  "rgba(255,255,255,0.11)",
  text:     "#FAFAFA",
  muted:    "#5A6478",
  muted2:   "#8B93A8",
  glass:    "rgba(255,255,255,0.03)",
  glass2:   "rgba(255,255,255,0.06)",
};

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#fff;color:#111827;font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:#F9FAFB;}
::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:4px;}
::selection{background:#E5E7EB;color:#1E3A8A;}

@keyframes fadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-40px) scale(1.08)}}
@keyframes drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,30px) scale(1.05)}}
@keyframes drift3{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
@keyframes lineGrow{from{width:0}to{width:100%}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes barGrow{from{height:0}to{height:var(--h)}}

.hero-fade{animation:fadeUp 0.8s ease both;}
.hero-fade-2{animation:fadeUp 0.8s 0.12s ease both;}
.hero-fade-3{animation:fadeUp 0.8s 0.24s ease both;}
.hero-fade-4{animation:fadeUp 0.8s 0.36s ease both;}
.float{animation:floatY 6s ease-in-out infinite;}
.card-hover{transition:all 0.3s cubic-bezier(0.4,0,0.2,1);}
.card-hover:hover{transform:translateY(-6px);}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   SCALE LOGO SVG
───────────────────────────────────────────────────────────────────────────── */
const ScaleLogo = ({size=28,gold=false}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="15" fill={gold?"rgba(245,158,11,0.12)":"rgba(109,40,217,0.12)"} stroke={gold?"#F59E0B":"#6D28D9"} strokeWidth="1"/>
    <rect x="15.2" y="8" width="1.6" height="16" rx="0.8" fill={gold?"#F59E0B":"#8B5CF6"}/>
    <rect x="11" y="23" width="10" height="1.5" rx="0.75" fill={gold?"#F59E0B":"#8B5CF6"}/>
    <rect x="9" y="9.5" width="14" height="1.2" rx="0.6" fill={gold?"#F59E0B":"#8B5CF6"}/>
    <line x1="10" y1="10.5" x2="8" y2="14.5" stroke={gold?"#F59E0B":"#8B5CF6"} strokeWidth="1" strokeLinecap="round"/>
    <line x1="22" y1="10.5" x2="24" y2="14.5" stroke={gold?"#F59E0B":"#8B5CF6"} strokeWidth="1" strokeLinecap="round"/>
    <path d="M5.5 14.5 Q8 17 10.5 14.5" stroke={gold?"#F59E0B":"#8B5CF6"} strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M21.5 14.5 Q24 17 26.5 14.5" stroke={gold?"#F59E0B":"#8B5CF6"} strokeWidth="1" fill="none" strokeLinecap="round"/>
    <circle cx="16" cy="8.5" r="1.2" fill={gold?"#F59E0B":"#6D28D9"}/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
   ATOM COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
const Pill = ({children,style:s}) => (
  <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(109,40,217,0.1)",border:"1px solid rgba(109,40,217,0.22)",borderRadius:99,padding:"4px 13px",fontSize:11,color:"#a78bfa",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",...s}}>
    {children}
  </div>
);

const GlassCard = ({children,style:s,hover=true,...p}) => (
  <div {...p} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)",...s}}
    onMouseEnter={hover?e=>{e.currentTarget.style.border="1px solid rgba(255,255,255,0.12)";e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.transform="translateY(-3px)";}:undefined}
    onMouseLeave={hover?e=>{e.currentTarget.style.border="1px solid rgba(255,255,255,0.07)";e.currentTarget.style.background="rgba(255,255,255,0.025)";e.currentTarget.style.transform="translateY(0)";}:undefined}>
    {children}
  </div>
);

const VBtn = ({children,style:s,variant="solid",...p}) => {
  const base = {display:"inline-flex",alignItems:"center",gap:8,padding:"11px 24px",borderRadius:10,fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:p.disabled?"not-allowed":"pointer",transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)",border:"none",letterSpacing:"0.01em",...s};
  const variants = {
    solid:{background:"linear-gradient(135deg,#6D28D9 0%,#4338CA 100%)",color:"#fff",boxShadow:"0 1px 0 rgba(255,255,255,0.08) inset,0 4px 20px rgba(109,40,217,0.4)"},
    ghost:{background:"rgba(255,255,255,0.04)",color:"#FAFAFA",border:"1px solid rgba(255,255,255,0.1)"},
    gold:{background:"linear-gradient(135deg,#F59E0B 0%,#D97706 100%)",color:"#fff",boxShadow:"0 4px 20px rgba(245,158,11,0.4)"},
    danger:{background:"rgba(239,68,68,0.1)",color:"#f87171",border:"1px solid rgba(239,68,68,0.2)"},
    success:{background:"rgba(16,185,129,0.1)",color:"#34d399",border:"1px solid rgba(16,185,129,0.2)"},
  };
  return (
    <button {...p} style={{...base,...variants[variant]}}
      onMouseEnter={e=>{if(!p.disabled){e.currentTarget.style.transform="translateY(-1px) scale(1.01)";if(variant==="solid")e.currentTarget.style.boxShadow="0 1px 0 rgba(255,255,255,0.08) inset,0 8px 36px rgba(109,40,217,0.55)";if(variant==="gold")e.currentTarget.style.boxShadow="0 8px 32px rgba(245,158,11,0.55)";if(variant==="ghost"){e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";}if(variant==="success")e.currentTarget.style.background="rgba(16,185,129,0.18)";}}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)";if(variant==="solid")e.currentTarget.style.boxShadow="0 1px 0 rgba(255,255,255,0.08) inset,0 4px 20px rgba(109,40,217,0.4)";if(variant==="gold")e.currentTarget.style.boxShadow="0 4px 20px rgba(245,158,11,0.4)";if(variant==="ghost"){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}if(variant==="success")e.currentTarget.style.background="rgba(16,185,129,0.1)";}}>
      {children}
    </button>
  );
};

const DarkInp = ({style,...p}) => (
  <input {...p} style={{width:"100%",padding:"12px 16px",background:"rgba(255,255,255,0.04)",border:"1.5px solid rgba(255,255,255,0.08)",borderRadius:10,fontFamily:"inherit",fontSize:14,color:"#FAFAFA",outline:"none",boxSizing:"border-box",transition:"all 0.2s",...style}}
    onFocus={e=>{e.target.style.borderColor="rgba(109,40,217,0.6)";e.target.style.boxShadow="0 0 0 3px rgba(109,40,217,0.12)";e.target.style.background="rgba(255,255,255,0.06)";}}
    onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.08)";e.target.style.boxShadow="none";e.target.style.background="rgba(255,255,255,0.04)";}}/>
);
const DarkSel = ({children,...p}) => (
  <select {...p} style={{width:"100%",padding:"12px 16px",background:"#0A0B12",border:"1.5px solid rgba(255,255,255,0.08)",borderRadius:10,fontFamily:"inherit",fontSize:14,color:"#FAFAFA",outline:"none",boxSizing:"border-box"}}>{children}</select>
);
const DarkTxt = (p) => (
  <textarea {...p} style={{width:"100%",padding:"12px 16px",background:"rgba(255,255,255,0.04)",border:"1.5px solid rgba(255,255,255,0.08)",borderRadius:10,fontFamily:"inherit",fontSize:14,color:"#FAFAFA",outline:"none",minHeight:100,resize:"vertical",boxSizing:"border-box"}}
    onFocus={e=>{e.target.style.borderColor="rgba(109,40,217,0.6)";}}
    onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.08)";}}/>
);
const Fld = ({label,req,err,children}) => (
  <div style={{marginBottom:16}}>
    <label style={{display:"block",fontSize:11,fontWeight:600,color:"#8B93A8",marginBottom:6,letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}{req&&<span style={{color:"#f87171",marginLeft:3}}>*</span>}</label>
    {children}
    {err&&<div style={{color:"#f87171",fontSize:11,marginTop:5}}>⚠ {err}</div>}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MESH BACKGROUND
───────────────────────────────────────────────────────────────────────────── */
const MeshBG = () => (
  <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
    <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(109,40,217,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(109,40,217,0.04) 1px,transparent 1px)",backgroundSize:"56px 56px"}}/>
    <div style={{position:"absolute",width:1000,height:1000,borderRadius:"50%",background:"radial-gradient(circle,rgba(109,40,217,0.1) 0%,transparent 60%)",top:-400,left:"-5%",animation:"drift1 25s ease-in-out infinite"}}/>
    <div style={{position:"absolute",width:800,height:800,borderRadius:"50%",background:"radial-gradient(circle,rgba(67,56,202,0.08) 0%,transparent 60%)",bottom:-300,right:"-5%",animation:"drift2 30s ease-in-out infinite"}}/>
    <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,0.05) 0%,transparent 65%)",top:"35%",right:"20%",animation:"drift3 22s ease-in-out infinite"}}/>
    <div style={{position:"absolute",top:"28%",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(109,40,217,0.12),transparent)"}}/>
    <div style={{position:"absolute",top:"72%",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(109,40,217,0.07),transparent)"}}/>
  </div>
);

/* Stars */
const Stars = () => {
  const stars = Array.from({length:30},(_,i)=>({x:Math.random()*100,y:Math.random()*100,s:Math.random()*1.5+0.5,d:Math.random()*3+2}));
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
      {stars.map((s,i)=>(
        <div key={i} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,background:"#fff",borderRadius:"50%",opacity:0.3,animation:`pulse ${s.d}s ${Math.random()*3}s ease-in-out infinite`}}/>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   DASHBOARD MOCKUP
───────────────────────────────────────────────────────────────────────────── */
const DashMockup = () => {
  const [tick,setTick] = useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),2000);return()=>clearInterval(t);},[]);
  const bars = [42,68,35,78,55,90,62,85,45,88,72,95];
  return (
    <div style={{background:"#0D1117",borderRadius:20,border:`1px solid ${T.border2}`,overflow:"hidden",boxShadow:"0 0 0 1px rgba(124,58,237,0.2),0 40px 80px rgba(0,0,0,0.6)",fontFamily:"'Inter',sans-serif"}}>
      {/* Browser chrome */}
      <div style={{background:"#161B22",padding:"10px 16px",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",gap:5}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}</div>
        <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"4px 12px",fontSize:11,color:T.muted,fontFamily:"monospace"}}>app.violationflow.com/dashboard</div>
        <div style={{width:60,height:18,background:"rgba(124,58,237,0.2)",borderRadius:4}}/>
      </div>
      <div style={{padding:20}}>
        {/* Stats row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
          {[["Active Cases","42",T.violet],["Resolved","128","#10B981"],["Pending","7",T.gold]].map(([l,v,c])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px 14px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:9,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{l}</div>
              <div style={{fontSize:26,fontWeight:800,color:c,fontFamily:"'Instrument Serif',Georgia,serif"}}>{v}</div>
            </div>
          ))}
        </div>
        {/* Cases */}
        {[
          {title:"Unapproved structural change",unit:"Unit 4B",status:"Notice Sent",c:T.violet,bg:"rgba(124,58,237,0.15)"},
          {title:"Parking violation — repeated",unit:"Unit 12A",status:"Final",c:"#f87171",bg:"rgba(239,68,68,0.12)"},
          {title:"Noise complaint",unit:"Unit 7C",status:"Resolved",c:"#34d399",bg:"rgba(16,185,129,0.1)"},
        ].map((r,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:10,background:"rgba(255,255,255,0.03)",marginBottom:6,border:`1px solid ${T.border}`}}>
            <div style={{width:30,height:30,borderRadius:8,background:`rgba(124,58,237,0.15)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>⚖️</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,color:T.text,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.title}</div>
              <div style={{fontSize:10,color:T.muted}}>{r.unit}</div>
            </div>
            <span style={{background:r.bg,color:r.c,padding:"3px 8px",borderRadius:20,fontSize:9,fontWeight:700,whiteSpace:"nowrap"}}>{r.status}</span>
          </div>
        ))}
        {/* Mini chart */}
        <div style={{background:"rgba(124,58,237,0.08)",borderRadius:12,padding:"12px 14px",marginTop:10,border:`1px solid rgba(124,58,237,0.15)`}}>
          <div style={{fontSize:9,fontWeight:700,color:"#c4b5fd",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Resolution Rate</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:36}}>
            {bars.map((h,i)=>(
              <div key={i} style={{flex:1,background:i===tick%12?T.gold:`rgba(124,58,237,0.5)`,borderRadius:2,height:`${h}%`,transition:"all 0.5s",boxShadow:i===tick%12?`0 0 6px ${T.gold}`:"none"}}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL
───────────────────────────────────────────────────────────────────────────── */
const Modal = ({title,sub,onClose,children,wide}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}} onClick={onClose}>
    <div style={{background:"#0D1117",border:`1px solid ${T.border2}`,borderRadius:24,padding:40,width:wide?720:560,maxWidth:"96vw",maxHeight:"92vh",overflowY:"auto",boxShadow:`0 0 0 1px rgba(124,58,237,0.2),0 32px 80px rgba(0,0,0,0.8)`}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
        <div>
          <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:22,fontWeight:700,color:T.text}}>{title}</div>
          {sub&&<div style={{fontSize:13,color:T.muted,marginTop:4}}>{sub}</div>}
        </div>
        <button onClick={onClose} style={{background:T.glass2,border:`1px solid ${T.border}`,borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:16,color:T.muted2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   CONTACT FORM
───────────────────────────────────────────────────────────────────────────── */
function ContactForm({onDone}) {
  const [f,setF]=useState({name:"",email:"",company:"",role:"",plan:"Professional",message:""});
  const [sent,setSent]=useState(false);const [saving,setSaving]=useState(false);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const submit=async()=>{
    if(!f.name||!f.email)return;setSaving(true);
    try{await db("leads",{method:"POST",body:JSON.stringify({name:f.name,email:f.email,company:f.company,role:f.role,plan:f.plan,message:f.message,source:"contact_form",created_at:new Date().toISOString()})});}catch(_){}
    setSent(true);setSaving(false);
    if(onDone)setTimeout(onDone,3500);
  };
  if(sent)return(
    <div style={{textAlign:"center",padding:"50px 20px"}}>
      <div style={{width:72,height:72,background:"rgba(124,58,237,0.15)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",border:`1px solid rgba(124,58,237,0.4)`,fontSize:30}}>✓</div>
      <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:10}}>You're on the list!</div>
      <p style={{color:T.muted,fontSize:14,lineHeight:1.7}}>Our team will reach out within 1 business day.<br/>In the meantime, email us at <a href="mailto:support@violationflow.com" style={{color:"#c4b5fd",textDecoration:"none"}}>support@violationflow.com</a></p>
    </div>
  );
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
        <Fld label="Full Name" req><DarkInp value={f.name} onChange={set("name")} placeholder="Your name"/></Fld>
        <Fld label="Email" req><DarkInp type="email" value={f.email} onChange={set("email")} placeholder="you@company.com"/></Fld>
        <Fld label="Company / Association"><DarkInp value={f.company} onChange={set("company")} placeholder="HOA or management company"/></Fld>
        <Fld label="Your Role"><DarkSel value={f.role} onChange={set("role")}><option value="">Select role...</option><option>Property Manager</option><option>HOA Board Member</option><option>Condo Association Manager</option><option>Community Manager</option><option>Other</option></DarkSel></Fld>
      </div>
      <Fld label="Plan Interest"><DarkSel value={f.plan} onChange={set("plan")}><option>On Demand — $9.99/report</option><option>Starter — $59/mo</option><option>Professional — $149/mo</option><option>Enterprise — Custom</option><option>Not sure yet</option></DarkSel></Fld>
      <Fld label="Tell us about your community"><DarkTxt value={f.message} onChange={set("message")} placeholder="Number of units, current pain points, any questions..."/></Fld>
      <VBtn onClick={submit} disabled={saving||!f.name||!f.email} style={{width:"100%",justifyContent:"center",padding:"14px",fontSize:15}}>{saving?"Sending...":"Request a Free Demo"}</VBtn>
      <p style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:10}}>By submitting, you agree to our Privacy Policy and Terms of Service. No spam, ever.</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AI AGENT
───────────────────────────────────────────────────────────────────────────── */
function AIAgent() {
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"assistant",text:"Hi! I'm the ViolationFlow AI assistant. I specialize in HOA and Condominium violation compliance. Ask me anything about our platform, pricing, how it works, or how to get started!"}]);
  const [input,setInput]=useState("");const [loading,setLoading]=useState(false);const [captured,setCaptured]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,open]);
  const SYS=`You are the ViolationFlow AI assistant — expert in HOA and Condominium violation compliance management.

ViolationFlow is a nationwide platform for HOAs and Condominium Associations that:
- Provides structured violation reporting (reporter identity required, must select specific rule)
- Automates manager review → notice generation → hearing deadline tracking
- Configurable hearing window (10-14 days per association)
- Auto-finalizes violations if no hearing requested
- Full audit trail and compliance timeline
- Analytics: violation patterns, resolution rates, recurring issues

PRICING PLANS — know these in detail:

ON DEMAND — $9.99 per violation report (no monthly fee)
- Best for: Individual condo owners or homeowners whose HOA has NOT signed up for ViolationFlow
- Features: Submit violation reports, select rule violated, official notice generation, case status tracking, legal-grade audit trail
- No account required, secure payment, instant notice generation

STARTER — $59/month
- Best for: Self-managed HOAs or Condo associations, volunteer boards
- Units: Up to 100 units
- Features: Violation portal for residents, rule database upload, notice generator, hearing deadline tracking, compliance history, email support
- Who should choose this: A small community with a volunteer board

PROFESSIONAL — $149/month
- Best for: Property management companies managing multiple communities
- Units: Up to 300 units (600 units with add-on)
- Features: Unlimited associations, portfolio dashboard, compliance analytics, API integrations, priority support
- Who should choose this: A property manager who oversees multiple communities

ENTERPRISE — Custom pricing
- Best for: Large management firms with 600+ units
- Features: Unlimited units, white label option, dedicated onboarding, custom integrations, SLA guarantee, account manager

KEY DIFFERENCE BETWEEN PLANS:
- On Demand = individual owners pay $9.99 per report, no subscription needed
- Starter = self-service for small self-managed communities up to 150 units
- Professional = multi-association dashboard for property managers, up to 300 units
- Enterprise = unlimited units, white label, fully custom for large firms
- Owner Plan = same as On Demand

WHAT ASSOCIATIONS MUST PROVIDE WHEN ONBOARDING:
1. Property Information: Full legal property name, address, city, state, zip code
2. Owner/Resident Information: Owner name, mailing address (for official notices if needed), email address
3. Unit Information: Unit number for every unit in the community
4. Phone Number: Phone number for each unit owner or primary contact
5. Governing Documents: Upload HOA or Condo bylaws, CC&Rs, rules & regulations so the platform can build the rules list
6. Hearing Window: Choose between 10-14 day hearing window per your governing documents
7. Board Contact: Primary board member or manager name and contact for correspondence

WHY THIS INFO IS REQUIRED:
- Mailing address: Required for sending official violation notices by mail if needed (some states require physical mail)
- Phone number: For urgent contact regarding hearing deadlines
- Unit number: All violation reports reference a specific unit — this is required for legal enforceability

FAQ KNOWLEDGE:
Q: Is ViolationFlow legal advice? A: No. It's a technology platform. Always consult a licensed attorney for legal questions.
Q: What states does it work in? A: All 50 US states. Hearing windows are configurable to match your state's requirements.
Q: Can residents submit anonymous reports? A: No. All reporters must provide name, unit number, and contact info. This prevents frivolous reports.
Q: What happens if a hearing is not requested? A: The violation auto-finalizes after the hearing window expires.
Q: Can I manage multiple associations? A: Yes, with Professional and Full Service plans.
Q: How do I get started? A: Contact us at support@violationflow.com or request a demo. Setup takes under 30 minutes.
Q: What if I have more than 50 units on Starter? A: You'd need to upgrade to Professional which has unlimited units.
Q: Do you offer a free trial? A: Yes, Professional plan includes a free trial. Contact us for details.
Q: Is my data secure? A: Yes, SOC 2 Type II compliant with encrypted storage.

Email: support@violationflow.com
Website: violationflow.com

If someone wants a demo or more info, ask for name + email + association name. Team responds in 1 business day.
Keep replies to 2-4 sentences max. Be warm, professional, expert.
Never give legal advice. Recommend consulting an attorney for legal questions.`;

  const send=async()=>{
    if(!input.trim()||loading)return;
    const msg=input.trim();setInput("");
    setMsgs(m=>[...m,{role:"user",text:msg}]);setLoading(true);
    const em=msg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if(em&&!captured){setCaptured(true);try{await db("leads",{method:"POST",body:JSON.stringify({email:em[0],source:"ai_chat",message:msg,created_at:new Date().toISOString()})});}catch(_){}}
    try{
      const history=msgs.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}));
      history.push({role:"user",content:msg});
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":"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","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:SYS,messages:history})});
      const data=await res.json();
      const reply=data.content?.find(c=>c.type==="text")?.text||"I had trouble with that. Email us at support@violationflow.com";
      setMsgs(m=>[...m,{role:"assistant",text:reply}]);
    }catch{setMsgs(m=>[...m,{role:"assistant",text:"Connection issue. Please email support@violationflow.com and we'll help right away."}]);}
    setLoading(false);
  };

  return(<>
    <button onClick={()=>setOpen(o=>!o)} style={{position:"fixed",bottom:28,right:28,width:60,height:60,borderRadius:"50%",background:`linear-gradient(135deg,${T.violet},${T.indigo})`,border:"none",cursor:"pointer",boxShadow:`0 8px 32px rgba(124,58,237,0.5)`,zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,transition:"all 0.2s",animation:open?"none":"glowPulse 3s ease-in-out infinite"}}
      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
      {open?"✕":"💬"}
      {!open&&<div style={{position:"absolute",top:-2,right:-2,width:16,height:16,background:T.gold,borderRadius:"50%",border:"2px solid #06080F",fontSize:9,color:"#000",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>1</div>}
    </button>
    {open&&(
      <div style={{position:"fixed",bottom:104,right:28,width:380,maxHeight:540,background:"#0D1117",borderRadius:20,boxShadow:`0 0 0 1px rgba(124,58,237,0.3),0 32px 80px rgba(0,0,0,0.8)`,zIndex:800,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"'Inter',sans-serif"}}>
        <div style={{background:`linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.2))`,padding:"16px 18px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:40,height:40,background:`linear-gradient(135deg,${T.violet},${T.indigo})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}><ScaleLogo size={22}/></div>
          <div><div style={{color:T.text,fontWeight:600,fontSize:14,fontFamily:"'Instrument Serif',Georgia,serif"}}>ViolationFlow AI</div><div style={{color:"#a78bfa",fontSize:11}}>● Online — HOA & Condo Expert</div></div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 14px 8px"}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:10}}>
              {m.role==="assistant"&&<div style={{width:28,height:28,background:`rgba(124,58,237,0.15)`,borderRadius:"50%",border:`1px solid rgba(124,58,237,0.3)`,display:"flex",alignItems:"center",justifyContent:"center",marginRight:8,flexShrink:0,alignSelf:"flex-end",fontSize:12}}>⚖️</div>}
              <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?`linear-gradient(135deg,${T.violet},${T.indigo})`:"rgba(255,255,255,0.06)",color:T.text,fontSize:13,lineHeight:1.6,border:m.role==="user"?"none":`1px solid ${T.border}`}}>
                {m.text}
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{width:28,height:28,background:"rgba(124,58,237,0.15)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⚖️</div>
            <div style={{background:"rgba(255,255,255,0.06)",padding:"10px 16px",borderRadius:"16px 16px 16px 4px",border:`1px solid ${T.border}`}}>
              <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,background:T.violet,borderRadius:"50%",animation:`bounce 1s ${i*0.2}s infinite`}}/>)}</div>
            </div>
          </div>}
          <div ref={endRef}/>
        </div>
        <div style={{padding:"10px 14px 14px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about violations, pricing..."
            style={{flex:1,padding:"10px 14px",background:"rgba(255,255,255,0.05)",border:`1.5px solid ${T.border2}`,borderRadius:10,fontFamily:"inherit",fontSize:13,color:T.text,outline:"none"}}
            onFocus={e=>e.target.style.borderColor=T.violet} onBlur={e=>e.target.style.borderColor=T.border2}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{background:`linear-gradient(135deg,${T.violet},${T.indigo})`,color:"#fff",border:"none",borderRadius:10,padding:"10px 14px",cursor:"pointer",fontSize:15,opacity:loading||!input.trim()?0.4:1,transition:"opacity 0.2s"}}>↑</button>
        </div>
      </div>
    )}
  </>);
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESIDENT FORM
───────────────────────────────────────────────────────────────────────────── */
function ResidentForm({onBack}) {
  const [search,setSearch]=useState("");const [assocs,setAssocs]=useState([]);const [assoc,setAssoc]=useState(null);const [rules,setRules]=useState([]);const [step,setStep]=useState(0);const [errs,setErrs]=useState({});const [saving,setSaving]=useState(false);
  const [reg,setReg]=useState({assoc_name:"",owner_name:"",address:"",unit:"",city:"",state:"",zip:"",email:"",phone:"",password:""});
  const [regDone,setRegDone]=useState(false);
  const [form,setForm]=useState({reporter_name:"",reporter_unit:"",reporter_email:"",reporter_phone:"",violator_unit:"",rule_id:"",description:"",incident_date:"",incident_time:"",location:"",previously_reported:"no",requested_action:"Warning",signature:"",cert1:false,cert2:false,cert3:false});
  useEffect(()=>{if(search.length>=3)db(`associations?name=ilike.${search}%&select=id,name,hearing_days,city,state&limit=8`).then(d=>setAssocs(Array.isArray(d)?d:[]));else setAssocs([]);},[search]);
  const pick=async a=>{setAssoc(a);const r=await db(`rules?association_id=eq.${a.id}&active=eq.true&select=*&order=category.asc`);setRules(Array.isArray(r)?r:[]);setStep(2);};
  const validate=()=>{const e={};if(!form.reporter_name.trim())e.reporter_name="Required";if(!form.reporter_unit.trim())e.reporter_unit="Required";if(!form.reporter_email.trim())e.reporter_email="Required";if(!form.violator_unit.trim())e.violator_unit="Required";if(!form.rule_id)e.rule_id="Select a rule";if(!form.description.trim())e.description="Required";if(!form.incident_date)e.incident_date="Required";if(!form.signature.trim())e.signature="Required";if(!form.cert1||!form.cert2||!form.cert3)e.cert="All certifications required";return e;};
  const submit=async()=>{const e=validate();if(Object.keys(e).length){setErrs(e);return;}setSaving(true);try{const d=await db(`violation_reports?reporter_unit=eq.${form.reporter_unit}&violator_unit=eq.${form.violator_unit}&rule_id=eq.${form.rule_id}&created_at=gte.${new Date(Date.now()-86400000).toISOString()}&select=id`);if(d?.length>0){setErrs({submit:"Duplicate report within 24 hours."});setSaving(false);return;}await db("violation_reports",{method:"POST",body:JSON.stringify({association_id:assoc.id,reporter_name:form.reporter_name,reporter_unit:form.reporter_unit,reporter_email:form.reporter_email,violator_unit:form.violator_unit,rule_id:form.rule_id,description:form.description,incident_date:form.incident_date,signature:form.signature})});setStep(4);}catch(err){setErrs({submit:err.message});}setSaving(false);};
  const selRule=rules.find(r=>r.id===form.rule_id);
  const grouped=rules.reduce((a,r)=>{(a[r.category]=a[r.category]||[]).push(r);return a;},{});
  const setF=k=>e=>setForm(f=>({...f,[k]:e.target.type==="checkbox"?e.target.checked:e.target.value}));
  const set=setF;
  const setR=k=>e=>setReg(r=>({...r,[k]:e.target.value}));

  const submitReg=async()=>{
    const e={};
    if(!reg.assoc_name.trim())e.assoc_name="Required";
    if(!reg.owner_name.trim())e.owner_name="Required";
    if(!reg.address.trim())e.address="Required";
    if(!reg.unit.trim())e.unit="Required";
    if(!reg.city.trim())e.city="Required";
    if(!reg.state.trim())e.state="Required";
    if(!reg.zip.trim())e.zip="Required";
    if(!reg.email.trim())e.email="Required";
    if(!reg.phone.trim())e.phone="Required";
    if(!reg.password||reg.password.length<8)e.password="Min 8 characters";
    if(Object.keys(e).length){setErrs(e);return;}
    setSaving(true);
    try{
      const res=await fetch(`${SUPA_URL}/auth/v1/signup`,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":"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","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true","apikey":SUPA_KEY},body:JSON.stringify({email:reg.email,password:reg.password,data:{owner_name:reg.owner_name,assoc_name:reg.assoc_name,address:reg.address,unit:reg.unit,city:reg.city,state:reg.state,zip:reg.zip,phone:reg.phone}})});
      const data=await res.json();
      if(data.error){setErrs({submit:data.error.message||data.error});setSaving(false);return;}
      setRegDone(true);
      setStep(-1);// verification pending screen
    }catch(err){setErrs({submit:err.message});}
    setSaving(false);
  };

  const inp=(label,key,type="text",placeholder="",req=true)=>(
    <div style={{marginBottom:16}}>
      <label style={{display:"block",fontSize:13,fontWeight:600,color:"#374151",marginBottom:6}}>{label}{req&&<span style={{color:"#EF4444"}}> *</span>}</label>
      <input type={type} value={reg[key]} onChange={setR(key)} placeholder={placeholder}
        style={{width:"100%",padding:"11px 14px",fontSize:14,border:`1.5px solid ${errs[key]?"#EF4444":"#D1D5DB"}`,borderRadius:8,outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#111827",background:"#fff",transition:"border 0.2s"}}
        onFocus={e=>e.target.style.borderColor="#111827"} onBlur={e=>e.target.style.borderColor=errs[key]?"#EF4444":"#D1D5DB"}/>
      {errs[key]&&<div style={{fontSize:12,color:"#EF4444",marginTop:4}}>{errs[key]}</div>}
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#F9FAFB",fontFamily:"'Inter',sans-serif"}}>
      <style>{STYLES}</style>
      <nav style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"14px 32px",display:"flex",alignItems:"center",gap:16,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={onBack}>
          <ScaleLogo size={22}/>
          <span style={{fontFamily:"'Georgia',serif",fontSize:17,fontWeight:700,color:"#111827"}}>ViolationFlow</span>
        </div>
        <div style={{flex:1}}/>
        <span style={{fontSize:13,color:"#6B7280"}}>HOA &amp; Condo Violation Portal</span>
      </nav>
      <div style={{maxWidth:640,margin:"0 auto",padding:"48px 20px"}}>

        {/* ── STEP 0: REGISTRATION ── */}
        {step===0&&(
          <div>
            <div style={{textAlign:"center",marginBottom:36}}>
              <div style={{fontFamily:"'Georgia',serif",fontSize:28,fontWeight:700,color:"#111827",marginBottom:8}}>Create Your Account</div>
              <p style={{color:"#6B7280",fontSize:15,lineHeight:1.7}}>Register to submit a violation report. A verification email will be sent before you can proceed.</p>
            </div>
            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:16,padding:"36px 40px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              {errs.submit&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"12px 16px",marginBottom:20,color:"#DC2626",fontSize:13}}>⚠ {errs.submit}</div>}
              <div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:16}}>Association Information</div>
              {inp("Association Name","assoc_name","text","e.g. Jefferson Court Condominium")}
              <div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:"0.08em",textTransform:"uppercase",margin:"24px 0 16px"}}>Owner Information</div>
              {inp("Full Name","owner_name","text","Your legal name")}
              {inp("Street Address","address","text","e.g. 123 Main St")}
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
                <div>{inp("Unit / Apt","unit","text","e.g. Unit 4B")}</div>
                <div>{inp("Zip Code","zip","text","e.g. 60025")}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
                <div>{inp("City","city","text","e.g. Glenview")}</div>
                <div>{inp("State","state","text","e.g. IL")}</div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:"0.08em",textTransform:"uppercase",margin:"24px 0 16px"}}>Contact &amp; Login</div>
              {inp("Email Address","email","email","you@email.com")}
              {inp("Cell Phone","phone","tel","e.g. (847) 555-1234")}
              {inp("Password","password","password","Min 8 characters")}
              <div style={{background:"#F0F9FF",border:"1px solid #BAE6FD",borderRadius:8,padding:"12px 16px",marginBottom:24,fontSize:13,color:"#0369A1",lineHeight:1.6}}>
                📧 After registering, a verification email will be sent to your address. You must verify before proceeding to payment and filing your report.
              </div>
              <button onClick={submitReg} disabled={saving}
                style={{width:"100%",padding:"13px",background:"#111827",color:"#fff",border:"none",borderRadius:8,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.7:1,transition:"all 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#000"}
                onMouseLeave={e=>e.currentTarget.style.background="#111827"}>
                {saving?"Creating Account...":"Create Account & Send Verification Email"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP -1: VERIFICATION PENDING ── */}
        {step===-1&&(
          <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:16,padding:"56px 40px",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{width:72,height:72,background:"#F9FAFB",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:32,border:"1px solid #E5E7EB"}}>📧</div>
            <div style={{fontFamily:"'Georgia',serif",fontSize:26,fontWeight:700,color:"#111827",marginBottom:12}}>Check Your Email</div>
            <p style={{color:"#6B7280",fontSize:15,lineHeight:1.8,marginBottom:8,maxWidth:420,margin:"0 auto 16px"}}>We sent a verification link to <strong style={{color:"#111827"}}>{reg.email}</strong>.</p>
            <p style={{color:"#6B7280",fontSize:14,lineHeight:1.7,maxWidth:420,margin:"0 auto 32px"}}>Click the link in your email to verify your account. Once verified, return here to complete payment and file your violation report.</p>
            <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:10,padding:"16px 20px",maxWidth:420,margin:"0 auto 32px",fontSize:13,color:"#92400E",lineHeight:1.7}}>
              ⚠ After verifying your email, you will be directed to complete a <strong>$9.99 payment</strong> before filing your report.
            </div>
            <button onClick={()=>setStep(1)}
              style={{background:"#111827",color:"#fff",border:"none",borderRadius:8,padding:"12px 28px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#000"}
              onMouseLeave={e=>e.currentTarget.style.background="#111827"}>
              I've Verified — Continue to Payment
            </button>
            <div style={{marginTop:16}}><button onClick={onBack} style={{background:"none",border:"none",color:"#9CA3AF",fontSize:13,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Back to home</button></div>
          </div>
        )}

        {/* ── STRIPE PAYMENT PLACEHOLDER ── */}
        {step===1&&(
          <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:16,padding:"56px 40px",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{width:72,height:72,background:"#F9FAFB",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:32,border:"1px solid #E5E7EB"}}>💳</div>
            <div style={{fontFamily:"'Georgia',serif",fontSize:26,fontWeight:700,color:"#111827",marginBottom:12}}>Complete Payment</div>
            <p style={{color:"#6B7280",fontSize:15,lineHeight:1.8,marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>A one-time payment of <strong style={{color:"#111827"}}>$9.99</strong> is required to file your violation report.</p>
            <div style={{background:"#F3F4F6",border:"2px dashed #D1D5DB",borderRadius:12,padding:"32px",marginBottom:32,color:"#9CA3AF",fontSize:14}}>
              🔧 Stripe payment integration coming soon.<br/>
              <span style={{fontSize:12,marginTop:8,display:"block"}}>This placeholder will be replaced with the Stripe checkout.</span>
            </div>
            <button onClick={()=>setStep(2)}
              style={{background:"#111827",color:"#fff",border:"none",borderRadius:8,padding:"13px 32px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#000"}
              onMouseLeave={e=>e.currentTarget.style.background="#111827"}>
              Continue to File Report →
            </button>
          </div>
        )}
        {step===1&&(
          <div className="hero-fade">
            <div style={{textAlign:"center",marginBottom:36}}>
              <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:32,fontWeight:800,color:T.text,marginBottom:8}}>Find Your Community</div>
              <p style={{color:T.muted,fontSize:15}}>Search for your HOA or Condominium Association to begin your violation report.</p>
            </div>
            <GlassCard style={{padding:36}}>
              <DarkInp placeholder="Type at least 3 letters — e.g. Oakwood, Harbor View..." value={search} onChange={e=>setSearch(e.target.value)} style={{fontSize:16,padding:"16px 20px"}}/>
              {assocs.length>0&&<div style={{marginTop:12,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden"}}>
                {assocs.map(a=><div key={a.id} onClick={()=>pick(a)} style={{padding:"14px 18px",cursor:"pointer",borderBottom:`1px solid ${T.border}`,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(124,58,237,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{fontWeight:600,color:T.text,fontSize:14}}>{a.name}</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>{a.city&&a.state?`${a.city}, ${a.state}`:"Community"} · {a.hearing_days}-day hearing window</div></div>)}
              </div>}
              {search.length>=3&&!assocs.length&&<div style={{marginTop:12,padding:"16px 20px",background:"#F9FAFB",borderRadius:10,border:"1px solid #E5E7EB",fontSize:13,color:"#374151",lineHeight:1.7}}>Your association is not yet using ViolationFlow. We encourage you to bring it to your board.<br/><br/><strong>In the meantime, you can still register and report your violation directly — $9.99.</strong></div>}
            </GlassCard>
          </div>
        )}
        {step===2&&(
          <div className="hero-fade">
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
              <Pill><ScaleLogo size={14}/> {assoc.name}</Pill>
              <button onClick={()=>setStep(1)} style={{background:"none",border:"none",color:T.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Change ↗</button>
            </div>
            <GlassCard style={{padding:36}} hover={false}>
              <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:4}}>Violation Report</div>
              <p style={{color:T.muted,fontSize:13,marginBottom:28}}>All fields marked * are required. Reports must reference a specific rule and identify the reporter. Anonymous submissions are not accepted.</p>
              <div style={{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"18px 20px",marginBottom:20,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,fontWeight:700,color:T.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:16}}>A — Reporter Information</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}><Fld label="Full Name" req err={errs.reporter_name}><DarkInp value={form.reporter_name} onChange={set("reporter_name")} placeholder="Your legal name"/></Fld><Fld label="Your Unit #" req err={errs.reporter_unit}><DarkInp value={form.reporter_unit} onChange={set("reporter_unit")} placeholder="e.g. 305"/></Fld><Fld label="Email" req err={errs.reporter_email}><DarkInp type="email" value={form.reporter_email} onChange={set("reporter_email")}/></Fld><Fld label="Phone (optional)"><DarkInp value={form.reporter_phone} onChange={set("reporter_phone")}/></Fld></div>
              </div>
              <div style={{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"18px 20px",marginBottom:20,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,fontWeight:700,color:T.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:16}}>B — Violation Details</div>
                <Fld label="Violating Unit #" req err={errs.violator_unit}><DarkInp value={form.violator_unit} onChange={set("violator_unit")} placeholder="Unit that committed the violation"/></Fld>
                <Fld label="Rule Violated" req err={errs.rule_id}><DarkSel value={form.rule_id} onChange={set("rule_id")}><option value="">— Select the exact rule that was violated —</option>{Object.entries(grouped).map(([cat,rs])=><optgroup key={cat} label={cat}>{rs.map(r=><option key={r.id} value={r.id}>{r.rule_title} — §{r.rule_section} (${r.fine_amount})</option>)}</optgroup>)}</DarkSel>{selRule&&<div style={{marginTop:8,background:"rgba(124,58,237,0.08)",borderRadius:8,padding:"9px 12px",fontSize:13,border:"1px solid rgba(124,58,237,0.2)"}}><b style={{color:"#c4b5fd"}}>§{selRule.rule_section}</b> <span style={{color:T.muted}}>{selRule.description}</span> <b style={{color:T.gold}}>Fine: ${selRule.fine_amount}</b></div>}</Fld>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}><Fld label="Incident Date" req err={errs.incident_date}><DarkInp type="date" value={form.incident_date} onChange={set("incident_date")}/></Fld><Fld label="Time"><DarkInp type="time" value={form.incident_time} onChange={set("incident_time")}/></Fld></div>
                <Fld label="Location"><DarkInp value={form.location} onChange={set("location")} placeholder="e.g. Parking spot #14..."/></Fld>
                <Fld label="Detailed Description" req err={errs.description}><DarkTxt value={form.description} onChange={set("description")} placeholder="Describe exactly what occurred. Be specific."/></Fld>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}><Fld label="Previously Reported?"><DarkSel value={form.previously_reported} onChange={set("previously_reported")}><option value="no">No — First report</option><option value="yes">Yes — Before</option></DarkSel></Fld><Fld label="Requested Action"><DarkSel value={form.requested_action} onChange={set("requested_action")}><option>Warning</option><option>Fine</option><option>Hearing</option><option>Other</option></DarkSel></Fld></div>
              </div>
              <div style={{background:"rgba(245,158,11,0.06)",borderRadius:12,padding:"18px 20px",marginBottom:20,border:"1px solid rgba(245,158,11,0.15)"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#fbbf24",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>C — Certification & Digital Signature</div>
                {[{k:"cert1",t:"I certify that all information provided is true and accurate to the best of my knowledge."},{k:"cert2",t:"I understand this report will be shared with the Board of Directors and the alleged violator as part of due process."},{k:"cert3",t:"I acknowledge that filing a false or frivolous report may result in penalties under association rules."}].map(c=><label key={c.k} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12,cursor:"pointer"}}><input type="checkbox" checked={form[c.k]} onChange={set(c.k)} style={{marginTop:2,width:16,height:16,flexShrink:0,accentColor:T.violet}}/><span style={{fontSize:13,color:T.muted2,lineHeight:1.5}}>{c.t}</span></label>)}
                {errs.cert&&<div style={{color:"#f87171",fontSize:12,marginBottom:10}}>⚠ {errs.cert}</div>}
                <Fld label="Digital Signature — Type your full legal name" req err={errs.signature}><DarkInp value={form.signature} onChange={set("signature")} placeholder="Type your full legal name" style={{fontStyle:"italic",fontSize:16}}/></Fld>
              </div>
              {errs.submit&&<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:16,color:"#f87171",fontSize:13}}>⚠ {errs.submit}</div>}
              <VBtn onClick={submit} disabled={saving} style={{width:"100%",justifyContent:"center",padding:"14px",fontSize:15}}>{saving?"Submitting...":"Submit Violation Report"}</VBtn>
              <p style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:12}}>Reports are reviewed by your property manager in accordance with association governing documents and applicable state law. Questions? Email <a href="mailto:support@violationflow.com" style={{color:"#a78bfa"}}>support@violationflow.com</a></p>
            </GlassCard>
          </div>
        )}
        {step===4&&(
          <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:16,padding:"56px 40px",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{width:72,height:72,background:"#F9FAFB",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:32,border:"1px solid #E5E7EB"}}>✓</div>
            <div style={{fontFamily:"'Georgia',serif",fontSize:26,fontWeight:700,color:"#111827",marginBottom:12}}>Report Submitted</div>
            <p style={{color:"#6B7280",lineHeight:1.8,marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>Your violation report has been received and will be reviewed by your property manager.</p>
            <button onClick={()=>{setStep(0);setSearch("");setAssoc(null);setForm({reporter_name:"",reporter_unit:"",reporter_email:"",reporter_phone:"",violator_unit:"",rule_id:"",description:"",incident_date:"",incident_time:"",location:"",previously_reported:"no",requested_action:"Warning",signature:"",cert1:false,cert2:false,cert3:false});setErrs({});}}
              style={{background:"#111827",color:"#fff",border:"none",borderRadius:8,padding:"12px 28px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Submit Another Report
            </button>
            <div style={{marginTop:16}}><button onClick={onBack} style={{background:"none",border:"none",color:"#9CA3AF",fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>Back to home</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MANAGER DASHBOARD
───────────────────────────────────────────────────────────────────────────── */
const ST={NEW_REPORT:{label:"New Report",c:"#F59E0B",bg:"rgba(245,158,11,0.12)"},UNDER_REVIEW:{label:"Under Review",c:"#60A5FA",bg:"rgba(96,165,250,0.12)"},NOTICE_SENT:{label:"Notice Sent",c:"#a78bfa",bg:"rgba(167,139,250,0.12)"},HEARING_REQUESTED:{label:"Hearing Req.",c:"#f472b6",bg:"rgba(244,114,182,0.12)"},FINAL_VIOLATION:{label:"Final Violation",c:"#f87171",bg:"rgba(248,113,113,0.12)"},CLOSED:{label:"Closed",c:"#34d399",bg:"rgba(52,211,153,0.1)"}};
const Bdg=({status})=>{const s=ST[status]||ST.NEW_REPORT;return<span style={{background:s.bg,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:"0.04em",whiteSpace:"nowrap",border:`1px solid ${s.c}22`}}>{s.label}</span>;};
const NDoc=({d})=><div style={{background:"#0D1117",borderRadius:16,padding:32,border:`1px solid ${T.border2}`}}><div style={{textAlign:"center",borderBottom:`1px solid ${T.border}`,paddingBottom:18,marginBottom:20}}><div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text,letterSpacing:"0.05em"}}>VIOLATION NOTICE</div><div style={{fontSize:13,color:T.muted,marginTop:4}}>{d.assocName}</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>Notice Date: {d.noticeDate}</div></div>{[["Unit in Violation",`Unit ${d.violatorUnit}`],["Rule Violated",d.ruleTitle],["Rule Section",`§${d.ruleSection}`],["Description",d.description]].map(([k,v])=><div key={k} style={{marginBottom:12,fontSize:14,color:T.muted2}}><span style={{color:T.text,fontWeight:600}}>{k}:</span> {v}</div>)}<div style={{marginBottom:20,fontSize:14}}><span style={{color:T.text,fontWeight:600}}>Fine Amount:</span> <span style={{color:T.gold,fontWeight:700}}>${d.fineAmount}</span></div><div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:14,marginBottom:16}}><div style={{fontWeight:700,marginBottom:6,color:"#fbbf24",fontSize:13}}>⚖ Your Hearing Rights</div><div style={{fontSize:13,lineHeight:1.7,color:T.muted2}}>You have the right to contest this violation by requesting a formal hearing within <strong style={{color:T.text}}>{d.hearingDays} days</strong> (by <strong style={{color:T.text}}>{d.deadline}</strong>). Failure to request a hearing will result in this violation becoming final and a fine of <strong style={{color:T.gold}}>${d.fineAmount}</strong> applied to your account.</div></div><div style={{fontSize:11,color:T.muted,borderTop:`1px solid ${T.border}`,paddingTop:12}}>Issued pursuant to applicable state condominium and HOA statutes and the association's governing documents. For questions contact: support@violationflow.com</div></div>;
const TL=({events})=><div style={{paddingLeft:22,position:"relative"}}><div style={{position:"absolute",left:7,top:8,bottom:8,width:2,background:T.border}}/>{events.map((e,i)=><div key={e.id} style={{position:"relative",marginBottom:16}}><div style={{position:"absolute",left:-22,top:5,width:11,height:11,borderRadius:"50%",background:i===0?T.violet:T.border2,border:"2px solid #06080F",outline:`2px solid ${i===0?T.violet:T.border}`}}/><div style={{fontSize:11,color:T.muted,marginBottom:2}}>{new Date(e.created_at).toLocaleString()}</div><div style={{fontSize:13,fontWeight:600,color:T.muted2}}>{e.event_type.replace(/_/g," ")}</div>{e.description&&<div style={{fontSize:12,color:T.muted,marginTop:2}}>{e.description}</div>}</div>)}</div>;

/* ─────────────────────────────────────────────────────────────────────────────
   PRINT STYLES
───────────────────────────────────────────────────────────────────────────── */
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  .vf-printable, .vf-printable * { visibility: visible !important; }
  .vf-printable { position: fixed !important; top: 0; left: 0; width: 100%; padding: 40px !important; background: white !important; z-index: 99999; }
  .vf-no-print { display: none !important; }
}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   NOTICE OF VIOLATION FORM
───────────────────────────────────────────────────────────────────────────── */
function NoticeOfViolationForm({ caseData, onClose }) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const assoc = caseData?.associations || {};
  const report = caseData?.violation_reports || {};
  const rule = caseData?.rules || {};

  const [fields, setFields] = useState({
    toName: "",
    date: today,
    unit: report.violator_unit || "",
    incidentDate: report.incident_date ? new Date(report.incident_date).toLocaleDateString() : "",
    incidentYear: new Date().getFullYear(),
    description: report.description || "",
    actionTaken: "",
    authorizedAgent: "",
    assocName: assoc.name || "",
    assocAddress: assoc.address || "",
    assocCity: assoc.city || "",
    assocState: assoc.state || "IL",
    assocZip: assoc.zip || "",
  });
  const set = k => e => setFields(f => ({ ...f, [k]: e.target.value }));

  const inp = (val, onChange, opts = {}) => (
    <input value={val} onChange={onChange}
      style={{ border: "none", borderBottom: "1px solid #222", outline: "none", background: "transparent", fontSize: 14, color: "#111", fontFamily: "inherit", padding: "2px 4px", minWidth: opts.wide ? 240 : opts.sm ? 80 : 160, width: opts.full ? "100%" : undefined, ...opts.style }} />
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "32px 16px" }}>
      <style>{PRINT_STYLES}</style>
      <div style={{ background: "#fff", width: "100%", maxWidth: 760, borderRadius: 4, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        {/* Toolbar */}
        <div className="vf-no-print" style={{ background: "#1a1a2e", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "4px 4px 0 0" }}>
          <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 14 }}>📋 Notice of Violation</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => window.print()} style={{ background: "#6D28D9", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🖨 Print / Save PDF</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>✕ Close</button>
          </div>
        </div>

        {/* Form */}
        <div className="vf-printable" style={{ padding: "48px 56px", fontFamily: "Georgia, serif", color: "#111", background: "#fff" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 36, borderBottom: "2px solid #111", paddingBottom: 20 }}>
            <div style={{ width: 80, height: 80, border: "2px solid #ccc", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "#999", textAlign: "center", lineHeight: 1.4 }}>Association Logo</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{inp(fields.assocName, set("assocName"), { wide: true })}</div>
              <div style={{ fontSize: 13, color: "#333" }}>{inp(fields.assocAddress, set("assocAddress"), { wide: true })} – {inp(fields.assocCity, set("assocCity"), { sm: true })}, {inp(fields.assocState, set("assocState"), { sm: true })} {inp(fields.assocZip, set("assocZip"), { sm: true })}</div>
            </div>
          </div>

          <h1 style={{ textAlign: "center", fontSize: 22, fontWeight: 900, letterSpacing: "0.06em", textDecoration: "underline", marginBottom: 32 }}>NOTICE OF VIOLATION</h1>

          {/* To / Date */}
          <div style={{ display: "flex", gap: 32, marginBottom: 8 }}>
            <div>To: {inp(fields.toName, set("toName"), { wide: true })}</div>
            <div>Date: {inp(fields.date, set("date"), { wide: true })}</div>
          </div>
          <div style={{ marginLeft: 24, marginBottom: 28, fontSize: 14, lineHeight: 2 }}>
            <div>{inp(fields.assocAddress, set("assocAddress"), { wide: true })}</div>
            <div>Unit {inp(fields.unit, set("unit"), { sm: true })}</div>
            <div>{inp(fields.assocCity, set("assocCity"), { sm: true })}, {inp(fields.assocState, set("assocState"), { sm: true })} {inp(fields.assocZip, set("assocZip"), { sm: true })}</div>
          </div>

          {/* Body text */}
          <p style={{ fontSize: 14, lineHeight: 2, marginBottom: 20 }}>
            You are hereby notified as the Owner of Unit {inp(fields.unit, set("unit"), { sm: true })} that you are charged with the following
            violation of the Association's Declaration, By-Laws, or Rules and Regulations. The actions
            complained of occurred on or about {inp(fields.incidentDate, set("incidentDate"), { wide: true })}, {inp(fields.incidentYear, set("incidentYear"), { sm: true })} and are described as follows:
          </p>

          {/* Description box */}
          <div style={{ border: "none", borderBottom: "1px solid #111", marginBottom: 8, paddingBottom: 2 }}>
            <textarea value={fields.description} onChange={set("description")} rows={5}
              style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 14, fontFamily: "Georgia, serif", resize: "vertical", lineHeight: 2 }} />
          </div>
          {[1, 2, 3].map(i => <div key={i} style={{ borderBottom: "1px solid #111", height: 28, marginBottom: 4 }} />)}

          {/* Legal paragraphs */}
          <div style={{ marginTop: 24, marginBottom: 20, fontSize: 13, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 14, fontWeight: 700 }}>
              If you wish to protest this violation, you must fill out a REQUEST FOR HEARING form, in accordance with the Association's enforcement policies. If you fail to protest within ten (10) days, the violation will be deemed admitted, and you will be assessed costs and expenses for a 1<sup>st</sup> violation, unless otherwise determined by the Board of Directors.
            </p>
            <p style={{ marginBottom: 14, fontWeight: 700 }}>
              Under the rules, if you fail to request or appear at a hearing on these charges, you will be found guilty of default, and assessments, charges, costs, expenses and legal fees may be assessed against you and added to your account.
            </p>
            <p style={{ fontWeight: 700 }}>
              If a violation exists which has not already been corrected, and you fail to make an appropriate correction, you will receive a second notice of violation, after which the association will correct the violation at your expense. In this case, an administrative charge will be added.
            </p>
          </div>

          {/* Action Taken */}
          <div style={{ marginBottom: 28, fontSize: 14 }}>
            ACTION TAKEN: {inp(fields.actionTaken, set("actionTaken"), { full: true })}
          </div>

          {/* Signature */}
          <div style={{ marginTop: 20 }}>
            <div style={{ borderBottom: "1px solid #111", width: 220, marginBottom: 4 }}>
              {inp(fields.authorizedAgent, set("authorizedAgent"), { wide: true })}
            </div>
            <div style={{ fontSize: 12, color: "#444" }}>By: (Authorized Agent)</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, textTransform: "uppercase" }}>{fields.assocName || "Association Name"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   REQUEST FOR HEARING FORM
───────────────────────────────────────────────────────────────────────────── */
function RequestForHearingForm({ caseData, onClose }) {
  const today = new Date();
  const assoc = caseData?.associations || {};
  const report = caseData?.violation_reports || {};

  const [fields, setFields] = useState({
    noticeDate: caseData?.notice_date ? new Date(caseData.notice_date).toLocaleDateString() : "",
    noticeYear: caseData?.notice_date ? new Date(caseData.notice_date).getFullYear() : today.getFullYear(),
    ownerName: "",
    address: assoc.address || "",
    city: assoc.city || "",
    state: assoc.state || "IL",
    zip: assoc.zip || "",
    unit: report.violator_unit || "",
    phone: "",
    dateMonth: today.toLocaleString("default", { month: "long" }),
    dateDay: today.getDate(),
    dateYear: today.getFullYear(),
    assocName: assoc.name || "",
    assocAddress: assoc.address || "",
    assocCity: assoc.city || "",
    assocState: assoc.state || "IL",
    assocZip: assoc.zip || "",
  });
  const set = k => e => setFields(f => ({ ...f, [k]: e.target.value }));
  const inp = (val, onChange, opts = {}) => (
    <input value={val} onChange={onChange}
      style={{ border: "none", borderBottom: "1px solid #222", outline: "none", background: "transparent", fontSize: 14, color: "#111", fontFamily: "inherit", padding: "2px 4px", minWidth: opts.wide ? 240 : opts.sm ? 80 : 160, width: opts.full ? "100%" : undefined }} />
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "32px 16px" }}>
      <style>{PRINT_STYLES}</style>
      <div style={{ background: "#fff", width: "100%", maxWidth: 760, borderRadius: 4, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div className="vf-no-print" style={{ background: "#1a1a2e", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "4px 4px 0 0" }}>
          <span style={{ color: "#f472b6", fontWeight: 700, fontSize: 14 }}>⚖️ Request for Hearing</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => window.print()} style={{ background: "#6D28D9", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🖨 Print / Save PDF</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>✕ Close</button>
          </div>
        </div>

        <div className="vf-printable" style={{ padding: "48px 56px", fontFamily: "Georgia, serif", color: "#111", background: "#fff" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 36, borderBottom: "2px solid #111", paddingBottom: 20 }}>
            <div style={{ width: 80, height: 80, border: "2px solid #ccc", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "#999", textAlign: "center", lineHeight: 1.4 }}>Association Logo</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{inp(fields.assocName, set("assocName"), { wide: true })}</div>
              <div style={{ fontSize: 13, color: "#333" }}>{inp(fields.assocAddress, set("assocAddress"), { wide: true })} – {inp(fields.assocCity, set("assocCity"), { sm: true })}, {inp(fields.assocState, set("assocState"), { sm: true })} {inp(fields.assocZip, set("assocZip"), { sm: true })}</div>
            </div>
          </div>

          <h1 style={{ textAlign: "center", fontSize: 22, fontWeight: 900, letterSpacing: "0.06em", textDecoration: "underline", marginBottom: 32 }}>REQUEST FOR HEARING</h1>

          <p style={{ fontSize: 14, fontWeight: 700, textDecoration: "underline", marginBottom: 32 }}>Sign and return to the Management office.</p>

          <p style={{ fontSize: 14, lineHeight: 2, marginBottom: 48 }}>
            I hereby request a hearing on the charges made against me contained in the Notice of Violation
            dated {inp(fields.noticeDate, set("noticeDate"), { wide: true })} {inp(fields.noticeYear, set("noticeYear"), { sm: true })} alleging a violation of the Declaration, By-Laws or Rules
            and Regulations of the {inp(fields.assocName, set("assocName"), { wide: true })}.
          </p>

          {/* Fields grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px 40px", marginBottom: 32 }}>
            <div>
              <div style={{ borderBottom: "1px solid #111", paddingBottom: 4, marginBottom: 4, minHeight: 28 }}></div>
              <div style={{ fontSize: 12, color: "#444" }}>Signature</div>
            </div>
            <div>
              <div style={{ borderBottom: "1px solid #111", paddingBottom: 4, marginBottom: 4 }}>{inp(fields.ownerName, set("ownerName"), { full: true })}</div>
              <div style={{ fontSize: 12, color: "#444" }}>Owner's Name – Printed</div>
            </div>
            <div>
              <div style={{ borderBottom: "1px solid #111", paddingBottom: 4, marginBottom: 4 }}>{inp(fields.address, set("address"), { full: true })}</div>
              <div style={{ fontSize: 12, color: "#444" }}>Address</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ borderBottom: "1px solid #111", paddingBottom: 4, marginBottom: 4 }}>{inp(fields.city, set("city"), { full: true })}</div>
                <div style={{ fontSize: 12, color: "#444" }}>City</div>
              </div>
              <div>
                <div style={{ borderBottom: "1px solid #111", paddingBottom: 4, marginBottom: 4 }}>{inp(fields.state, set("state"), { full: true })}</div>
                <div style={{ fontSize: 12, color: "#444" }}>State</div>
              </div>
              <div>
                <div style={{ borderBottom: "1px solid #111", paddingBottom: 4, marginBottom: 4 }}>{inp(fields.zip, set("zip"), { full: true })}</div>
                <div style={{ fontSize: 12, color: "#444" }}>Zip Code</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ borderBottom: "1px solid #111", width: 160, paddingBottom: 4, marginBottom: 4 }}>{inp(fields.unit, set("unit"), { full: true })}</div>
            <div style={{ fontSize: 12, color: "#444" }}>Unit #</div>
          </div>
          <div style={{ marginBottom: 40 }}>
            <div style={{ borderBottom: "1px solid #111", width: 280, paddingBottom: 4, marginBottom: 4 }}>{inp(fields.phone, set("phone"), { full: true })}</div>
            <div style={{ fontSize: 12, color: "#444" }}>Telephone</div>
          </div>

          {/* Date line */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ borderBottom: "1px solid #111", display: "inline-block", minWidth: 140, paddingBottom: 4 }}>{inp(fields.dateMonth, set("dateMonth"), { wide: true })}</span>
            <span style={{ margin: "0 8px", fontSize: 14 }}>, 2</span>
            <span style={{ borderBottom: "1px solid #111", display: "inline-block", minWidth: 60, paddingBottom: 4 }}>{inp(fields.dateYear, set("dateYear"), { sm: true })}</span>
          </div>
          <div style={{ fontSize: 12, color: "#444" }}>Date</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   NOTICE OF DETERMINATION FORM
───────────────────────────────────────────────────────────────────────────── */
function NoticeOfDeterminationForm({ caseData, onClose }) {
  const today = new Date();
  const assoc = caseData?.associations || {};
  const report = caseData?.violation_reports || {};
  const rule = caseData?.rules || {};

  const [fields, setFields] = useState({
    toName: "",
    date: today.toLocaleDateString(),
    unit: report.violator_unit || "",
    complaintViolation: rule.rule_title || "",
    noticeDay: "",
    noticeMonth: "",
    noticeYear: today.getFullYear(),
    // Checkbox selections
    det1: false, det2: false, det3: false, det4: false,
    fine1a: "", fine1b: "",
    fine2a: "", fine2b: "",
    repairCost: "",
    byName: "",
    byTitle: "",
    assocName: assoc.name || "",
    assocAddress: assoc.address || "",
    assocCity: assoc.city || "",
    assocState: assoc.state || "IL",
    assocZip: assoc.zip || "",
  });
  const set = k => e => setFields(f => ({ ...f, [k]: typeof e === "object" && e.target ? e.target.value : e }));
  const tog = k => () => setFields(f => ({ ...f, [k]: !f[k] }));

  const inp = (val, onChange, opts = {}) => (
    <input value={val} onChange={onChange}
      style={{ border: "none", borderBottom: "1px solid #222", outline: "none", background: "transparent", fontSize: 14, color: "#111", fontFamily: "inherit", padding: "2px 4px", minWidth: opts.wide ? 240 : opts.sm ? 80 : opts.xs ? 60 : 160, width: opts.full ? "100%" : undefined }} />
  );

  const Chk = ({ checked, onToggle, children }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
      <div onClick={onToggle} style={{ width: 18, height: 18, border: "2px solid #111", marginTop: 2, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: checked ? "#111" : "transparent" }}>
        {checked && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.8, flex: 1 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "32px 16px" }}>
      <style>{PRINT_STYLES}</style>
      <div style={{ background: "#fff", width: "100%", maxWidth: 760, borderRadius: 4, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div className="vf-no-print" style={{ background: "#1a1a2e", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "4px 4px 0 0" }}>
          <span style={{ color: "#f87171", fontWeight: 700, fontSize: 14 }}>⚖ Notice of Determination by the Board</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => window.print()} style={{ background: "#6D28D9", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🖨 Print / Save PDF</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>✕ Close</button>
          </div>
        </div>

        <div className="vf-printable" style={{ padding: "48px 56px", fontFamily: "Georgia, serif", color: "#111", background: "#fff" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 36, borderBottom: "2px solid #111", paddingBottom: 20 }}>
            <div style={{ width: 80, height: 80, border: "2px solid #ccc", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "#999", textAlign: "center", lineHeight: 1.4 }}>Association Logo</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{inp(fields.assocName, set("assocName"), { wide: true })}</div>
              <div style={{ fontSize: 13, color: "#333" }}>{inp(fields.assocAddress, set("assocAddress"), { wide: true })} – {inp(fields.assocCity, set("assocCity"), { sm: true })}, {inp(fields.assocState, set("assocState"), { sm: true })} {inp(fields.assocZip, set("assocZip"), { sm: true })}</div>
            </div>
          </div>

          <h1 style={{ textAlign: "center", fontSize: 20, fontWeight: 900, letterSpacing: "0.04em", textDecoration: "underline", marginBottom: 32 }}>NOTICE OF DETERMINATION BY THE BOARD</h1>

          {/* To / Date */}
          <div style={{ display: "flex", gap: 32, marginBottom: 8 }}>
            <div>To: {inp(fields.toName, set("toName"), { wide: true })}</div>
            <div>Date: {inp(fields.date, set("date"), { wide: true })}</div>
          </div>
          <div style={{ marginLeft: 24, marginBottom: 20, fontSize: 14, lineHeight: 2 }}>
            <div>{inp(fields.assocAddress, set("assocAddress"), { wide: true })}</div>
            <div>Unit {inp(fields.unit, set("unit"), { sm: true })}</div>
            <div>{inp(fields.assocCity, set("assocCity"), { sm: true })}, {inp(fields.assocState, set("assocState"), { sm: true })} {inp(fields.assocZip, set("assocZip"), { sm: true })}</div>
          </div>

          <div style={{ marginBottom: 24, fontSize: 14 }}>
            Complaint/Violation: {inp(fields.complaintViolation, set("complaintViolation"), { full: true })}
          </div>

          <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 16 }}>
            On the {inp(fields.noticeDay, set("noticeDay"), { xs: true })} day of {inp(fields.noticeMonth, set("noticeMonth"), { sm: true })}, 2{inp(fields.noticeYear, set("noticeYear"), { xs: true })}, you were notified of a violation of the
            Declaration, By-Laws, or Rules and Regulations of the Association. If you requested, a copy of the
            Association rules regarding enforcement was provided for your use.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 28 }}>
            Pursuant to the Association rules, a hearing was held or waived by you regarding the above-noted complaint. The Board of Directors, after considering the complaint, has taken the following action(s):
          </p>

          {/* Checkboxes */}
          <div style={{ marginBottom: 28 }}>
            <Chk checked={fields.det1} onToggle={tog("det1")}>
              The Board has determined that a violation of the Association's Declaration, By-Laws, or
              Rules and Regulations has occurred. Accordingly, a fine of ${inp(fields.fine1a, set("fine1a"), { xs: true })}, plus ${inp(fields.fine1b, set("fine1b"), { xs: true })} for
              related costs has been assessed against your unit.
            </Chk>
            <Chk checked={fields.det2} onToggle={tog("det2")}>
              The Board has determined that a second or subsequent violation has occurred. Accordingly,
              a fine of ${inp(fields.fine2a, set("fine2a"), { xs: true })}, plus ${inp(fields.fine2b, set("fine2b"), { xs: true })} for related costs has been assessed against your unit.
            </Chk>
            <Chk checked={fields.det3} onToggle={tog("det3")}>
              The costs, determined by the Board, for correction of the violation or for repair of damage to
              common elements is ${inp(fields.repairCost, set("repairCost"), { sm: true })}, which will be assessed to your unit.
            </Chk>
            <Chk checked={fields.det4} onToggle={tog("det4")}>
              The Board has determined that no offense has been committed.
            </Chk>
          </div>

          {/* Signature block */}
          <div style={{ marginTop: 32 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>{fields.assocName || "Association Name"}</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>By:</span>
                <div style={{ borderBottom: "1px solid #111", flex: 1, minWidth: 260, paddingBottom: 4 }}>{inp(fields.byName, set("byName"), { full: true })}</div>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>Title:</span>
                <div style={{ borderBottom: "1px solid #111", flex: 1, minWidth: 260, paddingBottom: 4 }}>{inp(fields.byTitle, set("byTitle"), { full: true })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ASSOCIATIONS TAB
───────────────────────────────────────────────────────────────────────────── */
function AssociationsTab({assocs,companyId,onSave}) {
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const [f,setF]=useState({name:"",address:"",city:"",state:"",zip:"",hearing_days:"10",phone:"",email:""});
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const open=(a=null)=>{setEditing(a);setErr("");setF(a?{name:a.name||"",address:a.address||"",city:a.city||"",state:a.state||"",zip:a.zip||"",hearing_days:String(a.hearing_days||10),phone:a.phone||"",email:a.email||""}:{name:"",address:"",city:"",state:"",zip:"",hearing_days:"10",phone:"",email:""});setShowForm(true);};
  const save=async()=>{
    if(!f.name.trim()){setErr("Association name is required.");return;}
    setSaving(true);setErr("");
    try{
      const data={name:f.name,address:f.address,city:f.city,state:f.state,zip:f.zip,hearing_days:parseInt(f.hearing_days)||10,phone:f.phone,email:f.email,company_id:companyId||null};
      if(editing){await db(`associations?id=eq.${editing.id}`,{method:"PATCH",body:JSON.stringify(data)});}
      else{await db("associations",{method:"POST",body:JSON.stringify(data)});}
      setShowForm(false);onSave();
    }catch(e){setErr(e.message);}
    setSaving(false);
  };
  const del=async id=>{if(!window.confirm("Delete this association? This cannot be undone."))return;await db(`associations?id=eq.${id}`,{method:"DELETE"});onSave();};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text}}>Associations</h2>
        <VBtn onClick={()=>open()} style={{fontSize:13,padding:"9px 18px"}}>+ Add Association</VBtn>
      </div>
      {!assocs.length&&<GlassCard style={{padding:60,textAlign:"center"}} hover={false}><div style={{fontSize:32}}>🏢</div><div style={{fontWeight:600,color:T.muted2,marginTop:12}}>No associations yet</div><div style={{fontSize:13,color:T.muted,marginTop:6}}>Add your first HOA or Condo association to get started.</div></GlassCard>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        {assocs.map(a=>(
          <GlassCard key={a.id} style={{padding:22}} hover={false}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:15,fontWeight:700,color:T.text}}>{a.name}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:2}}>{[a.address,a.city,a.state,a.zip].filter(Boolean).join(", ")}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>open(a)} style={{background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:7,padding:"5px 10px",color:"#c4b5fd",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                <button onClick={()=>del(a.id)} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:7,padding:"5px 10px",color:"#f87171",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Hearing Window",`${a.hearing_days} days`],["Phone",a.phone||"—"],["Email",a.email||"—"],["ZIP",a.zip||"—"]].map(([l,v])=>(
                <div key={l} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 10px",border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:9,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:12,color:T.muted2}}>{v}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
      {showForm&&<Modal title={editing?"Edit Association":"Add New Association"} onClose={()=>setShowForm(false)} wide>
        {err&&<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:16,color:"#f87171",fontSize:13}}>⚠ {err}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <Fld label="Association Name" req><DarkInp value={f.name} onChange={set("name")} placeholder="e.g. Oakwood HOA"/></Fld>
          <Fld label="Hearing Window (days)" req><DarkSel value={f.hearing_days} onChange={set("hearing_days")}><option value="10">10 days</option><option value="11">11 days</option><option value="12">12 days</option><option value="13">13 days</option><option value="14">14 days</option></DarkSel></Fld>
          <Fld label="Street Address"><DarkInp value={f.address} onChange={set("address")} placeholder="123 Main St"/></Fld>
          <Fld label="City"><DarkInp value={f.city} onChange={set("city")} placeholder="Chicago"/></Fld>
          <Fld label="State"><DarkInp value={f.state} onChange={set("state")} placeholder="IL"/></Fld>
          <Fld label="ZIP Code"><DarkInp value={f.zip} onChange={set("zip")} placeholder="60601"/></Fld>
          <Fld label="Phone"><DarkInp value={f.phone} onChange={set("phone")} placeholder="(312) 555-0000"/></Fld>
          <Fld label="Email"><DarkInp type="email" value={f.email} onChange={set("email")} placeholder="manager@association.com"/></Fld>
        </div>
        <VBtn onClick={save} disabled={saving} style={{width:"100%",justifyContent:"center",padding:"13px",marginTop:8}}>{saving?"Saving...":editing?"Save Changes":"Add Association"}</VBtn>
      </Modal>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   OWNERS TAB
───────────────────────────────────────────────────────────────────────────── */
function OwnersTab({assocs,companyId,onSave}) {
  const [owners,setOwners]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const [search,setSearch]=useState("");
  const [filterAssoc,setFilterAssoc]=useState("");useEffect(()=>{if(!filterAssoc&&assocs.length)setFilterAssoc(assocs[0].id);},[assocs]);
  const [f,setF]=useState({association_id:"",unit_number:"",owner_name:"",email:"",phone:"",mailing_address:"",mailing_city:"",mailing_state:"",mailing_zip:""});
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  useEffect(()=>{db("unit_owners?select=*,associations(name)&order=unit_number.asc").then(d=>{setOwners(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  const reload=()=>db("unit_owners?select=*,associations(name)&order=unit_number.asc").then(d=>setOwners(Array.isArray(d)?d:[]));
  const open=(o=null)=>{setEditing(o);setErr("");setF(o?{association_id:o.association_id||"",unit_number:o.unit_number||"",owner_name:o.owner_name||"",email:o.email||"",phone:o.phone||"",mailing_address:o.mailing_address||"",mailing_city:o.mailing_city||"",mailing_state:o.mailing_state||"",mailing_zip:o.mailing_zip||""}:{association_id:assocs[0]?.id||"",unit_number:"",owner_name:"",email:"",phone:"",mailing_address:"",mailing_city:"",mailing_state:"",mailing_zip:""});setShowForm(true);};
  const save=async()=>{
    if(!f.unit_number.trim()||!f.owner_name.trim()||!f.association_id){setErr("Association, unit number and owner name are required.");return;}
    setSaving(true);setErr("");
    try{
      const data={association_id:f.association_id,unit_number:f.unit_number,owner_name:f.owner_name,email:f.email,phone:f.phone,mailing_address:f.mailing_address,mailing_city:f.mailing_city,mailing_state:f.mailing_state,mailing_zip:f.mailing_zip,company_id:companyId||null};
      if(editing){await db(`unit_owners?id=eq.${editing.id}`,{method:"PATCH",body:JSON.stringify(data)});}
      else{await db("unit_owners",{method:"POST",body:JSON.stringify(data)});}
      setShowForm(false);reload();onSave();
    }catch(e){setErr(e.message);}
    setSaving(false);
  };
  const del=async id=>{if(!window.confirm("Delete this owner record?"))return;await db(`unit_owners?id=eq.${id}`,{method:"DELETE"});reload();};
  const [csvAssocId,setCsvAssocId]=useState("");
  const [csvLoading,setCsvLoading]=useState(false);
  const [csvPreview,setCsvPreview]=useState(null);

  const downloadTemplate=()=>{
    const csv="unit_number,owner_name,email,phone,mailing_address,mailing_city,mailing_state,mailing_zip\n101,John Smith,john@email.com,312-555-0001,123 Main St,Chicago,IL,60601\n102,Jane Doe,jane@email.com,312-555-0002,456 Oak Ave,Chicago,IL,60602";
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="owners-template.csv";a.click();
  };

  const handleCSV=e=>{
    const file=e.target.files[0];if(!file)return;
    if(!csvAssocId){alert("Please select an association first.");e.target.value="";return;}
    const reader=new FileReader();
    reader.onload=ev=>{
      const lines=ev.target.result.split("\n").map(l=>l.trim()).filter(Boolean);
      const headers=lines[0].split(",").map(h=>h.trim().toLowerCase());
      const rows=lines.slice(1).map(line=>{
        const vals=line.split(",").map(v=>v.trim());
        const obj={};headers.forEach((h,i)=>obj[h]=vals[i]||"");
        return{association_id:csvAssocId,unit_number:obj.unit_number,owner_name:obj.owner_name,email:obj.email,phone:obj.phone,mailing_address:obj.mailing_address,mailing_city:obj.mailing_city,mailing_state:obj.mailing_state,mailing_zip:obj.mailing_zip};
      }).filter(r=>r.unit_number&&r.owner_name);
      setCsvPreview(rows);
    };
    reader.readAsText(file);
    e.target.value="";
  };

  const importCSV=async()=>{
    if(!csvPreview?.length)return;
    setCsvLoading(true);
    try{
      for(const row of csvPreview){await db("unit_owners",{method:"POST",body:JSON.stringify(row)});}
      alert(`Successfully imported ${csvPreview.length} owners!`);
      setCsvPreview(null);reload();onSave();
    }catch(e){alert("Import failed: "+e.message);}
    setCsvLoading(false);
  };

  const filtered=owners.filter(o=>{
    const matchSearch=!search||o.owner_name?.toLowerCase().includes(search.toLowerCase())||o.unit_number?.toLowerCase().includes(search.toLowerCase());
    const matchAssoc=!filterAssoc||o.association_id===filterAssoc;
    return matchSearch&&matchAssoc;
  });
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text}}>Unit Owners</h2>
        <div style={{display:"flex",gap:8}}>
          <VBtn variant="ghost" onClick={()=>open()} style={{fontSize:13,padding:"9px 18px"}}>+ Add Owner</VBtn>
        </div>
      </div>

      {/* CSV Import Box */}
      <GlassCard style={{padding:22,marginBottom:20,border:"1px solid rgba(245,158,11,0.25)"}} hover={false}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:38,height:38,background:"rgba(245,158,11,0.12)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📊</div>
          <div>
            <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:14,fontWeight:700,color:T.text}}>Bulk Import via CSV</div>
            <div style={{fontSize:12,color:T.muted}}>Upload a spreadsheet to add all owners at once</div>
          </div>
          <button onClick={downloadTemplate} style={{marginLeft:"auto",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,padding:"7px 14px",color:"#fbbf24",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Download Template</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end"}}>
          <Fld label="Select Association for import">
            <DarkSel value={csvAssocId} onChange={e=>setCsvAssocId(e.target.value)}>
              <option value="">Select association...</option>
              {assocs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </DarkSel>
          </Fld>
          <label style={{display:"inline-flex",alignItems:"center",gap:8,background:`linear-gradient(135deg,#d97706,#b45309)`,color:"#fff",padding:"12px 20px",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap"}}>
            📂 Upload CSV
            <input type="file" accept=".csv" onChange={handleCSV} style={{display:"none"}}/>
          </label>
        </div>
        {csvPreview&&(
          <div style={{marginTop:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700,color:"#34d399"}}>✓ Found {csvPreview.length} owners — review before importing:</div>
              <div style={{display:"flex",gap:8}}>
                <VBtn variant="success" onClick={importCSV} disabled={csvLoading} style={{fontSize:12,padding:"7px 14px"}}>{csvLoading?"Importing...":"Import All"}</VBtn>
                <VBtn variant="ghost" onClick={()=>setCsvPreview(null)} style={{fontSize:12,padding:"7px 14px"}}>Discard</VBtn>
              </div>
            </div>
            <div style={{maxHeight:200,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:10}}>
              <div style={{display:"grid",gridTemplateColumns:"80px 1.5fr 1.5fr 1fr",padding:"8px 14px",background:"rgba(255,255,255,0.03)",fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                <span>Unit</span><span>Name</span><span>Email</span><span>Phone</span>
              </div>
              {csvPreview.map((r,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"80px 1.5fr 1.5fr 1fr",padding:"9px 14px",borderTop:`1px solid ${T.border}`,fontSize:12,alignItems:"center"}}>
                  <span style={{fontWeight:700,color:T.violet}}>U{r.unit_number}</span>
                  <span style={{color:T.text}}>{r.owner_name}</span>
                  <span style={{color:T.muted}}>{r.email||"—"}</span>
                  <span style={{color:T.muted}}>{r.phone||"—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
      <div style={{display:"flex",gap:12,marginBottom:16}}>
        <DarkInp value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or unit..." style={{maxWidth:280}}/>
        <DarkSel value={filterAssoc} onChange={e=>setFilterAssoc(e.target.value)} style={{maxWidth:220,width:"auto"}}>
          <option value="">All Associations</option>
          {assocs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </DarkSel>
      </div>
      {loading?<div style={{textAlign:"center",padding:40,color:T.muted}}>Loading...</div>:
      !filtered.length?<GlassCard style={{padding:60,textAlign:"center"}} hover={false}><div style={{fontSize:32}}>👤</div><div style={{fontWeight:600,color:T.muted2,marginTop:12}}>{owners.length?"No results found":"No owners yet"}</div><div style={{fontSize:13,color:T.muted,marginTop:6}}>Add unit owners so they can be identified in violation reports.</div></GlassCard>:
      <GlassCard hover={false} style={{overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"80px 1.5fr 1.5fr 1fr 1fr 80px",padding:"10px 18px",background:"rgba(255,255,255,0.03)",borderBottom:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>
          <span>Unit</span><span>Owner Name</span><span>Association</span><span>Phone</span><span>Email</span><span>Actions</span>
        </div>
        {filtered.map(o=>(
          <div key={o.id} style={{display:"grid",gridTemplateColumns:"80px 1.5fr 1.5fr 1fr 1fr 80px",padding:"12px 18px",alignItems:"center",borderBottom:`1px solid ${T.border}`,transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{fontWeight:700,color:T.violet,fontSize:13}}>U{o.unit_number}</span>
            <span style={{fontSize:13,color:T.text,fontWeight:500}}>{o.owner_name}</span>
            <span style={{fontSize:12,color:T.muted}}>{o.associations?.name||"—"}</span>
            <span style={{fontSize:12,color:T.muted}}>{o.phone||"—"}</span>
            <span style={{fontSize:12,color:T.muted}}>{o.email||"—"}</span>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>open(o)} style={{background:"rgba(124,58,237,0.12)",border:"none",borderRadius:6,padding:"4px 8px",color:"#c4b5fd",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
              <button onClick={()=>del(o.id)} style={{background:"rgba(239,68,68,0.08)",border:"none",borderRadius:6,padding:"4px 8px",color:"#f87171",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Del</button>
            </div>
          </div>
        ))}
      </GlassCard>}
      {showForm&&<Modal title={editing?"Edit Owner":"Add Unit Owner"} onClose={()=>setShowForm(false)} wide>
        {err&&<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:16,color:"#f87171",fontSize:13}}>⚠ {err}</div>}
        <Fld label="Association" req><DarkSel value={f.association_id} onChange={set("association_id")}><option value="">Select association...</option>{assocs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</DarkSel></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <Fld label="Unit Number" req><DarkInp value={f.unit_number} onChange={set("unit_number")} placeholder="e.g. 305"/></Fld>
          <Fld label="Owner Full Name" req><DarkInp value={f.owner_name} onChange={set("owner_name")} placeholder="John Smith"/></Fld>
          <Fld label="Email"><DarkInp type="email" value={f.email} onChange={set("email")} placeholder="owner@email.com"/></Fld>
          <Fld label="Phone" req><DarkInp value={f.phone} onChange={set("phone")} placeholder="(312) 555-0000"/></Fld>
        </div>
        <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:12,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:"#fbbf24",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Mailing Address (for official notices)</div>
          <Fld label="Street Address"><DarkInp value={f.mailing_address} onChange={set("mailing_address")} placeholder="123 Main St"/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px",gap:"0 10px"}}>
            <Fld label="City"><DarkInp value={f.mailing_city} onChange={set("mailing_city")} placeholder="Chicago"/></Fld>
            <Fld label="State"><DarkInp value={f.mailing_state} onChange={set("mailing_state")} placeholder="IL"/></Fld>
            <Fld label="ZIP"><DarkInp value={f.mailing_zip} onChange={set("mailing_zip")} placeholder="60601"/></Fld>
          </div>
        </div>
        <VBtn onClick={save} disabled={saving} style={{width:"100%",justifyContent:"center",padding:"13px"}}>{saving?"Saving...":editing?"Save Changes":"Add Owner"}</VBtn>
      </Modal>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RULES TAB WITH AI PDF UPLOAD
───────────────────────────────────────────────────────────────────────────── */
function RulesTab({assocs,rules,companyId,onSave}) {
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const [filterAssoc,setFilterAssoc]=useState("");useEffect(()=>{if(!filterAssoc&&assocs.length)setFilterAssoc(assocs[0].id);},[assocs]);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiResult,setAiResult]=useState(null);
  const [aiAssocId,setAiAssocId]=useState("");
  const [importing,setImporting]=useState(false);
  const [f,setF]=useState({association_id:"",rule_title:"",rule_section:"",category:"General",description:"",fine_amount:"",active:true});
  const set=k=>e=>setF(p=>({...p,[k]:e.target.type==="checkbox"?e.target.checked:e.target.value}));
  const open=(r=null)=>{setEditing(r);setErr("");setF(r?{association_id:r.association_id||"",rule_title:r.rule_title||"",rule_section:r.rule_section||"",category:r.category||"General",description:r.description||"",fine_amount:String(r.fine_amount||""),active:r.active!==false}:{association_id:assocs[0]?.id||"",rule_title:"",rule_section:"",category:"General",description:"",fine_amount:"",active:true});setShowForm(true);};
  const save=async()=>{
    if(!f.rule_title.trim()||!f.association_id){setErr("Association and rule title are required.");return;}
    setSaving(true);setErr("");
    try{
      const data={association_id:f.association_id,rule_title:f.rule_title,rule_section:f.rule_section,category:f.category,description:f.description,fine_amount:parseFloat(f.fine_amount)||0,active:f.active,company_id:companyId||null};
      if(editing){await db(`rules?id=eq.${editing.id}`,{method:"PATCH",body:JSON.stringify(data)});}
      else{await db("rules",{method:"POST",body:JSON.stringify(data)});}
      setShowForm(false);onSave();
    }catch(e){setErr(e.message);}
    setSaving(false);
  };
  const del=async id=>{if(!window.confirm("Delete this rule?"))return;await db(`rules?id=eq.${id}`,{method:"DELETE"});onSave();};

  // AI PDF Upload
  const handlePDF=async e=>{
    const file=e.target.files[0];if(!file)return;
    if(!aiAssocId){alert("Please select an association first.");return;}
    setAiLoading(true);setAiResult(null);
    try{
      const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":"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","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:8000,
        messages:[{role:"user",content:[
          {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
          {type:"text",text:`You are extracting violation rules from an HOA/Condo Rules and Regulations document. Read the ENTIRE document and extract every rule that could result in a fine or violation. For EACH rule create one entry. Return a JSON array where each object has these exact keys: rule_title (short descriptive name max 60 chars), rule_section (the section/topic like Garage or Pets or Smoking), category (must be one of: Parking, Noise, Pets, Landscaping, Structural, Common Areas, Trash, Leasing, General), description (one sentence describing what is prohibited or required), fine_amount (number - use exact fine if stated in document, otherwise use 100). Extract at least 20 rules. Return ONLY a valid JSON array with no markdown formatting and no explanation text.`}
        ]}]
      })});
      const data=await resp.json();
      const text=data.content?.find(c=>c.type==="text")?.text||"[]";
      const clean=text.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setAiResult(parsed);
    }catch(e){alert("Could not extract rules. Make sure the PDF contains readable text. Error: "+e.message);}
    setAiLoading(false);
  };

  const importRules=async()=>{
    if(!aiResult?.length)return;
    setImporting(true);
    try{
      for(const r of aiResult){
        await db("rules",{method:"POST",body:JSON.stringify({association_id:aiAssocId,rule_title:r.rule_title,rule_section:r.rule_section||"",category:r.category||"General",description:r.description||"",fine_amount:parseFloat(r.fine_amount)||0,active:true,company_id:companyId||null})});
      }
      setAiResult(null);onSave();
      alert(`Successfully imported ${aiResult.length} rules!`);
    }catch(e){alert("Import failed: "+e.message);}
    setImporting(false);
  };

  const filtered=rules.filter(r=>!filterAssoc||r.association_id===filterAssoc);
  const CATS=["Parking","Noise","Pets","Landscaping","Structural","Common Areas","Trash","Leasing","General"];

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text}}>Rules Library</h2>
        <VBtn onClick={()=>open()} style={{fontSize:13,padding:"9px 18px"}}>+ Add Rule</VBtn>
      </div>

      {/* AI PDF Upload */}
      <GlassCard style={{padding:24,marginBottom:20,border:"1px solid rgba(124,58,237,0.3)"}} hover={false}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:40,height:40,background:"rgba(124,58,237,0.15)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div>
          <div>
            <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:15,fontWeight:700,color:T.text}}>AI Rules Extractor</div>
            <div style={{fontSize:12,color:T.muted}}>Upload your HOA/Condo rulebook PDF and AI will automatically extract all rules and fees</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end"}}>
          <Fld label="Select Association for these rules">
            <DarkSel value={aiAssocId} onChange={e=>setAiAssocId(e.target.value)}>
              <option value="">Select association...</option>
              {assocs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </DarkSel>
          </Fld>
          <div>
            <label style={{display:"inline-flex",alignItems:"center",gap:8,background:`linear-gradient(135deg,${T.violet},${T.indigo})`,color:"#fff",padding:"12px 20px",borderRadius:12,cursor:aiLoading?"not-allowed":"pointer",fontSize:13,fontWeight:600,opacity:aiLoading?0.6:1}}>
              {aiLoading?"🔄 Extracting rules...":"📄 Upload PDF Rulebook"}
              <input type="file" accept=".pdf" onChange={handlePDF} style={{display:"none"}} disabled={aiLoading}/>
            </label>
          </div>
        </div>

        {/* AI Results Preview */}
        {aiResult&&(
          <div style={{marginTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,color:"#34d399"}}>✓ Found {aiResult.length} rules — review before importing:</div>
              <div style={{display:"flex",gap:8}}>
                <VBtn variant="success" onClick={importRules} disabled={importing} style={{fontSize:12,padding:"8px 16px"}}>{importing?"Importing...":"Import All Rules"}</VBtn>
                <VBtn variant="ghost" onClick={()=>setAiResult(null)} style={{fontSize:12,padding:"8px 16px"}}>Discard</VBtn>
              </div>
            </div>
            <div style={{maxHeight:280,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:10}}>
              {aiResult.map((r,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 80px",padding:"10px 14px",borderBottom:`1px solid ${T.border}`,fontSize:12,alignItems:"center",background:"rgba(16,185,129,0.03)"}}>
                  <div><div style={{color:T.text,fontWeight:500}}>{r.rule_title}</div><div style={{color:T.muted,fontSize:11,marginTop:1}}>{r.description}</div></div>
                  <span style={{background:"rgba(124,58,237,0.12)",color:"#c4b5fd",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,display:"inline-block"}}>{r.category}</span>
                  <span style={{color:T.muted}}>§{r.rule_section}</span>
                  <span style={{color:T.gold,fontWeight:700}}>${r.fine_amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Filter */}
      <div style={{marginBottom:14}}>
        <DarkSel value={filterAssoc} onChange={e=>setFilterAssoc(e.target.value)} style={{maxWidth:260}}>
          <option value="">All Associations</option>
          {assocs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </DarkSel>
      </div>

      {/* Rules Table */}
      {!filtered.length?<GlassCard style={{padding:60,textAlign:"center"}} hover={false}><div style={{fontSize:32}}>📖</div><div style={{fontWeight:600,color:T.muted2,marginTop:12}}>No rules yet</div><div style={{fontSize:13,color:T.muted,marginTop:6}}>Add rules manually or upload your PDF rulebook above.</div></GlassCard>:
      <GlassCard hover={false} style={{overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 80px 70px 80px",padding:"10px 18px",background:"rgba(255,255,255,0.03)",borderBottom:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>
          <span>Rule</span><span>Association</span><span>Category</span><span>Section</span><span>Fine</span><span>Actions</span>
        </div>
        {filtered.map(r=>{const a=assocs.find(x=>x.id===r.association_id);return(
          <div key={r.id} style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 80px 70px 80px",padding:"12px 18px",alignItems:"center",borderBottom:`1px solid ${T.border}`,transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div><div style={{fontSize:13,fontWeight:500,color:T.muted2}}>{r.rule_title}</div>{r.description&&<div style={{fontSize:11,color:T.muted,marginTop:1}}>{r.description}</div>}</div>
            <span style={{fontSize:12,color:T.muted}}>{a?.name||"—"}</span>
            <span style={{background:"rgba(124,58,237,0.12)",color:"#c4b5fd",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{r.category}</span>
            <span style={{fontSize:12,color:T.muted}}>§{r.rule_section}</span>
            <span style={{fontSize:13,fontWeight:700,color:T.gold}}>${r.fine_amount}</span>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>open(r)} style={{background:"rgba(124,58,237,0.12)",border:"none",borderRadius:6,padding:"4px 8px",color:"#c4b5fd",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
              <button onClick={()=>del(r.id)} style={{background:"rgba(239,68,68,0.08)",border:"none",borderRadius:6,padding:"4px 8px",color:"#f87171",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Del</button>
            </div>
          </div>
        );})}
      </GlassCard>}

      {showForm&&<Modal title={editing?"Edit Rule":"Add New Rule"} onClose={()=>setShowForm(false)}>
        {err&&<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:16,color:"#f87171",fontSize:13}}>⚠ {err}</div>}
        <Fld label="Association" req><DarkSel value={f.association_id} onChange={set("association_id")}><option value="">Select...</option>{assocs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</DarkSel></Fld>
        <Fld label="Rule Title" req><DarkInp value={f.rule_title} onChange={set("rule_title")} placeholder="e.g. No Unauthorized Parking"/></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <Fld label="Rule Section"><DarkInp value={f.rule_section} onChange={set("rule_section")} placeholder="e.g. 4.2"/></Fld>
          <Fld label="Category"><DarkSel value={f.category} onChange={set("category")}>{CATS.map(c=><option key={c}>{c}</option>)}</DarkSel></Fld>
        </div>
        <Fld label="Description"><DarkTxt value={f.description} onChange={set("description")} placeholder="Describe the rule briefly..."/></Fld>
        <Fld label="Fine Amount ($)"><DarkInp type="number" value={f.fine_amount} onChange={set("fine_amount")} placeholder="e.g. 150"/></Fld>
        <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,cursor:"pointer"}}>
          <input type="checkbox" checked={f.active} onChange={set("active")} style={{accentColor:T.violet,width:16,height:16}}/>
          <span style={{fontSize:13,color:T.muted2}}>Rule is active (visible to reporters)</span>
        </label>
        <VBtn onClick={save} disabled={saving} style={{width:"100%",justifyContent:"center",padding:"13px"}}>{saving?"Saving...":editing?"Save Changes":"Add Rule"}</VBtn>
      </Modal>}
    </div>
  );
}

function Dashboard({onBack,session,onSignOut}) {
  const company=session?.company;const cid=company?.id;const cFilter=cid?`&company_id=eq.${cid}`:"";
  const cFilterOr=cid?`&or=(company_id.eq.${cid},company_id.is.null)`:"";
  const [tab,setTab]=useState("reports");const [reports,setReports]=useState([]);const [cases,setCases]=useState([]);const [assocs,setAssocs]=useState([]);const [rules,setRules]=useState([]);const [leads,setLeads]=useState([]);const [loading,setLoading]=useState(true);const [selCase,setSelCase]=useState(null);const [evts,setEvts]=useState([]);const [noticeData,setNoticeData]=useState(null);const [saving,setSaving]=useState(false);const [activeForm,setActiveForm]=useState(null);
  const load=async()=>{setLoading(true);const[r,c,a,ru,l]=await Promise.all([db(`violation_reports?select=*,rules(*),associations(*)&order=created_at.desc`),db(`violation_cases?select=*,violation_reports(*),rules(*),associations(*)&order=created_at.desc`),db(`associations?select=*&order=name.asc${cFilterOr}`),db(`rules?select=*&order=rule_title.asc${cFilterOr}`),db("leads?select=*&order=created_at.desc&limit=50").catch(()=>[])]);setReports(Array.isArray(r)?r:[]);setCases(Array.isArray(c)?c:[]);setAssocs(Array.isArray(a)?a:[]);setRules(Array.isArray(ru)?ru:[]);setLeads(Array.isArray(l)?l:[]);setLoading(false);};
  useEffect(()=>{load();},[]);
  const log=async(cid,type,desc)=>db("case_events",{method:"POST",body:JSON.stringify({case_id:cid,event_type:type,description:desc})});
  const openCase=async c=>{setSelCase(c);const e=await db(`case_events?case_id=eq.${c.id}&order=created_at.asc`);setEvts(Array.isArray(e)?e:[]);};
  const approve=async rep=>{setSaving(true);const a=assocs.find(x=>x.id===rep.association_id);const rule=rules.find(x=>x.id===rep.rule_id);const nd=new Date(),dl=new Date();dl.setDate(dl.getDate()+(a?.hearing_days||10));const[nc]=await db("violation_cases",{method:"POST",body:JSON.stringify({report_id:rep.id,association_id:rep.association_id,rule_id:rep.rule_id,fine_amount:rule?.fine_amount||0,status:"NOTICE_SENT",notice_date:nd.toISOString(),hearing_deadline:dl.toISOString(),finalized:false})});await log(nc.id,"REPORT_SUBMITTED",`Submitted by Unit ${rep.reporter_unit}`);await log(nc.id,"MANAGER_APPROVED","Manager reviewed and approved");await log(nc.id,"NOTICE_SENT",`Notice sent. Hearing deadline: ${dl.toLocaleDateString()}`);setNoticeData({assocName:a?.name,violatorUnit:rep.violator_unit,ruleTitle:rule?.rule_title,ruleSection:rule?.rule_section,fineAmount:rule?.fine_amount,description:rep.description,noticeDate:nd.toLocaleDateString(),deadline:dl.toLocaleDateString(),hearingDays:a?.hearing_days||10});await load();setSaving(false);};
  const reject=async id=>{if(!window.confirm("Reject and delete this report?"))return;setSaving(true);await db(`violation_reports?id=eq.${id}`,{method:"DELETE"});await load();setSaving(false);};
  const updateStatus=async(id,status)=>{setSaving(true);await db(`violation_cases?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({status,finalized:["FINAL_VIOLATION","CLOSED"].includes(status)})});await log(id,status,`Status: ${status.replace(/_/g," ")}`);await load();if(selCase?.id===id){setSelCase(p=>({...p,status}));const e=await db(`case_events?case_id=eq.${id}&order=created_at.asc`);setEvts(Array.isArray(e)?e:[]);}setSaving(false);};
  const pending=reports.filter(r=>!cases.find(c=>c.report_id===r.id));
  const stats={p:pending.length,a:cases.filter(c=>["NOTICE_SENT","UNDER_REVIEW","HEARING_REQUESTED"].includes(c.status)).length,f:cases.filter(c=>c.status==="FINAL_VIOLATION").length,cl:cases.filter(c=>c.status==="CLOSED").length};
  const CD=({dl})=>{if(!dl)return null;const d=Math.ceil((new Date(dl)-new Date())/86400000);if(d<0)return<span style={{color:"#f87171",fontSize:11,fontWeight:700}}>EXPIRED</span>;if(d<=2)return<span style={{color:T.gold,fontSize:11,fontWeight:700}}>{d}d ⚠</span>;return<span style={{color:T.muted,fontSize:11}}>{d}d</span>;};
  const TABS=[{id:"reports",icon:"📋",label:"New Reports",count:stats.p},{id:"cases",icon:"⚖️",label:"Cases",count:stats.a},{id:"forms",icon:"📄",label:"Legal Forms"},{id:"associations",icon:"🏢",label:"Associations"},{id:"owners",icon:"👤",label:"Owners"},{id:"rules",icon:"📖",label:"Rules"},{id:"leads",icon:"✉️",label:"Leads",count:leads.length},{id:"analytics",icon:"📊",label:"Analytics"},{id:"settings",icon:"⚙️",label:"Settings"}];
  const bars=[42,68,35,78,55,90,62,85,45,88,72,95];
  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:T.bg,minHeight:"100vh",color:T.text}}>
      <style>{STYLES}</style>
      <div style={{display:"flex",minHeight:"100vh"}}>
        <aside style={{width:240,background:T.bg2,display:"flex",flexDirection:"column",padding:"24px 0",flexShrink:0,borderRight:`1px solid ${T.border}`}}>
          <div style={{padding:"0 20px 24px",borderBottom:`1px solid ${T.border}`,cursor:"pointer",transition:"opacity 0.2s"}} onClick={onBack}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><ScaleLogo size={28} gold/><div><div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:18,fontWeight:800,color:T.text}}>Violation<span style={{color:"#a78bfa"}}>Flow</span></div><div style={{fontSize:10,color:T.muted,marginTop:1}}>Manager Portal</div></div></div>
          </div>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 20px",background:tab===t.id?"rgba(124,58,237,0.12)":"none",border:"none",borderLeft:`3px solid ${tab===t.id?T.violet:"transparent"}`,color:tab===t.id?T.text:T.muted,fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.15s"}}>
              <span>{t.icon}</span><span style={{flex:1}}>{t.label}</span>
              {t.count>0&&<span style={{background:T.violet,color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>{t.count}</span>}
            </button>
          ))}
          <div style={{flex:1}}/>
          <div style={{padding:"14px 20px",borderTop:`1px solid ${T.border}`}}>
            {/* Logged in user */}
            <div style={{background:"rgba(124,58,237,0.08)",border:`1px solid rgba(124,58,237,0.2)`,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
              {company&&<div style={{fontSize:11,fontWeight:700,color:"#a78bfa",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{company.name}</div>}
              <div style={{fontSize:9,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>Signed in as</div>
              <div style={{fontSize:12,color:"#c4b5fd",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{session?.user?.email||"Manager"}</div>
            </div>
            <button onClick={load} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,fontSize:12,padding:"8px",cursor:"pointer",width:"100%",fontFamily:"inherit",marginBottom:6}}>↻ Refresh</button>
            <button onClick={onSignOut} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:8,color:"#f87171",fontSize:12,padding:"8px",cursor:"pointer",width:"100%",fontFamily:"inherit"}}>Sign Out</button>
          </div>
        </aside>
        <main style={{flex:1,padding:32,overflowY:"auto"}}>
          {loading?<div style={{textAlign:"center",padding:80,color:T.muted}}>Loading...</div>:<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
            {[["Pending",stats.p,T.gold],["Active",stats.a,T.violet],["Final",stats.f,"#f87171"],["Closed",stats.cl,"#34d399"]].map(([l,v,c])=>(
              <GlassCard key={l} style={{padding:"20px 22px",borderLeft:`3px solid ${c}`}} hover={false}>
                <div style={{fontSize:32,fontFamily:"'Instrument Serif',Georgia,serif",fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>{l}</div>
              </GlassCard>
            ))}
          </div>

          {tab==="reports"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:18}}>New Reports — Awaiting Review</h2>
            {!pending.length?<GlassCard style={{padding:60,textAlign:"center"}} hover={false}><div style={{fontSize:40}}>✅</div><div style={{fontWeight:600,color:T.muted2,marginTop:12}}>All caught up</div></GlassCard>
            :pending.map(r=>{const a=assocs.find(x=>x.id===r.association_id);const ru=rules.find(x=>x.id===r.rule_id);return(
              <GlassCard key={r.id} style={{padding:24,marginBottom:14,borderLeft:`3px solid ${T.gold}`}} hover={false}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><div><div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:16,fontWeight:700,color:T.text}}>Unit {r.reporter_unit} → Unit {r.violator_unit}</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>{a?.name} · {new Date(r.created_at).toLocaleString()}</div></div><Bdg status="NEW_REPORT"/></div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>{[["Rule",ru?.rule_title||"—"],["Section",`§${ru?.rule_section||"—"}`],["Fine",`$${ru?.fine_amount||0}`],["Reporter",r.reporter_name],["Email",r.reporter_email],["Date",r.incident_date?new Date(r.incident_date).toLocaleDateString():"—"]].map(([l,v])=><div key={l} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 10px",border:`1px solid ${T.border}`}}><div style={{fontSize:9,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>{l}</div><div style={{fontSize:12,color:T.muted2,fontWeight:500}}>{v}</div></div>)}</div>
                {r.description&&<div style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:13,color:T.muted2,lineHeight:1.6,border:`1px solid ${T.border}`}}><b style={{color:T.text}}>Description:</b> {r.description}</div>}
                <div style={{display:"flex",gap:8}}><VBtn onClick={()=>approve(r)} disabled={saving} style={{fontSize:13,padding:"9px 18px"}}>✓ Approve & Send Notice</VBtn><VBtn variant="danger" onClick={()=>reject(r.id)} disabled={saving} style={{fontSize:13,padding:"9px 18px"}}>✕ Reject</VBtn></div>
              </GlassCard>
            );})}
          </div>}

          {tab==="cases"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:18}}>All Cases</h2>
            <GlassCard hover={false} style={{overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"70px 1.5fr 70px 1.5fr 70px 150px 80px 70px",padding:"11px 18px",background:"rgba(255,255,255,0.03)",borderBottom:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>
                <span>ID</span><span>Association</span><span>Unit</span><span>Rule</span><span>Fine</span><span>Status</span><span>Deadline</span><span>Date</span>
              </div>
              {!cases.length&&<div style={{padding:40,textAlign:"center",color:T.muted}}>No cases yet.</div>}
              {cases.map((c,i)=>(
                <div key={c.id} onClick={()=>openCase(c)} style={{display:"grid",gridTemplateColumns:"70px 1.5fr 70px 1.5fr 70px 150px 80px 70px",padding:"13px 18px",alignItems:"center",borderBottom:`1px solid ${T.border}`,cursor:"pointer",transition:"background 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(124,58,237,0.06)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:11,fontWeight:700,color:T.violet,fontFamily:"monospace"}}>#{c.id.slice(-4).toUpperCase()}</span>
                  <span style={{fontSize:12,color:T.muted2}}>{c.associations?.name||"—"}</span>
                  <span style={{fontSize:12,color:T.muted}}>U{c.violation_reports?.violator_unit||"—"}</span>
                  <span style={{fontSize:11,color:T.muted}}>{c.rules?.rule_title||"—"}</span>
                  <span style={{fontSize:13,fontWeight:700,color:T.gold}}>${c.fine_amount}</span>
                  <Bdg status={c.status}/>
                  <CD dl={c.hearing_deadline}/>
                  <span style={{fontSize:11,color:T.muted}}>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </GlassCard>
          </div>}

          {tab==="associations"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:18}}>Associations</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
              {assocs.map(a=>{const ac=cases.filter(c=>c.association_id===a.id).length;const ar=rules.filter(r=>r.association_id===a.id).length;return(
                <GlassCard key={a.id} style={{padding:22}}>
                  <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:3}}>{a.name}</div>
                  <div style={{fontSize:12,color:T.muted,marginBottom:14}}>{a.city&&a.state?`${a.city}, ${a.state}`:"Community"} · {a.hearing_days}-day hearing window</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["Cases",ac,T.violet],["Rules",ar,"#a78bfa"]].map(([l,v,c])=>(
                      <div key={l} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px",textAlign:"center",border:`1px solid ${T.border}`}}>
                        <div style={{fontSize:22,fontFamily:"'Instrument Serif',Georgia,serif",fontWeight:800,color:c}}>{v}</div>
                        <div style={{fontSize:10,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              );})}
            </div>
          </div>}

          {tab==="associations"&&<AssociationsTab assocs={assocs} companyId={cid} onSave={load}/>}
          {tab==="owners"&&<OwnersTab assocs={assocs} companyId={cid} onSave={load}/>}
          {tab==="rules"&&<RulesTab assocs={assocs} rules={rules} companyId={cid} onSave={load}/>}

          {tab==="leads"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:18}}>Captured Leads</h2>
            <GlassCard hover={false} style={{overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 2fr",padding:"11px 18px",background:"rgba(255,255,255,0.03)",borderBottom:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>
                <span>Email</span><span>Name</span><span>Company</span><span>Plan</span><span>Source</span><span>Date</span>
              </div>
              {!leads.length&&<div style={{padding:40,textAlign:"center",color:T.muted}}>No leads yet. They appear here when visitors submit the contact form or chat with the AI agent.</div>}
              {leads.map((l,i)=>(
                <div key={l.id||i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 2fr",padding:"12px 18px",alignItems:"center",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#c4b5fd"}}>{l.email||"—"}</span>
                  <span style={{fontSize:12,color:T.muted2}}>{l.name||"—"}</span>
                  <span style={{fontSize:12,color:T.muted}}>{l.company||"—"}</span>
                  <span style={{fontSize:11,color:T.muted}}>{l.plan||"—"}</span>
                  <span style={{background:"rgba(124,58,237,0.12)",color:"#c4b5fd",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{l.source||"web"}</span>
                  <span style={{fontSize:11,color:T.muted}}>{new Date(l.created_at).toLocaleString()}</span>
                </div>
              ))}
            </GlassCard>
          </div>}

          {tab==="forms"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:8}}>Legal Forms</h2>
            <div style={{fontSize:13,color:T.muted,marginBottom:24}}>Fill out and print official violation documents. All fields are editable before printing.</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
              {[
                {type:"violation",icon:"📋",title:"Notice of Violation",desc:"Notify a unit owner of a rule violation and their right to request a hearing.",color:T.gold},
                {type:"hearing",icon:"⚖️",title:"Request for Hearing",desc:"Form for a unit owner to contest a violation and request a formal board hearing.",color:"#f472b6"},
                {type:"determination",icon:"📜",title:"Notice of Determination",desc:"Board's final decision after a hearing — includes fine amounts and outcome.",color:"#f87171"},
              ].map(f=>(
                <div key={f.type} onClick={()=>setActiveForm({type:f.type,data:{associations:{},violation_reports:{},rules:{}}})}
                  style={{background:T.bg2,border:`1px solid ${T.border}`,borderTop:`3px solid ${f.color}`,borderRadius:12,padding:28,cursor:"pointer",transition:"all 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
                  onMouseLeave={e=>e.currentTarget.style.background=T.bg2}>
                  <div style={{fontSize:32,marginBottom:14}}>{f.icon}</div>
                  <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:8}}>{f.title}</div>
                  <div style={{fontSize:13,color:T.muted,lineHeight:1.6,marginBottom:20}}>{f.desc}</div>
                  <div style={{display:"inline-block",background:`rgba(${f.type==="violation"?"245,158,11":f.type==="hearing"?"244,114,182":"248,113,113"},0.12)`,color:f.color,border:`1px solid ${f.color}33`,borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:600}}>Open Form →</div>
                </div>
              ))}
            </div>
          </div>}
          {tab==="settings"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:24}}>Account Settings</h2>
            <GlassCard style={{padding:28,marginBottom:20}} hover={false}>
              <div style={{fontSize:13,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>Company Info</div>
              {[["Company Name",company?.name||"—"],["Contact Name",company?.contact_name||"—"],["Phone",company?.phone||"—"],["Status",company?.status||"—"],["Company ID",company?.id||"Not linked — contact support"],["Your Email",session?.user?.email||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",gap:16,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:13,color:T.muted,width:140,flexShrink:0}}>{l}</div>
                  <div style={{fontSize:13,color:T.text,fontWeight:500,fontFamily:l==="Company ID"?"monospace":"inherit",wordBreak:"break-all"}}>{v}</div>
                </div>
              ))}
            </GlassCard>
            <GlassCard style={{padding:28}} hover={false}>
              <div style={{fontSize:13,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Data Summary</div>
              {[["Associations",assocs.length],["Rules",rules.length],["Total Cases",cases.length]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:10,fontSize:13}}>
                  <span style={{color:T.muted}}>{l}</span>
                  <span style={{color:T.text,fontWeight:700}}>{v}</span>
                </div>
              ))}
            </GlassCard>
          </div>}
          {tab==="analytics"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:18}}>Analytics</h2>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
              <GlassCard style={{padding:24}} hover={false}>
                <div style={{fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Monthly Violation Volume</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:6,height:120,marginTop:16}}>
                  {bars.map((h,i)=><div key={i} style={{flex:1,background:`linear-gradient(to top,${T.violet},rgba(124,58,237,0.3))`,borderRadius:"4px 4px 0 0",height:`${h}%`,transition:`all 0.5s ${i*0.05}s`}}/>)}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m=><div key={m} style={{fontSize:9,color:T.muted,flex:1,textAlign:"center"}}>{m}</div>)}</div>
              </GlassCard>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {[["Resolution Rate","94%","#34d399"],["Avg. Case Duration","8.2 days","#60A5FA"],["Hearing Requests","12%","#f472b6"],["Fine Collection","89%",T.gold]].map(([l,v,c])=>(
                  <GlassCard key={l} style={{padding:"14px 18px"}} hover={false}>
                    <div style={{fontSize:11,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{l}</div>
                    <div style={{fontSize:24,fontFamily:"'Instrument Serif',Georgia,serif",fontWeight:800,color:c}}>{v}</div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>}
          </>}
        </main>
      </div>

      {selCase&&<Modal title={`Case #${selCase.id.slice(-4).toUpperCase()}`} onClose={()=>setSelCase(null)} wide>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[["Association",selCase.associations?.name],["Violator",`Unit ${selCase.violation_reports?.violator_unit}`],["Rule",selCase.rules?.rule_title],["Section",`§${selCase.rules?.rule_section}`],["Fine",`$${selCase.fine_amount}`],["Status",<Bdg status={selCase.status}/>],["Notice Date",selCase.notice_date?new Date(selCase.notice_date).toLocaleDateString():"—"],["Hearing Deadline",selCase.hearing_deadline?new Date(selCase.hearing_deadline).toLocaleDateString():"—"]].map(([l,v])=>(
            <div key={l} style={{background:T.glass,borderRadius:8,padding:"10px 12px",border:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>{l}</div><div style={{fontSize:13,color:T.muted2,fontWeight:500}}>{v}</div></div>
          ))}
        </div>
        <div style={{marginBottom:18}}><div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10}}>Case Timeline</div>{evts.length?<TL events={evts}/>:<div style={{color:T.muted,fontSize:13}}>No events yet.</div>}</div>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}><div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10}}>Actions</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {selCase.status==="NOTICE_SENT"&&<><VBtn variant="danger" onClick={()=>updateStatus(selCase.id,"FINAL_VIOLATION")} disabled={saving} style={{fontSize:13}}>Finalize Violation</VBtn><VBtn variant="ghost" onClick={()=>updateStatus(selCase.id,"HEARING_REQUESTED")} disabled={saving} style={{fontSize:13}}>Record Hearing Request</VBtn></>}
            {selCase.status==="HEARING_REQUESTED"&&<><VBtn variant="danger" onClick={()=>updateStatus(selCase.id,"FINAL_VIOLATION")} disabled={saving} style={{fontSize:13}}>Issue Final Violation</VBtn><VBtn variant="success" onClick={()=>updateStatus(selCase.id,"CLOSED")} disabled={saving} style={{fontSize:13}}>Close Case</VBtn></>}
            {selCase.status==="FINAL_VIOLATION"&&<VBtn variant="ghost" onClick={()=>updateStatus(selCase.id,"CLOSED")} disabled={saving} style={{fontSize:13}}>Close Case</VBtn>}
          </div>
          <div style={{borderTop:`1px solid ${T.border}`,marginTop:14,paddingTop:14}}><div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10}}>📄 Legal Forms</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <VBtn variant="ghost" onClick={()=>{setSelCase(null);setActiveForm({type:"violation",data:selCase});}} style={{fontSize:12,padding:"8px 14px"}}>📋 Notice of Violation</VBtn>
              <VBtn variant="ghost" onClick={()=>{setSelCase(null);setActiveForm({type:"hearing",data:selCase});}} style={{fontSize:12,padding:"8px 14px"}}>⚖️ Request for Hearing</VBtn>
              <VBtn variant="ghost" onClick={()=>{setSelCase(null);setActiveForm({type:"determination",data:selCase});}} style={{fontSize:12,padding:"8px 14px"}}>📜 Notice of Determination</VBtn>
            </div>
          </div>
        </div>
      </Modal>}
      {activeForm?.type==="violation"&&<NoticeOfViolationForm caseData={activeForm.data} onClose={()=>setActiveForm(null)}/>}
      {activeForm?.type==="hearing"&&<RequestForHearingForm caseData={activeForm.data} onClose={()=>setActiveForm(null)}/>}
      {activeForm?.type==="determination"&&<NoticeOfDeterminationForm caseData={activeForm.data} onClose={()=>setActiveForm(null)}/>}
      {noticeData&&<Modal title="Violation Notice Generated" onClose={()=>setNoticeData(null)} wide><NDoc d={noticeData}/><div style={{display:"flex",gap:10,marginTop:18}}><VBtn onClick={()=>{setNoticeData(null);setTab("cases");}} style={{flex:1,justifyContent:"center"}}>View in Cases</VBtn><VBtn variant="ghost" onClick={()=>setNoticeData(null)}>Close</VBtn></div></Modal>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LEGAL PAGES
───────────────────────────────────────────────────────────────────────────── */
function LegalPage({type,onClose}) {
  const year = new Date().getFullYear();
  const pages = {
    privacy: {
      title:"Privacy Policy",
      updated:"March 1, 2025",
      content:[
        {h:"1. Information We Collect",p:"We collect information you provide directly to us, including name, email address, company name, and any messages or reports submitted through our platform. We also collect usage data and technical information such as IP addresses, browser type, and pages visited."},
        {h:"2. How We Use Your Information",p:"We use the information we collect to provide, maintain, and improve our services; send you technical notices and support messages; respond to your comments and questions; and send you marketing communications (with your consent)."},
        {h:"3. Information Sharing",p:"We do not sell, trade, or rent your personal information to third parties. We may share your information with service providers who assist us in operating our platform, conducting our business, or servicing you, provided those parties agree to keep this information confidential."},
        {h:"4. HOA & Condo Violation Reports",p:"Violation reports submitted through our platform are shared with the relevant property manager and association board as part of the enforcement process. This is a fundamental part of the service and is disclosed to reporters at the time of submission."},
        {h:"5. Data Security",p:"We implement appropriate technical and organizational measures to protect your personal information against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access."},
        {h:"6. Data Retention",p:"We retain personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law."},
        {h:"7. Your Rights",p:"Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, or delete your data. Contact us at support@violationflow.com to exercise these rights."},
        {h:"8. Cookies",p:"We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent."},
        {h:"9. Changes to This Policy",p:"We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last Updated' date."},
        {h:"10. Contact Us",p:"If you have questions about this Privacy Policy, please contact us at support@violationflow.com or write to ViolationFlow, Inc., Attn: Privacy, Chicago, IL 60601."},
      ]
    },
    terms: {
      title:"Terms of Service",
      updated:"March 1, 2025",
      content:[
        {h:"1. Acceptance of Terms",p:"By accessing or using ViolationFlow, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service."},
        {h:"2. Description of Service",p:"ViolationFlow provides a software-as-a-service (SaaS) platform for HOA and Condominium Associations to manage violation reporting, notices, hearing workflows, and compliance documentation."},
        {h:"3. NOT Legal Advice",p:"ViolationFlow is a technology platform and does not provide legal advice. The platform helps associations implement their own rules and procedures. Associations should consult qualified legal counsel regarding their governing documents and applicable state laws."},
        {h:"4. User Accounts",p:"You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account."},
        {h:"5. Acceptable Use",p:"You agree not to use ViolationFlow to file false or frivolous violation reports, harass other community members, violate any applicable laws, or interfere with the platform's operation."},
        {h:"6. Subscription and Billing",p:"Paid subscriptions are billed monthly or annually in advance. Refunds are not provided for partial months. You may cancel your subscription at any time, effective at the end of your current billing period."},
        {h:"7. Data Ownership",p:"You retain ownership of all data you submit to ViolationFlow. By using the service, you grant ViolationFlow a license to process and store that data solely for the purpose of providing the service."},
        {h:"8. Limitation of Liability",p:"To the maximum extent permitted by law, ViolationFlow shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service."},
        {h:"9. Indemnification",p:"You agree to indemnify and hold harmless ViolationFlow and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the service or violation of these terms."},
        {h:"10. Governing Law",p:"These Terms shall be governed by the laws of the State of Illinois, without regard to its conflict of law provisions. Disputes shall be resolved in the courts of Cook County, Illinois."},
        {h:"11. Changes to Terms",p:"We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms. We will provide notice of material changes via email."},
        {h:"12. Contact",p:"For questions about these Terms, contact us at support@violationflow.com"},
      ]
    },
    disclaimer: {
      title:"Legal Disclaimer",
      updated:"March 1, 2025",
      content:[
        {h:"No Legal Advice",p:"ViolationFlow is a technology platform only. Nothing on this website or within the ViolationFlow platform constitutes legal advice. All information is provided for general informational purposes only."},
        {h:"No Attorney-Client Relationship",p:"Your use of ViolationFlow does not create an attorney-client relationship between you and ViolationFlow or any of its employees or contractors."},
        {h:"State Law Variation",p:"HOA and condominium laws vary significantly by state. The features and workflows in ViolationFlow are designed to support compliance with common due process principles, but associations must verify that their use of the platform complies with their specific state laws and governing documents."},
        {h:"Consult Legal Counsel",p:"Associations are strongly encouraged to have their governing documents and enforcement procedures reviewed by a qualified attorney licensed in their jurisdiction. ViolationFlow does not warrant that use of the platform will ensure legal compliance in any particular jurisdiction."},
        {h:"Accuracy of Information",p:"While we strive to keep information accurate and up to date, ViolationFlow makes no warranties regarding the completeness, accuracy, or suitability of any information provided through the platform."},
        {h:"Limitation of Liability",p:"ViolationFlow shall not be liable for any fines, penalties, legal fees, or other damages arising from an association's enforcement actions or failure to comply with applicable laws, even if facilitated through our platform."},
      ]
    }
  };
  const page = pages[type];
  return(
    <Modal title={page.title} sub={`Last Updated: ${page.updated}`} onClose={onClose} wide>
      <div style={{maxHeight:"60vh",overflowY:"auto",paddingRight:8}}>
        {page.content.map((s,i)=>(
          <div key={i} style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:6}}>{s.h}</div>
            <div style={{fontSize:13,color:T.muted,lineHeight:1.8}}>{s.p}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${T.border}`,textAlign:"center"}}>
        <p style={{fontSize:12,color:T.muted}}>Questions? Contact us at <a href="mailto:support@violationflow.com" style={{color:"#c4b5fd",textDecoration:"none"}}>support@violationflow.com</a></p>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FAQ ACCORDION
───────────────────────────────────────────────────────────────────────────── */
const FAQS = [
  {q:"Can residents submit anonymous violation reports?",a:"No. ViolationFlow requires all reporters to provide their full name, unit number, and contact information. This prevents frivolous or harassing reports and ensures accountability. Anonymous submissions are blocked by design."},
  {q:"What happens if a hearing is not requested?",a:"If the unit owner does not request a hearing within the configured window (10–14 days), the violation is automatically finalized. Both the manager and owner are notified and the fine is ready to apply to the account ledger."},
  {q:"Does ViolationFlow work in all US states?",a:"Yes — all 50 states. Hearing windows are fully configurable (10–14 days) to match your specific state's governing document requirements and applicable HOA or Condominium statutes."},
  {q:"What's the difference between the plans?",a:"Pay-Per-Violation is $9.99 per report with no subscription — ideal for individual owners. Starter is $79/month for self-managed HOAs up to 100 units. Professional 1 is $299/month for property managers handling multiple associations up to 500 units. Professional 2 is $499/month for larger portfolios up to 2,000 units. Enterprise is custom pricing for unlimited scale."},
  {q:"What is the Pay-Per-Violation plan?",a:"Pay-Per-Violation is $9.99 per violation report — no subscription required. It's designed for individual condo owners or homeowners who need to submit a violation report in their building instantly."},
  {q:"Can I manage multiple HOAs or Condo associations?",a:"Yes, with Professional 1, Professional 2, and Enterprise plans. You can manage unlimited associations from a single portfolio dashboard — perfect for property management companies."},
  {q:"Is my community's data secure?",a:"Yes. ViolationFlow uses encrypted data storage and secure access controls. Your community's data is never sold or shared with third parties."},
  {q:"What information does my association need to provide?",a:"To onboard, associations must provide: property name and full address, owner name and mailing address per unit (for official notice delivery), unit numbers, phone numbers per owner, and uploaded governing documents (bylaws, CC&Rs, rules). This information is required for legally defensible enforcement."},
  {q:"Why do you need mailing addresses and phone numbers?",a:"Some states require physical mail delivery for official violation notices to be legally enforceable. Phone numbers ensure your team can reach owners before hearing deadlines expire. Both are essential for a compliant enforcement process."},
  {q:"Is ViolationFlow legal advice?",a:"No. ViolationFlow is a technology platform only. Nothing on our website or within the platform constitutes legal advice. We strongly recommend that associations consult a qualified attorney licensed in their jurisdiction regarding their governing documents and applicable state law."},
  {q:"How long does setup take?",a:"Most associations are live in under 30 minutes. Our team helps you upload governing documents, configure your rules, set hearing windows, and import unit/owner data."},
];

function FAQAccordion() {
  const [open,setOpen] = useState(null);
  return (
    <div>
      {FAQS.map((f,i)=>(
        <div key={i} style={{marginBottom:10,border:`1px solid ${open===i?"#D1D5DB":"#E5E7EB"}`,borderRadius:14,overflow:"hidden",transition:"all 0.2s",background:open===i?"#F9FAFB":"#fff"}}>
          <button onClick={()=>setOpen(open===i?null:i)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",gap:12}}>
            <span style={{fontSize:14,fontWeight:600,color:"#111827",lineHeight:1.5}}>{f.q}</span>
            <span style={{flexShrink:0,width:22,height:22,borderRadius:"50%",background:open===i?"#F3F4F6":"#F9FAFB",border:`1px solid ${open===i?"#9CA3AF":"#E5E7EB"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#6B7280",transition:"all 0.2s",transform:open===i?"rotate(45deg)":"rotate(0deg)"}}>+</span>
          </button>
          {open===i&&(
            <div style={{padding:"0 20px 18px",fontSize:13,color:"#6B7280",lineHeight:1.85,borderTop:"1px solid #E5E7EB"}}>
              <div style={{paddingTop:14}}>{f.a}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
   PENDING / REJECTED SCREENS
───────────────────────────────────────────────────────────────────────────── */
/* ─── NAV SIGN-IN DROPDOWN ─────────────────────────────────────────────── */
function NavSignIn({goToLogin}) {
  const [open,setOpen]=useState(false);
  const ref=useRef();
  useEffect(()=>{
    const h=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);
  const items=[
    {icon:"🏠",label:"Self-Managed HOA Login",sub:"Board members & volunteers",action:goToLogin},
    {icon:"🏢",label:"Property Manager Login",sub:"Multi-association managers",action:goToLogin},
    {icon:"🔒",label:"Admin Login",sub:"ViolationFlow staff only",action:goToLogin},
  ];
  return(
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:6,background:open?"rgba(255,255,255,0.06)":"none",border:`1px solid ${open?"rgba(255,255,255,0.15)":T.border}`,borderRadius:9,padding:"8px 14px",fontSize:13,fontWeight:500,color:T.muted2,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}
        onMouseEnter={e=>{e.currentTarget.style.color=T.text;e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";}}
        onMouseLeave={e=>{if(!open){e.currentTarget.style.color=T.muted2;e.currentTarget.style.borderColor=T.border;}}}>
        Sign In <span style={{fontSize:10,marginLeft:2,opacity:0.7,transform:open?"rotate(180deg)":"rotate(0)",display:"inline-block",transition:"transform 0.2s"}}>▼</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#0D1117",border:`1px solid rgba(255,255,255,0.1)`,borderRadius:14,padding:8,minWidth:260,boxShadow:"0 20px 60px rgba(0,0,0,0.6)",zIndex:999}}>
          <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.1em",padding:"6px 12px 4px"}}>Sign in as</div>
          {items.map(item=>(
            <button key={item.label} onClick={()=>{setOpen(false);item.action();}}
              style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 12px",background:"none",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"background 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <span style={{fontSize:18,width:28,textAlign:"center"}}>{item.icon}</span>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:T.text}}>{item.label}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:1}}>{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingScreen({session,onSignOut}) {
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <style>{STYLES}</style>
      <div style={{textAlign:"center",maxWidth:480,padding:40}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(245,158,11,0.12)",border:"2px solid rgba(245,158,11,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 24px"}}>⏳</div>
        <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:28,fontWeight:800,color:T.text,marginBottom:12}}>Application Under Review</div>
        <div style={{color:T.muted,fontSize:15,lineHeight:1.7,marginBottom:8}}>Thank you for signing up for ViolationFlow. Your application is being reviewed by our team.</div>
        <div style={{color:T.muted,fontSize:14,marginBottom:32}}>You'll receive an email at <span style={{color:"#a78bfa"}}>{session?.user?.email}</span> once your account is approved — usually within 24 hours.</div>
        <GlassCard style={{padding:"14px 20px",marginBottom:20,textAlign:"left"}} hover={false}>
          <div style={{fontSize:12,color:T.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>What happens next</div>
          {["Our team reviews your application","You receive an approval email","Log in and set up your associations","Start managing violations"].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,fontSize:13,color:T.muted2}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#a78bfa",flexShrink:0}}>{i+1}</div>
              {s}
            </div>
          ))}
        </GlassCard>
        <div style={{fontSize:13,color:T.muted,marginBottom:20}}>Questions? Email us at <a href="mailto:support@violationflow.com" style={{color:"#a78bfa"}}>support@violationflow.com</a></div>
        <button onClick={onSignOut} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 24px",color:T.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
      </div>
    </div>
  );
}

function RejectedScreen({reason,onSignOut}) {
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <style>{STYLES}</style>
      <div style={{textAlign:"center",maxWidth:480,padding:40}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(239,68,68,0.1)",border:"2px solid rgba(239,68,68,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 24px"}}>✕</div>
        <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:28,fontWeight:800,color:T.text,marginBottom:12}}>Application Not Approved</div>
        <div style={{color:T.muted,fontSize:15,lineHeight:1.7,marginBottom:20}}>Unfortunately your application was not approved at this time.</div>
        {reason&&<GlassCard style={{padding:"14px 20px",marginBottom:20,textAlign:"left",border:"1px solid rgba(239,68,68,0.2)"}} hover={false}>
          <div style={{fontSize:11,color:"#f87171",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Reason</div>
          <div style={{fontSize:13,color:T.muted2}}>{reason}</div>
        </GlassCard>}
        <div style={{fontSize:13,color:T.muted,marginBottom:20}}>If you believe this is an error, contact us at <a href="mailto:support@violationflow.com" style={{color:"#a78bfa"}}>support@violationflow.com</a></div>
        <button onClick={onSignOut} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 24px",color:T.muted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DASHBOARD
───────────────────────────────────────────────────────────────────────────── */
function AdminDashboard({session,onSignOut,onBack}) {
  const [tab,setTab]=useState("approvals");
  const [companies,setCompanies]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(null);
  const [rejectModal,setRejectModal]=useState(null);
  const [rejectReason,setRejectReason]=useState("");
  const [approveModal,setApproveModal]=useState(null);
  const [approveFields,setApproveFields]=useState({plan:"starter",notes:""});

  const load=async()=>{
    setLoading(true);
    const data=await db("companies?select=*&order=created_at.desc").catch(()=>[]);
    setCompanies(Array.isArray(data)?data:[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const approve=async()=>{
    if(!approveModal)return;
    setSaving(approveModal.id);
    await db(`companies?id=eq.${approveModal.id}`,{method:"PATCH",body:JSON.stringify({status:"approved",plan:approveFields.plan,notes:approveFields.notes})});
    setApproveModal(null);setApproveFields({plan:"starter",notes:""});
    await load();setSaving(null);
  };

  const reject=async()=>{
    if(!rejectModal)return;
    setSaving(rejectModal);
    await db(`companies?id=eq.${rejectModal}`,{method:"PATCH",body:JSON.stringify({status:"rejected",rejected_reason:rejectReason})});
    setRejectModal(null);setRejectReason("");
    await load();setSaving(null);
  };

  const pending=companies.filter(c=>c.status==="pending"&&c.role!=="admin");
  const approved=companies.filter(c=>c.status==="approved"&&c.role!=="admin");
  const rejected=companies.filter(c=>c.status==="rejected");
  const TABS=[{id:"approvals",label:"Pending Approvals",icon:"⏳",count:pending.length},{id:"managers",label:"Active Managers",icon:"✅",count:approved.length},{id:"rejected",label:"Rejected",icon:"✕",count:rejected.length}];

  const CoCard=({c,showActions})=>(
    <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,padding:18,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:4}}>{c.name}</div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {[["Contact",c.contact_name],["Email",c.owner_email],["Phone",c.phone],["Signed up",new Date(c.created_at).toLocaleDateString()]].map(([l,v])=>v?(
              <div key={l} style={{fontSize:12,color:T.muted}}><span style={{color:T.muted,fontWeight:600}}>{l}:</span> <span style={{color:T.muted2}}>{v}</span></div>
            ):null)}
          </div>
          {c.rejected_reason&&<div style={{marginTop:8,fontSize:12,color:"#f87171"}}>Reason: {c.rejected_reason}</div>}
        </div>
        {showActions&&(
          <div style={{display:"flex",gap:8,marginLeft:16,flexShrink:0}}>
            <button onClick={()=>{setApproveModal(c);setApproveFields({plan:"starter",notes:""});}} style={{background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:9,padding:"8px 16px",color:"#34d399",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Approve</button>
            <button onClick={()=>{setRejectModal(c.id);setRejectReason("");}} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,padding:"8px 16px",color:"#f87171",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Reject</button>
          </div>
        )}
        {!showActions&&c.status==="approved"&&(
          <button onClick={()=>reject()&&setRejectModal(c.id)} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:9,padding:"6px 12px",color:"#f87171",fontSize:12,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>{setRejectModal(c.id);setRejectReason("");}}>Revoke</button>
        )}
      </div>
    </div>
  );

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:T.bg,minHeight:"100vh",color:T.text,display:"flex"}}>
      <style>{STYLES}</style>
      {/* Sidebar */}
      <aside style={{width:240,background:T.bg2,display:"flex",flexDirection:"column",padding:"24px 0",flexShrink:0,borderRight:`1px solid ${T.border}`}}>
        <div style={{padding:"0 20px 24px",borderBottom:`1px solid ${T.border}`,cursor:"pointer"}} onClick={onBack}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><ScaleLogo size={28} gold/><div><div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:18,fontWeight:800,color:T.text}}>Violation<span style={{color:"#a78bfa"}}>Flow</span></div><div style={{fontSize:10,color:"#f59e0b",marginTop:1,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Admin Panel</div></div></div>
        </div>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 20px",background:tab===t.id?"rgba(124,58,237,0.12)":"none",border:"none",borderLeft:`3px solid ${tab===t.id?T.violet:"transparent"}`,color:tab===t.id?T.text:T.muted,fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.15s"}}>
            <span>{t.icon}</span><span style={{flex:1}}>{t.label}</span>
            {t.count>0&&<span style={{background:t.id==="approvals"?"#f59e0b":T.violet,color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>{t.count}</span>}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${T.border}`}}>
          <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>Admin</div>
            <div style={{fontSize:12,color:"#fbbf24",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{session?.user?.email}</div>
          </div>
          <button onClick={load} style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,fontSize:12,padding:"8px",cursor:"pointer",width:"100%",fontFamily:"inherit",marginBottom:6}}>↻ Refresh</button>
          <button onClick={onSignOut} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:8,color:"#f87171",fontSize:12,padding:"8px",cursor:"pointer",width:"100%",fontFamily:"inherit"}}>Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,padding:32,overflowY:"auto"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:28}}>
          {[["Pending",pending.length,"#f59e0b"],["Active Managers",approved.length,"#34d399"],["Rejected",rejected.length,"#f87171"]].map(([l,v,c])=>(
            <GlassCard key={l} style={{padding:"20px 24px"}} hover={false}>
              <div style={{fontSize:32,fontFamily:"'Instrument Serif',Georgia,serif",fontWeight:800,color:c,marginBottom:4}}>{v}</div>
              <div style={{fontSize:11,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>{l}</div>
            </GlassCard>
          ))}
        </div>

        {loading?<div style={{textAlign:"center",padding:60,color:T.muted}}>Loading...</div>:<>
          {tab==="approvals"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,marginBottom:16}}>Pending Approvals</h2>
            {!pending.length?<GlassCard style={{padding:60,textAlign:"center"}} hover={false}><div style={{fontSize:32}}>✅</div><div style={{fontWeight:600,color:T.muted2,marginTop:12}}>No pending applications</div></GlassCard>:
            pending.map(c=><CoCard key={c.id} c={c} showActions/>)}
          </div>}

          {tab==="managers"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,marginBottom:16}}>Active Managers</h2>
            {!approved.length?<GlassCard style={{padding:60,textAlign:"center"}} hover={false}><div style={{fontSize:32}}>👤</div><div style={{fontWeight:600,color:T.muted2,marginTop:12}}>No approved managers yet</div></GlassCard>:
            approved.map(c=><CoCard key={c.id} c={c} showActions={false}/>)}
          </div>}

          {tab==="rejected"&&<div>
            <h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:20,fontWeight:700,marginBottom:16}}>Rejected Applications</h2>
            {!rejected.length?<GlassCard style={{padding:60,textAlign:"center"}} hover={false}><div style={{fontSize:32}}>📋</div><div style={{fontWeight:600,color:T.muted2,marginTop:12}}>No rejected applications</div></GlassCard>:
            rejected.map(c=><CoCard key={c.id} c={c} showActions={false}/>)}
          </div>}
        </>}
      </main>

      {approveModal&&<Modal title="Approve Manager Account" onClose={()=>setApproveModal(null)}>
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:4}}>{approveModal.name}</div>
          <div style={{fontSize:13,color:T.muted}}>{approveModal.owner_email} · {approveModal.contact_name}</div>
        </div>
        <div style={{background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:13,color:"#34d399"}}>
          ✓ Company ID will be: <span style={{fontFamily:"monospace",fontWeight:700}}>{approveModal.id}</span>
        </div>
        <Fld label="Subscription Plan">
          <DarkSel value={approveFields.plan} onChange={e=>setApproveFields(f=>({...f,plan:e.target.value}))}>
            <option value="on_demand">On Demand — $9.99/report</option>
            <option value="starter">Starter — $79/mo (up to 100 units)</option>
            <option value="professional1">Professional 1 — $299/mo (up to 500 units)</option>
            <option value="professional2">Professional 2 — $499/mo (up to 2,000 units)</option>
            <option value="enterprise">Enterprise — Custom</option>
          </DarkSel>
        </Fld>
        <Fld label="Internal Notes (optional)">
          <DarkTxt value={approveFields.notes} onChange={e=>setApproveFields(f=>({...f,notes:e.target.value}))} placeholder="e.g. Referred by John, 30-day trial..."/>
        </Fld>
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <VBtn onClick={approve} disabled={!!saving} style={{flex:1,justifyContent:"center"}}>{saving?"Approving...":"✓ Approve & Activate"}</VBtn>
          <VBtn variant="ghost" onClick={()=>setApproveModal(null)}>Cancel</VBtn>
        </div>
      </Modal>}
      {rejectModal&&<Modal title="Reject Application" onClose={()=>setRejectModal(null)}>
        <Fld label="Reason for rejection (will be shown to applicant)">
          <DarkTxt value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="e.g. Unable to verify business information. Please contact support@violationflow.com"/>
        </Fld>
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <VBtn variant="danger" onClick={reject} disabled={saving} style={{flex:1,justifyContent:"center"}}>{saving?"Rejecting...":"Confirm Rejection"}</VBtn>
          <VBtn variant="ghost" onClick={()=>setRejectModal(null)} style={{flex:1,justifyContent:"center"}}>Cancel</VBtn>
        </div>
      </Modal>}
    </div>
  );
}

export default function App() {
  const [view,setView] = useState("home");
  const [modal,setModal] = useState(null);
  const [annual,setAnnual] = useState(false);
  const [activeFeature,setActiveFeature] = useState(0);
  const [session,setSession] = useState(null);
  const [sessionChecked,setSessionChecked] = useState(false);
  const [buildingSearch, setBuildingSearch] = useState("");

  // On mount — check if a valid saved session exists
  useEffect(()=>{
    const saved = loadSession();
    if(saved?.access_token){
      authGetUser(saved.access_token)
        .then(u=>{
          if(u){setSession(saved);}
          else{clearSession();}
        })
        .catch(()=>clearSession())
        .finally(()=>setSessionChecked(true));
    } else {
      clearSession();
      setSessionChecked(true);
    }
  },[]);

  const handleSignOut=async()=>{
    if(session?.access_token){await authSignOut(session.access_token).catch(()=>{});}
    clearSession();setSession(null);setView("home");
  };

  const goToLogin=()=>{
    clearSession();setSession(null);setView("login");
  };

  if(view==="resident") return <><ResidentForm onBack={()=>setView("home")}/><AIAgent/></>;
  if(view==="login") return <ManagerLogin onBack={()=>setView("home")} onSuccess={s=>{setSession(s);saveSession(s);setView("manager");}}/>;
  if(view==="manager"){
    if(!session||!session.access_token) return <ManagerLogin onBack={()=>setView("home")} onSuccess={s=>{setSession(s);saveSession(s);setView("manager");}}/>;
    const co=session?.company;
    // Admin gets admin dashboard
    if(co?.role==="admin") return <AdminDashboard session={session} onSignOut={handleSignOut} onBack={()=>setView("home")}/>;
    // Pending approval
    if(!co||co?.status==="pending") return <PendingScreen session={session} onSignOut={handleSignOut}/>;
    // Rejected
    if(co?.status==="rejected") return <RejectedScreen reason={co?.rejected_reason} onSignOut={handleSignOut}/>;
    // Approved manager
    return <Dashboard onBack={()=>setView("home")} session={session} onSignOut={handleSignOut}/>;
  }

  const year = new Date().getFullYear();
  const features = [
    {icon:"⚡",title:"One-Click Enforcement",desc:"Automatically generate violation notices and cure timelines based on association rules."},
    {icon:"📋",title:"Rule-Based Reporting",desc:"Residents select the exact rule violated from governing documents."},
    {icon:"⏱",title:"Hearing Deadline Automation",desc:"Track hearing request windows automatically."},
    {icon:"📊",title:"Powerful Analytics",desc:"Identify patterns, repeat violations, and enforcement bottlenecks."},
    {icon:"🛡",title:"Due Process Protection",desc:"Full timestamped audit trail for every case."},
    {icon:"⚖️",title:"Consistent Enforcement Tracking",desc:"Ensure violations are enforced consistently across the community."},
  ];

  const mockBuildings = [
    "Jefferson Court Condominium",
    "Brandon Shores Condominium", 
    "Buck City Lofts",
    "Lincoln Commons HOA",
    "Maple Park Condominiums",
  ];
  const filteredBuildings = buildingSearch.length >= 2
    ? mockBuildings.filter(b => b.toLowerCase().includes(buildingSearch.toLowerCase()))
    : [];

  const pricingPlans = [
    {
      name: "Pay-Per-Violation",
      tag: "FOR OWNERS",
      price: "$9.99",
      per: "per report",
      color: "#111827",
      bg: "#F9FAFB",
      border: "#E5E7EB",
      desc: "No subscription needed. Submit a violation report in your building — instantly.",
      features: ["Submit violation report","Select exact rule violated","Automated violation report","Email delivery to management","Case tracking dashboard"],
      cta: "Submit Evidence",
      ctaStyle: {background:"#111827",color:"#fff",border:"none"},
      ctaFn: ()=>setView("resident"),
    },
    {
      name: "Starter",
      tag: "SELF-MANAGED HOA",
      price: "$79",
      per: "/month",
      color: "#065F46",
      bg: "#F9FAFB",
      border: "#6EE7B7",
      desc: "For small self-managed associations. Everything you need to run enforcement properly.",
      features: ["Violation reporting portal","Rule database upload","Notice generator","Hearing deadline tracking","Compliance history","Up to 100 units"],
      cta: "Get Started",
      ctaStyle: {background:"#111827",color:"#fff",border:"none"},
      ctaHover: "#047857",
      ctaFn: ()=>setModal("contact"),
    },
    {
      name: "Professional 1",
      tag: "PROPERTY MANAGERS",
      price: "$299",
      per: "/month",
      color: "#1E3A8A",
      bg: "#F9FAFB",
      border: "#93C5FD",
      desc: "For property management companies managing multiple associations.",
      features: ["Unlimited associations","Portfolio dashboard","Multi-property tracking","Automated notices","Compliance reports","API integration","Priority support","Up to 500 units"],
      cta: "Get Started",
      ctaStyle: {background:"#111827",color:"#fff",border:"none"},
      ctaHover: "#1E3A8A",
      ctaFn: ()=>setModal("contact"),
    },
    {
      name: "Professional 2",
      tag: "PROPERTY MANAGERS",
      price: "$499",
      per: "/month",
      color: "#4C1D95",
      bg: "#F5F3FF",
      border: "#7C3AED",
      desc: "For larger portfolios needing more capacity and advanced reporting.",
      features: ["Everything in Professional 1","Up to 2,000 units","Advanced analytics","Custom workflows","Dedicated account rep"],
      cta: "Get Started",
      ctaStyle: {background:"#6D28D9",color:"#fff",border:"none"},
      ctaHover: "#4C1D95",
      ctaFn: ()=>setModal("contact"),
      highlight: true,
    },
    {
      name: "Enterprise",
      tag: "LARGE FIRMS",
      price: "Custom",
      per: "pricing",
      color: "#111827",
      bg: "#F9FAFB",
      border: "#E5E7EB",
      desc: "For large management firms with unlimited scale and custom requirements.",
      features: ["Everything in Professional 2","Unlimited units","AI violation detection","Automated workflows","Custom branding","Legal compliance templates","Dedicated onboarding"],
      cta: "Contact Us",
      ctaStyle: {background:"#111827",color:"#fff",border:"none"},
      ctaHover: "#000000",
      ctaFn: ()=>setModal("contact"),
    },
  ];

  return (
    <div style={{background:"#fff",color:"#111827",fontFamily:"'Inter',system-ui,sans-serif",overflowX:"hidden"}}>
      <style>{STYLES}</style>

      {/* ── NAV ── */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:300,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #E5E7EB",height:64}}>
        <div style={{maxWidth:1200,margin:"0 auto",height:"100%",display:"flex",alignItems:"center",padding:"0 32px",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginRight:40,cursor:"pointer",flexShrink:0}} onClick={()=>setView("home")}>
            <ScaleLogo size={24}/>
            <span style={{fontFamily:"'Georgia',serif",fontSize:17,fontWeight:700,color:"#111827",letterSpacing:"-0.01em"}}>ViolationFlow</span>
          </div>
          <div style={{display:"flex",gap:0,flex:1}}>
            {[{l:"Features",h:"#features"},{l:"How It Works",h:"#how-it-works"},{l:"Pricing",h:"#pricing"},{l:"FAQ",h:"#faq"}].map(({l,h})=>(
              <a key={l} href={h} style={{padding:"8px 14px",fontSize:14,fontWeight:500,color:"#6B7280",textDecoration:"none",transition:"color 0.15s"}}
                onMouseEnter={e=>e.target.style.color="#111827"} onMouseLeave={e=>e.target.style.color="#6B7280"}>{l}</a>
            ))}
          </div>
          <NavSignIn goToLogin={goToLogin}/>
          <button onClick={()=>setView("resident")}
            style={{display:"flex",alignItems:"center",gap:6,background:"#111827",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginLeft:8,transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="#000000";}}
            onMouseLeave={e=>{e.currentTarget.style.background="#111827";}}>
            🚨 Submit Evidence
          </button>
          <button onClick={()=>setModal("contact")}
            style={{display:"flex",alignItems:"center",gap:6,background:"#fff",color:"#111827",border:"1.5px solid #D1D5DB",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginLeft:6,transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="#F9FAFB";e.currentTarget.style.borderColor="#9CA3AF";}}
            onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor="#D1D5DB";}}>
            Get Started Free
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{paddingTop:120,paddingBottom:80,background:"linear-gradient(180deg,#F8FAFC 0%,#ffffff 100%)",borderBottom:"1px solid #E5E7EB"}}>
        <div style={{maxWidth:900,margin:"0 auto",padding:"0 32px",textAlign:"center"}}>
          <div style={{display:"inline-flex",alignItems:"center",background:"#111827",border:"1px solid #111827",borderRadius:99,padding:"6px 18px",fontSize:15,fontWeight:600,color:"#fff",marginBottom:24,letterSpacing:"0.01em"}}>
            HOA &amp; Condominium Enforcement Platform
          </div>
          <h1 style={{fontFamily:"'Georgia',serif",fontSize:"clamp(36px,5.5vw,68px)",fontWeight:700,lineHeight:1.1,color:"#111827",marginBottom:20,letterSpacing:"-0.02em"}}>
            Report and Enforce House Rule Violations in Minutes.
          </h1>
          <p style={{fontSize:"clamp(15px,1.6vw,18px)",color:"#6B7280",maxWidth:580,margin:"0 auto 36px",lineHeight:1.75}}>
            ViolationFlow helps condominium associations and property managers document violations, generate notices, manage hearings, and track compliance — all in one platform.
          </p>
          <div style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",flexWrap:"wrap",marginBottom:16}}>
            <button onClick={()=>setView("resident")}
              style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,background:"#111827",color:"#fff",border:"1.5px solid #111827",borderRadius:8,padding:"11px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",height:44,minWidth:220,transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="#000";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#111827";}}>
              🚨 Submit Evidence of a Violation
            </button>
            <button onClick={()=>{document.getElementById("for-managers")?.scrollIntoView({behavior:"smooth"});}}
              style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,background:"#fff",color:"#111827",border:"1.5px solid #D1D5DB",borderRadius:8,padding:"11px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",height:44,minWidth:220,transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#9CA3AF";e.currentTarget.style.background="#F9FAFB";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#D1D5DB";e.currentTarget.style.background="#fff";}}>
              🏢 For Boards &amp; Property Managers
            </button>
          </div>
        </div>
      </section>

      {/* ── FIND YOUR BUILDING ── */}
      <section style={{padding:"64px 32px",background:"#fff",borderBottom:"1px solid #E5E7EB"}}>
        <div style={{maxWidth:640,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#374151",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Report a Violation</div>
          <h2 style={{fontFamily:"'Georgia',serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:700,color:"#111827",marginBottom:12,letterSpacing:"-0.02em"}}>Find Your Building</h2>
          <p style={{color:"#6B7280",fontSize:15,marginBottom:32,lineHeight:1.7}}>Search for your association to submit a violation report.</p>
          <div style={{position:"relative",maxWidth:480,margin:"0 auto 24px"}}>
            <input
              value={buildingSearch}
              onChange={e=>setBuildingSearch(e.target.value)}
              placeholder="Enter first 3 letters of association name..."
              style={{width:"100%",padding:"14px 20px",fontSize:15,border:"1.5px solid #D1D5DB",borderRadius:10,outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#111827",background:"#fff",transition:"border 0.2s"}}
              onFocus={e=>e.target.style.borderColor="#111827"}
              onBlur={e=>e.target.style.borderColor="#D1D5DB"}
            />
          </div>
          {filteredBuildings.length > 0 && (
            <div style={{background:"#fff",border:"1.5px solid #E5E7EB",borderRadius:10,overflow:"hidden",maxWidth:480,margin:"0 auto 24px",boxShadow:"0 4px 16px rgba(0,0,0,0.06)",textAlign:"left"}}>
              {filteredBuildings.map(b=>(
                <div key={b}
                  style={{padding:"12px 20px",fontSize:14,color:"#374151",borderBottom:"1px solid #F3F4F6",cursor:"pointer",transition:"background 0.15s",display:"flex",alignItems:"center",gap:10}}
                  onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}
                  onClick={()=>setView("resident")}>
                  <span style={{color:"#111827",fontSize:16}}>🏢</span> {b}
                </div>
              ))}
            </div>
          )}
          {buildingSearch.length >= 3 && filteredBuildings.length === 0 && (
            <div style={{background:"#FFF7ED",border:"1.5px solid #FED7AA",borderRadius:12,padding:"28px 32px",maxWidth:480,margin:"0 auto",textAlign:"left"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#92400E",marginBottom:8}}>Your association is not yet using ViolationFlow.</div>
              <div style={{fontSize:14,color:"#78350F",lineHeight:1.75,marginBottom:20}}>
                We encourage you to bring ViolationFlow to your association board — it automates enforcement for the entire community.<br/><br/>
                In the meantime, you can still register and report your violation directly using the link below.
              </div>
              <button onClick={()=>setView("resident")}
                style={{background:"#111827",color:"#fff",border:"none",borderRadius:8,padding:"12px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",width:"100%"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#000000";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#111827";}}>
                🚨 Register &amp; Report a Violation — $9.99
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section style={{background:"#F9FAFB",borderBottom:"1px solid #E5E7EB",padding:"24px 32px"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"center",alignItems:"center",gap:0,flexWrap:"wrap"}}>
          {[["1,572+","Communities Served"],["98%","Satisfaction Rate"],["90%","Faster Enforcement"],["24/7","AI Support"]].map(([v,l],i)=>(
            <div key={l} style={{textAlign:"center",padding:"12px 48px",borderRight:i<3?"1px solid #E5E7EB":"none",flex:"0 0 auto"}}>
              <div style={{fontFamily:"'Georgia',serif",fontSize:28,fontWeight:700,color:"#111827",lineHeight:1}}>{v}</div>
              <div style={{fontSize:12,color:"#9CA3AF",marginTop:4,letterSpacing:"0.03em",textTransform:"uppercase"}}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{padding:"80px 32px",background:"#F8FAFC",borderBottom:"1px solid #E5E7EB"}}>
        <div style={{maxWidth:1000,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <div style={{fontSize:11,fontWeight:700,color:"#111827",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>How It Works</div>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:700,color:"#111827",marginBottom:12,letterSpacing:"-0.02em"}}>Four steps. Fully enforced.</h2>
            <p style={{color:"#6B7280",fontSize:15,maxWidth:480,margin:"0 auto",lineHeight:1.7}}>From violation report to tracked enforcement — in minutes.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
            {[
              {n:"1",icon:"📸",title:"Report a Violation",desc:"Describe the violation and select the rule broken. Submitted instantly.",color:"#D97706",bg:"#FFFBEB",border:"#FDE68A"},
              {n:"2",icon:"🔍",title:"Management Reviews",desc:"Board or management verifies the report and takes action.",color:"#111827",bg:"#F9FAFB",border:"#E5E7EB"},
              {n:"3",icon:"📋",title:"Notice Generated",desc:"ViolationFlow prepares the official violation notice automatically.",color:"#111827",bg:"#F9FAFB",border:"#E5E7EB"},
              {n:"4",icon:"⚖️",title:"Enforcement Tracked",desc:"Hearings, fines, and compliance are tracked automatically to resolution.",color:"#7C3AED",bg:"#F5F3FF",border:"#DDD6FE"},
            ].map((s,i)=>(
              <div key={s.n} style={{background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:14,padding:"28px 22px",textAlign:"center",transition:"all 0.25s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.08)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 16px",boxShadow:`0 0 0 3px ${s.border}`}}>{s.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:s.color,letterSpacing:"0.08em",marginBottom:8}}>STEP {s.n}</div>
                <div style={{fontFamily:"'Georgia',serif",fontSize:16,fontWeight:700,color:"#111827",marginBottom:8}}>{s.title}</div>
                <div style={{fontSize:13,color:"#6B7280",lineHeight:1.7}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR BOARDS & MANAGERS ── */}
      <section id="for-managers" style={{padding:"80px 32px",background:"#fff",borderBottom:"1px solid #E5E7EB"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#111827",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>For Boards &amp; Property Managers</div>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:"clamp(26px,3.5vw,44px)",fontWeight:700,color:"#111827",lineHeight:1.15,marginBottom:16,letterSpacing:"-0.02em"}}>Stop Managing Violations in Email.</h2>
            <p style={{color:"#6B7280",fontSize:15,lineHeight:1.8,marginBottom:28}}>ViolationFlow automates your entire enforcement workflow — from the first report to the final hearing determination. Accepting violation reports by phone or email is not compliant with proper HOA enforcement procedures. Informal reporting creates inconsistent records, exposes the association to legal liability, and undermines due process. Every report must be documented, timestamped, and traceable.</p>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:36}}>
              {["Violation reports & notices","Evidence storage & audit trail","Notice generation & delivery","Hearing scheduling","Board determinations","Fine tracking & compliance history"].map(f=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:10,fontSize:14,color:"#374151"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#DBEAFE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:10,color:"#111827",fontWeight:700}}>✓</span>
                  </div>
                  {f}
                </div>
              ))}
            </div>
            <button onClick={()=>setModal("contact")}
              style={{display:"inline-flex",alignItems:"center",gap:8,background:"#111827",color:"#fff",border:"none",borderRadius:10,padding:"13px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(29,78,216,0.3)",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="#000000";e.currentTarget.style.transform="translateY(-1px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#111827";e.currentTarget.style.transform="translateY(0)";}}>
              🏢 Start Using ViolationFlow
            </button>
          </div>
          {/* Dashboard stats mockup */}
          <div style={{background:"#111827",borderRadius:16,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <div style={{background:"#1F2937",padding:"12px 16px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:"#EF4444"}}/>
              <div style={{width:10,height:10,borderRadius:"50%",background:"#F59E0B"}}/>
              <div style={{width:10,height:10,borderRadius:"50%",background:"#10B981"}}/>
              <div style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:4,padding:"4px 12px",fontSize:11,color:"rgba(255,255,255,0.4)",textAlign:"center",marginLeft:8}}>app.violationflow.com/dashboard</div>
            </div>
            <div style={{padding:24}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                {[["ACTIVE VIOLATIONS","17","#F59E0B"],["HEARINGS PENDING","4","#60A5FA"],["FINES OUTSTANDING","$1,200","#F87171"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"16px 14px",border:"1px solid rgba(255,255,255,0.07)"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:"0.08em",marginBottom:8}}>{l}</div>
                    <div style={{fontFamily:"'Georgia',serif",fontSize:24,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              {[["Unapproved structural change","Unit 4B","#F59E0B","Notice Sent"],["Parking violation — repeated","Unit 12A","#EF4444","Final"],["Noise complaint","Unit 7C","#10B981","Resolved"]].map(([t,u,c,s])=>(
                <div key={t} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"12px 14px",marginBottom:8,border:"1px solid rgba(255,255,255,0.05)"}}>
                  <div style={{width:32,height:32,borderRadius:8,background:"rgba(109,40,217,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>⚖️</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#F9FAFB"}}>{t}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{u}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:c,background:`${c}18`,padding:"3px 10px",borderRadius:99,border:`1px solid ${c}33`}}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{padding:"80px 32px",background:"#F8FAFC",borderBottom:"1px solid #E5E7EB"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <div style={{fontSize:11,fontWeight:700,color:"#111827",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Platform Features</div>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:700,color:"#111827",marginBottom:12,letterSpacing:"-0.02em"}}>Built for HOA enforcement.</h2>
            <p style={{color:"#6B7280",fontSize:15,maxWidth:440,margin:"0 auto",lineHeight:1.7}}>Purpose-built for associations and property managers — not bolted onto generic software.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {features.map((f,i)=>(
              <div key={f.title} style={{background:"#fff",border:"1.5px solid #E5E7EB",borderRadius:14,padding:"28px 24px",transition:"all 0.25s",cursor:"default"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#E5E7EB";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.06)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E7EB";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
                <div style={{width:44,height:44,background:"#F9FAFB",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:14}}>{f.icon}</div>
                <div style={{fontFamily:"'Georgia',serif",fontSize:16,fontWeight:700,color:"#111827",marginBottom:8}}>{f.title}</div>
                <div style={{fontSize:13,color:"#6B7280",lineHeight:1.7}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{padding:"80px 32px",background:"#fff",borderBottom:"1px solid #E5E7EB"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:52}}>
            <div style={{fontSize:11,fontWeight:700,color:"#111827",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Pricing</div>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:700,color:"#111827",marginBottom:12,letterSpacing:"-0.02em"}}>Simple, honest pricing.</h2>
            <p style={{color:"#6B7280",fontSize:15}}>No setup fees. No long-term contracts. Cancel anytime.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
            {pricingPlans.map(p=>(
              <div key={p.name} style={{background:p.bg,border:`1.5px solid ${p.border}`,borderRadius:14,padding:"28px 20px",display:"flex",flexDirection:"column",transition:"all 0.25s",position:"relative",...(p.highlight?{boxShadow:`0 0 0 2px ${p.border}`}:{})}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.12)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=p.highlight?`0 0 0 2px ${p.border}`:"none";}}>
                <div style={{fontSize:9,fontWeight:800,color:p.color,letterSpacing:"0.1em",marginBottom:16,opacity:0.7}}>{p.tag}</div>
                <div style={{fontFamily:"'Georgia',serif",fontSize:16,fontWeight:700,color:"#111827",marginBottom:12}}>{p.name}</div>
                <div style={{marginBottom:4}}>
                  <span style={{fontFamily:"'Georgia',serif",fontSize:p.price==="Custom"?26:36,fontWeight:700,color:p.color,lineHeight:1}}>{p.price}</span>
                  <span style={{fontSize:12,color:"#9CA3AF",marginLeft:3}}>{p.per}</span>
                </div>
                <div style={{fontSize:12,color:"#6B7280",marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${p.border}`}}>{p.desc}</div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                  {p.features.map(f=>(
                    <div key={f} style={{display:"flex",gap:8,fontSize:12,color:"#374151",alignItems:"flex-start"}}>
                      <span style={{color:p.color,fontWeight:700,flexShrink:0,marginTop:1}}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={p.ctaFn}
                  style={{width:"100%",padding:"11px",borderRadius:8,fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",letterSpacing:"0.01em",...p.ctaStyle}}
                  onMouseEnter={e=>{e.currentTarget.style.background=p.ctaHover||"#000";e.currentTarget.style.transform="translateY(-1px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background=p.ctaStyle.background;e.currentTarget.style.transform="translateY(0)";}}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEGAL PROTECTION ── */}
      <section style={{padding:"80px 32px",background:"#F8FAFC",borderBottom:"1px solid #E5E7EB"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:64,alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#111827",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Legal Protection</div>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:"clamp(24px,3vw,38px)",fontWeight:700,color:"#111827",lineHeight:1.2,marginBottom:16,letterSpacing:"-0.02em"}}>Built for HOA Enforcement Procedures.</h2>
            <p style={{color:"#6B7280",fontSize:15,lineHeight:1.8,marginBottom:24}}>Fair and consistent rule enforcement is a legal requirement. ViolationFlow supports every step of the process with a documented audit trail.</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {["Violation notices","Hearing requests","Board determinations","Enforcement documentation","Due process protection","Immutable audit trail"].map(f=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:10,fontSize:14,color:"#374151"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:10,color:"#111827",fontWeight:700}}>✓</span>
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div style={{background:"#fff",border:"1.5px solid #E5E7EB",borderRadius:16,padding:32,boxShadow:"0 4px 24px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:32,marginBottom:16}}>⚖️</div>
            <div style={{fontFamily:"'Georgia',serif",fontSize:18,fontWeight:700,color:"#111827",marginBottom:12}}>HOA Enforcement Operating System</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[["Violation Reporting","Document and submit violation reports"],["Notice Generation","Automated, rule-specific notices"],["Hearing Scheduling","Deadline-tracked automatically"],["Board Decisions","Recorded and documented"],["Fine Management","Tracked to resolution"],["Compliance History","Full audit trail, always"]].map(([t,d])=>(
                <div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F3F4F6"}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#111827"}}>{t}</span>
                  <span style={{fontSize:12,color:"#6B7280"}}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{padding:"80px 32px",background:"#fff",borderBottom:"1px solid #E5E7EB"}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:52}}>
            <div style={{fontSize:11,fontWeight:700,color:"#111827",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>FAQ</div>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:700,color:"#111827",marginBottom:12,letterSpacing:"-0.02em"}}>Questions? Answers.</h2>
            <p style={{color:"#6B7280",fontSize:15}}>Can't find yours? Email <a href="mailto:support@violationflow.com" style={{color:"#111827",textDecoration:"none"}}>support@violationflow.com</a></p>
          </div>
          <FAQAccordion/>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{padding:"80px 32px",background:"#111827",textAlign:"center"}}>
        <div style={{maxWidth:640,margin:"0 auto"}}>
          <h2 style={{fontFamily:"'Georgia',serif",fontSize:"clamp(26px,3.5vw,44px)",fontWeight:700,color:"#fff",marginBottom:16,letterSpacing:"-0.02em"}}>Enforce HOA Rules the Right Way.</h2>
          <p style={{color:"#9CA3AF",fontSize:15,marginBottom:36,lineHeight:1.7}}>Join thousands of communities using ViolationFlow to document, enforce, and track rule violations.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={()=>setView("resident")}
              style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,background:"#fff",color:"#111827",border:"1.5px solid #fff",borderRadius:8,padding:"11px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",height:44,minWidth:220,transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="#F3F4F6";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#fff";}}>
              🚨 Submit Evidence of a Violation
            </button>
            <button onClick={()=>setModal("contact")}
              style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,background:"transparent",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"11px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",height:44,minWidth:220,transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.6)";e.currentTarget.style.background="rgba(255,255,255,0.05)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.3)";e.currentTarget.style.background="transparent";}}>
              🏢 Start Using ViolationFlow
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:"#1F2937",borderTop:"1px solid rgba(255,255,255,0.07)",padding:"56px 32px 32px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:48,marginBottom:48}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                <ScaleLogo size={22} gold/>
                <span style={{fontFamily:"'Georgia',serif",fontSize:16,fontWeight:700,color:"#fff"}}>ViolationFlow</span>
              </div>
              <p style={{color:"#9CA3AF",fontSize:13,lineHeight:1.8,maxWidth:280}}>HOA and condo violation enforcement platform. Document, enforce, and track rule violations in one place.</p>
              <div style={{marginTop:16,fontSize:13,color:"#6B7280"}}>support@violationflow.com</div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:"0.08em",marginBottom:16,textTransform:"uppercase"}}>Product</div>
              {["Features","How It Works","Pricing","FAQ"].map(l=>(
                <div key={l} style={{marginBottom:10}}><a href={`#${l.toLowerCase().replace(/ /g,"-")}`} style={{fontSize:13,color:"#6B7280",textDecoration:"none"}} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="#6B7280"}>{l}</a></div>
              ))}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:"0.08em",marginBottom:16,textTransform:"uppercase"}}>For</div>
              {["Condo Owners","HOA Boards","Property Managers","Large Firms"].map(l=>(
                <div key={l} style={{marginBottom:10,fontSize:13,color:"#6B7280"}}>{l}</div>
              ))}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:"0.08em",marginBottom:16,textTransform:"uppercase"}}>Legal</div>
              {[["Privacy Policy","privacy"],["Terms of Service","terms"],["Disclaimer","disclaimer"]].map(([l,t])=>(
                <div key={l} style={{marginBottom:10}}><button onClick={()=>setModal(t)} style={{background:"none",border:"none",fontSize:13,color:"#6B7280",cursor:"pointer",fontFamily:"inherit",padding:0}} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="#6B7280"}>{l}</button></div>
              ))}
            </div>
          </div>
          <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:24,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{fontSize:12,color:"#6B7280"}}>© {new Date().getFullYear()} ViolationFlow. All rights reserved. Governing law: State of Illinois.</div>
            <div style={{fontSize:11,color:"rgba(100,116,139,0.5)",maxWidth:500,textAlign:"right"}}>ViolationFlow is a technology platform and does not provide legal advice. Consult a qualified attorney for legal matters.</div>
          </div>
        </div>
      </footer>

      {/* ── MODALS ── */}
      {modal==="contact"&&<Modal title="Request a Free Demo" sub="Tell us about your community and we'll set up a personalized walkthrough." onClose={()=>setModal(null)}><ContactForm onDone={()=>setModal(null)}/></Modal>}
      {(modal==="privacy"||modal==="terms"||modal==="disclaimer")&&<LegalPage type={modal} onClose={()=>setModal(null)}/>}

      {/* ── AI AGENT ── */}
      <AIAgent/>
    </div>
  );
}
