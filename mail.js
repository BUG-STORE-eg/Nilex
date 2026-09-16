const SUPABASE_URL =
  "https://loqwcsxdqgasgokfmswi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "ضع_مفتاح_Supabase_الخاص_بك_هنا";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


let currentUser = null;
let currentProfile = null;
let currentFolder = "inbox";
let currentMessages = [];
let composeMode = "user";


const $ = id => document.getElementById(id);


function show(id) {
  $(id).classList.remove("hidden");
}


function hide(id) {
  $(id).classList.add("hidden");
}


function setError(id, message = "") {
  $(id).textContent = message;
}


function normalizeUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}


function internalEmail(username) {
  return `${normalizeUsername(username)}@nilex.local`;
}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));

}


function formatDate(date) {

  try {

    return new Intl.DateTimeFormat(
      "ar-EG",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    ).format(new Date(date));

  } catch {

    return date;

  }

}


function switchAuth(screen) {

  hide("loginScreen");
  hide("registerScreen");

  show(screen);

  setError("loginError");
  setError("registerError");

}


function switchMailView(view) {

  hide("listView");
  hide("messageView");
  hide("composeView");

  show(view);

}


/*
==================================================
LOGIN
==================================================
*/

async function login() {

  setError("loginError");

  const raw =
    $("loginUsername").value.trim();

  const password =
    $("loginPassword").value;


  if (!raw || !password) {

    setError(
      "loginError",
      "اكتب اسم المستخدم وكلمة المرور."
    );

    return;
  }


  /*
    IMPORTANT:
    هنا لا نبحث داخل profiles قبل تسجيل الدخول.

    admin
    تتحول إلى:

    admin@nilex.local

    وبالتالي نتجنب مشكلة:
    "حصل خطأ أثناء البحث عن الحساب"
  */

  let email =
    raw.toLowerCase();


  if (!email.includes("@")) {

    email =
      internalEmail(email);

  } else if (
    email.endsWith("@nilex")
  ) {

    email =
      email.replace(
        "@nilex",
        "@nilex.local"
      );

  }


  $("loginBtn").disabled = true;

  $("loginBtn").textContent =
    "جاري الدخول...";


  try {

    const { error } =
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

  } catch (err) {

    console.error(err);

    setError(
      "loginError",
      "حصل خطأ أثناء تسجيل الدخول."
    );

  } finally {

    $("loginBtn").disabled = false;

    $("loginBtn").textContent =
      "تسجيل الدخول";

  }

}


/*
==================================================
REGISTER
==================================================
*/

async function register() {

  setError("registerError");


  const username =
    normalizeUsername(
      $("registerUsername").value
    );


  const displayName =
    $("registerDisplayName")
      .value
      .trim() || username;


  const password =
    $("registerPassword").value;


  if (
    !/^[a-z0-9._-]{3,30}$/.test(username)
  ) {

    setError(
      "registerError",
      "اسم المستخدم يكون 3-30 حرفًا: a-z أو 0-9 أو . _ -"
    );

    return;
  }


  if (password.length < 6) {

    setError(
      "registerError",
      "كلمة المرور لازم تكون 6 أحرف أو أكثر."
    );

    return;
  }


  $("registerBtn").disabled = true;

  $("registerBtn").textContent =
    "جاري إنشاء الحساب...";


  try {

    const email =
      internalEmail(username);


    const {
      data,
      error
    } = await db.auth.signUp({

      email,
      password

    });


    if (error) {

      setError(
        "registerError",
        error.message
      );

      return;
    }


    if (!data.user) {

      setError(
        "registerError",
        "لم يتم إنشاء المستخدم."
      );

      return;
    }


    /*
      لو Supabase طالب تأكيد Email
      لن تكون هناك Session.
    */

    if (!data.session) {

      setError(
        "registerError",
        "تم إنشاء الحساب، لكن تأكيد البريد الإلكتروني مفعّل في Supabase. عطّل Email Confirmations من Auth."
      );

      return;
    }


    const {
      error: profileError
    } = await db
      .from("profiles")
      .insert({

        id: data.user.id,

        username,

        email,

        display_name:
          displayName,

        role: "user"

      });


    if (profileError) {

      console.error(
        "Profile error:",
        profileError
      );

      setError(
        "registerError",
        "الحساب اتعمل لكن إعداد بياناته حصل فيه خطأ: " +
        profileError.message
      );

      return;
    }


    await loadProfile(
      data.user
    );


  } catch (err) {

    console.error(err);

    setError(
      "registerError",
      "حصل خطأ أثناء إنشاء الحساب."
    );

  } finally {

    $("registerBtn").disabled = false;

    $("registerBtn").textContent =
      "إنشاء الحساب";

  }

}


/*
==================================================
LOAD PROFILE
==================================================
*/

async function loadProfile(user) {

  currentUser = user;


  const {
    data,
    error
  } = await db
    .from("profiles")
    .select(
      "id, username, email, display_name, role, created_at"
    )
    .eq("id", user.id)
    .maybeSingle();


  if (error) {

    console.error(
      "Profile load error:",
      error
    );

    await db.auth.signOut();

    switchAuth(
      "loginScreen"
    );

    setError(
      "loginError",
      "تم الدخول لكن بيانات الحساب لم تُقرأ. تأكد من RLS في Supabase."
    );

    return;
  }


  if (!data) {

    await db.auth.signOut();

    switchAuth(
      "loginScreen"
    );

    setError(
      "loginError",
      "الحساب موجود لكن لا توجد بيانات له في profiles."
    );

    return;
  }


  currentProfile =
    data;


  showMailScreen();

}


/*
==================================================
SHOW MAIL
==================================================
*/

function showMailScreen() {

  hide("loginScreen");
  hide("registerScreen");

  show("mailScreen");


  const name =
    currentProfile.display_name ||
    currentProfile.username ||
    "NILEX";


  $("welcomeText").textContent =
    name;


  $("profileEmail").textContent =
    currentProfile.email || "";


  $("profileAvatar").textContent =
    name.charAt(0).toUpperCase();


  if (
    currentProfile.role === "admin"
  ) {

    show("adminControls");

  } else {

    hide("adminControls");

  }


  currentFolder =
    "inbox";


  document
    .querySelectorAll(".folder")
    .forEach(
      btn =>
        btn.classList.remove("active")
    );


  document
    .querySelector(
      '[data-folder="inbox"]'
    )
    .classList.add("active");


  loadMessages();

}


/*
==================================================
MESSAGES
==================================================
*/

async function loadMessages() {

  const list =
    $("messagesList");


  list.innerHTML =
    '<div class="empty">جاري تحميل الرسائل...</div>';


  if (!currentUser)
    return;


  let query =
    db
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
          email,
          display_name
        ),
        receiver:profiles!messages_receiver_id_fkey(
          id,
          username,
          email,
          display_name
        )
      `)
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (
    currentFolder ===
    "inbox"
  ) {

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
  } = await query;


  if (error) {

    console.error(
      "Messages error:",
      error
    );

    list.innerHTML =
      `<div class="empty">
        حصل خطأ أثناء تحميل الرسائل.<br>
        ${escapeHtml(error.message)}
      </div>`;

    return;
  }


  currentMessages =
    data || [];


  renderMessages();

}


/*
==================================================
RENDER
==================================================
*/

function renderMessages() {

  const list =
    $("messagesList");


  $("folderTitle").textContent =
    currentFolder === "inbox"
      ? "الوارد"
      : "المرسل";


  if (!currentMessages.length) {

    list.innerHTML =
      '<div class="empty">لا توجد رسائل هنا حاليًا.</div>';

    return;
  }


  list.innerHTML =
    currentMessages
      .map(message => {

        const other =
          currentFolder === "inbox"
            ? message.sender
            : message.receiver;


        const name =
          other?.display_name ||
          other?.username ||
          other?.email ||
          "NILEX";


        const preview =
          (message.body || "")
            .replace(/\s+/g, " ")
            .slice(0, 100);


        return `

          <div
            class="message-row ${
              !message.is_read &&
              currentFolder === "inbox"
                ? "unread"
                : ""
            }"
            data-message-id="${message.id}"
          >

            <div class="message-sender">
              ${escapeHtml(name)}
            </div>

            <div>

              <div class="message-subject">
                ${escapeHtml(
                  message.subject ||
                  "(بدون عنوان)"
                )}
              </div>

              <div class="message-preview">
                ${escapeHtml(preview)}
              </div>

            </div>

            <div class="message-date">
              ${escapeHtml(
                formatDate(
                  message.created_at
                )
              )}
            </div>

          </div>

        `;

      })
      .join("");


  list
    .querySelectorAll(".message-row")
    .forEach(row => {

      row.addEventListener(
        "click",
        () =>
          openMessage(
            Number(
              row.dataset.messageId
            )
          )
      );

    });


  if (
    currentFolder === "inbox"
  ) {

    const unread =
      currentMessages.filter(
        m => !m.is_read
      ).length;


    $("inboxCount")
      .textContent =
      unread;

  }

}


/*
==================================================
OPEN MESSAGE
==================================================
*/

async function openMessage(id) {

  const message =
    currentMessages.find(
      m => Number(m.id) === id
    );


  if (!message)
    return;


  $("messageContent").innerHTML = `

    <article class="message-card">

      <div class="message-meta">

        <h2>
          ${escapeHtml(
            message.subject ||
            "(بدون عنوان)"
          )}
        </h2>

        <div class="meta-line">
          من:
          ${escapeHtml(
            message.sender?.display_name ||
            message.sender?.username ||
            message.sender?.email ||
            ""
          )}
        </div>

        <div class="meta-line">
          إلى:
          ${escapeHtml(
            message.receiver?.display_name ||
            message.receiver?.username ||
            message.receiver?.email ||
            ""
          )}
        </div>

        <div class="meta-line">
          ${escapeHtml(
            formatDate(
              message.created_at
            )
          )}
        </div>

      </div>

      <div class="message-body">
        ${escapeHtml(
          message.body
        )}
      </div>

    </article>

  `;


  switchMailView(
    "messageView"
  );


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
      .eq(
        "id",
        id
      )
      .eq(
        "receiver_id",
        currentUser.id
      );


    if (!error) {

      message.is_read =
        true;

      renderMessages();

    }

  }

}


/*
==================================================
USER COMPOSE
==================================================
*/

function openUserCompose() {

  composeMode =
    "user";


  $("composeTitle")
    .textContent =
    "إرسال طلب للأدمن";


  $("recipientInput")
    .value =
    "admin@nilex";


  $("recipientInput")
    .readOnly =
    true;


  show("recipientBox");


  setError(
    "composeError"
  );


  $("subjectInput")
    .value = "";


  $("bodyInput")
    .value = "";


  switchMailView(
    "composeView"
  );

}


/*
==================================================
ADMIN COMPOSE
==================================================
*/

function openAdminCompose() {

  composeMode =
    "admin";


  $("composeTitle")
    .textContent =
    "إرسال رسالة لحساب";


  $("recipientInput")
    .value = "";


  $("recipientInput")
    .readOnly =
    false;


  $("recipientInput")
    .placeholder =
    "username أو username@nilex";


  show("recipientBox");


  setError(
    "composeError"
  );


  $("subjectInput")
    .value = "";


  $("bodyInput")
    .value = "";


  switchMailView(
    "composeView"
  );

}


/*
==================================================
FIND ADMIN
==================================================
*/

async function findAdmin() {

  const {
    data,
    error
  } = await db
    .from("profiles")
    .select(
      "id, username, email, display_name"
    )
    .eq(
      "role",
      "admin"
    )
    .limit(1)
    .maybeSingle();


  if (error)
    throw error;


  return data;

}


/*
==================================================
FIND USER
==================================================
*/

async function findRecipientForAdmin(
  input
) {

  let value =
    input
      .trim()
      .toLowerCase();


  if (!value)
    return null;


  if (!value.includes("@")) {

    const {
      data,
      error
    } = await db
      .from("profiles")
      .select(
        "id, username, email, display_name"
      )
      .eq(
        "username",
        value
      )
      .maybeSingle();


    if (error)
      throw error;


    return data;

  }


  if (
    value.endsWith("@nilex")
  ) {

    value =
      value.replace(
        "@nilex",
        "@nilex.local"
      );

  }


  const {
    data,
    error
  } = await db
    .from("profiles")
    .select(
      "id, username, email, display_name"
    )
    .eq(
      "email",
      value
    )
    .maybeSingle();


  if (error)
    throw error;


  return data;

}


/*
==================================================
SEND MESSAGE
==================================================
*/

async function sendMessage() {

  setError(
    "composeError"
  );


  const subject =
    $("subjectInput")
      .value
      .trim();


  const body =
    $("bodyInput")
      .value
      .trim();


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


  $("sendMessageBtn")
    .disabled =
    true;


  $("sendMessageBtn")
    .textContent =
    "جاري الإرسال...";


  try {

    let recipient;


    if (
      composeMode ===
      "user"
    ) {

      recipient =
        await findAdmin();

    } else {

      recipient =
        await findRecipientForAdmin(
          $("recipientInput")
            .value
        );

    }


    if (!recipient) {

      setError(
        "composeError",
        "لم يتم العثور على الحساب المطلوب."
      );

      return;
    }


    const {
      error
    } = await db
      .from("messages")
      .insert({

        sender_id:
          currentUser.id,

        receiver_id:
          recipient.id,

        subject,

        body

      });


    if (error)
      throw error;


    $("subjectInput")
      .value = "";


    $("bodyInput")
      .value = "";


    switchMailView(
      "listView"
    );


    await loadMessages();


  } catch (err) {

    console.error(
      "Send message error:",
      err
    );


    setError(
      "composeError",
      err.message ||
      "حصل خطأ أثناء إرسال الرسالة."
    );

  } finally {

    $("sendMessageBtn")
      .disabled =
      false;


    $("sendMessageBtn")
      .textContent =
      "إرسال الرسالة";

  }

}


/*
==================================================
LOGOUT
==================================================
*/

async function logout() {

  await db.auth.signOut();

}


/*
==================================================
EVENTS
==================================================
*/

function bindEvents() {

  $("loginBtn")
    .addEventListener(
      "click",
      login
    );


  $("registerBtn")
    .addEventListener(
      "click",
      register
    );


  $("showRegisterBtn")
    .addEventListener(
      "click",
      () =>
        switchAuth(
          "registerScreen"
        )
    );


  $("backLoginBtn")
    .addEventListener(
      "click",
      () =>
        switchAuth(
          "loginScreen"
        )
    );


  $("loginPassword")
    .addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          login();

        }

      }
    );


  $("registerPassword")
    .addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          register();

        }

      }
    );


  $("newMessageBtn")
    .addEventListener(
      "click",
      openUserCompose
    );


  $("adminComposeBtn")
    .addEventListener(
      "click",
      openAdminCompose
    );


  $("cancelComposeBtn")
    .addEventListener(
      "click",
      () => {

        switchMailView(
          "listView"
        );

        loadMessages();

      }
    );


  $("backToListBtn")
    .addEventListener(
      "click",
      () => {

        switchMailView(
          "listView"
        );

        loadMessages();

      }
    );


  $("sendMessageBtn")
    .addEventListener(
      "click",
      sendMessage
    );


  $("refreshBtn")
    .addEventListener(
      "click",
      loadMessages
    );


  $("logoutBtn")
    .addEventListener(
      "click",
      logout
    );


  $("homeBtn")
    .addEventListener(
      "click",
      () => {

        window.location.href =
          "index.html";

      }
    );


  document
    .querySelectorAll(".folder")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          currentFolder =
            button.dataset.folder;


          document
            .querySelectorAll(
              ".folder"
            )
            .forEach(
              btn =>
                btn.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          switchMailView(
            "listView"
          );


          await loadMessages();

        }
      );

    });

}


/*
==================================================
INIT
==================================================
*/

async function init() {

  bindEvents();


  const {
    data: {
      session
    }
  } =
    await db.auth.getSession();


  if (session?.user) {

    await loadProfile(
      session.user
    );

  } else {

    switchAuth(
      "loginScreen"
    );

  }


  db.auth.onAuthStateChange(
    async (
      event,
      sessionData
    ) => {

      if (
        event ===
        "SIGNED_OUT"
      ) {

        currentUser =
          null;

        currentProfile =
          null;

        hide(
          "mailScreen"
        );

        switchAuth(
          "loginScreen"
        );

      }


      if (
        event ===
          "SIGNED_IN" &&
        sessionData?.user
      ) {

        setTimeout(
          () =>
            loadProfile(
              sessionData.user
            ),
          0
        );

      }

    }
  );

}


init();
