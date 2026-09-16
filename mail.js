```javascript
"use strict";

// =========================================================
// NILEX MAIL
// Supabase + Internal Mail
// =========================================================

const SUPABASE_URL =
  "https://loqwcsxdqgasgokfmswi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_vkNXRSYz-hz_PxJCXGwdhg__0-Jmlsx";

const CREATE_USER_FUNCTION =
  `${SUPABASE_URL}/functions/v1/bright-service`;

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// =========================================================
// GLOBAL STATE
// =========================================================

let currentUser = null;
let currentProfile = null;
let currentFolder = "inbox";
let currentMessages = [];
let adminUsers = [];

// =========================================================
// HELPERS
// =========================================================

function $(id) {
  return document.getElementById(id);
}

function show(id, visible = true) {
  const el = $(id);
  if (!el) return;

  el.style.display = visible ? "" : "none";
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text ?? "";
}

function setError(id, message) {
  const el = $(id);

  if (!el) return;

  if (!message) {
    el.textContent = "";
    el.style.display = "none";
    return;
  }

  el.textContent = message;
  el.style.display = "block";
}

function setStatus(message, type = "success") {
  const el = $("statusMessage");

  if (!el) return;

  if (!message) {
    el.textContent = "";
    el.className = "status-message";
    return;
  }

  el.textContent = message;
  el.className = `status-message ${type}`;
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function usernameToEmail(username) {
  return `${normalizeUsername(username)}@nilex.local`;
}

function emailToUsername(email) {
  return String(email || "")
    .trim()
    .replace(/@nilex(?:\.local)?$/i, "");
}

function formatDate(date) {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// =========================================================
// AUTH SCREENS
// =========================================================

function getLoginView() {
  return $("loginView") || $("loginScreen");
}

function getSignupView() {
  return $("signupView") || $("registerScreen");
}

function getMailApp() {
  return $("mailApp");
}

function showLogin() {
  const login = getLoginView();
  const signup = getSignupView();
  const app = getMailApp();

  if (login) login.style.display = "";
  if (signup) signup.style.display = "none";
  if (app) app.style.display = "none";

  setError("loginError", "");
  setError("registerError", "");
  setStatus("");

  const password = $("loginPassword");
  if (password) password.value = "";
}

function showSignup() {
  const login = getLoginView();
  const signup = getSignupView();
  const app = getMailApp();

  if (login) login.style.display = "none";
  if (signup) signup.style.display = "";
  if (app) app.style.display = "none";

  setError("loginError", "");
  setError("registerError", "");
  setStatus("");

  updateSignupEmail();
}

function showMailApp() {
  const login = getLoginView();
  const signup = getSignupView();
  const app = getMailApp();

  if (login) login.style.display = "none";
  if (signup) signup.style.display = "none";
  if (app) app.style.display = "";

  show("listView", true);
  show("messageView", false);
  show("composeView", false);

  updateAccountUI();
}

// =========================================================
// ACCOUNT UI
// =========================================================

function updateAccountUI() {
  if (!currentProfile && !currentUser) return;

  const username =
    currentProfile?.username ||
    emailToUsername(currentUser?.email) ||
    "user";

  const displayName =
    currentProfile?.display_name ||
    username;

  const email =
    currentProfile?.email ||
    currentUser?.email ||
    usernameToEmail(username);

  setText("accountName", displayName);
  setText("accountEmail", email);

  const avatar = $("profileAvatar");

  if (avatar) {
    avatar.textContent =
      displayName.charAt(0).toUpperCase() || "N";
  }

  const adminControls = $("adminControls");

  if (adminControls) {
    adminControls.style.display =
      currentProfile?.role === "admin" ? "" : "none";
  }

  document
    .querySelectorAll("[data-admin-only]")
    .forEach((el) => {
      el.style.display =
        currentProfile?.role === "admin" ? "" : "none";
    });
}

// =========================================================
// PROFILE
// =========================================================

async function loadCurrentProfile() {
  if (!currentUser) {
    currentProfile = null;
    return null;
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Profile error:", error);
    throw new Error(error.message);
  }

  currentProfile = data;

  return data;
}

// =========================================================
// SIGN UP
// =========================================================

function updateSignupEmail() {
  const usernameInput =
    $("signupUsername") ||
    $("registerUsername");

  const emailInput =
    $("signupEmail") ||
    $("registerEmailPreview");

  if (!usernameInput || !emailInput) return;

  const username = normalizeUsername(usernameInput.value);

  emailInput.value =
    username ? `${username}@nilex` : "";
}

async function registerAccount() {
  const usernameInput =
    $("signupUsername") ||
    $("registerUsername");

  const passwordInput =
    $("signupPassword") ||
    $("registerPassword");

  const button =
    $("signupButton") ||
    $("registerButton") ||
    $("createAccountButton");

  setError("registerError", "");
  setStatus("");

  const username = normalizeUsername(
    usernameInput?.value
  );

  const password =
    passwordInput?.value || "";

  if (!username) {
    setError(
      "registerError",
      "اكتب اسم المستخدم أولًا."
    );
    return;
  }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    setError(
      "registerError",
      "اسم المستخدم يجب أن يكون من 3 إلى 30 حرفًا أو رقمًا أو _"
    );
    return;
  }

  if (password.length < 6) {
    setError(
      "registerError",
      "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
    );
    return;
  }

  if (button) {
    button.disabled = true;
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

    let result = {};

    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      throw new Error(
        result.error ||
        "فشل إنشاء الحساب."
      );
    }

    // تسجيل الدخول مباشرة بعد إنشاء الحساب
    const email = usernameToEmail(username);

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw new Error(error.message);
    }

    currentUser = data.user;

    await loadCurrentProfile();

    setStatus(
      "تم إنشاء الحساب وتسجيل الدخول بنجاح.",
      "success"
    );

    showMailApp();

    await loadMessages();

  } catch (error) {
    console.error("Register error:", error);

    setError(
      "registerError",
      translateAuthError(error?.message)
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "إنشاء الحساب";
    }
  }
}

// =========================================================
// LOGIN
// =========================================================

async function loginAccount() {
  const usernameInput =
    $("loginUsername");

  const passwordInput =
    $("loginPassword");

  const button =
    $("loginButton") ||
    $("signinButton") ||
    $("loginBtn");

  setError("loginError", "");
  setStatus("");

  let loginValue =
    usernameInput?.value?.trim() || "";

  const password =
    passwordInput?.value || "";

  if (!loginValue) {
    setError(
      "loginError",
      "اكتب اسم المستخدم أو البريد الداخلي."
    );
    return;
  }

  if (!password) {
    setError(
      "loginError",
      "اكتب كلمة المرور."
    );
    return;
  }

  // دعم:
  // admin
  // admin@nilex
  // admin@nilex.local

  let email;

  if (
    loginValue.includes("@nilex.local")
  ) {
    email = loginValue;
  } else if (
    loginValue.includes("@nilex")
  ) {
    email =
      loginValue.replace(
        /@nilex$/i,
        "@nilex.local"
      );
  } else {
    email = usernameToEmail(loginValue);
  }

  if (button) {
    button.disabled = true;
    button.textContent = "جاري الدخول...";
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw new Error(error.message);
    }

    currentUser = data.user;

    await loadCurrentProfile();

    showMailApp();

    await loadMessages();

  } catch (error) {
    console.error("Login error:", error);

    setError(
      "loginError",
      translateAuthError(error?.message)
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "تسجيل الدخول";
    }
  }
}

// =========================================================
// LOGOUT
// =========================================================

async function logoutAccount() {
  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error("Logout error:", error);
  }

  currentUser = null;
  currentProfile = null;
  currentMessages = [];
  adminUsers = [];

  showLogin();
}

// =========================================================
// MESSAGES
// =========================================================

async function loadMessages() {
  if (!currentUser) return;

  const list =
    $("messagesList") ||
    $("messageList") ||
    $("inboxList");

  if (!list) return;

  list.innerHTML =
    `<div class="loading">جاري تحميل الرسائل...</div>`;

  let query =
    supabaseClient
      .from("messages")
      .select(`
        id,
        sender_id,
        receiver_id,
        subject,
        body,
        is_read,
        created_at,
        sender:profiles!messages_sender_id_fkey(
          id,
          username,
          display_name,
          email
        ),
        receiver:profiles!messages_receiver_id_fkey(
          id,
          username,
          display_name,
          email
        )
      `)
      .order("created_at", {
        ascending: false
      });

  if (currentFolder === "sent") {
    query = query.eq(
      "sender_id",
      currentUser.id
    );
  } else {
    query = query.eq(
      "receiver_id",
      currentUser.id
    );
  }

  const { data, error } =
    await query;

  if (error) {
    console.error("Messages error:", error);

    list.innerHTML =
      `<div class="error-box">
        حدث خطأ أثناء تحميل الرسائل.<br>
        ${escapeHtml(error.message)}
      </div>`;

    return;
  }

  currentMessages = data || [];

  renderMessages();
  updateUnreadCount();
}

function renderMessages() {
  const list =
    $("messagesList") ||
    $("messageList") ||
    $("inboxList");

  if (!list) return;

  if (!currentMessages.length) {
    list.innerHTML =
      `<div class="empty">
        لا توجد رسائل هنا.
      </div>`;

    return;
  }

  list.innerHTML =
    currentMessages
      .map((message) => {
        const person =
          currentFolder === "sent"
            ? message.receiver
            : message.sender;

        const personName =
          person?.display_name ||
          person?.username ||
          person?.email ||
          "مستخدم";

        const subject =
          message.subject ||
          "بدون عنوان";

        const preview =
          String(message.body || "")
            .replace(/\s+/g, " ")
            .trim();

        return `
          <div
            class="message-item ${
              message.is_read ? "" : "unread"
            }"
            data-message-id="${message.id}"
          >

            <div class="message-item-top">
              <strong>
                ${escapeHtml(personName)}
              </strong>

              <span>
                ${escapeHtml(
                  formatDate(message.created_at)
                )}
              </span>
            </div>

            <strong>
              ${escapeHtml(subject)}
            </strong>

            <div class="message-preview">
              ${escapeHtml(preview)}
            </div>

            ${
              !message.is_read &&
              currentFolder === "inbox"
                ? `<span class="unread-badge">جديدة</span>`
                : ""
            }

          </div>
        `;
      })
      .join("");

  list
    .querySelectorAll(".message-item")
    .forEach((item) => {
      item.addEventListener(
        "click",
        () => {
          const id =
            Number(item.dataset.messageId);

          openMessage(id);
        }
      );
    });
}

// =========================================================
// OPEN MESSAGE
// =========================================================

async function openMessage(id) {
  const message =
    currentMessages.find(
      (item) => Number(item.id) === Number(id)
    );

  if (!message) return;

  setText(
    "viewSubject",
    message.subject || "بدون عنوان"
  );

  setText(
    "viewDate",
    formatDate(message.created_at)
  );

  const body = $("viewBody");

  if (body) {
    body.textContent =
      message.body || "";
  }

  show("listView", false);
  show("composeView", false);
  show("messageView", true);

  if (
    !message.is_read &&
    message.receiver_id === currentUser?.id
  ) {
    const { error } =
      await supabaseClient
        .from("messages")
        .update({
          is_read: true
        })
        .eq("id", message.id)
        .eq("receiver_id", currentUser.id);

    if (!error) {
      message.is_read = true;
      updateUnreadCount();
    }
  }
}

// =========================================================
// FOLDER
// =========================================================

async function changeFolder(folder) {
  currentFolder =
    folder === "sent"
      ? "sent"
      : "inbox";

  document
    .querySelectorAll("[data-folder]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.folder === currentFolder
      );
    });

  setText(
    "folderTitle",
    currentFolder === "sent"
      ? "المرسل"
      : "الوارد"
  );

  show("messageView", false);
  show("composeView", false);
  show("listView", true);

  await loadMessages();
}

// =========================================================
// UNREAD COUNT
// =========================================================

function updateUnreadCount() {
  const count =
    currentMessages.filter(
      (message) =>
        !message.is_read &&
        message.receiver_id === currentUser?.id
    ).length;

  const el = $("inboxCount");

  if (el) {
    el.textContent = count;
  }

  document
    .querySelectorAll("[data-unread-count]")
    .forEach((item) => {
      item.textContent = count;
    });
}

// =========================================================
// COMPOSE
// =========================================================

function openCompose(isAdmin = false) {
  show("listView", false);
  show("messageView", false);
  show("composeView", true);

  const normalRecipient =
    $("normalRecipientBox");

  const adminRecipient =
    $("adminRecipientBox");

  if (isAdmin && currentProfile?.role === "admin") {
    if (normalRecipient)
      normalRecipient.style.display = "none";

    if (adminRecipient)
      adminRecipient.style.display = "";

    setText(
      "composeTitle",
      "رسالة لأي حساب"
    );

    loadAdminUsers();

  } else {
    if (normalRecipient)
      normalRecipient.style.display = "";

    if (adminRecipient)
      adminRecipient.style.display = "none";

    setText(
      "composeTitle",
      "إرسال طلبك للأدمن"
    );
  }

  setError("composeError", "");

  const subject =
    $("messageSubject");

  const body =
    $("messageBody");

  if (subject) {
    subject.value = "";
  }

  if (body) {
    body.value = "";
  }
}

function backToList() {
  show("composeView", false);
  show("messageView", false);
  show("listView", true);

  setError("composeError", "");
}

// =========================================================
// SEND NORMAL MESSAGE
// =========================================================

async function sendNormalMessage() {
  if (!currentUser) return;

  const subject =
    $("messageSubject")?.value?.trim() ||
    "";

  const body =
    $("messageBody")?.value?.trim() ||
    "";

  const button =
    $("sendButton") ||
    $("sendMessageButton");

  setError("composeError", "");

  if (!subject) {
    setError(
      "composeError",
      "اختار نوع الخدمة أولًا."
    );
    return;
  }

  if (!body) {
    setError(
      "composeError",
      "اكتب تفاصيل الرسالة."
    );
    return;
  }

  // البحث عن الأدمن
  const { data: admin, error: adminError } =
    await supabaseClient
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

  if (adminError) {
    setError(
      "composeError",
      adminError.message
    );
    return;
  }

  if (!admin) {
    setError(
      "composeError",
      "لم يتم العثور على حساب الأدمن."
    );
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "جاري الإرسال...";
  }

  try {
    const { error } =
      await supabaseClient
        .from("messages")
        .insert({
          sender_id: currentUser.id,
          receiver_id: admin.id,
          subject,
          body
        });

    if (error) {
      throw new Error(error.message);
    }

    alert("تم إرسال الرسالة بنجاح.");

    show("composeView", false);
    show("messageView", false);
    show("listView", true);

    await loadMessages();

  } catch (error) {
    console.error("Send error:", error);

    setError(
      "composeError",
      error.message ||
      "حدث خطأ أثناء إرسال الرسالة."
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "إرسال الرسالة";
    }
  }
}

// =========================================================
// ADMIN USERS
// =========================================================

async function loadAdminUsers() {
  if (currentProfile?.role !== "admin") {
    return;
  }

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select(
        "id, username, email, display_name, role"
      )
      .neq(
        "id",
        currentUser.id
      )
      .order("username");

  if (error) {
    console.error(
      "Admin users error:",
      error
    );
    return;
  }

  adminUsers = data || [];

  const select =
    $("adminReceiver") ||
    $("receiverSelect") ||
    $("adminUserSelect");

  const input =
    $("recipientInput");

  if (select) {
    select.innerHTML =
      `<option value="">
        اختر الحساب
      </option>`;

    adminUsers.forEach((user) => {
      const option =
        document.createElement("option");

      option.value = user.id;

      option.textContent =
        `${user.display_name || user.username} (${user.username})`;

      select.appendChild(option);
    });
  }

  if (input) {
    input.value = "";
    input.placeholder =
      "username أو username@nilex";
  }
}

// =========================================================
// ADMIN SEND
// =========================================================

async function adminSendMessage() {
  if (currentProfile?.role !== "admin") {
    return;
  }

  let receiverId = "";

  const select =
    $("adminReceiver") ||
    $("receiverSelect") ||
    $("adminUserSelect");

  const input =
    $("recipientInput");

  if (select) {
    receiverId = select.value;
  }

  if (!receiverId && input?.value?.trim()) {
    const value =
      normalizeUsername(input.value);

    const username =
      value.replace(
        /@nilex(?:\.local)?$/i,
        ""
      );

    const found =
      adminUsers.find(
        (user) =>
          user.username.toLowerCase() ===
          username.toLowerCase()
      );

    if (found) {
      receiverId = found.id;
    }
  }

  const subject =
    $("adminSubject")?.value?.trim() ||
    $("messageSubject")?.value?.trim() ||
    "";

  const body =
    $("adminMessageBody")?.value?.trim() ||
    $("messageBody")?.value?.trim() ||
    "";

  setError("composeError", "");

  if (!receiverId) {
    setError(
      "composeError",
      "اختار الحساب المستلم."
    );
    return;
  }

  if (!subject) {
    setError(
      "composeError",
      "اكتب عنوان الرسالة."
    );
    return;
  }

  if (!body) {
    setError(
      "composeError",
      "اكتب محتوى الرسالة."
    );
    return;
  }

  const button =
    $("adminSendButton") ||
    $("sendButton");

  if (button) {
    button.disabled = true;
    button.textContent =
      "جاري الإرسال...";
  }

  try {
    const { error } =
      await supabaseClient
        .from("messages")
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          subject,
          body
        });

    if (error) {
      throw new Error(error.message);
    }

    alert("تم إرسال الرسالة.");

    backToList();

    await loadMessages();

  } catch (error) {
    console.error(
      "Admin send error:",
      error
    );

    setError(
      "composeError",
      error.message ||
      "حدث خطأ أثناء الإرسال."
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "إرسال الرسالة";
    }
  }
}

// =========================================================
// SERVICE SELECT
// =========================================================

function setupServiceSelect() {
  const select =
    $("messageSubject");

  if (!select) return;

  // لو جاي من index.html بخدمة محددة
  const params =
    new URLSearchParams(
      window.location.search
    );

  const service =
    params.get("service");

  if (service) {
    const option =
      Array.from(
        select.options
      ).find(
        (item) =>
          item.textContent.trim() ===
          service.trim()
      );

    if (option) {
      select.value =
        option.value;
    }
  }
}

// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEvents() {

  // -------------------------
  // Login
  // -------------------------

  const loginButton =
    $("loginButton") ||
    $("signinButton") ||
    $("loginBtn");

  if (loginButton) {
    loginButton.addEventListener(
      "click",
      loginAccount
    );
  }

  // Enter في تسجيل الدخول
  $("loginUsername")?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        loginAccount();
      }
    }
  );

  $("loginPassword")?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        loginAccount();
      }
    }
  );

  // -------------------------
  // Signup
  // -------------------------

  const signupButton =
    $("signupButton") ||
    $("registerButton") ||
    $("createAccountButton");

  if (signupButton) {
    signupButton.addEventListener(
      "click",
      registerAccount
    );
  }

  const signupUsername =
    $("signupUsername") ||
    $("registerUsername");

  if (signupUsername) {
    signupUsername.addEventListener(
      "input",
      updateSignupEmail
    );
  }

  // -------------------------
  // Show signup
  // -------------------------

  const showRegister =
    $("showRegisterBtn");

  if (showRegister) {
    showRegister.addEventListener(
      "click",
      showSignup
    );
  }

  // -------------------------
  // Back login
  // -------------------------

  const backLogin =
    $("backLoginBtn");

  if (backLogin) {
    backLogin.addEventListener(
      "click",
      showLogin
    );
  }

  // -------------------------
  // Logout
  // -------------------------

  const logoutButton =
    $("logoutButton") ||
    $("logoutBtn");

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      logoutAccount
    );
  }

  // -------------------------
  // New message
  // -------------------------

  const newMessage =
    $("newMessageBtn");

  if (newMessage) {
    newMessage.addEventListener(
      "click",
      () => openCompose(false)
    );
  }

  // -------------------------
  // Admin compose
  // -------------------------

  const adminCompose =
    $("adminComposeBtn");

  if (adminCompose) {
    adminCompose.addEventListener(
      "click",
      () => openCompose(true)
    );
  }

  // -------------------------
  // Send
  // -------------------------

  const sendButton =
    $("sendButton") ||
    $("sendMessageButton");

  if (sendButton) {
    sendButton.addEventListener(
      "click",
      async () => {

        if (
          currentProfile?.role === "admin" &&
          (
            $("adminSubject") ||
            $("adminMessageBody") ||
            $("adminReceiver") ||
            $("receiverSelect") ||
            $("adminUserSelect")
          )
        ) {
          await adminSendMessage();
        } else {
          await sendNormalMessage();
        }

      }
    );
  }

  // -------------------------
  // Refresh
  // -------------------------

  const refreshButton =
    $("refreshBtn");

  if (refreshButton) {
    refreshButton.addEventListener(
      "click",
      loadMessages
    );
  }

  // -------------------------
  // Folders
  // -------------------------

  document
    .querySelectorAll("[data-folder]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          changeFolder(
            button.dataset.folder
          );
        }
      );
    });

  // -------------------------
  // Back
  // -------------------------

  document
    .querySelectorAll("[data-back]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        backToList
      );
    });

  // -------------------------
  // Home
  // -------------------------

  document
    .querySelectorAll("[data-home]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          window.location.href =
            "index.html";
        }
      );
    });

  // -------------------------
  // Global home buttons
  // -------------------------

  const homeButton =
    $("homeBtn");

  if (homeButton) {
    homeButton.addEventListener(
      "click",
      () => {
        window.location.href =
          "index.html";
      }
    );
  }
}

// =========================================================
// AUTH STATE
// =========================================================

async function restoreSession() {
  try {
    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "Session error:",
        error
      );

      showLogin();
      return;
    }

    currentUser =
      data?.session?.user || null;

    if (!currentUser) {
      showLogin();
      return;
    }

    try {
      await loadCurrentProfile();
    } catch (profileError) {
      console.error(
        "Profile loading failed:",
        profileError
      );
    }

    showMailApp();

    await loadMessages();

  } catch (error) {
    console.error(
      "Restore session error:",
      error
    );

    showLogin();
  }
}

// =========================================================
// AUTH LISTENER
// =========================================================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    if (
      event === "SIGNED_OUT"
    ) {
      currentUser = null;
      currentProfile = null;

      showLogin();
      return;
    }

    if (
      event === "SIGNED_IN" &&
      session?.user
    ) {
      currentUser =
        session.user;

      try {
        await loadCurrentProfile();
      } catch (error) {
        console.error(
          "Auth profile error:",
          error
        );
      }

      showMailApp();

      await loadMessages();
    }
  }
);

// =========================================================
// ERROR TRANSLATION
// =========================================================

function translateAuthError(message) {
  const text =
    String(message || "");

  const lower =
    text.toLowerCase();

  if (
    lower.includes(
      "invalid login credentials"
    )
  ) {
    return "اسم المستخدم أو كلمة المرور غير صحيحة.";
  }

  if (
    lower.includes(
      "user already registered"
    )
  ) {
    return "الحساب موجود بالفعل.";
  }

  if (
    lower.includes(
      "email rate limit"
    )
  ) {
    return "تم تجاوز حد إرسال البريد. جرّب مرة أخرى لاحقًا.";
  }

  if (
    lower.includes(
      "password should be at least"
    )
  ) {
    return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
  }

  if (
    lower.includes(
      "email not confirmed"
    )
  ) {
    return "الحساب لم يتم تأكيده.";
  }

  if (
    lower.includes(
      "failed to fetch"
    )
  ) {
    return "تعذر الاتصال بالخادم. تأكد من الإنترنت.";
  }

  return text || "حدث خطأ غير معروف.";
}

// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupEvents();

    setupServiceSelect();

    updateSignupEmail();

    await restoreSession();

  }
);

// =========================================================
// GLOBAL FUNCTIONS
// =========================================================

window.showLogin = showLogin;
window.showSignup = showSignup;
window.registerAccount = registerAccount;
window.loginAccount = loginAccount;
window.logoutAccount = logoutAccount;
window.openCompose = openCompose;
window.backToList = backToList;
window.loadMessages = loadMessages;
window.openMessage = openMessage;
window.changeFolder = changeFolder;
window.sendNormalMessage = sendNormalMessage;
window.adminSendMessage = adminSendMessage;
```
