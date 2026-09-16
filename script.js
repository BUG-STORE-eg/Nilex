document.addEventListener("DOMContentLoaded",()=>{
  const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
  let lang=localStorage.getItem("nilex_lang")||"ar";

  function applyLang(){
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==="ar"?"rtl":"ltr";
    $$('[data-ar]').forEach(e=>{
      const t=e.dataset[lang];
      if(t!==undefined)e.innerHTML=t;
    });
    if($("#langBtn")) $("#langBtn").textContent=lang==="ar"?"EN":"AR";
    localStorage.setItem("nilex_lang",lang);
    updateAuthButtons();
  }

  applyLang();
  $("#langBtn")?.addEventListener("click",()=>{lang=lang==="ar"?"en":"ar";applyLang()});
  $("#menuBtn")?.addEventListener("click",()=>$("#mobileNav")?.classList.toggle("open"));
  $$(".mobile-nav a").forEach(a=>a.addEventListener("click",()=>$("#mobileNav")?.classList.remove("open")));

  const SUPABASE_URL="https://loqwcsxdqgasgokfmswi.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY="sb_publishable_vkNXRSYz-hz_PxJCXGwdhg__0-Jmlsx";
  let supabaseClient=null;

  if(window.supabase){
    supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    updateAuthButtons();
    supabaseClient.auth.getSession().then(({data})=>updateAuthButtons(data.session));
    supabaseClient.auth.onAuthStateChange((_event,session)=>updateAuthButtons(session));
  }

  function updateAuthButtons(session){
    if(!supabaseClient){
      setAuthButton($("#authNavBtn"),false);
      setAuthButton($("#mobileAuthBtn"),false);
      return;
    }
    supabaseClient.auth.getSession().then(({data})=>{
      const activeSession=session===undefined?data.session:session;
      const loggedIn=!!activeSession;
      setAuthButton($("#authNavBtn"),loggedIn);
      setAuthButton($("#mobileAuthBtn"),loggedIn);
    });
  }

  function setAuthButton(btn,loggedIn){
    if(!btn)return;
    btn.textContent=loggedIn?(lang==="ar"?"تسجيل الخروج":"Logout"):(lang==="ar"?"تسجيل الدخول":"Login");
    btn.classList.toggle("logged-in",loggedIn);
    btn.onclick=async()=>{
      if(!loggedIn){
        location.href="mail.html";
        return;
      }
      if(supabaseClient){
        await supabaseClient.auth.signOut();
        toast(lang==="ar"?"تم تسجيل الخروج ✓":"Logged out ✓");
        setAuthButton(btn,false);
      }
    };
  }

  function goService(card){
    const selected=lang==="ar"?card.dataset.service:card.dataset.serviceEn;
    location.href="mail.html?compose=1&service="+encodeURIComponent(selected);
  }
  $$(".service").forEach(card=>{
    card.addEventListener("click",e=>{if(!e.target.closest("button"))goService(card)});
    card.querySelector("button")?.addEventListener("click",e=>{e.stopPropagation();goService(card)});
  });

  $$(".copy").forEach(btn=>btn.addEventListener("click",async()=>{
    try{await navigator.clipboard.writeText(btn.dataset.copy);toast(lang==="ar"?"تم نسخ الرقم ✓":"Number copied ✓")}
    catch{toast(btn.dataset.copy)}
  }));

  function toast(t){
    const x=$("#toast");
    if(!x)return;
    x.textContent=t;x.classList.add("show");clearTimeout(window.nilexToast);
    window.nilexToast=setTimeout(()=>x.classList.remove("show"),2200);
  }

  if("IntersectionObserver"in window){
    const ob=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add("visible");ob.unobserve(e.target)}
    }),{threshold:.12});
    $$(".reveal").forEach(e=>ob.observe(e));
  }else $$(".reveal").forEach(e=>e.classList.add("visible"));

  if($("#year"))$("#year").textContent=new Date().getFullYear();
});
