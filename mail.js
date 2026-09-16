// =========================================================
// NILEX INTERNAL MAIL
// =========================================================

// =========================================================
// SUPABASE
// =========================================================

const SUPABASE_URL =
  "https://loqwcsxdqgasgokfmswi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_vkNXRSYz-hz_PxJCXGwdhg__0-Jmlsx";

const supabaseClient =
  window.supabase.createClient(
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


// =========================================================
// ELEMENTS
// =========================================================

const loginView =
  document.getElementById("loginView");

const signupView =
  document.getElementById("signupView");

const mailApp =
  document.getElementById("mailApp");

const loginUsername =
  document.getElementById("loginUsername");

const loginPassword =
  document.getElementById("loginPassword");

const loginButton =
  document.getElementById("loginButton");

const showRegisterBtn =
  document.getElementById("showRegisterBtn");

const backLoginBtn =
  document.getElementById("backLoginBtn");

const signupUsername =
  document.getElementById("signupUsername");

const signupEmail =
  document.getElementById("signupEmail");

const signupPassword =
  document.getElementById("signupPassword");

const signupButton =
  document.getElementById("signupButton");

const loginError =
  document.getElementById("loginError");

const registerError =
  document.getElementById("registerError");

const statusMessage =
  document.getElementById("statusMessage");

const accountName =
  document.getElementById("accountName");

const accountEmail =
  document.getElementById("accountEmail");

const profileAvatar =
  document.getElementById("profileAvatar");

const logoutButton =
  document.getElementById("logoutButton");

const homeBtn =
  document.getElementById("homeBtn");

const newMessageBtn =
  document.getElementById("newMessageBtn");

const adminComposeBtn =
  document.getElementById("adminComposeBtn");

const adminControls =
  document.getElementById("adminControls");

const listView =
  document.getElementById("listView");

const messageView =
  document.getElementById("messageView");

const composeView =
  document.getElementById("composeView");

const messagesList =
  document.getElementById("messagesList");

const folderTitle =
  document.getElementById("folderTitle");

const inboxCount =
  document.getElementById("inboxCount");

const refreshBtn =
  document.getElementById("refreshBtn");

const backToListBtn =
  document.getElementById("backToListBtn");

const composeTitle =
  document.getElementById("composeTitle");

const normalRecipientBox =
  document.getElementById("normalRecipientBox");

const adminRecipientBox =
  document.getElementById("adminRecipientBox");

const adminReceiver =
  document.getElementById("adminReceiver");

const messageSubject =
  document.getElementById("messageSubject");

const adminSubjectBox =
  document.getElementById("adminSubjectBox");

const adminSubject =
  document.getElementById("adminSubject");

const messageBody =
  document.getElementById("messageBody");

const adminMessageBody =
  document.getElementById("adminMessageBody");

const composeError =
  document.getElementById("composeError");

const cancelComposeBtn =
  document.getElementById("cancelComposeBtn");

const sendButton =
  document.getElementById("sendButton");


// =========================================================
// STATE
// =========================================================

let currentUser = null;
let currentProfile = null;
let adminUserId = null;
let currentFolder = "inbox";
let adminMode = false;


// =========================================================
// HELPERS
// =========================================================

function showOnly(view) {

  if (loginView) {
    loginView.style.display =
      view === "login"
        ? ""
        : "none";
  }

  if (signupView) {
    signupView.style.display =
      view === "signup"
        ? ""
        : "none";
  }

  if (mailApp) {
    mailApp.style.display =
      view === "app"
        ? ""
        : "none";
  }
}


function setLoginError(message = "") {

  if (loginError) {
    loginError.textContent = message;
  }
}


function setRegisterError(message = "") {

  if (registerError) {
    registerError.textContent = message;
  }
}


function setComposeError(message = "") {

  if (composeError) {
    composeError.textContent = message;
  }
}


function setStatus(message = "") {

  if (statusMessage) {
    statusMessage.textContent = message;
  }
}


function normalizeUsername(value) {

  return String(value || "")
    .trim()
    .toLowerCase();
}


function getInternalEmail(username) {

  const clean =
    normalizeUsername(username);

  if (!clean) {
    return "";
  }

  return `${clean}@nilex`;
}


function getAuthEmail(username) {

  const clean =
    normalizeUsername(username);

  if (!clean) {
    return "";
  }

  return `${clean}@nilex.local`;
}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatDate(dateValue) {

  if (!dateValue) {
    return "";
  }

  const date =
    new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}


// =========================================================
// INTERNAL EMAIL PREVIEW
// =========================================================

if (signupUsername && signupEmail) {

  signupUsername.addEventListener(
    "input",
    function () {

      const username =
        normalizeUsername(
          signupUsername.value
        );

      signupEmail.value =
        username
          ? `${username}@nilex`
          : "";
    }
  );
}


// =========================================================
// SHOW LOGIN
// =========================================================

function showLogin() {

  setRegisterError("");
  setLoginError("");
  setStatus("");

  showOnly("login");
}


function showRegister() {

  setLoginError("");
  setStatus("");

  if (signupUsername) {
    signupUsername.value = "";
  }

  if (signupEmail) {
    signupEmail.value = "";
  }

  if (signupPassword) {
    signupPassword.value = "";
  }

  setRegisterError("");

  showOnly("signup");
}


// =========================================================
// REGISTER
// =========================================================

async function registerUser() {

  setRegisterError("");
  setStatus("");

  const username =
    normalizeUsername(
      signupUsername?.value
    );

  const password =
    String(
      signupPassword?.value || ""
    );

  if (!username) {

    setRegisterError(
      "اكتب اسم المستخدم."
    );

    return;
  }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {

    setRegisterError(
      "اسم المستخدم يجب أن يكون من 3 إلى 30 حرفًا أو رقمًا أو _"
    );

    return;
  }

  if (password.length < 6) {

    setRegisterError(
      "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
    );

    return;
  }

  const internalEmail =
    getInternalEmail(username);

  if (signupEmail) {
    signupEmail.value =
      internalEmail;
  }

  const originalText =
    signupButton.textContent;

  signupButton.disabled = true;

  signupButton.textContent =
    "جاري إنشاء الحساب...";

  try {

    console.log(
      "REGISTER START:",
      username
    );

    const response =
      await fetch(
        `${SUPABASE_URL}/functions/v1/bright-service`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "apikey":
              SUPABASE_PUBLISHABLE_KEY
          },

          body: JSON.stringify({
            username,
            password
          })
        }
      );

    let result = null;

    try {
      result =
        await response.json();
    } catch {
      result = null;
    }

    console.log(
      "REGISTER RESPONSE:",
      response.status,
      result
    );

    if (!response.ok) {

      throw new Error(
        result?.error ||
        `خطأ من الخادم (${response.status})`
      );
    }

    if (!result?.success) {

      throw new Error(
        result?.error ||
        "فشل إنشاء الحساب."
      );
    }

    // ==========================================
    // LOGIN AFTER REGISTRATION
    // ==========================================

    const authEmail =
      getAuthEmail(username);

    const {
      data: loginData,
      error: loginErrorResult
    } =
      await supabaseClient.auth.signInWithPassword(
        {
          email: authEmail,
          password
        }
      );

    if (loginErrorResult) {
      throw loginErrorResult;
    }

    if (!loginData?.user) {
      throw new Error(
        "تم إنشاء الحساب لكن لم يتم تسجيل الدخول تلقائيًا."
      );
    }

    currentUser =
      loginData.user;

    await loadCurrentProfile();

    showOnly("app");

    await initializeMailApp();

  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );

    setRegisterError(
      error?.message ||
      "حدث خطأ أثناء إنشاء الحساب."
    );

  } finally {

    signupButton.disabled = false;

    signupButton.textContent =
      originalText;
  }
}


// =========================================================
// LOGIN
// =========================================================

async function loginUser() {

  setLoginError("");
  setStatus("");

  let usernameOrEmail =
    String(
      loginUsername?.value || ""
    ).trim();

  const password =
    String(
      loginPassword?.value || ""
    );

  if (!usernameOrEmail) {

    setLoginError(
      "اكتب اسم المستخدم أو البريد."
    );

    return;
  }

  if (!password) {

    setLoginError(
      "اكتب كلمة المرور."
    );

    return;
  }

  const originalText =
    loginButton.textContent;

  loginButton.disabled = true;

  loginButton.textContent =
    "جاري تسجيل الدخول...";

  try {

    let authEmail =
      usernameOrEmail;

    // ==========================================
    // Convert internal email
    // islam@nilex
    // to
    // islam@nilex.local
    // ==========================================

    if (
      authEmail
        .toLowerCase()
        .endsWith("@nilex")
    ) {

      authEmail =
        authEmail.slice(
          0,
          -("@nilex".length)
        ) + "@nilex.local";
    }

    // ==========================================
    // Plain username
    // ==========================================

    if (
      !authEmail.includes("@")
    ) {

      authEmail =
        getAuthEmail(
          authEmail
        );
    }

    const {
      data,
      error
    } =
      await supabaseClient.auth.signInWithPassword(
        {
          email: authEmail,
          password
        }
      );

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(
        "لم يتم العثور على الحساب."
      );
    }

    currentUser =
      data.user;

    await loadCurrentProfile();

    showOnly("app");

    await initializeMailApp();

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    setLoginError(
      error?.message ||
      "بيانات تسجيل الدخول غير صحيحة."
    );

  } finally {

    loginButton.disabled = false;

    loginButton.textContent =
      originalText;
  }
}


// =========================================================
// LOAD PROFILE
// =========================================================

async function loadCurrentProfile() {

  if (!currentUser) {
    return null;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id, username, email, internal_email, display_name, role, created_at"
      )
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();

  if (error) {

    console.error(
      "PROFILE LOAD ERROR:",
      error
    );

    throw error;
  }

  currentProfile =
    data || null;

  return currentProfile;
}


// =========================================================
// UPDATE ACCOUNT UI
// =========================================================

function updateAccountUI() {

  if (!currentUser) {
    return;
  }

  const username =
    currentProfile?.username ||
    currentUser.user_metadata?.username ||
    currentUser.email?.split("@")[0] ||
    "User";

  const displayName =
    currentProfile?.display_name ||
    username;

  // ==========================================
  // IMPORTANT:
  // Always display internal email as username@nilex
  // ==========================================

  const internalEmail =
    currentProfile?.internal_email ||
    getInternalEmail(username);

  if (accountName) {

    accountName.textContent =
      displayName;
  }

  if (accountEmail) {

    accountEmail.textContent =
      internalEmail;
  }

  if (profileAvatar) {

    profileAvatar.textContent =
      displayName
        .charAt(0)
        .toUpperCase() || "N";
  }
}


// =========================================================
// ADMIN CHECK
// =========================================================

async function getAdminUserId() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id, username, internal_email"
      )
      .eq(
        "role",
        "admin"
      )
      .limit(1)
      .maybeSingle();

  if (error) {

    console.error(
      "ADMIN LOOKUP ERROR:",
      error
    );

    return null;
  }

  adminUserId =
    data?.id || null;

  return adminUserId;
}


// =========================================================
// INITIALIZE APP
// =========================================================

async function initializeMailApp() {

  updateAccountUI();

  const isAdmin =
    currentProfile?.role === "admin";

  adminMode =
    isAdmin;

  if (adminControls) {

    adminControls.style.display =
      isAdmin
        ? ""
        : "none";
  }

  await getAdminUserId();

  await loadAdminReceivers();

  await loadMessages();
}


// =========================================================
// LOAD ADMIN RECEIVERS
// =========================================================

async function loadAdminReceivers() {

  if (!adminReceiver) {
    return;
  }

  adminReceiver.innerHTML = `
    <option value="">
      اختر الحساب
    </option>
  `;

  if (!adminMode) {
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id, username, display_name, internal_email"
      )
      .neq(
        "id",
        currentUser?.id || ""
      )
      .order(
        "username",
        {
          ascending: true
        }
      );

  if (error) {

    console.error(
      "ADMIN RECEIVERS ERROR:",
      error
    );

    return;
  }

  for (const profile of data || []) {

    const option =
      document.createElement("option");

    option.value =
      profile.id;

    const internalEmail =
      profile.internal_email ||
      getInternalEmail(
        profile.username
      );

    option.textContent =
      `${profile.display_name || profile.username} — ${internalEmail}`;

    adminReceiver.appendChild(
      option
    );
  }
}


// =========================================================
// SHOW LIST
// =========================================================

function showList() {

  if (listView) {
    listView.style.display = "";
  }

  if (messageView) {
    messageView.style.display =
      "none";
  }

  if (composeView) {
    composeView.style.display =
      "none";
  }
}


// =========================================================
// SHOW MESSAGE
// =========================================================

function showMessage(message) {

  if (listView) {
    listView.style.display =
      "none";
  }

  if (composeView) {
    composeView.style.display =
      "none";
  }

  if (messageView) {
    messageView.style.display =
      "";
  }

  const viewSubject =
    document.getElementById(
      "viewSubject"
    );

  const viewDate =
    document.getElementById(
      "viewDate"
    );

  const viewBody =
    document.getElementById(
      "viewBody"
    );

  if (viewSubject) {

    viewSubject.textContent =
      message.subject ||
      "بدون عنوان";
  }

  if (viewDate) {

    viewDate.textContent =
      formatDate(
        message.created_at
      );
  }

  if (viewBody) {

    viewBody.textContent =
      message.body || "";
  }
}


// =========================================================
// OPEN COMPOSE
// =========================================================

function openCompose(
  isAdmin = false
) {

  adminMode =
    isAdmin;

  setComposeError("");

  if (listView) {
    listView.style.display =
      "none";
  }

  if (messageView) {
    messageView.style.display =
      "none";
  }

  if (composeView) {
    composeView.style.display =
      "";
  }

  if (normalRecipientBox) {

    normalRecipientBox.style.display =
      isAdmin
        ? "none"
        : "";
  }

  if (adminRecipientBox) {

    adminRecipientBox.style.display =
      isAdmin
        ? ""
        : "none";
  }

  if (adminSubjectBox) {

    adminSubjectBox.style.display =
      isAdmin
        ? ""
        : "none";
  }

  if (adminMessageBody) {

    adminMessageBody.style.display =
      "none";
  }

  if (composeTitle) {

    composeTitle.textContent =
      isAdmin
        ? "إرسال رسالة لأي حساب"
        : "إرسال طلبك للأدمن";
  }

  if (messageSubject) {

    messageSubject.style.display =
      isAdmin
        ? "none"
        : "";
  }

  if (messageBody) {

    messageBody.value = "";
  }

  if (messageSubject) {

    messageSubject.value = "";
  }

  if (adminSubject) {

    adminSubject.value = "";
  }

  if (adminReceiver) {

    adminReceiver.value = "";
  }
}


// =========================================================
// LOAD MESSAGES
// =========================================================

async function loadMessages() {

  if (!currentUser) {
    return;
  }

  if (!messagesList) {
    return;
  }

  messagesList.innerHTML = `
    <div class="loading">
      جاري تحميل الرسائل...
    </div>
  `;

  try {

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
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (currentFolder === "inbox") {

      query =
        query.eq(
          "receiver_id",
          currentUser.id
        );

    } else {

      query =
        query.eq(
          "sender_id",
          currentUser.id
        );
    }

    const {
      data,
      error
    } =
      await query;

    if (error) {
      throw error;
    }

    renderMessages(
      data || []
    );

    await updateUnreadCount();

  } catch (error) {

    console.error(
      "LOAD MESSAGES ERROR:",
      error
    );

    messagesList.innerHTML = `
      <div class="error">
        حدث خطأ أثناء تحميل الرسائل.
        <br>
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}


// =========================================================
// RENDER MESSAGES
// =========================================================

function renderMessages(messages) {

  if (!messages.length) {

    messagesList.innerHTML = `
      <div class="loading">
        لا توجد رسائل هنا.
      </div>
    `;

    return;
  }

  messagesList.innerHTML =
    messages
      .map(
        (message) => {

          const unread =
            !message.is_read &&
            currentFolder === "inbox";

          return `
            <button
              type="button"
              class="message-item ${unread ? "unread" : ""}"
              data-message-id="${message.id}"
            >

              <div class="message-item-top">

                <strong>
                  ${escapeHtml(
                    message.subject ||
                    "بدون عنوان"
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

              <div class="message-item-body">
                ${escapeHtml(
                  String(
                    message.body || ""
                  ).slice(0, 150)
                )}
              </div>

            </button>
          `;
        }
      )
      .join("");

  messagesList
    .querySelectorAll(
      "[data-message-id]"
    )
    .forEach(
      (element) => {

        element.addEventListener(
          "click",
          async () => {

            const id =
              Number(
                element.dataset.messageId
              );

            await openMessageById(
              id
            );
          }
        );
      }
    );
}


// =========================================================
// OPEN MESSAGE BY ID
// =========================================================

async function openMessageById(
  messageId
) {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
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
        .eq(
          "id",
          messageId
        )
        .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return;
    }

    // Mark received message as read
    if (
      data.receiver_id ===
        currentUser.id &&
      !data.is_read
    ) {

      const {
        error: updateError
      } =
        await supabaseClient
          .from("messages")
          .update({
            is_read: true
          })
          .eq(
            "id",
            messageId
          )
          .eq(
            "receiver_id",
            currentUser.id
          );

      if (updateError) {

        console.error(
          "MARK READ ERROR:",
          updateError
        );
      }

      data.is_read = true;
    }

    showMessage(data);

    await updateUnreadCount();

  } catch (error) {

    console.error(
      "OPEN MESSAGE ERROR:",
      error
    );

    setStatus(
      error.message ||
      "حدث خطأ أثناء فتح الرسالة."
    );
  }
}


// =========================================================
// UNREAD COUNT
// =========================================================

async function updateUnreadCount() {

  if (!currentUser) {
    return;
  }

  const {
    count,
    error
  } =
    await supabaseClient
      .from("messages")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      )
      .eq(
        "receiver_id",
        currentUser.id
      )
      .eq(
        "is_read",
        false
      );

  if (error) {

    console.error(
      "UNREAD COUNT ERROR:",
      error
    );

    return;
  }

  if (inboxCount) {

    inboxCount.textContent =
      String(
        count || 0
      );
  }
}


// =========================================================
// SEND MESSAGE
// =========================================================

async function sendMessage() {

  setComposeError("");

  if (!currentUser) {

    setComposeError(
      "يجب تسجيل الدخول أولًا."
    );

    return;
  }

  let receiverId = null;
  let subject = "";
  let body = "";

  // ==========================================
  // Normal user -> Admin
  // ==========================================

  if (!adminMode) {

    if (!adminUserId) {

      await getAdminUserId();
    }

    receiverId =
      adminUserId;

    subject =
      String(
        messageSubject?.value || ""
      ).trim();

    body =
      String(
        messageBody?.value || ""
      ).trim();

    if (!receiverId) {

      setComposeError(
        "لم يتم العثور على حساب الأدمن."
      );

      return;
    }

    if (!subject) {

      setComposeError(
        "اختر نوع الخدمة."
      );

      return;
    }
  }

  // ==========================================
  // Admin -> User
  // ==========================================

  else {

    receiverId =
      adminReceiver?.value || "";

    subject =
      String(
        adminSubject?.value || ""
      ).trim();

    body =
      String(
        messageBody?.value || ""
      ).trim();

    if (!receiverId) {

      setComposeError(
        "اختر الحساب المستلم."
      );

      return;
    }

    if (!subject) {

      setComposeError(
        "اكتب عنوان الرسالة."
      );

      return;
    }
  }

  if (!body) {

    setComposeError(
      "اكتب محتوى الرسالة."
    );

    return;
  }

  const originalText =
    sendButton.textContent;

  sendButton.disabled = true;

  sendButton.textContent =
    "جاري الإرسال...";

  try {

    const {
      error
    } =
      await supabaseClient
        .from("messages")
        .insert({
          sender_id:
            currentUser.id,

          receiver_id:
            receiverId,

          subject:
            subject,

          body:
            body,

          is_read:
            false
        });

    if (error) {
      throw error;
    }

    if (messageBody) {
      messageBody.value = "";
    }

    if (messageSubject) {
      messageSubject.value = "";
    }

    if (adminSubject) {
      adminSubject.value = "";
    }

    if (adminReceiver) {
      adminReceiver.value = "";
    }

    setComposeError("");

    showList();

    await loadMessages();

  } catch (error) {

    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    setComposeError(
      error.message ||
      "حدث خطأ أثناء إرسال الرسالة."
    );

  } finally {

    sendButton.disabled = false;

    sendButton.textContent =
      originalText;
  }
}


// =========================================================
// FOLDERS
// =========================================================

document
  .querySelectorAll(
    ".folder"
  )
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        async () => {

          currentFolder =
            button.dataset.folder ||
            "inbox";

          document
            .querySelectorAll(
              ".folder"
            )
            .forEach(
              (item) => {

                item.classList.remove(
                  "active"
                );
              }
            );

          button.classList.add(
            "active"
          );

          if (folderTitle) {

            folderTitle.textContent =
              currentFolder === "sent"
                ? "المرسل"
                : "الوارد";
          }

          showList();

          await loadMessages();
        }
      );
    }
  );


// =========================================================
// BUTTON EVENTS
// =========================================================

if (showRegisterBtn) {

  showRegisterBtn.addEventListener(
    "click",
    showRegister
  );
}


if (backLoginBtn) {

  backLoginBtn.addEventListener(
    "click",
    showLogin
  );
}


if (loginButton) {

  loginButton.addEventListener(
    "click",
    loginUser
  );
}


if (signupButton) {

  signupButton.addEventListener(
    "click",
    registerUser
  );
}


if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async () => {

      await supabaseClient.auth.signOut();

      currentUser = null;
      currentProfile = null;
      adminUserId = null;
      adminMode = false;

      if (loginPassword) {
        loginPassword.value = "";
      }

      showLogin();
    }
  );
}


if (homeBtn) {

  homeBtn.addEventListener(
    "click",
    () => {

      window.location.href =
        "index.html";
    }
  );
}


if (newMessageBtn) {

  newMessageBtn.addEventListener(
    "click",
    () => {

      openCompose(false);
    }
  );
}


if (adminComposeBtn) {

  adminComposeBtn.addEventListener(
    "click",
    () => {

      openCompose(true);
    }
  );
}


if (sendButton) {

  sendButton.addEventListener(
    "click",
    sendMessage
  );
}


if (refreshBtn) {

  refreshBtn.addEventListener(
    "click",
    async () => {

      await loadMessages();
    }
  );
}


if (backToListBtn) {

  backToListBtn.addEventListener(
    "click",
    () => {

      showList();
    }
  );
}


if (cancelComposeBtn) {

  cancelComposeBtn.addEventListener(
    "click",
    () => {

      showList();
    }
  );
}


// =========================================================
// ENTER TO LOGIN
// =========================================================

if (loginPassword) {

  loginPassword.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        loginUser();
      }
    }
  );
}


// =========================================================
// AUTH STATE
// =========================================================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "AUTH EVENT:",
      event
    );

    if (session?.user) {

      currentUser =
        session.user;

      try {

        await loadCurrentProfile();

        showOnly("app");

        await initializeMailApp();

      } catch (error) {

        console.error(
          "AUTH PROFILE ERROR:",
          error
        );
      }

    } else {

      currentUser = null;
      currentProfile = null;

      showOnly("login");
    }
  }
);


// =========================================================
// RESTORE SESSION
// =========================================================

async function restoreSession() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (data?.session?.user) {

      currentUser =
        data.session.user;

      await loadCurrentProfile();

      showOnly("app");

      await initializeMailApp();

    } else {

      showOnly("login");
    }

  } catch (error) {

    console.error(
      "RESTORE SESSION ERROR:",
      error
    );

    showOnly("login");
  }
}


// =========================================================
// START
// =========================================================

restoreSession();
