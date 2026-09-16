const SUPABASE_URL =
  "https://loqwcsxdqgasgokfmswi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_vkNXRSYz-hz_PxJCXGwdhg__0-Jmlsx";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// =========================================================
// Helpers
// =========================================================

const $ = (id) => document.getElementById(id);

let currentUser = null;
let currentProfile = null;
let currentFolder = "inbox";
let currentMessages = [];
let selectedMessage = null;

function normalizeUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .replace("@nilex.local", "")
    .replace("@nilex", "");
}

function setError(id, message = "") {
  const el = $(id);
  if (!el) return;

  el.textContent = message;
  el.style.display = message ? "block" : "none";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date) {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function getDisplayName(profile) {
  if (!profile) return "مستخدم NILEX";

  return (
    profile.display_name ||
    profile.username ||
    profile.email ||
    "مستخدم NILEX"
  );
}

function getInternalEmail(profile) {
  if (!profile) return "";

  if (profile.email) {
    return profile.email.replace("@nilex.local", "@nilex");
  }

  if (profile.username) {
    return `${profile.username}@nilex`;
  }

  return "";
}

// =========================================================
// Screens
// =========================================================

function showScreen(screenId) {
  const screens = [
    "loginScreen",
    "registerScreen",
    "mailScreen"
  ];

  screens.forEach((id) => {
    const el = $(id);

    if (!el) return;

    el.style.display = id === screenId ? "flex" : "none";
  });
}

function showLogin() {
  showScreen("loginScreen");

  setError("loginError");

  if ($("loginPassword")) {
    $("loginPassword").value = "";
  }
}

function showRegister() {
  showScreen("registerScreen");

  setError("registerError");

  if ($("registerUsername")) {
    $("registerUsername").value = "";
  }

  if ($("registerDisplayName")) {
    $("registerDisplayName").value = "";
  }

  if ($("registerPassword")) {
    $("registerPassword").value = "";
  }
}

// =========================================================
// Login
// =========================================================

async function login() {
  setError("loginError");

  const raw = $("loginUsername")?.value.trim();
  const password = $("loginPassword")?.value || "";

  if (!raw || !password) {
    setError(
      "loginError",
      "اكتب اسم المستخدم وكلمة المرور."
    );
    return;
  }

  let email = raw.toLowerCase();

  if (!email.includes("@")) {
    email = `${normalizeUsername(email)}@nilex.local`;
  } else if (email.endsWith("@nilex")) {
    email = email.replace("@nilex", "@nilex.local");
  }

  const button = $("loginBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "جاري الدخول...";
  }

  try {
    const { data, error } =
      await db.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      console.error(error);

      setError(
        "loginError",
        "اسم المستخدم أو كلمة المرور غلط."
      );

      return;
    }

    if (!data?.user) {
      setError(
        "loginError",
        "تعذر تسجيل الدخول."
      );

      return;
    }

    currentUser = data.user;

    await loadUserProfile();

    showScreen("mailScreen");

    await initializeMail();
  } catch (err) {
    console.error(err);

    setError(
      "loginError",
      "حصل خطأ أثناء تسجيل الدخول."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "تسجيل الدخول";
    }
  }
}

// =========================================================
// Register
// =========================================================

async function register() {
  setError("registerError");

  const username = normalizeUsername(
    $("registerUsername")?.value || ""
  );

  const displayName =
    $("registerDisplayName")?.value.trim() || "";

  const password =
    $("registerPassword")?.value || "";

  if (!username || !displayName || !password) {
    setError(
      "registerError",
      "املأ جميع البيانات."
    );
    return;
  }

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    setError(
      "registerError",
      "اسم المستخدم يجب أن يكون 3 إلى 30 حرفًا، باستخدام الإنجليزية والأرقام و . _ - فقط."
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

  const email = `${username}@nilex.local`;

  const button = $("registerBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "جاري إنشاء الحساب...";
  }

  try {
    const {
      data,
      error
    } = await db.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error(error);

      let message =
        "تعذر إنشاء الحساب.";

      if (
        error.message &&
        error.message.toLowerCase().includes("already registered")
      ) {
        message = "اسم المستخدم ده مستخدم بالفعل.";
      }

      setError(
        "registerError",
        message
      );

      return;
    }

    if (!data?.user) {
      setError(
        "registerError",
        "تعذر إنشاء الحساب."
      );
      return;
    }

    if (!data.session) {
      setError(
        "registerError",
        "تم إنشاء الحساب، لكن تأكيد البريد الإلكتروني مفعّل في Supabase. عطّله من إعدادات Authentication حتى يتم الدخول مباشرة."
      );

      return;
    }

    currentUser = data.user;

    const {
      error: profileError
    } = await db
      .from("profiles")
      .insert({
        id: data.user.id,
        username,
        email,
        display_name: displayName,
        role: "user"
      });

    if (profileError) {
      console.error(profileError);

      setError(
        "registerError",
        "تم إنشاء الحساب لكن حدث خطأ أثناء إنشاء بيانات الحساب."
      );

      return;
    }

    await loadUserProfile();

    showScreen("mailScreen");

    await initializeMail();
  } catch (err) {
    console.error(err);

    setError(
      "registerError",
      "حصل خطأ أثناء إنشاء الحساب."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "إنشاء الحساب";
    }
  }
}

// =========================================================
// Profile
// =========================================================

async function loadUserProfile() {
  if (!currentUser) return null;

  const {
    data,
    error
  } = await db
    .from("profiles")
    .select(
      "id, username, email, display_name, role, created_at"
    )
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Profile error:", error);
    return null;
  }

  currentProfile = data;

  return data;
}

// =========================================================
// Admin
// =========================================================

async function findAdmin() {
  const {
    data,
    error
  } = await db
    .from("profiles")
    .select(
      "id, username, email, display_name, role"
    )
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Find admin error:", error);
    return null;
  }

  return data;
}

// =========================================================
// Find User
// =========================================================

async function findRecipient(value) {
  const raw = value.trim().toLowerCase();

  if (!raw) return null;

  let result;

  if (raw.includes("@")) {
    let email = raw;

    if (email.endsWith("@nilex")) {
      email = email.replace("@nilex", "@nilex.local");
    }

    result = await db
      .from("profiles")
      .select(
        "id, username, email, display_name, role"
      )
      .eq("email", email)
      .maybeSingle();
  } else {
    const username = normalizeUsername(raw);

    result = await db
      .from("profiles")
      .select(
        "id, username, email, display_name, role"
      )
      .eq("username", username)
      .maybeSingle();
  }

  if (result.error) {
    console.error("Find recipient error:", result.error);
    return null;
  }

  return result.data;
}

// =========================================================
// Send Message
// =========================================================

async function sendMessage() {
  setError("composeError");

  if (!currentUser || !currentProfile) {
    setError(
      "composeError",
      "لازم تسجل الدخول أولًا."
    );
    return;
  }

  const subject =
    $("subjectInput")?.value.trim() || "";

  const body =
    $("bodyInput")?.value.trim() || "";

  if (!body) {
    setError(
      "composeError",
      "اكتب محتوى الرسالة."
    );
    return;
  }

  let recipient = null;

  if (currentProfile.role === "admin") {
    const recipientInput =
      $("recipientInput")?.value.trim() || "";

    if (!recipientInput) {
      setError(
        "composeError",
        "اكتب اسم المستخدم أو البريد الداخلي للمستلم."
      );
      return;
    }

    recipient = await findRecipient(
      recipientInput
    );

    if (!recipient) {
      setError(
        "composeError",
        "المستخدم ده مش موجود."
      );
      return;
    }

    if (recipient.id === currentUser.id) {
      setError(
        "composeError",
        "لا يمكن إرسال رسالة لنفس الحساب."
      );
      return;
    }
  } else {
    recipient = await findAdmin();

    if (!recipient) {
      setError(
        "composeError",
        "تعذر العثور على حساب الأدمن."
      );
      return;
    }
  }

  const button = $("sendMessageBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "جاري الإرسال...";
  }

  try {
    const {
      error
    } = await db
      .from("messages")
      .insert({
        sender_id: currentUser.id,
        receiver_id: recipient.id,
        subject,
        body
      });

    if (error) {
      console.error("Send message error:", error);

      setError(
        "composeError",
        "حصل خطأ أثناء إرسال الرسالة."
      );

      return;
    }

    if ($("subjectInput")) {
      $("subjectInput").value = "";
    }

    if ($("bodyInput")) {
      $("bodyInput").value = "";
    }

    if (
      currentProfile.role === "admin" &&
      $("recipientInput")
    ) {
      $("recipientInput").value = "";
    }

    setError("composeError");

    await loadMessages();

    showListView();
  } catch (err) {
    console.error(err);

    setError(
      "composeError",
      "حصل خطأ أثناء إرسال الرسالة."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "إرسال الرسالة";
    }
  }
}

// =========================================================
// Messages
// =========================================================

const messageSelect = `
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
    email,
    display_name
  ),
  receiver:profiles!messages_receiver_id_fkey(
    id,
    username,
    email,
    display_name
  )
`;

async function loadMessages() {
  if (!currentUser) return;

  const list = $("messagesList");

  if (list) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⌛</div>
        <p>جاري تحميل الرسائل...</p>
      </div>
    `;
  }

  try {
    let query = db
      .from("messages")
      .select(messageSelect)
      .order("created_at", {
        ascending: false
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

    const {
      data,
      error
    } = await query;

    if (error) {
      console.error("Load messages error:", error);

      if (list) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">!</div>
            <p>حصل خطأ أثناء تحميل الرسائل.</p>
          </div>
        `;
      }

      return;
    }

    currentMessages = data || [];

    renderMessages();

    await updateInboxCount();
  } catch (err) {
    console.error(err);
  }
}

function renderMessages() {
  const list = $("messagesList");

  if (!list) return;

  if (!currentMessages.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✉</div>
        <p>${
          currentFolder === "inbox"
            ? "مفيش رسائل واردة."
            : "مفيش رسائل مرسلة."
        }</p>
      </div>
    `;

    return;
  }

  list.innerHTML = currentMessages
    .map((message) => {
      const otherProfile =
        currentFolder === "inbox"
          ? message.sender
          : message.receiver;

      const name =
        getDisplayName(otherProfile);

      const internalEmail =
        getInternalEmail(otherProfile);

      const unread =
        currentFolder === "inbox" &&
        !message.is_read;

      return `
        <button
          class="message-row ${
            unread ? "unread" : ""
          }"
          data-message-id="${message.id}"
          type="button"
        >
          <div class="message-avatar">
            ${escapeHtml(
              name.charAt(0).toUpperCase()
            )}
          </div>

          <div class="message-main">
            <div class="message-top">
              <strong>
                ${escapeHtml(name)}
              </strong>

              <span class="message-date">
                ${escapeHtml(
                  formatDate(message.created_at)
                )}
              </span>
            </div>

            <div class="message-email">
              ${escapeHtml(internalEmail)}
            </div>

            <div class="message-subject">
              ${
                escapeHtml(
                  message.subject || "بدون عنوان"
                )
              }
            </div>

            <div class="message-preview">
              ${escapeHtml(
                message.body.substring(0, 120)
              )}
              ${
                message.body.length > 120
                  ? "..."
                  : ""
              }
            </div>
          </div>
        </button>
      `;
    })
    .join("");

  list
    .querySelectorAll(".message-row")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const id = Number(
            button.dataset.messageId
          );

          openMessage(id);
        }
      );
    });
}

// =========================================================
// Open Message
// =========================================================

async function openMessage(id) {
  const message =
    currentMessages.find(
      (item) => Number(item.id) === id
    );

  if (!message) return;

  selectedMessage = message;

  if (
    currentFolder === "inbox" &&
    !message.is_read &&
    message.receiver_id === currentUser.id
  ) {
    const {
      error
    } = await db
      .from("messages")
      .update({
        is_read: true
      })
      .eq("id", message.id)
      .eq(
        "receiver_id",
        currentUser.id
      );

    if (error) {
      console.error(
        "Mark read error:",
        error
      );
    } else {
      message.is_read = true;
    }
  }

  renderMessageContent();

  const listView = $("listView");
  const messageView = $("messageView");

  if (listView) {
    listView.style.display = "none";
  }

  if (messageView) {
    messageView.style.display = "block";
  }

  await updateInboxCount();
  renderMessages();
}

function renderMessageContent() {
  const container =
    $("messageContent");

  if (!container || !selectedMessage) {
    return;
  }

  const message = selectedMessage;

  const senderName =
    getDisplayName(message.sender);

  const senderEmail =
    getInternalEmail(message.sender);

  const receiverName =
    getDisplayName(message.receiver);

  const receiverEmail =
    getInternalEmail(message.receiver);

  container.innerHTML = `
    <div class="message-full">
      <div class="message-full-head">
        <div class="message-full-avatar">
          ${escapeHtml(
            senderName.charAt(0).toUpperCase()
          )}
        </div>

        <div class="message-full-info">
          <h2>
            ${escapeHtml(
              message.subject || "بدون عنوان"
            )}
          </h2>

          <div class="message-meta">
            <strong>
              ${escapeHtml(senderName)}
            </strong>

            <span>
              ${escapeHtml(senderEmail)}
            </span>

            <span>→</span>

            <span>
              ${escapeHtml(receiverEmail || receiverName)}
            </span>

            <span>
              ${escapeHtml(
                formatDate(message.created_at)
              )}
            </span>
          </div>
        </div>
      </div>

      <div class="message-full-body">
        ${escapeHtml(message.body).replace(
          /\n/g,
          "<br>"
        )}
      </div>
    </div>
  `;
}

// =========================================================
// Inbox Count
// =========================================================

async function updateInboxCount() {
  if (!currentUser) return;

  const {
    count,
    error
  } = await db
    .from("messages")
    .select("id", {
      count: "exact",
      head: true
    })
    .eq(
      "receiver_id",
      currentUser.id
    )
    .eq("is_read", false);

  if (error) {
    console.error(
      "Inbox count error:",
      error
    );

    return;
  }

  const countElement =
    $("inboxCount");

  if (!countElement) return;

  const total = count || 0;

  countElement.textContent =
    total > 99 ? "99+" : String(total);

  countElement.style.display =
    total > 0 ? "inline-flex" : "none";
}

// =========================================================
// Folder
// =========================================================

async function changeFolder(folder) {
  if (
    folder !== "inbox" &&
    folder !== "sent"
  ) {
    return;
  }

  currentFolder = folder;

  const title =
    $("folderTitle");

  if (title) {
    title.textContent =
      folder === "inbox"
        ? "الوارد"
        : "المرسل";
  }

  document
    .querySelectorAll(".folder-btn")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.folder === folder
      );
    });

  showListView();

  await loadMessages();
}

// =========================================================
// Views
// =========================================================

function showListView() {
  const listView = $("listView");
  const messageView = $("messageView");
  const composeView = $("composeView");

  if (listView) {
    listView.style.display = "block";
  }

  if (messageView) {
    messageView.style.display = "none";
  }

  if (composeView) {
    composeView.style.display = "none";
  }

  selectedMessage = null;
}

function showCompose() {
  const listView = $("listView");
  const messageView = $("messageView");
  const composeView = $("composeView");

  if (listView) {
    listView.style.display = "none";
  }

  if (messageView) {
    messageView.style.display = "none";
  }

  if (composeView) {
    composeView.style.display = "block";
  }

  setError("composeError");

  const composeTitle =
    $("composeTitle");

  if (composeTitle) {
    composeTitle.textContent =
      currentProfile?.role === "admin"
        ? "رسالة جديدة"
        : "إرسال طلبك للأدمن";
  }

  const recipientBox =
    $("recipientBox");

  if (recipientBox) {
    recipientBox.style.display =
      currentProfile?.role === "admin"
        ? "block"
        : "none";
  }

  if (
    currentProfile?.role !== "admin" &&
    $("recipientInput")
  ) {
    $("recipientInput").value =
      "admin@nilex";

    $("recipientInput").disabled = true;
  } else if ($("recipientInput")) {
    $("recipientInput").disabled = false;
    $("recipientInput").value = "";
  }

  if ($("subjectInput")) {
    $("subjectInput").value = "";
  }

  if ($("bodyInput")) {
    $("bodyInput").value = "";
  }
}

// =========================================================
// UI Setup
// =========================================================

function setupUI() {
  $("showRegisterBtn")?.addEventListener(
    "click",
    showRegister
  );

  $("backLoginBtn")?.addEventListener(
    "click",
    showLogin
  );

  $("loginBtn")?.addEventListener(
    "click",
    login
  );

  $("registerBtn")?.addEventListener(
    "click",
    register
  );

  $("loginPassword")?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        login();
      }
    }
  );

  $("registerPassword")?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        register();
      }
    }
  );

  document
    .querySelectorAll(".folder-btn")
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

  $("newMessageBtn")?.addEventListener(
    "click",
    showCompose
  );

  $("adminComposeBtn")?.addEventListener(
    "click",
    showCompose
  );

  $("cancelComposeBtn")?.addEventListener(
    "click",
    showListView
  );

  $("backToListBtn")?.addEventListener(
    "click",
    showListView
  );

  $("sendMessageBtn")?.addEventListener(
    "click",
    sendMessage
  );

  $("refreshBtn")?.addEventListener(
    "click",
    async () => {
      await loadMessages();
    }
  );

  $("homeBtn")?.addEventListener(
    "click",
    () => {
      window.location.href = "index.html";
    }
  );

  $("logoutBtn")?.addEventListener(
    "click",
    logout
  );
}

// =========================================================
// Initialize Mail
// =========================================================

async function initializeMail() {
  if (!currentUser) return;

  await loadUserProfile();

  if (!currentProfile) {
    console.error(
      "No profile found for current user."
    );

    return;
  }

  const welcome =
    $("welcomeText");

  if (welcome) {
    welcome.textContent =
      `أهلاً ${getDisplayName(currentProfile)}`;
  }

  const profileEmail =
    $("profileEmail");

  if (profileEmail) {
    profileEmail.textContent =
      getInternalEmail(currentProfile);
  }

  const avatar =
    $("profileAvatar");

  if (avatar) {
    avatar.textContent =
      getDisplayName(
        currentProfile
      )
        .charAt(0)
        .toUpperCase();
  }

  const adminControls =
    $("adminControls");

  if (adminControls) {
    adminControls.style.display =
      currentProfile.role === "admin"
        ? "block"
        : "none";
  }

  await changeFolder("inbox");
}

// =========================================================
// Logout
// =========================================================

async function logout() {
  try {
    await db.auth.signOut();
  } catch (error) {
    console.error(error);
  }

  currentUser = null;
  currentProfile = null;
  currentMessages = [];
  selectedMessage = null;

  showLogin();
}

// =========================================================
// Auth State
// =========================================================

async function checkSession() {
  try {
    const {
      data,
      error
    } = await db.auth.getSession();

    if (error) {
      console.error(
        "Session error:",
        error
      );

      showLogin();
      return;
    }

    if (data?.session?.user) {
      currentUser =
        data.session.user;

      await loadUserProfile();

      if (currentProfile) {
        showScreen("mailScreen");
        await initializeMail();
      } else {
        await db.auth.signOut();
        showLogin();
      }
    } else {
      showLogin();
    }
  } catch (error) {
    console.error(error);
    showLogin();
  }
}

// =========================================================
// Supabase Auth Listener
// =========================================================

db.auth.onAuthStateChange(
  async (event, session) => {
    if (
      event === "SIGNED_OUT"
    ) {
      currentUser = null;
      currentProfile = null;
      currentMessages = [];
      selectedMessage = null;

      showLogin();
      return;
    }

    if (
      session?.user &&
      (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION"
      )
    ) {
      currentUser = session.user;

      await loadUserProfile();

      if (currentProfile) {
        showScreen("mailScreen");
        await initializeMail();
      }
    }
  }
);

// =========================================================
// Start
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupUI();
    await checkSession();
  }
);
