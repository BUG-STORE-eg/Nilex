"use strict";

/* =========================================================
   NILEX MAIL SYSTEM
   Supabase configuration
   ========================================================= */

const SUPABASE_URL =
  "https://loqwcsxdqgasgokfmswi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_vkNXRSYz-hz_PxJCXGwdhg__0-Jmlsx";

const CREATE_USER_FUNCTION =
  `${SUPABASE_URL}/functions/v1/bright-service`;

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;
let currentMessages = [];
let currentFolder = "inbox";
let currentOpenedMessage = null;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function showElement(id, show) {
  const el = $(id);

  if (!el) return;

  el.style.display = show ? "" : "none";
}

function setText(id, text) {
  const el = $(id);

  if (!el) return;

  el.textContent = text ?? "";
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   ERROR TRANSLATION
   ========================================================= */

function translateError(error) {
  if (!error) {
    return "حدث خطأ غير معروف.";
  }

  const message =
    typeof error === "string"
      ? error
      : error.message || error.error_description || "";

  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "اسم المستخدم أو كلمة المرور غير صحيحة.";
  }

  if (lower.includes("email not confirmed")) {
    return "الحساب لم يتم تأكيده.";
  }

  if (lower.includes("user already registered")) {
    return "الحساب موجود بالفعل.";
  }

  if (lower.includes("permission denied for table profiles")) {
    return "حدث خطأ في صلاحيات حساب البريد. سجّل خروج ثم ادخل مرة أخرى.";
  }

  if (lower.includes("permission denied for table messages")) {
    return "حدث خطأ في صلاحيات الرسائل.";
  }

  if (lower.includes("duplicate")) {
    return "البيانات مستخدمة بالفعل.";
  }

  if (lower.includes("network")) {
    return "تعذر الاتصال بالخادم. تأكد من الإنترنت.";
  }

  return message || "حدث خطأ غير متوقع.";
}


/* =========================================================
   UI VIEWS
   ========================================================= */

function showLogin() {
  showElement("loginView", true);
  showElement("signupView", false);
  showElement("mailApp", false);
}

function showSignup() {
  showElement("loginView", false);
  showElement("signupView", true);
  showElement("mailApp", false);
}

function showMailApp() {
  showElement("loginView", false);
  showElement("signupView", false);
  showElement("mailApp", true);
}


/* =========================================================
   UI ERRORS
   ========================================================= */

function showLoginError(message) {
  const el =
    $("loginError") ||
    $("loginMessage") ||
    $("loginStatus");

  if (!el) return;

  el.textContent = message;
  el.style.display = "block";
}

function clearLoginError() {
  const el =
    $("loginError") ||
    $("loginMessage") ||
    $("loginStatus");

  if (!el) return;

  el.textContent = "";
  el.style.display = "none";
}

function showSignupError(message) {
  const el =
    $("signupError") ||
    $("signupMessage") ||
    $("signupStatus");

  if (!el) return;

  el.textContent = message;
  el.style.display = "block";
}

function clearSignupError() {
  const el =
    $("signupError") ||
    $("signupMessage") ||
    $("signupStatus");

  if (!el) return;

  el.textContent = "";
  el.style.display = "none";
}

function showComposeError(message) {
  const el = $("composeError");

  if (!el) return;

  el.textContent = message;
  el.style.display = "block";
}

function clearComposeError() {
  const el = $("composeError");

  if (!el) return;

  el.textContent = "";
  el.style.display = "none";
}


/* =========================================================
   USERNAME → INTERNAL EMAIL
   ========================================================= */

function normalizeLoginEmail(value) {
  value = String(value || "").trim();

  if (!value) return "";

  if (
    value === "admin" ||
    value === "admin@nilex" ||
    value === "admin@nilex.local"
  ) {
    return "admin@nilex.local";
  }

  if (value.includes("@")) {
    return value;
  }

  return `${value}@nilex.local`;
}


/* =========================================================
   SIGN UP
   ========================================================= */

async function registerUser() {
  clearSignupError();

  const username =
    $("signupUsername")?.value.trim() || "";

  const password =
    $("signupPassword")?.value || "";

  if (!username) {
    showSignupError("اكتب اسم المستخدم.");
    return;
  }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    showSignupError(
      "اسم المستخدم يجب أن يكون من 3 إلى 30 حرفًا أو رقمًا أو _"
    );
    return;
  }

  if (!password) {
    showSignupError("اكتب كلمة المرور.");
    return;
  }

  if (password.length < 6) {
    showSignupError(
      "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
    );
    return;
  }

  const button = $("signupButton");

  if (button) {
    button.disabled = true;
    button.dataset.oldText = button.textContent;
    button.textContent = "جاري إنشاء الحساب...";
  }

  try {
    const response = await fetch(
      CREATE_USER_FUNCTION,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          username,
          password
        })
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        `فشل إنشاء الحساب (${response.status})`
      );
    }

    /*
      بعد إنشاء الحساب عن طريق Edge Function،
      نسجل دخوله مباشرة من الواجهة.
    */

    const email = `${username}@nilex.local`;

    const { data: loginData, error: loginError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) {
      throw loginError;
    }

    if (!loginData?.session || !loginData?.user) {
      throw new Error(
        "تم إنشاء الحساب ولكن لم يتم إنشاء جلسة الدخول."
      );
    }

    currentUser = loginData.user;

    /*
      ننتظر لحظة صغيرة للتأكد أن الـ session
      تم حفظها في المتصفح.
    */

    await new Promise(resolve =>
      setTimeout(resolve, 150)
    );

    const loaded = await loadCurrentProfile();

    if (!loaded) {
      await supabaseClient.auth.signOut();
      throw new Error(
        "تم إنشاء الحساب، لكن تعذر تحميل بيانات الحساب."
      );
    }

    showMailApp();

    await initializeMailApp();

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    showSignupError(
      translateError(error)
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        button.dataset.oldText || "إنشاء الحساب";
    }
  }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser() {
  clearLoginError();

  const username =
    $("loginUsername")?.value.trim() || "";

  const password =
    $("loginPassword")?.value || "";

  if (!username) {
    showLoginError("اكتب اسم المستخدم.");
    return;
  }

  if (!password) {
    showLoginError("اكتب كلمة المرور.");
    return;
  }

  const email = normalizeLoginEmail(username);

  const button = $("loginButton");

  if (button) {
    button.disabled = true;
    button.dataset.oldText = button.textContent;
    button.textContent = "جاري تسجيل الدخول...";
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    if (!data?.session || !data?.user) {
      throw new Error(
        "لم يتم إنشاء جلسة تسجيل الدخول."
      );
    }

    currentUser = data.user;

    /*
      مهم:
      لا نحاول قراءة profiles قبل التأكد
      من وجود المستخدم والجلسة.
    */

    const loaded = await loadCurrentProfile();

    if (!loaded) {
      await supabaseClient.auth.signOut();

      throw new Error(
        "تعذر تحميل بيانات حسابك من profiles."
      );
    }

    showMailApp();

    await initializeMailApp();

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    showLoginError(
      translateError(error)
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        button.dataset.oldText || "تسجيل الدخول";
    }
  }
}


/* =========================================================
   LOAD CURRENT PROFILE
   ========================================================= */

async function loadCurrentProfile() {
  try {
    /*
      نجيب الـ session أولًا.
    */

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
      console.error(
        "SESSION ERROR:",
        sessionError
      );

      return false;
    }

    const session = sessionData?.session;

    if (!session?.user) {
      console.error(
        "No authenticated session found."
      );

      return false;
    }

    currentUser = session.user;

    const userId = currentUser.id;

    console.log(
      "Loading profile for:",
      userId
    );

    /*
      قراءة profile الخاص بالمستخدم الحالي.
      استخدام id = userId يجعل الطلب بسيطًا
      ومتوافقًا مع RLS.
    */

    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select(
        "id, username, email, display_name, role, created_at"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "PROFILE LOAD ERROR:",
        error
      );

      throw error;
    }

    if (!data) {
      console.error(
        "No profile found for current user."
      );

      return false;
    }

    currentProfile = data;

    console.log(
      "Current profile:",
      currentProfile
    );

    updateAccountUI();

    return true;

  } catch (error) {
    console.error(
      "loadCurrentProfile ERROR:",
      error
    );

    return false;
  }
}


/* =========================================================
   ACCOUNT UI
   ========================================================= */

function updateAccountUI() {
  if (!currentProfile) return;

  const username =
    currentProfile.username ||
    currentProfile.display_name ||
    "User";

  const displayName =
    currentProfile.display_name ||
    username;

  setText(
    "accountUsername",
    username
  );

  setText(
    "accountName",
    displayName
  );

  setText(
    "userName",
    username
  );

  setText(
    "currentUsername",
    username
  );

  setText(
    "accountEmail",
    currentProfile.email || ""
  );

  setText(
    "userEmail",
    currentProfile.email || ""
  );

  const role =
    currentProfile.role || "user";

  /*
    Admin section
  */

  const adminSection =
    $("adminSection");

  if (adminSection) {
    adminSection.style.display =
      role === "admin"
        ? ""
        : "none";
  }
}


/* =========================================================
   INITIALIZE MAIL APP
   ========================================================= */

async function initializeMailApp() {
  if (!currentUser || !currentProfile) {
    const loaded =
      await loadCurrentProfile();

    if (!loaded) {
      showLogin();
      return;
    }
  }

  updateAccountUI();

  await loadMessages();

  if (currentProfile.role === "admin") {
    await loadUsersForAdmin();
  }
}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages() {
  if (!currentUser) {
    console.error(
      "Cannot load messages: no user."
    );

    return;
  }

  const list = $("messagesList");

  if (list) {
    list.innerHTML =
      `<div class="loading">جاري تحميل الرسائل...</div>`;
  }

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("messages")
      .select(`
        id,
        sender_id,
        receiver_id,
        subject,
        body,
        is_read,
        created_at
      `)
      .or(
        `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    currentMessages = data || [];

    renderMessages();

  } catch (error) {
    console.error(
      "LOAD MESSAGES ERROR:",
      error
    );

    if (list) {
      list.innerHTML =
        `<div class="error-message">
          ${escapeHTML(
            translateError(error)
          )}
        </div>`;
    }
  }
}


/* =========================================================
   FOLDER FILTER
   ========================================================= */

function getFilteredMessages() {
  if (!currentUser) {
    return [];
  }

  if (currentFolder === "sent") {
    return currentMessages.filter(
      message =>
        message.sender_id === currentUser.id
    );
  }

  return currentMessages.filter(
    message =>
      message.receiver_id === currentUser.id
  );
}


/* =========================================================
   RENDER MESSAGES
   ========================================================= */

function renderMessages() {
  const list = $("messagesList");

  if (!list) return;

  const messages =
    getFilteredMessages();

  if (!messages.length) {
    list.innerHTML =
      `<div class="empty-state">
        لا توجد رسائل هنا.
      </div>`;

    return;
  }

  list.innerHTML =
    messages
      .map(message => {
        const isReceived =
          message.receiver_id === currentUser.id;

        const unread =
          isReceived && !message.is_read;

        const date =
          formatDate(message.created_at);

        return `
          <div
            class="message-item ${unread ? "unread" : ""}"
            data-message-id="${message.id}"
            onclick="openMessage(${message.id})"
          >
            <div class="message-main">
              <div class="message-subject">
                ${escapeHTML(
                  message.subject || "(بدون عنوان)"
                )}
              </div>

              <div class="message-preview">
                ${escapeHTML(
                  String(message.body || "")
                    .replace(/\s+/g, " ")
                    .slice(0, 100)
                )}
              </div>
            </div>

            <div class="message-date">
              ${escapeHTML(date)}
            </div>
          </div>
        `;
      })
      .join("");
}


/* =========================================================
   OPEN MESSAGE
   ========================================================= */

async function openMessage(id) {
  const message =
    currentMessages.find(
      item => Number(item.id) === Number(id)
    );

  if (!message) return;

  currentOpenedMessage = message;

  const view = $("messageView");

  if (!view) return;

  const isReceived =
    message.receiver_id === currentUser.id;

  if (
    isReceived &&
    !message.is_read
  ) {
    await markMessageAsRead(message.id);

    message.is_read = true;
  }

  const date =
    formatDate(message.created_at);

  view.innerHTML = `
    <div class="message-header">
      <h2>
        ${escapeHTML(
          message.subject || "(بدون عنوان)"
        )}
      </h2>

      <div class="message-meta">
        ${escapeHTML(date)}
      </div>
    </div>

    <div class="message-content">
      ${escapeHTML(message.body)}
    </div>

    <button
      type="button"
      onclick="closeMessage()"
    >
      رجوع
    </button>
  `;

  showElement(
    "messagesList",
    false
  );

  showElement(
    "messageView",
    true
  );
}


/* =========================================================
   CLOSE MESSAGE
   ========================================================= */

function closeMessage() {
  currentOpenedMessage = null;

  showElement(
    "messageView",
    false
  );

  showElement(
    "messagesList",
    true
  );

  renderMessages();
}


/* =========================================================
   MARK AS READ
   ========================================================= */

async function markMessageAsRead(messageId) {
  if (!currentUser) return;

  try {
    const {
      error
    } = await supabaseClient
      .from("messages")
      .update({
        is_read: true
      })
      .eq("id", messageId)
      .eq(
        "receiver_id",
        currentUser.id
      );

    if (error) {
      throw error;
    }

  } catch (error) {
    console.error(
      "MARK READ ERROR:",
      error
    );
  }
}


/* =========================================================
   SEND NORMAL MESSAGE
   ========================================================= */

async function sendMessage() {
  clearComposeError();

  if (!currentUser) {
    showComposeError(
      "يجب تسجيل الدخول أولًا."
    );

    return;
  }

  if (!currentProfile) {
    showComposeError(
      "تعذر تحميل بيانات الحساب."
    );

    return;
  }

  let receiverId = null;

  /*
    للمستخدم العادي:
    الرسالة تذهب إلى admin.
  */

  if (currentProfile.role !== "admin") {
    receiverId =
      await getAdminUserId();
  } else {
    /*
      للـ admin:
      نقرأ المستلم من select.
    */

    const select =
      $("adminReceiver");

    receiverId =
      select?.value || null;
  }

  if (!receiverId) {
    showComposeError(
      "اختر المستلم أولًا."
    );

    return;
  }

  const subject =
    (
      $("adminSubject")?.value ||
      $("messageSubject")?.value ||
      ""
    ).trim();

  const body =
    (
      $("adminMessageBody")?.value ||
      $("messageBody")?.value ||
      ""
    ).trim();

  if (!subject) {
    showComposeError(
      "اكتب عنوان الرسالة."
    );

    return;
  }

  if (!body) {
    showComposeError(
      "اكتب محتوى الرسالة."
    );

    return;
  }

  const button =
    $("sendButton");

  if (button) {
    button.disabled = true;
    button.dataset.oldText =
      button.textContent;
    button.textContent =
      "جاري الإرسال...";
  }

  try {
    const {
      error
    } = await supabaseClient
      .from("messages")
      .insert({
        sender_id: currentUser.id,
        receiver_id: receiverId,
        subject,
        body,
        is_read: false
      });

    if (error) {
      throw error;
    }

    clearComposeFields();

    closeCompose();

    await loadMessages();

  } catch (error) {
    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    showComposeError(
      translateError(error)
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        button.dataset.oldText ||
        "إرسال";
    }
  }
}


/* =========================================================
   GET ADMIN USER
   ========================================================= */

async function getAdminUserId() {
  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.id || null;

  } catch (error) {
    console.error(
      "GET ADMIN ERROR:",
      error
    );

    showComposeError(
      translateError(error)
    );

    return null;
  }
}


/* =========================================================
   LOAD USERS FOR ADMIN
   ========================================================= */

async function loadUsersForAdmin() {
  if (
    !currentProfile ||
    currentProfile.role !== "admin"
  ) {
    return;
  }

  const select =
    $("adminReceiver");

  if (!select) return;

  select.innerHTML =
    `<option value="">
      اختر المستلم
    </option>`;

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select(
        "id, username, email, display_name, role"
      )
      .order(
        "username",
        {
          ascending: true
        }
      );

    if (error) {
      throw error;
    }

    const users =
      (data || []).filter(
        user =>
          user.id !== currentUser.id
      );

    users.forEach(user => {
      const option =
        document.createElement("option");

      option.value = user.id;

      option.textContent =
        user.display_name
          ? `${user.display_name} — ${user.username}`
          : user.username;

      select.appendChild(option);
    });

  } catch (error) {
    console.error(
      "LOAD ADMIN USERS ERROR:",
      error
    );

    select.innerHTML =
      `<option value="">
        تعذر تحميل الحسابات
      </option>`;
  }
}


/* =========================================================
   COMPOSE
   ========================================================= */

function openCompose() {
  clearComposeError();

  showElement(
    "messagesList",
    false
  );

  showElement(
    "messageView",
    false
  );

  showElement(
    "composeView",
    true
  );

  /*
    User normal message
  */

  const normalRecipient =
    $("normalRecipient");

  if (
    normalRecipient &&
    currentProfile?.role !== "admin"
  ) {
    normalRecipient.style.display = "";
  }

  /*
    Admin recipient
  */

  const adminReceiver =
    $("adminReceiver");

  if (currentProfile?.role === "admin") {
    if (adminReceiver) {
      adminReceiver.style.display = "";
    }
  }
}


function closeCompose() {
  clearComposeError();

  showElement(
    "composeView",
    false
  );

  showElement(
    "messageView",
    false
  );

  showElement(
    "messagesList",
    true
  );

  renderMessages();
}


function clearComposeFields() {
  const fields = [
    "messageSubject",
    "messageBody",
    "adminSubject",
    "adminMessageBody"
  ];

  fields.forEach(id => {
    const el = $(id);

    if (el) {
      el.value = "";
    }
  });

  const select =
    $("adminReceiver");

  if (select) {
    select.value = "";
  }
}


/* =========================================================
   FOLDERS
   ========================================================= */

function switchFolder(folder) {
  currentFolder =
    folder === "sent"
      ? "sent"
      : "inbox";

  closeMessage();

  renderMessages();

  /*
    Optional active class
  */

  document
    .querySelectorAll(
      "[data-folder]"
    )
    .forEach(el => {
      el.classList.toggle(
        "active",
        el.dataset.folder === currentFolder
      );
    });
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {
  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error(
      "LOGOUT ERROR:",
      error
    );
  }

  currentUser = null;
  currentProfile = null;
  currentMessages = [];
  currentOpenedMessage = null;

  showLogin();
}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date =
    new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    "ar-EG",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

function setupEvents() {

  /* Login */

  $("loginButton")?.addEventListener(
    "click",
    loginUser
  );

  $("loginPassword")?.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        loginUser();
      }
    }
  );


  /* Show signup */

  $("showRegisterBtn")?.addEventListener(
    "click",
    showSignup
  );


  /* Back to login */

  $("backLoginBtn")?.addEventListener(
    "click",
    showLogin
  );


  /* Signup */

  $("signupButton")?.addEventListener(
    "click",
    registerUser
  );

  $("signupPassword")?.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        registerUser();
      }
    }
  );


  /* New message */

  $("newMessageBtn")?.addEventListener(
    "click",
    openCompose
  );


  /* Admin compose */

  $("adminComposeBtn")?.addEventListener(
    "click",
    openCompose
  );


  /* Cancel compose */

  $("cancelComposeBtn")?.addEventListener(
    "click",
    closeCompose
  );


  /* Send */

  $("sendButton")?.addEventListener(
    "click",
    sendMessage
  );


  /* Logout buttons */

  $("logoutButton")?.addEventListener(
    "click",
    logoutUser
  );

  $("logoutBtn")?.addEventListener(
    "click",
    logoutUser
  );


  /* Inbox */

  document
    .querySelectorAll(
      '[data-folder="inbox"]'
    )
    .forEach(el => {
      el.addEventListener(
        "click",
        () => switchFolder("inbox")
      );
    });


  /* Sent */

  document
    .querySelectorAll(
      '[data-folder="sent"]'
    )
    .forEach(el => {
      el.addEventListener(
        "click",
        () => switchFolder("sent")
      );
    });
}


/* =========================================================
   AUTH STATE
   ========================================================= */

async function restoreSession() {
  try {
    const {
      data,
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    const session =
      data?.session;

    if (!session?.user) {
      showLogin();
      return;
    }

    currentUser =
      session.user;

    const loaded =
      await loadCurrentProfile();

    if (!loaded) {
      await supabaseClient.auth.signOut();
      showLogin();
      return;
    }

    showMailApp();

    await initializeMailApp();

  } catch (error) {
    console.error(
      "RESTORE SESSION ERROR:",
      error
    );

    showLogin();
  }
}


/* =========================================================
   AUTH LISTENER
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "AUTH EVENT:",
      event
    );

    if (
      event === "SIGNED_OUT"
    ) {
      currentUser = null;
      currentProfile = null;
      currentMessages = [];

      showLogin();

      return;
    }

    if (
      event === "SIGNED_IN" &&
      session?.user
    ) {
      currentUser =
        session.user;
    }
  }
);


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.showLogin = showLogin;
window.showSignup = showSignup;
window.showMailApp = showMailApp;

window.loginUser = loginUser;
window.registerUser = registerUser;

window.logoutUser = logoutUser;

window.openCompose = openCompose;
window.closeCompose = closeCompose;

window.sendMessage = sendMessage;

window.openMessage = openMessage;
window.closeMessage = closeMessage;

window.switchFolder = switchFolder;

window.loadMessages = loadMessages;
window.loadUsersForAdmin =
  loadUsersForAdmin;


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupEvents();

    /*
      نخفي التطبيق في البداية
      إلى أن نتحقق من الـ session.
    */

    showLogin();

    await restoreSession();
  }
);
