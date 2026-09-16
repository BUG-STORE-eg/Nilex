const SUPABASE_URL =
  "https://loqwcsxdqgasgokfmswi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_vkNXRSYz-hz_PxJCXGwdhg__0-Jmlsx";

const CREATE_USER_FUNCTION =
  `${SUPABASE_URL}/functions/v1/bright-service`;

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let profile = null;
let currentFolder = "inbox";
let currentMessage = null;

const $ = (id) => document.getElementById(id);

const SERVICES = [
  "تطوير البرامج والمواقع",
  "التصميم والهوية",
  "الدعم التقني",
  "الاستضافة وإدارة المواقع",
  "خدمات الألعاب",
  "السوشيال والمحتوى",
  "خدمة أخرى / استفسار",
];

function show(id) {
  const el = $(id);
  if (el) el.style.display = "";
}

function hide(id) {
  const el = $(id);
  if (el) el.style.display = "none";
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date) {
  try {
    return new Date(date).toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date || "";
  }
}

function notify(message, type = "info") {
  const box = $("statusMessage");

  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.className = `status-message ${type}`;
  box.style.display = "block";
}

function clearNotify() {
  const box = $("statusMessage");

  if (box) {
    box.textContent = "";
    box.style.display = "none";
  }
}

/* =========================================================
   SIGNUP
   ========================================================= */

function updateInternalEmail() {
  const usernameInput = $("signupUsername");
  const emailInput = $("signupEmail");

  if (!usernameInput || !emailInput) return;

  const username = usernameInput.value.trim();

  emailInput.value = username
    ? `${username}@nilex`
    : "";
}

async function signup() {
  clearNotify();

  const usernameInput = $("signupUsername");
  const emailInput = $("signupEmail");
  const passwordInput = $("signupPassword");

  if (!usernameInput || !passwordInput) {
    notify("بيانات التسجيل غير موجودة في الصفحة", "error");
    return;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username) {
    notify("اكتب اسم المستخدم", "error");
    usernameInput.focus();
    return;
  }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    notify(
      "اسم المستخدم يجب أن يكون من 3 إلى 30 حرفًا أو رقمًا أو _",
      "error"
    );
    usernameInput.focus();
    return;
  }

  if (!password) {
    notify("اكتب كلمة المرور", "error");
    passwordInput.focus();
    return;
  }

  if (password.length < 6) {
    notify("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error");
    passwordInput.focus();
    return;
  }

  updateInternalEmail();

  const button =
    $("signupButton") ||
    $("registerButton") ||
    $("createAccountButton");

  if (button) {
    button.disabled = true;
    button.dataset.oldText = button.textContent;
    button.textContent = "جاري إنشاء الحساب...";
  }

  try {
    const response = await fetch(CREATE_USER_FUNCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    let result = {};

    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "فشل إنشاء الحساب"
      );
    }

    /*
      الحساب تم إنشاؤه من الـ Edge Function
      باستخدام:
      username@nilex.local

      لكن المستخدم يرى:
      username@nilex
    */

    const technicalEmail = `${username}@nilex.local`;

    notify("تم إنشاء الحساب، جاري تسجيل الدخول...", "success");

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: technicalEmail,
        password,
      });

    if (error) {
      throw error;
    }

    currentUser = data.user;

    await loadProfile();

    if (!profile) {
      throw new Error(
        "تم إنشاء الحساب ولكن بيانات الحساب غير موجودة"
      );
    }

    notify("تم إنشاء الحساب وتسجيل الدخول بنجاح", "success");

    setTimeout(() => {
      showMailApp();
    }, 500);

  } catch (error) {
    console.error("Signup error:", error);

    notify(
      error?.message || "حدث خطأ أثناء إنشاء الحساب",
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;

      if (button.dataset.oldText) {
        button.textContent = button.dataset.oldText;
      }
    }
  }
}

/* =========================================================
   LOGIN
   ========================================================= */

async function login() {
  clearNotify();

  const usernameInput = $("loginUsername");
  const passwordInput = $("loginPassword");

  if (!usernameInput || !passwordInput) {
    notify("بيانات تسجيل الدخول غير موجودة", "error");
    return;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username) {
    notify("اكتب اسم المستخدم", "error");
    usernameInput.focus();
    return;
  }

  if (!password) {
    notify("اكتب كلمة المرور", "error");
    passwordInput.focus();
    return;
  }

  const button =
    $("loginButton") ||
    $("signinButton");

  if (button) {
    button.disabled = true;
    button.dataset.oldText = button.textContent;
    button.textContent = "جاري الدخول...";
  }

  try {
    /*
      حساب الأدمن:
      admin@nilex.local

      المستخدم العادي:
      username@nilex.local
    */

    const technicalEmail =
      username.toLowerCase() === "admin"
        ? "admin@nilex.local"
        : `${username}@nilex.local`;

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: technicalEmail,
        password,
      });

    if (error) {
      throw error;
    }

    currentUser = data.user;

    await loadProfile();

    if (!profile) {
      await supabase.auth.signOut();

      throw new Error(
        "بيانات الحساب غير موجودة"
      );
    }

    showMailApp();

  } catch (error) {
    console.error("Login error:", error);

    notify(
      error?.message || "اسم المستخدم أو كلمة المرور غير صحيحة",
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;

      if (button.dataset.oldText) {
        button.textContent = button.dataset.oldText;
      }
    }
  }
}

/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {
  if (!currentUser) {
    const {
      data: sessionData,
    } = await supabase.auth.getSession();

    currentUser = sessionData?.session?.user || null;
  }

  if (!currentUser) {
    profile = null;
    return null;
  }

  const { data, error } =
    await supabase
      .from("profiles")
      .select(`
        id,
        username,
        email,
        display_name,
        role,
        created_at
      `)
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) {
    console.error("Profile error:", error);
    profile = null;
    return null;
  }

  profile = data;

  updateAccountUI();

  return profile;
}

function updateAccountUI() {
  if (!profile) return;

  const name =
    profile.display_name ||
    profile.username ||
    "مستخدم NILEX";

  const username =
    profile.username || "";

  const email =
    profile.email ||
    `${username}@nilex`;

  setText("accountName", name);
  setText("accountUsername", username);
  setText("accountEmail", email);

  const roleEl = $("accountRole");

  if (roleEl) {
    roleEl.textContent =
      profile.role === "admin"
        ? "الأدمن"
        : "مستخدم";
  }

  const adminElements =
    document.querySelectorAll(
      "[data-admin-only]"
    );

  adminElements.forEach((el) => {
    el.style.display =
      profile.role === "admin"
        ? ""
        : "none";
  });
}

/* =========================================================
   APP STATE
   ========================================================= */

async function showMailApp() {
  hide("loginView");
  hide("signupView");
  hide("authView");

  show("mailApp");

  if ($("accountPanel")) {
    show("accountPanel");
  }

  updateAccountUI();

  await setupServiceSelect();

  currentFolder = "inbox";

  await loadMessages();
}

function showLogin() {
  hide("signupView");
  hide("mailApp");

  show("loginView");

  clearNotify();
}

function showSignup() {
  hide("loginView");
  hide("mailApp");

  show("signupView");

  clearNotify();

  updateInternalEmail();
}

function logout() {
  supabase.auth.signOut().finally(() => {
    currentUser = null;
    profile = null;
    currentMessage = null;

    showLogin();
  });
}

/* =========================================================
   SERVICES
   ========================================================= */

async function setupServiceSelect() {
  const select =
    $("messageSubject") ||
    $("subject") ||
    $("serviceSelect");

  if (!select) return;

  const currentValue = select.value;

  select.innerHTML =
    `<option value="">اختر الخدمة</option>` +
    SERVICES.map(
      (service) =>
        `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`
    ).join("");

  if (currentValue) {
    select.value = currentValue;
  }

  /*
    لو جايين من index.html ومعانا:
    ?service=...
  */

  const params =
    new URLSearchParams(window.location.search);

  const requestedService =
    params.get("service");

  if (requestedService) {
    const match = SERVICES.find(
      (service) =>
        service === requestedService
    );

    if (match) {
      select.value = match;
    }
  }
}

/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {
  clearNotify();

  if (!currentUser || !profile) {
    notify("يجب تسجيل الدخول أولًا", "error");
    return;
  }

  const subjectSelect =
    $("messageSubject") ||
    $("subject") ||
    $("serviceSelect");

  const bodyInput =
    $("messageBody") ||
    $("body") ||
    $("messageText");

  if (!subjectSelect || !bodyInput) {
    notify(
      "حقول الرسالة غير موجودة",
      "error"
    );
    return;
  }

  const subject =
    subjectSelect.value.trim();

  const body =
    bodyInput.value.trim();

  if (!subject) {
    notify("اختار الخدمة", "error");
    subjectSelect.focus();
    return;
  }

  if (!body) {
    notify("اكتب تفاصيل طلبك", "error");
    bodyInput.focus();
    return;
  }

  const button =
    $("sendButton") ||
    $("sendMessageButton");

  if (button) {
    button.disabled = true;
    button.dataset.oldText = button.textContent;
    button.textContent = "جاري الإرسال...";
  }

  try {
    /*
      المستخدم العادي يرسل للأدمن فقط.
      لا يوجد اختيار للمستلم من الواجهة.
    */

    const { data: adminProfile, error: adminError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

    if (adminError) {
      throw adminError;
    }

    if (!adminProfile) {
      throw new Error(
        "لم يتم العثور على حساب الأدمن"
      );
    }

    const { error } =
      await supabase
        .from("messages")
        .insert({
          sender_id: currentUser.id,
          receiver_id: adminProfile.id,
          subject,
          body,
          is_read: false,
        });

    if (error) {
      throw error;
    }

    notify(
      "تم إرسال طلبك للأدمن بنجاح",
      "success"
    );

    subjectSelect.value = "";
    bodyInput.value = "";

    await loadMessages();

  } catch (error) {
    console.error("Send message error:", error);

    notify(
      error?.message ||
        "حدث خطأ أثناء إرسال الرسالة",
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;

      if (button.dataset.oldText) {
        button.textContent =
          button.dataset.oldText;
      }
    }
  }
}

/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages() {
  if (!currentUser || !profile) {
    return;
  }

  const list =
    $("messageList") ||
    $("messagesList") ||
    $("inboxList");

  if (!list) return;

  list.innerHTML =
    `<div class="loading">جاري تحميل الرسائل...</div>`;

  try {
    let query =
      supabase
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
        .order("created_at", {
          ascending: false,
        });

    if (currentFolder === "inbox") {
      query = query.eq(
        "receiver_id",
        currentUser.id
      );
    } else if (currentFolder === "sent") {
      query = query.eq(
        "sender_id",
        currentUser.id
      );
    }

    const { data, error } =
      await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      list.innerHTML =
        `<div class="empty">لا توجد رسائل</div>`;
      updateUnreadCount(0);
      return;
    }

    list.innerHTML = data
      .map((message) => {
        const unread =
          !message.is_read &&
          message.receiver_id ===
            currentUser.id;

        return `
          <div
            class="message-item ${unread ? "unread" : ""}"
            data-message-id="${message.id}"
            onclick="openMessage(${message.id})"
          >
            <div class="message-item-top">
              <strong>
                ${escapeHtml(
                  message.subject || "بدون عنوان"
                )}
              </strong>

              <span>
                ${escapeHtml(
                  formatDate(
                    message.created_at
                  )
                )}
              </span>
            </div>

            <div class="message-preview">
              ${escapeHtml(
                message.body
              )}
            </div>

            ${
              unread
                ? `<span class="unread-badge">جديد</span>`
                : ""
            }
          </div>
        `;
      })
      .join("");

    if (currentFolder === "inbox") {
      const unreadCount =
        data.filter(
          (message) =>
            !message.is_read
        ).length;

      updateUnreadCount(unreadCount);
    }

  } catch (error) {
    console.error("Load messages error:", error);

    list.innerHTML =
      `<div class="error">حدث خطأ أثناء تحميل الرسائل</div>`;
  }
}

function updateUnreadCount(count) {
  const elements =
    document.querySelectorAll(
      "[data-unread-count]"
    );

  elements.forEach((el) => {
    el.textContent = count;
    el.style.display =
      count > 0 ? "" : "none";
  });

  setText(
    "unreadCount",
    String(count)
  );
}

/* =========================================================
   OPEN MESSAGE
   ========================================================= */

async function openMessage(id) {
  try {
    const { data: message, error } =
      await supabase
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
        .eq("id", id)
        .single();

    if (error) {
      throw error;
    }

    if (
      message.sender_id !== currentUser.id &&
      message.receiver_id !== currentUser.id
    ) {
      throw new Error(
        "غير مسموح لك بفتح هذه الرسالة"
      );
    }

    currentMessage = message;

    if (
      message.receiver_id === currentUser.id &&
      !message.is_read
    ) {
      await supabase
        .from("messages")
        .update({
          is_read: true,
        })
        .eq("id", id)
        .eq("receiver_id", currentUser.id);

      message.is_read = true;
    }

    setText(
      "viewSubject",
      message.subject || "بدون عنوان"
    );

    setText(
      "viewBody",
      message.body || ""
    );

    setText(
      "viewDate",
      formatDate(message.created_at)
    );

    setText(
      "messageViewSubject",
      message.subject || "بدون عنوان"
    );

    setText(
      "messageViewBody",
      message.body || ""
    );

    setText(
      "messageViewDate",
      formatDate(message.created_at)
    );

    hide("listView");
    show("messageView");

    await loadMessages();

  } catch (error) {
    console.error("Open message error:", error);

    notify(
      error?.message ||
        "تعذر فتح الرسالة",
      "error"
    );
  }
}

function backToList() {
  hide("messageView");
  show("listView");

  currentMessage = null;

  loadMessages();
}

/* =========================================================
   FOLDERS
   ========================================================= */

async function changeFolder(folder) {
  currentFolder = folder;

  document
    .querySelectorAll("[data-folder]")
    .forEach((el) => {
      el.classList.toggle(
        "active",
        el.dataset.folder === folder
      );
    });

  hide("messageView");
  show("listView");

  await loadMessages();
}

/* =========================================================
   ADMIN
   ========================================================= */

async function loadUsersForAdmin() {
  if (
    !profile ||
    profile.role !== "admin"
  ) {
    return;
  }

  const select =
    $("adminReceiver") ||
    $("receiverSelect") ||
    $("adminUserSelect");

  if (!select) return;

  select.innerHTML =
    `<option value="">اختار الحساب</option>`;

  try {
    const { data, error } =
      await supabase
        .from("profiles")
        .select(
          "id,username,email,display_name,role"
        )
        .order("username", {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    (data || [])
      .filter(
        (user) =>
          user.id !== currentUser.id
      )
      .forEach((user) => {
        const option =
          document.createElement("option");

        option.value = user.id;

        option.textContent =
          `${user.display_name || user.username} — ${user.username}@nilex`;

        select.appendChild(option);
      });

  } catch (error) {
    console.error(
      "Load admin users error:",
      error
    );

    notify(
      "تعذر تحميل حسابات المستخدمين",
      "error"
    );
  }
}

async function adminSendMessage() {
  if (
    !profile ||
    profile.role !== "admin"
  ) {
    notify(
      "هذه الخاصية للأدمن فقط",
      "error"
    );
    return;
  }

  const receiver =
    $("adminReceiver") ||
    $("receiverSelect") ||
    $("adminUserSelect");

  const subject =
    $("adminSubject");

  const body =
    $("adminMessageBody");

  if (!receiver || !subject || !body) {
    notify(
      "حقول إرسال الأدمن غير موجودة",
      "error"
    );
    return;
  }

  const receiverId =
    receiver.value;

  const subjectValue =
    subject.value.trim();

  const bodyValue =
    body.value.trim();

  if (!receiverId) {
    notify(
      "اختار المستخدم",
      "error"
    );
    return;
  }

  if (!subjectValue) {
    notify(
      "اكتب عنوان الرسالة",
      "error"
    );
    return;
  }

  if (!bodyValue) {
    notify(
      "اكتب محتوى الرسالة",
      "error"
    );
    return;
  }

  try {
    const { error } =
      await supabase
        .from("messages")
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          subject: subjectValue,
          body: bodyValue,
          is_read: false,
        });

    if (error) {
      throw error;
    }

    notify(
      "تم إرسال الرسالة بنجاح",
      "success"
    );

    receiver.value = "";
    subject.value = "";
    body.value = "";

  } catch (error) {
    console.error(
      "Admin send error:",
      error
    );

    notify(
      error?.message ||
        "حدث خطأ أثناء إرسال الرسالة",
      "error"
    );
  }
}

/* =========================================================
   SERVICE URL SUPPORT
   ========================================================= */

function openService(service) {
  const encoded =
    encodeURIComponent(service);

  window.location.href =
    `mail.html?service=${encoded}`;
}

/* =========================================================
   AUTO LOGIN / SESSION
   ========================================================= */

async function init() {
  try {
    const {
      data: sessionData,
    } = await supabase.auth.getSession();

    currentUser =
      sessionData?.session?.user || null;

    if (currentUser) {
      await loadProfile();

      if (profile) {
        await showMailApp();

        if (
          profile.role === "admin"
        ) {
          await loadUsersForAdmin();
        }

        return;
      }
    }

    showLogin();

  } catch (error) {
    console.error(
      "Initialization error:",
      error
    );

    showLogin();
  }
}

/* =========================================================
   AUTH STATE
   ========================================================= */

supabase.auth.onAuthStateChange(
  async (event, session) => {
    currentUser =
      session?.user || null;

    if (!currentUser) {
      profile = null;
      return;
    }

    if (
      event === "SIGNED_IN"
    ) {
      setTimeout(async () => {
        await loadProfile();

        if (profile) {
          await showMailApp();

          if (
            profile.role === "admin"
          ) {
            await loadUsersForAdmin();
          }
        }
      }, 0);
    }
  }
);

/* =========================================================
   EVENTS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const usernameInput =
      $("signupUsername");

    if (usernameInput) {
      usernameInput.addEventListener(
        "input",
        updateInternalEmail
      );
    }

    const signupForm =
      $("signupForm");

    if (signupForm) {
      signupForm.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
          signup();
        }
      );
    }

    const loginForm =
      $("loginForm");

    if (loginForm) {
      loginForm.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
          login();
        }
      );
    }

    const sendForm =
      $("sendMessageForm");

    if (sendForm) {
      sendForm.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
          sendMessage();
        }
      );
    }

    const signupBtn =
      $("signupButton");

    if (signupBtn) {
      signupBtn.addEventListener(
        "click",
        signup
      );
    }

    const loginBtn =
      $("loginButton");

    if (loginBtn) {
      loginBtn.addEventListener(
        "click",
        login
      );
    }

    const sendBtn =
      $("sendButton");

    if (sendBtn) {
      sendBtn.addEventListener(
        "click",
        sendMessage
      );
    }

    const logoutBtn =
      $("logoutButton");

    if (logoutBtn) {
      logoutBtn.addEventListener(
        "click",
        logout
      );
    }

    const homeButtons =
      document.querySelectorAll(
        "[data-home]"
      );

    homeButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          window.location.href =
            "index.html";
        }
      );
    });

    const backButtons =
      document.querySelectorAll(
        "[data-back]"
      );

    backButtons.forEach((button) => {
      button.addEventListener(
        "click",
        backToList
      );
    });

    const folderButtons =
      document.querySelectorAll(
        "[data-folder]"
      );

    folderButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () =>
          changeFolder(
            button.dataset.folder
          )
      );
    });

    init();
  }
);

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.signup = signup;
window.login = login;
window.logout = logout;
window.openMessage = openMessage;
window.backToList = backToList;
window.changeFolder = changeFolder;
window.sendMessage = sendMessage;
window.adminSendMessage =
  adminSendMessage;
window.loadUsersForAdmin =
  loadUsersForAdmin;
window.showLogin = showLogin;
window.showSignup = showSignup;
window.openService = openService;
window.updateInternalEmail =
  updateInternalEmail;
