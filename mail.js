const SUPABASE_URL = "https://loqwcsxdqgasgokfmswi.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_vkNXRSYz-hz_PxJCXGwdhg__0-Jmlsx";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================
   STATE
========================= */

let currentUser = null;
let currentProfile = null;
let currentFolder = "inbox";
let currentMessages = [];
let composeMode = "user";


/* =========================
   ELEMENTS
========================= */

const loginScreen = document.getElementById("loginScreen");
const registerScreen = document.getElementById("registerScreen");
const mailScreen = document.getElementById("mailScreen");

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const registerUsername = document.getElementById("registerUsername");
const registerPassword = document.getElementById("registerPassword");
const registerDisplayName = document.getElementById("registerDisplayName");
const registerError = document.getElementById("registerError");

const welcomeText = document.getElementById("welcomeText");
const adminControls = document.getElementById("adminControls");

const messagesList = document.getElementById("messagesList");
const folderTitle = document.getElementById("folderTitle");
const inboxCount = document.getElementById("inboxCount");

const listView = document.getElementById("listView");
const messageView = document.getElementById("messageView");
const composeView = document.getElementById("composeView");

const messageContent = document.getElementById("messageContent");

const recipientBox = document.getElementById("recipientBox");
const recipientInput = document.getElementById("recipientInput");
const subjectInput = document.getElementById("subjectInput");
const bodyInput = document.getElementById("bodyInput");

const composeTitle = document.getElementById("composeTitle");
const composeError = document.getElementById("composeError");


/* =========================
   HELPERS
========================= */

function showOnly(screen) {
    loginScreen.classList.add("hidden");
    registerScreen.classList.add("hidden");
    mailScreen.classList.add("hidden");

    screen.classList.remove("hidden");
}


function showError(element, message) {
    element.textContent = message || "";
}


function escapeHTML(value) {
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
            dateStyle: "medium",
            timeStyle: "short"
        });
    } catch {
        return "";
    }
}


/* =========================
   LOGIN
========================= */

async function login() {

    showError(loginError, "");

    const usernameOrEmail =
        loginUsername.value.trim();

    const password =
        loginPassword.value;

    if (!usernameOrEmail || !password) {
        showError(
            loginError,
            "اكتب اسم المستخدم وكلمة المرور."
        );
        return;
    }

    let email = usernameOrEmail;

    /*
       لو المستخدم كتب username فقط:
       نحاول نجيب الإيميل من profiles.
    */

    if (!usernameOrEmail.includes("@")) {

        const { data, error } =
            await supabaseClient
                .from("profiles")
                .select("email")
                .eq("username", usernameOrEmail)
                .maybeSingle();

        if (error) {

            console.error(error);

            showError(
                loginError,
                "حصل خطأ أثناء البحث عن الحساب."
            );

            return;
        }

        if (!data) {

            showError(
                loginError,
                "اسم المستخدم أو كلمة المرور غلط."
            );

            return;
        }

        email = data.email;
    }

    const {
        data,
        error
    } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {

        console.error(error);

        showError(
            loginError,
            "اسم المستخدم أو كلمة المرور غلط."
        );

        return;
    }

    currentUser = data.user;

    await loadProfile();

}


/* =========================
   PROFILE
========================= */

async function loadProfile() {

    if (!currentUser) {
        showOnly(loginScreen);
        return;
    }

    /*
       أهم جزء في الإصلاح:
       نقرأ Profile الخاص بالمستخدم الحالي
       مباشرة عن طريق id = auth.uid().
    */

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select(`
            id,
            username,
            email,
            display_name,
            role
        `)
        .eq("id", currentUser.id)
        .maybeSingle();

    console.log("PROFILE:", data);
    console.log("PROFILE ERROR:", error);

    if (error) {

        console.error(error);

        showError(
            loginError,
            "تم تسجيل الدخول، لكن حصل خطأ أثناء تحميل بيانات الحساب."
        );

        await supabaseClient.auth.signOut();

        showOnly(loginScreen);

        return;
    }

    if (!data) {

        showError(
            loginError,
            "الحساب موجود لكن بياناته غير موجودة في profiles."
        );

        await supabaseClient.auth.signOut();

        showOnly(loginScreen);

        return;
    }

    currentProfile = data;

    showMailScreen();

}


/* =========================
   SHOW MAIL
========================= */

async function showMailScreen() {

    showOnly(mailScreen);

    const name =
        currentProfile.display_name ||
        currentProfile.username;

    welcomeText.textContent =
        `مرحباً ${name}`;

    if (currentProfile.role === "admin") {

        adminControls.classList.remove("hidden");

    } else {

        adminControls.classList.add("hidden");
    }

    openList();

    await loadMessages();
}


/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    if (!currentUser) return;

    messagesList.innerHTML =
        `<div class="loading">جاري التحميل...</div>`;

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
                    username,
                    email,
                    display_name
                ),
                receiver:profiles!messages_receiver_id_fkey(
                    username,
                    email,
                    display_name
                )
            `)
            .order("created_at", {
                ascending: false
            });

    if (currentFolder === "inbox") {

        query =
            query.eq(
                "receiver_id",
                currentUser.id
            );

        folderTitle.textContent = "الوارد";

    } else {

        query =
            query.eq(
                "sender_id",
                currentUser.id
            );

        folderTitle.textContent = "المرسل";
    }

    const {
        data,
        error
    } = await query;

    if (error) {

        console.error(error);

        messagesList.innerHTML = `
            <div class="empty">
                حصل خطأ أثناء تحميل الرسائل.
            </div>
        `;

        return;
    }

    currentMessages = data || [];

    renderMessages();

    updateInboxCount();

}


/* =========================
   RENDER
========================= */

function renderMessages() {

    if (!currentMessages.length) {

        messagesList.innerHTML = `
            <div class="empty">
                لا توجد رسائل هنا.
            </div>
        `;

        return;
    }

    messagesList.innerHTML =
        currentMessages.map(message => {

            const person =
                currentFolder === "inbox"
                    ? message.sender
                    : message.receiver;

            const name =
                person?.display_name ||
                person?.username ||
                person?.email ||
                "مستخدم";

            return `
                <div
                    class="message-item ${
                        !message.is_read &&
                        currentFolder === "inbox"
                            ? "unread"
                            : ""
                    }"
                    data-id="${message.id}"
                >

                    <div class="message-top">

                        <div class="message-sender">
                            ${escapeHTML(name)}
                        </div>

                        <div class="message-date">
                            ${formatDate(message.created_at)}
                        </div>

                    </div>

                    <div class="message-subject">
                        ${escapeHTML(
                            message.subject || "(بدون موضوع)"
                        )}
                    </div>

                    <div class="message-preview">
                        ${escapeHTML(message.body)}
                    </div>

                </div>
            `;

        }).join("");

    document
        .querySelectorAll(".message-item")
        .forEach(element => {

            element.addEventListener(
                "click",
                () => openMessage(
                    Number(element.dataset.id)
                )
            );

        });
}


/* =========================
   OPEN MESSAGE
========================= */

async function openMessage(id) {

    const message =
        currentMessages.find(
            item => Number(item.id) === id
        );

    if (!message) return;

    const sender =
        message.sender?.display_name ||
        message.sender?.username ||
        message.sender?.email ||
        "مستخدم";

    const receiver =
        message.receiver?.display_name ||
        message.receiver?.username ||
        message.receiver?.email ||
        "مستخدم";

    messageContent.innerHTML = `
        <div class="message-card">

            <h1>
                ${escapeHTML(
                    message.subject || "(بدون موضوع)"
                )}
            </h1>

            <div class="message-meta">

                <div>
                    <strong>من:</strong>
                    ${escapeHTML(sender)}
                </div>

                <div>
                    <strong>إلى:</strong>
                    ${escapeHTML(receiver)}
                </div>

                <div>
                    ${formatDate(message.created_at)}
                </div>

            </div>

            <div class="message-body">
                ${escapeHTML(message.body)}
            </div>

        </div>
    `;

    openMessageView();

    /*
       Mark as read
    */

    if (
        !message.is_read &&
        message.receiver_id === currentUser.id
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
            updateInboxCount();
        }
    }
}


/* =========================
   INBOX COUNT
========================= */

async function updateInboxCount() {

    if (!currentUser) return;

    const {
        count,
        error
    } = await supabaseClient
        .from("messages")
        .select("id", {
            count: "exact",
            head: true
        })
        .eq("receiver_id", currentUser.id)
        .eq("is_read", false);

    if (!error) {
        inboxCount.textContent = count || 0;
    }
}


/* =========================
   VIEWS
========================= */

function openList() {

    listView.classList.remove("hidden");
    messageView.classList.add("hidden");
    composeView.classList.add("hidden");
}


function openMessageView() {

    listView.classList.add("hidden");
    messageView.classList.remove("hidden");
    composeView.classList.add("hidden");
}


function openCompose() {

    listView.classList.add("hidden");
    messageView.classList.add("hidden");
    composeView.classList.remove("hidden");

    subjectInput.value = "";
    bodyInput.value = "";
    recipientInput.value = "";

    showError(composeError, "");

    if (composeMode === "admin") {

        composeTitle.textContent =
            "إرسال رسالة";

        recipientBox.classList.remove("hidden");

    } else {

        composeTitle.textContent =
            "إرسال طلبك للأدمن";

        recipientBox.classList.add("hidden");
    }
}


/* =========================
   NEW MESSAGE
========================= */

async function prepareUserMessage() {

    composeMode = "user";

    openCompose();
}


/* =========================
   ADMIN COMPOSE
========================= */

function prepareAdminMessage() {

    if (
        !currentProfile ||
        currentProfile.role !== "admin"
    ) {
        return;
    }

    composeMode = "admin";

    openCompose();
}


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {

    showError(composeError, "");

    const subject =
        subjectInput.value.trim();

    const body =
        bodyInput.value.trim();

    if (!body) {

        showError(
            composeError,
            "اكتب محتوى الرسالة."
        );

        return;
    }

    let receiverId = null;


    /*
       USER:
       الرسالة تذهب تلقائياً للأدمن.
    */

    if (composeMode === "user") {

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("role", "admin")
            .limit(1)
            .maybeSingle();

        if (error || !data) {

            console.error(error);

            showError(
                composeError,
                "لم يتم العثور على حساب الأدمن."
            );

            return;
        }

        receiverId = data.id;
    }


    /*
       ADMIN:
       يبحث عن المستخدم بالـ username
       أو email.
    */

    if (composeMode === "admin") {

        const recipient =
            recipientInput.value.trim();

        if (!recipient) {

            showError(
                composeError,
                "اكتب اسم المستخدم أو البريد الداخلي للمستلم."
            );

            return;
        }

        let query =
            supabaseClient
                .from("profiles")
                .select("id, username, email");

        if (recipient.includes("@")) {

            query =
                query.eq(
                    "email",
                    recipient.includes("@nilex")
                        ? `${recipient.replace("@nilex", "@nilex.local")}`
                        : recipient
                );

        } else {

            query =
                query.eq(
                    "username",
                    recipient
                );
        }

        const {
            data,
            error
        } = await query.maybeSingle();

        if (error || !data) {

            console.error(error);

            showError(
                composeError,
                "المستخدم غير موجود."
            );

            return;
        }

        receiverId = data.id;
    }


    /*
       إرسال الرسالة
    */

    const {
        error
    } = await supabaseClient
        .from("messages")
        .insert({
            sender_id: currentUser.id,
            receiver_id: receiverId,
            subject,
            body
        });

    if (error) {

        console.error(error);

        showError(
            composeError,
            "حصل خطأ أثناء إرسال الرسالة."
        );

        return;
    }

    subjectInput.value = "";
    bodyInput.value = "";
    recipientInput.value = "";

    alert("تم إرسال الرسالة بنجاح.");

    openList();

    currentFolder = "sent";

    document
        .querySelectorAll(".folder")
        .forEach(button =>
            button.classList.remove("active")
        );

    await loadMessages();
}


/* =========================
   REGISTER
========================= */

async function register() {

    showError(registerError, "");

    const username =
        registerUsername.value.trim()
            .toLowerCase();

    const password =
        registerPassword.value;

    const displayName =
        registerDisplayName.value.trim();

    if (!username || !password) {

        showError(
            registerError,
            "اكتب Username وكلمة المرور."
        );

        return;
    }

    if (!/^[a-z0-9._-]+$/i.test(username)) {

        showError(
            registerError,
            "الـ Username يستخدم حروف إنجليزية وأرقام فقط."
        );

        return;
    }

    if (password.length < 6) {

        showError(
            registerError,
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
        );

        return;
    }


    /*
       نستخدم بريد داخلي خاص بـ NILEX
    */

    const email =
        `${username}@nilex.local`;


    /*
       نتأكد أن username غير مستخدم
    */

    const {
        data: existing
    } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

    if (existing) {

        showError(
            registerError,
            "اسم المستخدم ده مستخدم بالفعل."
        );

        return;
    }


    /*
       إنشاء حساب Auth
    */

    const {
        data,
        error
    } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
                display_name:
                    displayName || username
            }
        }
    });

    if (error) {

        console.error(error);

        showError(
            registerError,
            error.message ||
            "حصل خطأ أثناء إنشاء الحساب."
        );

        return;
    }


    /*
       لو Supabase أعطى session مباشرة
       ننشئ profile.
    */

    if (data.user && data.session) {

        const {
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .insert({
                id: data.user.id,
                username,
                email,
                display_name:
                    displayName || username,
                role: "user"
            });

        if (profileError) {

            console.error(profileError);

            showError(
                registerError,
                "الحساب اتعمل لكن حصل خطأ أثناء إعداد بياناته."
            );

            return;
        }

        currentUser = data.user;

        await loadProfile();

        return;
    }


    /*
       في حالة Email Confirmation مفعّل.
    */

    showError(
        registerError,
        "تم إنشاء الحساب. لو تأكيد البريد الإلكتروني مفعّل في Supabase، عطّله من Authentication ثم سجّل الدخول."
    );
}


/* =========================
   LOGOUT
========================= */

async function logout() {

    await supabaseClient.auth.signOut();

    currentUser = null;
    currentProfile = null;
    currentMessages = [];

    loginUsername.value = "";
    loginPassword.value = "";

    showOnly(loginScreen);
}


/* =========================
   EVENTS
========================= */

document
    .getElementById("loginBtn")
    .addEventListener("click", login);


document
    .getElementById("registerBtn")
    .addEventListener("click", register);


document
    .getElementById("showRegisterBtn")
    .addEventListener("click", () => {

        showError(loginError, "");
        showOnly(registerScreen);

    });


document
    .getElementById("backLoginBtn")
    .addEventListener("click", () => {

        showError(registerError, "");
        showOnly(loginScreen);

    });


document
    .getElementById("logoutBtn")
    .addEventListener("click", logout);


document
    .getElementById("newMessageBtn")
    .addEventListener(
        "click",
        prepareUserMessage
    );


document
    .getElementById("adminComposeBtn")
    .addEventListener(
        "click",
        prepareAdminMessage
    );


document
    .getElementById("sendMessageBtn")
    .addEventListener(
        "click",
        sendMessage
    );


document
    .getElementById("cancelComposeBtn")
    .addEventListener(
        "click",
        openList
    );


document
    .getElementById("backToListBtn")
    .addEventListener(
        "click",
        openList
    );


document
    .getElementById("refreshBtn")
    .addEventListener(
        "click",
        loadMessages
    );


document
    .getElementById("homeBtn")
    .addEventListener(() => {

        window.location.href = "index.html";

    });


/*
   الفولدرات
*/

document
    .querySelectorAll(".folder[data-folder]")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                currentFolder =
                    button.dataset.folder;

                document
                    .querySelectorAll(".folder[data-folder]")
                    .forEach(item =>
                        item.classList.remove("active")
                    );

                button.classList.add("active");

                openList();

                await loadMessages();

            }
        );

    });


/* =========================
   ENTER KEY
========================= */

loginPassword.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            login();
        }

    }
);


/* =========================
   SESSION CHECK
========================= */

async function init() {

    const {
        data
    } = await supabaseClient.auth.getSession();

    if (data.session?.user) {

        currentUser =
            data.session.user;

        await loadProfile();

    } else {

        showOnly(loginScreen);

    }
}


init();
