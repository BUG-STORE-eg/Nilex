const SUPABASE_URL="https://loqwcsxdqgasgokfmswi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_vkNXRSYz-hz_PxJCXGwdhg__0-Jmlsx";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let user=null,profile=null,folder="inbox",messages=[];

const SERVICES=[
  "تطوير البرامج والمواقع","التصميم والهوية","الدعم التقني",
  "الاستضافة وإدارة المواقع","خدمات الألعاب","السوشيال والمحتوى","خدمة أخرى / استفسار"
];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const uname=p=>p?.display_name||p?.username||p?.email||"مستخدم";
const visibleEmail=p=>p?.email?.replace("@nilex.local","@nilex")||"";
const err=(id,t="")=>{$(id).textContent=t;$(id).style.display=t?"block":"none"};
function screen(id){["loginScreen","registerScreen","mailScreen"].forEach(x=>$(x).style.display=x===id?(x==="mailScreen"?"block":"flex"):"none")}

function normalizeLoginEmail(v){
  v=v.trim().toLowerCase();
  if(v.endsWith("@nilex")) return v.replace("@nilex","@nilex.local");
  if(v.endsWith("@nilex.local")) return v;
  if(v.includes("@")) return v;
  return v+"@nilex.local";
}

async function login(){
  err("loginError");
  const v=$("loginUsername").value,pass=$("loginPassword").value;
  if(!v.trim()||!pass)return err("loginError","اكتب اسم المستخدم وكلمة المرور.");
  const em=normalizeLoginEmail(v);
  const b=$("loginBtn");b.disabled=true;b.textContent="جاري الدخول...";
  try{
    const r=await db.auth.signInWithPassword({email:em,password:pass});
    if(r.error||!r.data.user)return err("loginError","اسم المستخدم أو كلمة المرور غلط.");
    user=r.data.user;
    await loadProfile();
    if(!profile){await db.auth.signOut();return err("loginError","بيانات الحساب غير موجودة.")}
    screen("mailScreen");await init();
    const pending=sessionStorage.getItem("nilex_pending_service");if(pending){sessionStorage.removeItem("nilex_pending_service");if(profile.role!=="admin")compose(pending)}
  }catch(e){console.error(e);err("loginError","حصل خطأ أثناء تسجيل الدخول.")}
  finally{b.disabled=false;b.textContent="تسجيل الدخول"}
}

function updateEmailPreview(){
  const u=$("registerUsername").value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"");
  if($("registerUsername").value!==u)$("registerUsername").value=u;
  $("registerEmailPreview").value=u?u+"@nilex":"@nilex";
}

async function register(){
  err("registerError");
  const u=$("registerUsername").value.trim().toLowerCase();
  const d=u;
  const p=$("registerPassword").value;
  if(!/^[a-z0-9._-]{3,30}$/.test(u))return err("registerError","اسم المستخدم يجب أن يكون 3-30 حرفًا بالإنجليزية والأرقام و . _ - فقط.");
  if(p.length<6)return err("registerError","كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
  const em=u+"@nilex.local";
  const b=$("registerBtn");b.disabled=true;b.textContent="جاري إنشاء الحساب...";
  try{
    const r=await db.auth.signUp({email:em,password:p});
    if(r.error){
      const msg=(r.error.message||"").toLowerCase();
      if(msg.includes("rate limit")||msg.includes("email rate limit")) return err("registerError","Supabase أوقف إنشاء الحسابات مؤقتًا بسبب كثرة المحاولات. انتظر قليلًا قبل إنشاء حساب جديد.");
      if(msg.includes("invalid")&&msg.includes("email")) return err("registerError","حصل خطأ في عنوان البريد الداخلي. لا تكتب @nilex.local بنفسك؛ الموقع ينشئه تلقائيًا.");
      if(msg.includes("already registered")||msg.includes("already been registered")) return err("registerError","اسم المستخدم ده مستخدم بالفعل.");
      return err("registerError",r.error.message);
    }
    if(!r.data.user)return err("registerError","تعذر إنشاء الحساب.");
    if(!r.data.session)return err("registerError","الحساب اتعمل، لكن تأكيد البريد الإلكتروني مفعّل في Supabase. عطّله من Authentication ثم جرّب تسجيل الدخول.");
    const q=await db.from("profiles").insert({id:r.data.user.id,username:u,email:em,display_name:d,role:"user"});
    if(q.error){console.error(q.error);return err("registerError","الحساب اتعمل لكن تعذر إنشاء بيانات الحساب.");}
    user=r.data.user;await loadProfile();screen("mailScreen");await init();const pending=sessionStorage.getItem("nilex_pending_service");if(pending){sessionStorage.removeItem("nilex_pending_service");if(profile.role!=="admin")compose(pending)}
  }catch(e){console.error(e);err("registerError","حصل خطأ أثناء إنشاء الحساب.")}
  finally{b.disabled=false;b.textContent="إنشاء الحساب"}
}

async function loadProfile(){
  if(!user){profile=null;return null}
  const r=await db.from("profiles").select("id,username,email,display_name,role").eq("id",user.id).maybeSingle();
  if(r.data){profile=r.data;return profile}
  if((user.email||"").toLowerCase()==="admin@nilex.local"){
    profile={id:user.id,username:"admin",email:"admin@nilex.local",display_name:"NILEX Admin",role:"admin"};
    return profile;
  }
  console.error(r.error||"Profile not found");profile=null;return null;
}

async function admin(){
  const r=await db.from("profiles").select("id,username,email,display_name,role").eq("role","admin").limit(1).maybeSingle();
  return r.data;
}
async function recipient(v){
  v=v.trim().toLowerCase();if(!v)return null;
  if(v.endsWith("@nilex"))v=v.replace("@nilex","@nilex.local");
  let r=v.includes("@")
    ?await db.from("profiles").select("id,username,email,display_name,role").eq("email",v).maybeSingle()
    :await db.from("profiles").select("id,username,email,display_name,role").eq("username",v).maybeSingle();
  return r.data;
}

const select=`id,sender_id,receiver_id,subject,body,is_read,created_at,sender:profiles!messages_sender_id_fkey(id,username,email,display_name),receiver:profiles!messages_receiver_id_fkey(id,username,email,display_name)`;
async function load(){
  let q=db.from("messages").select(select).order("created_at",{ascending:false});
  q=folder==="inbox"?q.eq("receiver_id",user.id):q.eq("sender_id",user.id);
  const r=await q;
  if(r.error){console.error(r.error);$("messagesList").innerHTML='<div class="empty">حصل خطأ أثناء تحميل الرسائل.</div>';return}
  messages=r.data||[];render();count();
}
function render(){
  if(!messages.length){$("messagesList").innerHTML='<div class="empty">مفيش رسائل هنا.</div>';return}
  $("messagesList").innerHTML=messages.map(m=>{
    const p=folder==="inbox"?m.sender:m.receiver;
    return `<button class="row" data-id="${m.id}"><div class="avatar">${esc(uname(p)[0])}</div><div class="rowbody"><div class="rowtop"><strong>${esc(uname(p))}</strong><span class="muted">${new Date(m.created_at).toLocaleString("ar-EG")}</span></div><div class="muted">${esc(visibleEmail(p))}</div><b>${esc(m.subject||"بدون عنوان")}</b><div class="preview">${esc(m.body)}</div></div></button>`;
  }).join("");
  document.querySelectorAll(".row").forEach(x=>x.onclick=()=>open(+x.dataset.id));
}
async function open(id){
  const m=messages.find(x=>+x.id===id);if(!m)return;
  if(folder==="inbox"&&!m.is_read){await db.from("messages").update({is_read:true}).eq("id",id);m.is_read=true}
  $("listView").style.display="none";$('composeView').style.display="none";$('messageView').style.display="block";
  $("messageContent").innerHTML=`<div><button class="mini" onclick="back()">→ رجوع</button><div class="message-head"><h2>${esc(m.subject||"بدون عنوان")}</h2><div class="muted">${esc(uname(m.sender))} — ${esc(visibleEmail(m.sender))}</div></div><div class="message-body">${esc(m.body).replace(/\n/g,"<br>")}</div></div>`;
  count();
}
function back(){["messageView","composeView"].forEach(x=>$(x).style.display="none");$("listView").style.display="block"}
async function count(){
  const r=await db.from("messages").select("id",{count:"exact",head:true}).eq("receiver_id",user.id).eq("is_read",false);
  const n=r.count||0;$("inboxCount").textContent=n;$("inboxCount").style.display=n?"inline":"none";
}

function compose(service=""){
  $("listView").style.display="none";$("messageView").style.display="none";$("composeView").style.display="block";
  const isAdmin=profile.role==="admin";
  $("composeTitle").textContent=isAdmin?"رسالة جديدة":"إرسال طلبك للأدمن";
  $("normalRecipientBox").style.display=isAdmin?"none":"block";
  $("adminRecipientBox").style.display=isAdmin?"block":"none";
  $("recipientInput").value="";
  $("subjectInput").value=service||"";
  $("bodyInput").value="";err("composeError");
}

async function send(){
  err("composeError");
  let to=profile.role==="admin"?await recipient($("recipientInput").value):await admin();
  if(!to)return err("composeError",profile.role==="admin"?"المستخدم المستلم غير موجود.":"حساب الأدمن غير موجود.");
  const subject=$("subjectInput").value.trim(),body=$("bodyInput").value.trim();
  if(!subject)return err("composeError","اختار نوع الخدمة من العنوان.");
  if(!body)return err("composeError","اكتب تفاصيل طلبك في الرسالة.");
  const b=$("sendMessageBtn");b.disabled=true;b.textContent="جاري الإرسال...";
  const r=await db.from("messages").insert({sender_id:user.id,receiver_id:to.id,subject,body});
  b.disabled=false;b.textContent="إرسال الرسالة";
  if(r.error){console.error(r.error);return err("composeError","حصل خطأ أثناء الإرسال.");}
  back();await load();
}

async function init(){
  if(!profile)await loadProfile();if(!profile)return;
  $("welcomeText").textContent="أهلاً "+uname(profile);
  $("profileEmail").textContent=visibleEmail(profile);
  $("profileAvatar").textContent=uname(profile)[0];
  $("adminControls").style.display=profile.role==="admin"?"block":"none";
  await change("inbox");
}
async function change(f){
  folder=f;$("folderTitle").textContent=f==="inbox"?"الوارد":"المرسل";
  document.querySelectorAll(".folder").forEach(x=>x.classList.toggle("active",x.dataset.folder===f));
  back();await load();
}
async function logout(){await db.auth.signOut();user=null;profile=null;screen("loginScreen")}

document.addEventListener("DOMContentLoaded",async()=>{
  const serviceParam=new URLSearchParams(location.search).get("service");
  $("loginBtn").onclick=login;
  $("showRegisterBtn").onclick=()=>screen("registerScreen");
  $("backLoginBtn").onclick=()=>screen("loginScreen");
  $("registerBtn").onclick=register;
  $("registerUsername").addEventListener("input",updateEmailPreview);
  updateEmailPreview();
  $("newMessageBtn").onclick=()=>compose();
  $("adminComposeBtn").onclick=()=>compose();
  $("cancelComposeBtn").onclick=back;
  $("sendMessageBtn").onclick=send;
  $("backToListBtn").onclick=back;
  $("refreshBtn").onclick=load;
  $("logoutBtn").onclick=logout;
  $("homeBtn").onclick=()=>location.href="index.html";
  document.querySelectorAll(".folder").forEach(x=>x.onclick=()=>change(x.dataset.folder));
  const s=await db.auth.getSession();
  if(s.data.session?.user){user=s.data.session.user;await loadProfile();if(profile){screen("mailScreen");await init();if(serviceParam&&profile.role!=="admin")compose(serviceParam)}else await logout()}else {screen("loginScreen");if(serviceParam)sessionStorage.setItem("nilex_pending_service",serviceParam)}
});
