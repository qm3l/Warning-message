// ====== ضبط مهم قبل التشغيل ======
// 1) روح Google Cloud Console -> Credentials -> OAuth 2.0 Client IDs
// 2) أنشئ Web application وضع ضمن Authorized JavaScript origins:
//    مثال: https://USERNAME.github.io
//    أو أثناء التجربة localhost: http://127.0.0.1:5500
// 3) انسخ ال CLIENT_ID وضعه مكان YOUR_GOOGLE_CLIENT_ID
// 4) ارفع الملفات على GitHub Pages أو شغّل محلياً عبر خادم بسيط
// ==================================

const CLIENT_ID = "88526907541-ob4nvsmcvvj9aautlkj8ugeugfqfm6io.apps.googleusercontent.com"; // استبدل هنا

// Helpers
const qs = (s) => document.querySelector(s);
const isGallery = location.pathname.endsWith("gallery.html");

// Common functions for GSI
function initGSI(callback){
  if(!window.google || !google.accounts){
    console.error("Google Identity not loaded");
    callback(new Error("Google SDK not loaded"));
    return;
  }
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (res)=> {
      // res.credential is a JWT token with user info in base64
      callback(null, res);
    }
  });
  // optional automatic prompt
  google.accounts.id.renderButton && google.accounts.id.renderButton(qs("#g-sign-container") || document.body, {theme:"outline",size:"large"});
}

function parseJwt(token){
  try{
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g,'+').replace(/_/g,'/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  }catch(e){
    return null;
  }
}

// INDEX PAGE LOGIC
if(!isGallery){
  const signBtn = qs("#googleSignBtn");
  const errEl = qs("#error");

  signBtn.addEventListener("click", ()=> {
    initGSI((err,res)=>{
      if(err){ errEl.hidden=false; errEl.textContent="خطأ تحميل Google SDK"; return }
      google.accounts.id.prompt(notification => {
        // prompt will open chooser
        // but fallback: use token callback when user picks account
      });
    });
  });

  // handle client-side token if google calls us
  window.handleCredentialResponse = function(resp){
    if(!resp || !resp.credential){ qs("#error").hidden=false; qs("#error").textContent="فشل الحصول على بيانات الدخول"; return }
    const info = parseJwt(resp.credential);
    if(!info){ qs("#error").hidden=false; qs("#error").textContent="تعذر فك الترميز"; return }
    // store minimal profile in sessionStorage and go to gallery
    sessionStorage.setItem("profile", JSON.stringify({
      name: info.name || info.email,
      email: info.email,
      picture: info.picture || ""
    }));
    // redirect to gallery
    location.href = "gallery.html";
  }

  // attach global callback for GSI
  // if google.accounts.id.initialize called, it will call above handleCredentialResponse
  initGSI((err)=>{ if(err){ console.warn(err) } });
}

// GALLERY PAGE LOGIC
if(isGallery){
  // Block if bomb fired earlier
  if(localStorage.getItem("siteDestroyed") === "1"){
    document.body.innerHTML = "<main class='card'><h2 style='text-align:center'>هذه الصفحة مُقفلة نهائياً</h2><p style='text-align:center;color:#d9b2b2'>تم تفعيل القنبلة مسبقاً. امسح بيانات المتصفح للدخول مجدداً</p></main>";
    throw "site locked";
  }

  const profile = sessionStorage.getItem("profile");
  if(!profile){
    // not logged in
    location.href = "index.html";
    throw "no profile";
  }
  const user = JSON.parse(profile);
  qs("#userName").textContent = user.name || "المستخدم";
  qs("#userEmail").textContent = user.email || "";
  const avatar = qs("#avatar");
  avatar.src = user.picture || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%2306323a'/></svg>";

  // load saved photos from localStorage
  const photosEl = qs("#photos");
  const saved = JSON.parse(localStorage.getItem("my_photos") || "[]");

  function renderPhotos(){
    photosEl.innerHTML = "";
    const arr = JSON.parse(localStorage.getItem("my_photos") || "[]");
    if(arr.length === 0){
      photosEl.innerHTML = "<div class='muted' style='padding:20px;text-align:center'>لا صور مرفوعة بعد</div>";
      return;
    }
    arr.forEach((dataUrl, i) => {
      const box = document.createElement("div");
      box.className = "photo";
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "photo-"+i;
      box.appendChild(img);
      photosEl.appendChild(box);
    });
  }
  renderPhotos();

  // upload button
  const fileInput = qs("#fileInput");
  qs("#uploadBtn").addEventListener("click", ()=> fileInput.click());
  fileInput.addEventListener("change", async (e)=> {
    const files = Array.from(e.target.files || []);
    if(files.length === 0) return;
    const cur = JSON.parse(localStorage.getItem("my_photos") || "[]");
    for(const f of files){
      // convert to dataURL but limit size to avoid huge storage
      if(f.size > 2_500_000) { alert("صورة كبيرة جدا, رجاء اختر صور أقل من 2.5MB"); continue }
      const data = await new Promise(res=>{
        const r = new FileReader();
        r.onload = ()=> res(r.result);
        r.readAsDataURL(f);
      });
      cur.push(data);
    }
    localStorage.setItem("my_photos", JSON.stringify(cur));
    renderPhotos();
  });

  // logout: clear sessionStorage profile and go to index
  qs("#logoutBtn").addEventListener("click", ()=> {
    sessionStorage.removeItem("profile");
    // sign out from google (optional)
    try{ google.accounts.id.disableAutoSelect(); }catch(e){}
    location.href = "index.html";
  });

  // Bomb logic
  const armBtn = qs("#armBomb");
  const timeoutInput = qs("#timeoutInput");
  const overlay = qs("#overlay");
  const overlayMsg = qs("#overlayMsg");
  const countdownEl = qs("#countdown");

  armBtn.addEventListener("click", ()=>{
    const t = parseInt(timeoutInput.value,10);
    if(isNaN(t) || t < 1){ alert("اكتب عدد ثوان صحيح"); return }
    // set a flag that this session will self-destruct after viewing once
    sessionStorage.setItem("willExplode", "1");
    sessionStorage.setItem("explodeAfter", String(t));
    alert("تم تفعيل القنبلة. عند أول عرض سيتم العد التنازلي");
  });

  // on load, if willExplode set, show overlay and countdown once then destroy
  if(sessionStorage.getItem("willExplode") === "1"){
    const t = parseInt(sessionStorage.getItem("explodeAfter") || "5", 10);
    overlay.hidden = false;
    overlayMsg.textContent = "تبدأ المشاهدة. سيحصل التدمير التلقائي بعد"
    let cur = t;
    countdownEl.textContent = String(cur);
    const id = setInterval(()=>{
      cur--;
      countdownEl.textContent = String(cur);
      if(cur <= 0){
        clearInterval(id);
        // destroy: set persistent lock so future visits blocked in this browser
        localStorage.setItem("siteDestroyed", "1");
        // clear any session data so user can't re-enter except by clearing storage
        sessionStorage.removeItem("willExplode");
        sessionStorage.removeItem("explodeAfter");
        // visually show destroyed
        overlayMsg.textContent = "انتهى الوقت. تم تدمير الصفحة"
        setTimeout(()=> {
          // replace body with locked message
          document.body.innerHTML = "<main class='card'><h2 style='text-align:center'>تم تدمير الصفحة</h2><p style='text-align:center;color:#d9b2b2'>لا يمكن فتحها مرة ثانية من هذا المتصفح. امسح بيانات المتصفح أو افتح متصفح آخر إذا أردت الدخول مجدداً</p></main>";
        }, 800);
      }
    }, 1000);
  }
                                                }
    
