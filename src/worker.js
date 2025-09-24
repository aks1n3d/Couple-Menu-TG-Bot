// ===============================
//  Telegram + Firestore Worker
//  Cloudflare Workers + Firestore REST (JWT)
//  Фото блюд через Telegram file_id
// ===============================

const TG_API = (t) => `https://api.telegram.org/bot${t}`;
const FS_SCOPE = "https://www.googleapis.com/auth/datastore";
const LANGS = ["ru", "uk", "en"];
const PAGE_SIZE = 5; // история заказов

// ───────────────────────────────
// I18N
// ───────────────────────────────
const I18N = {
    ru: {
        start_choose: "Выберите язык / Choose language",
        start_help: `Привет! Это меню для пары 💞
Создай пару и поделись кодом или присоединись по коду.

• /create_boy — создать пару (я парень)
• /create_girl — создать пару (я девушка)
• /join ABC123 — присоединиться по коду
• /orders — история заказов
• /export_menu — экспорт меню (CSV)
• /export_orders — экспорт заказов (CSV)`,
        home_choose: "Выберите меню:",
        btn_back: "⬅️ Назад",
        btn_boy: "🍽 Меню парня",
        btn_girl: "🍽 Меню девушки",
        btn_add: "➕ Добавить позицию",
        btn_history: "📜 История заказов",
        btn_invite_partner: "🔗 Пригласить вторую половинку",
        btn_invite_others: "🫶 Поделиться ботом для других пар",
        invite_partner_btn: "Открыть бот по ссылке",
        invite_partner_message: "Пригласи вторую половинку по ссылке:",
        invite_others_caption: "Поделись этим ботом с друзьями 💞",
        invite_others_message: "Поделись ботом с другими парами:",
        pair_created: (code) =>
            `Пара создана! Код: <b>${code}</b>\nВторой участник может нажать кнопку ниже или ввести: <code>/join ${code}</code>`,
        pair_join_ok: (code) => `Вы присоединились к паре <b>${code}</b>!`,
        no_positions: "Нет позиций. Нажмите «➕ Добавить позицию».",
        add_flow_title: "Название блюда:",
        add_flow_desc: "Короткое описание:",
        add_flow_price: "Ценник (например: 3 🤗 или 2 💋):",
        add_flow_photo: "Отправьте фото блюда одним сообщением (как фото).",
        item_added: (id) => `Готово! Позиция #${id} добавлена.`,
        order_new_for_receiver: (itemId) =>
            `🛎 Новый заказ: #${itemId}\nСтатус: new`,
        order_ok_for_sender: "Заказ создан! Уведомление отправлено.",
        unknown_cmd: "Команда не распознана. Используйте /start",
        first_start_tip: "Сначала /start",

        // История
        orders_empty: "Пока нет заказов.",
        orders_header: "История заказов:",
        orders_filter_in: "📥 Ко мне",
        orders_filter_out: "📤 Мои",
        orders_filter_all: "📜 Все",
        orders_next: "▶️ Дальше",
        orders_reset: "⏮️ Сначала",
        orders_view: "Открыть",

        order_line: (id, itemId, title, fromId, toRole, status, dateStr) =>
            `#${id} · ${title || ("позиция " + itemId)}
От: <code>${fromId}</code> → Для: ${toRole}
Статус: <b>${status}</b> · ${dateStr}`,

        // Роли
        choose_role: "Кто ты? Выбери роль:",
        role_boy: "Я парень",
        role_girl: "Я девушка",
        role_saved: "Роль сохранена!",
        role_required: "Сначала выбери свою роль.",
        you_can_only_add_to_own: "Ты можешь добавлять позиции только в своё меню.",

        // Заказ (статусы/комментарии)
        order_card_title: (id) => `Заказ #${id}`,
        order_card_body: (title, itemId, priceLove, fromId, toRole, status, comment, dateStr) =>
            `Позиция: ${title || ("#" + itemId)}
Цена: ${priceLove || "-"}
От: <code>${fromId}</code> → Для: ${toRole}
Статус: <b>${status}</b>
Комментарий: ${comment ? comment : "—"}
Создан: ${dateStr}`,
        btn_accept: "✅ Принять",
        btn_reject: "❌ Отклонить",
        btn_done: "🎉 Готово",
        enter_reason_reject: "Напишите причину отклонения:",
        enter_comment_optional: "Добавьте комментарий (или введите «-», чтобы пропустить):",
        status_changed_notify: (id, status) => `Ваш заказ #${id} теперь в статусе: <b>${status}</b>`,
        status_saved: "Статус заказа обновлён.",
        reason_required: "Нужна причина. Напишите текст причины:",
        btn_delete_pair: "🗑 Удалить пару",
        delpair_need_pair: "Сначала создайте или присоединитесь к паре.",
        delpair_already_pending: "Запрос на удаление пары уже отправлен. Ожидаем согласие второго участника.",
        delpair_request_created: "Запрос на удаление пары создан. Ожидаем согласие второго участника.",
        delpair_partner_prompt: "Партнёр запросил удаление пары. Подтвердить?",
        btn_confirm_delete: "✅ Подтвердить удаление",
        btn_cancel_delete: "✋ Отменить запрос",
        delpair_cancelled: "Запрос на удаление пары отменён.",
        delpair_done_both: "Пара удалена. Вы больше не связаны кодом пары.",
        delpair_not_member: "Это действие доступно только участникам пары.",
        delpair_nothing_pending: "Нет активного запроса на удаление.",
    },

    uk: {
        start_choose: "Оберіть мову / Choose language",
        start_help: `Привіт! Це меню для пари 💞
Створи пару та поділися кодом або приєднайся за кодом.

• /create_boy — створити пару (я хлопець)
• /create_girl — створити пару (я дівчина)
• /join ABC123 — приєднатись за кодом
• /orders — історія замовлень
• /export_menu — експорт меню (CSV)
• /export_orders — експорт замовлень (CSV)`,
        home_choose: "Оберіть меню:",
        btn_boy: "🍽 Меню хлопця",
        btn_girl: "🍽 Меню дівчини",
        btn_add: "➕ Додати позицію",
        btn_history: "📜 Історія замовлень",
        btn_invite_partner: "🔗 Запросити другу половинку",
        btn_invite_others: "🫶 Поділитися ботом для інших пар",
        invite_partner_btn: "Відкрити бота за посиланням",
        invite_partner_message: "Запроси другу половинку за посиланням:",
        invite_others_caption: "Поділись цим ботом із друзями 💞",
        invite_others_message: "Поділись ботом з іншими парами:",
        pair_created: (code) =>
            `Пару створено! Код: <b>${code}</b>\nДругий учасник може натиснути кнопку нижче або ввести: <code>/join ${code}</code>`,
        pair_join_ok: (code) => `Ви приєдналися до пари <b>${code}</b>!`,
        no_positions: "Немає позицій. Натисніть «➕ Додати позицію».",
        add_flow_title: "Назва страви:",
        add_flow_desc: "Короткий опис:",
        add_flow_price: "Ціна (наприклад: 3 🤗 або 2 💋):",
        add_flow_photo: "Надішліть фото страви одним повідомленням (як фото).",
        item_added: (id) => `Готово! Позицію #${id} додано.`,
        order_new_for_receiver: (itemId) =>
            `🛎 Нове замовлення: #${itemId}\nСтатус: new`,
        order_ok_for_sender: "Замовлення створене! Сповіщення відправлено.",
        unknown_cmd: "Команду не розпізнано. Використайте /start",
        first_start_tip: "Спочатку /start",

        orders_empty: "Поки немає замовлень.",
        orders_header: "Історія замовлень:",
        orders_filter_in: "📥 До мене",
        orders_filter_out: "📤 Мої",
        orders_filter_all: "📜 Усі",
        orders_next: "▶️ Далі",
        orders_reset: "⏮️ Спочатку",
        orders_view: "Відкрити",
        order_line: (id, itemId, title, fromId, toRole, status, dateStr) =>
            `#${id} · ${title || ("позиція " + itemId)}
Від: <code>${fromId}</code> → Для: ${toRole}
Статус: <b>${status}</b> · ${dateStr}`,

        choose_role: "Хто ти? Обери роль:",
        role_boy: "Я хлопець",
        role_girl: "Я дівчина",
        role_saved: "Роль збережена!",
        role_required: "Спочатку обери свою роль.",
        you_can_only_add_to_own: "Ти можеш додавати позиції лише у своє меню.",

        order_card_title: (id) => `Замовлення #${id}`,
        order_card_body: (title, itemId, priceLove, fromId, toRole, status, comment, dateStr) =>
            `Позиція: ${title || ("#" + itemId)}
Ціна: ${priceLove || "-"}
Від: <code>${fromId}</code> → Для: ${toRole}
Статус: <b>${status}</b>
Коментар: ${comment ? comment : "—"}
Створено: ${dateStr}`,
        btn_accept: "✅ Прийняти",
        btn_reject: "❌ Відхилити",
        btn_done: "🎉 Готово",
        enter_reason_reject: "Напишіть причину відхилення:",
        enter_comment_optional: "Додайте коментар (або введіть «-», щоб пропустити):",
        status_changed_notify: (id, status) => `Ваше замовлення #${id} тепер у статусі: <b>${status}</b>`,
        status_saved: "Статус замовлення оновлено.",
        reason_required: "Потрібна причина. Напишіть текст причини:",
        btn_back: "⬅️ Назад",
        btn_delete_pair: "🗑 Видалити пару",
        delpair_need_pair: "Спочатку створіть або приєднайтесь до пари.",
        delpair_already_pending: "Запит на видалення пари вже створено. Чекаємо згоду другого учасника.",
        delpair_request_created: "Запит на видалення пари створено. Чекаємо згоду другого учасника.",
        delpair_partner_prompt: "Партнер запросив видалення пари. Підтвердити?",
        btn_confirm_delete: "✅ Підтвердити видалення",
        btn_cancel_delete: "✋ Скасувати запит",
        delpair_cancelled: "Запит на видалення пари скасовано.",
        delpair_done_both: "Пару видалено. Ви більше не пов'язані кодом пари.",
        delpair_not_member: "Дія доступна лише учасникам пари.",
        delpair_nothing_pending: "Немає активного запиту на видалення.",
    },

    en: {
        start_choose: "Choose your language",
        start_help: `Hi! This is a couple menu bot 💞
Create a pair and share the code, or join by code.

• /create_boy — create pair (I'm a boy)
• /create_girl — create pair (I'm a girl)
• /join ABC123 — join by code
• /orders — order history
• /export_menu — export menu (CSV)
• /export_orders — export orders (CSV)`,
        home_choose: "Choose a menu:",
        btn_boy: "🍽 Boy's menu",
        btn_girl: "🍽 Girl's menu",
        btn_add: "➕ Add item",
        btn_history: "📜 Order history",
        btn_invite_partner: "🔗 Invite your partner",
        btn_invite_others: "🫶 Share bot with other couples",
        invite_partner_btn: "Open bot via link",
        invite_partner_message: "Invite your partner via this link:",
        invite_others_caption: "Share this bot with your friends 💞",
        invite_others_message: "Share the bot with other couples:",
        pair_created: (code) =>
            `Pair created! Code: <b>${code}</b>\nYour partner can press the button below or type: <code>/join ${code}</code>`,
        pair_join_ok: (code) => `You joined the pair <b>${code}</b>!`,
        no_positions: "No items yet. Tap “➕ Add item”.",
        add_flow_title: "Item title:",
        add_flow_desc: "Short description:",
        add_flow_price: "Price in hugs/kisses (e.g. 3 🤗 or 2 💋):",
        add_flow_photo: "Send the dish photo in a single message (as photo).",
        item_added: (id) => `Done! Item #${id} added.`,
        order_new_for_receiver: (itemId) =>
            `🛎 New order: #${itemId}\nStatus: new`,
        order_ok_for_sender: "Order created! Notification sent.",
        unknown_cmd: "Unknown command. Use /start",
        first_start_tip: "Please /start first",

        orders_empty: "No orders yet.",
        orders_header: "Order history:",
        orders_filter_in: "📥 Incoming",
        orders_filter_out: "📤 Outgoing",
        orders_filter_all: "📜 All",
        orders_next: "▶️ Next",
        orders_reset: "⏮️ Reset",
        orders_view: "Open",
        order_line: (id, itemId, title, fromId, toRole, status, dateStr) =>
            `#${id} · ${title || ("item " + itemId)}
From: <code>${fromId}</code> → To: ${toRole}
Status: <b>${status}</b> · ${dateStr}`,

        choose_role: "Who are you? Choose your role:",
        role_boy: "I'm a boy",
        role_girl: "I'm a girl",
        role_saved: "Role saved!",
        role_required: "Please choose your role first.",
        you_can_only_add_to_own: "You can add items only to your own menu.",

        order_card_title: (id) => `Order #${id}`,
        order_card_body: (title, itemId, priceLove, fromId, toRole, status, comment, dateStr) =>
            `Item: ${title || ("#" + itemId)}
Price: ${priceLove || "-"}
From: <code>${fromId}</code> → To: ${toRole}
Status: <b>${status}</b>
Comment: ${comment ? comment : "—"}
Created: ${dateStr}`,
        btn_accept: "✅ Accept",
        btn_reject: "❌ Reject",
        btn_done: "🎉 Done",
        enter_reason_reject: "Please type the reason for rejection:",
        enter_comment_optional: "Add a comment (or type '-' to skip):",
        status_changed_notify: (id, status) => `Your order #${id} is now: <b>${status}</b>`,
        status_saved: "Order status updated.",
        reason_required: "A reason is required. Please type it:",
        btn_back: "⬅️ Back",
        btn_delete_pair: "🗑 Delete pair",
        delpair_need_pair: "Create or join a pair first.",
        delpair_already_pending: "A delete request already exists. Waiting for your partner to confirm.",
        delpair_request_created: "Delete request created. Waiting for partner confirmation.",
        delpair_partner_prompt: "Your partner requested to delete the pair. Confirm?",
        btn_confirm_delete: "✅ Confirm delete",
        btn_cancel_delete: "✋ Cancel request",
        delpair_cancelled: "Delete request cancelled.",
        delpair_done_both: "Pair deleted. You are no longer linked by a pair code.",
        delpair_not_member: "Only pair members can do this.",
        delpair_nothing_pending: "No active delete request.",
    },
};
function t(lang, key, ...args) {
    const pack = I18N[lang] || I18N.ru;
    const v = pack[key];
    return typeof v === "function" ? v(...args) : v;
}

// ───────────────────────────────
// Helpers (JWT, Firestore, Telegram)
// ───────────────────────────────
function base64url(input) {
    const b64 = btoa(input);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function normalizeNewlines(str) {
    return str && str.includes("\\n") ? str.replace(/\\n/g, "\n") : str;
}
function pemToArrayBuffer(pem) {
    pem = normalizeNewlines(pem);
    const b64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr.buffer;
}
async function gcpAccessToken(env) {
    const iat = Math.floor(Date.now() / 1000), exp = iat + 3600;
    const h = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const p = base64url(JSON.stringify({
        iss: env.GCP_CLIENT_EMAIL,
        sub: env.GCP_CLIENT_EMAIL,
        aud: "https://oauth2.googleapis.com/token",
        scope: FS_SCOPE,
        iat, exp
    }));
    const toSign = `${h}.${p}`;
    const key = await crypto.subtle.importKey(
        "pkcs8",
        pemToArrayBuffer(env.GCP_PRIVATE_KEY),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sigBuf = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
    const sig = base64url(String.fromCharCode(...new Uint8Array(sigBuf)));
    const jwt = `${toSign}.${sig}`;

    const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt
        })
    });
    const data = await resp.json();
    if (!data.access_token) throw new Error("No access_token: " + JSON.stringify(data));
    return data.access_token;
}
function withBack(reply_markup, lang = "ru") {
    // приведём к виду { inline_keyboard: [...] }
    let kb = reply_markup && reply_markup.inline_keyboard
        ? reply_markup
        : { inline_keyboard: [] };

    // проверим, есть ли уже кнопка с callback_data=home или с таким же текстом
    const hasBack = kb.inline_keyboard.some(
        row => row.some(btn => btn.callback_data === "home")
    );
    if (!hasBack) {
        kb.inline_keyboard.push([{ text: t(lang, "btn_back"), callback_data: "home" }]);
    }
    return kb;
}

// Firestore REST
async function fsGet(env, path) {
    const token = await gcpAccessToken(env);
    const url = `https://firestore.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/databases/(default)/documents/${path}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return r.ok ? r.json() : null;
}
async function fsRunQuery(env, structuredQuery) {
    const token = await gcpAccessToken(env);
    const url = `https://firestore.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/databases/(default)/documents:runQuery`;
    const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ structuredQuery })
    });
    const list = await r.json();
    return Array.isArray(list) ? list.filter(x => x.document).map(x => x.document) : [];
}
async function fsCreate(env, collection, docId, fields) {
    const token = await gcpAccessToken(env);
    const url = `https://firestore.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/databases/(default)/documents/${collection}?documentId=${encodeURIComponent(docId)}`;
    const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fields: mapFields(fields) })
    });
    return r.json();
}
async function fsPatch(env, path, fields) {
    // обновление части полей документа
    const token = await gcpAccessToken(env);
    const url = `https://firestore.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/databases/(default)/documents/${path}?currentDocument.exists=true`;
    const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fields: mapFields(fields) })
    });
    return r.json();
}
async function fsSet(env, path, fields) {
    const token = await gcpAccessToken(env);
    const url = `https://firestore.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/databases/(default)/documents/${path}`;
    const r = await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fields: mapFields(fields) }),
    });
    return r.json();
}
async function fsDelete(env, path) {
    const token = await gcpAccessToken(env);
    const url = `https://firestore.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/databases/(default)/documents/${path}`;
    const r = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }});
    // Firestore возвращает пустой ответ при успехе
    return r.ok;
}
function mapFields(obj) {
    const f = {};
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") f[k] = { stringValue: v };
        else if (typeof v === "number") f[k] = { integerValue: String(v) };
        else if (typeof v === "boolean") f[k] = { booleanValue: v };
        else if (Array.isArray(v)) f[k] = { arrayValue: { values: v.map(x => typeof x==="number" ? { integerValue:String(x) } : { stringValue:String(x) }) } };
        else if (v === null || v === undefined) continue;
        else f[k] = { stringValue: JSON.stringify(v) };
    }
    return f;
}
function fget(doc, key, def = null) {
    const f = doc?.fields?.[key];
    if (!f) return def;
    if (f.stringValue !== undefined) return f.stringValue;
    if (f.integerValue !== undefined) return Number(f.integerValue);
    if (f.booleanValue !== undefined) return f.booleanValue;
    if (f.arrayValue?.values) return f.arrayValue.values.map(v => v.stringValue ?? Number(v.integerValue));
    return def;
}
function genPairCode(len = 6) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Telegram helpers
async function tgSendMessage(env, chat_id, text, reply_markup, lang = "ru") {
    await fetch(`${TG_API(env.TG_TOKEN)}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id,
            text,
            parse_mode: "HTML",
            reply_markup: withBack(reply_markup, lang)
        }),
    });
}
async function tgSendPhoto(env, chat_id, photo, caption, reply_markup, lang = "ru") {
    await fetch(`${TG_API(env.TG_TOKEN)}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id,
            photo,
            caption,
            parse_mode: "HTML",
            reply_markup: withBack(reply_markup, lang)
        }),
    });
}
async function tgAnswerCallbackQuery(env, callback_query_id, text = "", show_alert = false) {
    await fetch(`${TG_API(env.TG_TOKEN)}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id, text, show_alert })
    });
}
async function tgSendDocument(env, chat_id, fileName, buf, mime="text/csv") {
    const fd = new FormData();
    fd.append("chat_id", String(chat_id));
    fd.append("document", new File([buf], fileName, { type: mime }));
    await fetch(`${TG_API(env.TG_TOKEN)}/sendDocument`, { method:"POST", body: fd });
}

// Users helpers & deep-link
async function getUser(env, telegramId) { return await fsGet(env, `users/${telegramId}`); }
async function setUser(env, telegramId, fields) { return await fsSet(env, `users/${telegramId}`, fields); }
function botDeepLink(env, payload) { return `https://t.me/${env.BOT_USERNAME}?start=${encodeURIComponent(payload)}`; }

//Pair delete
// получить документ пары по коду
async function getPairDoc(env, code) { return await fsGet(env, `pairs/${code}`); }

// удалить все menuItems и orders пары
async function wipePairCollections(env, pairCode) {
    // menuItems
    const items = await fsRunQuery(env, {
        from:[{collectionId:"menuItems"}],
        where:{ fieldFilter:{ field:{fieldPath:"pairCode"}, op:"EQUAL", value:{ stringValue: pairCode } } },
        limit: 1000
    });
    for (const d of items) {
        const id = d.name.split("/").pop();
        await fsDelete(env, `menuItems/${id}`);
    }
    // orders
    const orders = await fsRunQuery(env, {
        from:[{collectionId:"orders"}],
        where:{ fieldFilter:{ field:{fieldPath:"pairCode"}, op:"EQUAL", value:{ stringValue: pairCode } } },
        limit: 2000
    });
    for (const d of orders) {
        const id = d.name.split("/").pop();
        await fsDelete(env, `orders/${id}`);
    }
}

// найти второго участника пары
async function findOtherMemberId(env, pairDoc, meId) {
    let members=[];
    try { members = JSON.parse(fget(pairDoc,"members","[]")); } catch { members=[]; }
    return members.find(x => Number(x) !== Number(meId)) || null;
}

// полная финализация удаления пары (после второго согласия)
async function finalizePairDelete(env, initiatorId, confirmerId, pairCode) {
    // отвязать обоих пользователей от пары
    const pDoc = await getPairDoc(env, pairCode);
    let members=[];
    try { members = JSON.parse(fget(pDoc,"members","[]")); } catch { members=[]; }
    for (const uid of members) {
        await setUser(env, uid, { pairCode: "" }); // роль оставим
    }
    // очистить коллекции и саму пару
    await wipePairCollections(env, pairCode);
    await fsDelete(env, `pairs/${pairCode}`);
    // уведомить обоих
    const u1 = await getUser(env, initiatorId); const lang1 = fget(u1,"lang","ru");
    const u2 = await getUser(env, confirmerId); const lang2 = fget(u2,"lang","ru");
    await tgSendMessage(env, initiatorId, t(lang1,"delpair_done_both"));
    await tgSendMessage(env, confirmerId, t(lang2,"delpair_done_both"));
}

// ───────────────────────────────
// UI helpers
// ───────────────────────────────
async function sendLangChoice(env, chatId) {
    const kb = { inline_keyboard: [
            [{ text: "🇷🇺 Русский", callback_data: "lang:ru" }],
            [{ text: "🇺🇦 Українська", callback_data: "lang:uk" }],
            [{ text: "🇬🇧 English", callback_data: "lang:en" }],
        ]};
    await tgSendMessage(env, chatId, I18N.ru.start_choose, kb);
}
async function sendRoleChoice(env, chatId, lang) {
    await tgSendMessage(env, chatId, t(lang, "choose_role"), {
        inline_keyboard: [
            [{ text: t(lang, "role_boy"), callback_data: "setrole:boy" }],
            [{ text: t(lang, "role_girl"), callback_data: "setrole:girl" }],
        ]
    });
}

// ───────────────────────────────
// Handlers: start / create / join / home / menus
// ───────────────────────────────
async function handleStart(env, chatId, fromId, payloadRaw = "") {
    const joinMatch = /^join-([A-Z0-9]{4,12})$/.exec(payloadRaw || "");
    const langMatch = /^lang-(ru|uk|en)$/.exec(payloadRaw || "");
    const refMatch  = /^ref-(\d+)$/.exec(payloadRaw || "");

    if (refMatch && Number(refMatch[1]) !== fromId) {
        await setUser(env, fromId, { telegramId: fromId, refBy: Number(refMatch[1]) });
    }
    if (langMatch) {
        await setUser(env, fromId, { telegramId: fromId, lang: langMatch[1] });
    }
    if (joinMatch) {
        return await handleJoin(env, chatId, fromId, joinMatch[1]);
    }

    const userDoc = await getUser(env, fromId);
    const lang = fget(userDoc, "lang", null);
    if (!lang) return sendLangChoice(env, chatId);
    await tgSendMessage(env, chatId, t(lang, "start_help"));
}

async function handleCreate(env, chatId, fromId, role) {
    const uDoc = await getUser(env, fromId);
    const lang = fget(uDoc, "lang", "ru");

    const code = genPairCode();
    await fsCreate(env, "pairs", code, { code, createdBy: fromId, members: JSON.stringify([fromId]), createdAt: Date.now() });
    await setUser(env, fromId, { telegramId: fromId, pairCode: code, role });

    const refBy = fget(uDoc, "refBy", null);
    if (refBy) {
        await fsCreate(env, "referrals", `R-${Date.now()}-${fromId}`, { refBy, newUserId: fromId, pairCode: code, createdAt: Date.now() });
    }

    await tgSendMessage(env, chatId, t(lang, "pair_created", code), {
        inline_keyboard: [
            [{ text: t(lang, "btn_boy"), callback_data: "menu:boy:0" }],
            [{ text: t(lang, "btn_girl"), callback_data: "menu:girl:0" }],
            [{ text: t(lang, "btn_add"), callback_data: "item:add" }],
            [{ text: t(lang, "invite_partner_btn"), callback_data: "invite:partner" }],
        ],
    });
}

async function handleJoin(env, chatId, fromId, code) {
    const uDoc = await getUser(env, fromId);
    const lang = fget(uDoc, "lang", "ru");

    const pair = await fsGet(env, `pairs/${code}`);
    if (!pair) return tgSendMessage(env, chatId, `Код <b>${code}</b> не найден 😔`);

    let members = [];
    try { members = JSON.parse(fget(pair, "members", "[]")); } catch { members = []; }
    if (!members.includes(fromId)) {
        if (members.length >= 2) return tgSendMessage(env, chatId, `Эта пара уже заполнена двумя участниками.`);
        members.push(fromId);
        await fsSet(env, `pairs/${code}`, { members: JSON.stringify(members) });
    }
    await setUser(env, fromId, { telegramId: fromId, pairCode: code });
    await tgSendMessage(env, chatId, t(lang, "pair_join_ok", code), { inline_keyboard: [[{ text: "Домой", callback_data: "home" }]] });

    const curRole = fget(uDoc, "role", "");
    if (!curRole) await sendRoleChoice(env, chatId, lang);
}

async function handleHome(env, chatId, fromId) {
    const uDoc = await getUser(env, fromId);
    const lang = fget(uDoc, "lang", "ru");

    await tgSendMessage(env, chatId, t(lang, "home_choose"), {
        inline_keyboard: [
            [{ text: t(lang, "btn_boy"), callback_data: "menu:boy:0" }],
            [{ text: t(lang, "btn_girl"), callback_data: "menu:girl:0" }],
            [{ text: t(lang, "btn_add"), callback_data: "item:add" }],
            [{ text: t(lang, "btn_history"), callback_data: "orders:all:reset" }],
            [{ text: t(lang, "btn_invite_others"), callback_data: "invite:others" }],
            [{ text: t(lang, "btn_delete_pair"), callback_data: "pairdel:start" }],
        ]
    });
}

async function handleShowMenu(env, chatId, fromId, role, page = 0) {
    const uDoc = await getUser(env, fromId);
    if (!uDoc) return tgSendMessage(env, chatId, I18N.ru.first_start_tip);
    const lang = fget(uDoc, "lang", "ru");
    const pairCode = fget(uDoc, "pairCode", "");

    const docs = await fsRunQuery(env, {
        from: [{ collectionId: "menuItems" }],
        where: { compositeFilter: {
                op: "AND",
                filters: [
                    { fieldFilter: { field: { fieldPath: "pairCode" }, op: "EQUAL", value: { stringValue: pairCode } } },
                    { fieldFilter: { field: { fieldPath: "ownerRole" }, op: "EQUAL", value: { stringValue: role } } },
                ]
            }},
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
        limit: 1, offset: page
    });

    if (!docs.length) return tgSendMessage(env, chatId, t(lang, "no_positions"));

    const it = docs[0], id = it.name.split("/").pop();
    const title = fget(it, "title", ""), description = fget(it, "description", ""), priceLove = fget(it, "priceLove", "");
    const photoFileId = fget(it, "photoFileId", null);

    const caption = `#${id}\n<b>${title}</b>\n${description}\nЦена: <b>${priceLove}</b>`;
    const nav = {
        inline_keyboard: [
            [{ text: "🛒 Заказать", callback_data: `order:${id}` }],
            [
                { text: "◀️", callback_data: `menu:${role}:${Math.max(0, page - 1)}` },
                { text: "▶️", callback_data: `menu:${role}:${page + 1}` }
            ]
        ]
    };
    if (photoFileId) await tgSendPhoto(env, chatId, photoFileId, caption, nav);
    else await tgSendMessage(env, chatId, caption, nav);
}

async function handlePairDeleteStart(env, chatId, fromId) {
    const u = await getUser(env, fromId);
    const lang = fget(u,"lang","ru");
    const pairCode = fget(u,"pairCode","");
    if (!pairCode) return tgSendMessage(env, chatId, t(lang,"delpair_need_pair"));

    const pair = await getPairDoc(env, pairCode);
    // если уже есть запрос — просто сообщим
    const pendingBy = fget(pair,"deleteRequestedBy",0);
    if (pendingBy) {
        return tgSendMessage(env, chatId, t(lang,"delpair_already_pending"));
    }

    // создаём запрос
    await fsPatch(env, `pairs/${pairCode}`, {
        deleteRequestedBy: Number(fromId),
        deleteRequestedAt: Date.now()
    });

    // уведомим второго участника
    const otherId = await findOtherMemberId(env, pair, fromId);
    if (otherId) {
        const ou = await getUser(env, otherId); const olang = fget(ou,"lang","ru");
        await tgSendMessage(env, otherId, t(olang,"delpair_partner_prompt"), {
            inline_keyboard: [
                [{ text: t(olang,"btn_confirm_delete"), callback_data: "pairdel:confirm" }],
                [{ text: t(olang,"btn_cancel_delete"),  callback_data: "pairdel:cancel"  }],
            ]
        });
    }

    await tgSendMessage(env, chatId, t(lang,"delpair_request_created"));
}

async function handlePairDeleteCancel(env, chatId, fromId) {
    const u = await getUser(env, fromId);
    const lang = fget(u,"lang","ru");
    const pairCode = fget(u,"pairCode","");
    if (!pairCode) return tgSendMessage(env, chatId, t(lang,"delpair_need_pair"));

    const pair = await getPairDoc(env, pairCode);
    const pendingBy = fget(pair,"deleteRequestedBy",0);
    if (!pendingBy) return tgSendMessage(env, chatId, t(lang,"delpair_nothing_pending"));

    // только участники пары могут отменять
    let members=[]; try { members = JSON.parse(fget(pair,"members","[]")); } catch {}
    if (!members.includes(fromId)) return tgSendMessage(env, chatId, t(lang,"delpair_not_member"));

    await fsPatch(env, `pairs/${pairCode}`, { deleteRequestedBy: 0, deleteRequestedAt: 0 });
    // уведомим обоих
    const otherId = await findOtherMemberId(env, pair, fromId);
    await tgSendMessage(env, chatId, t(lang,"delpair_cancelled"));
    if (otherId) {
        const ou = await getUser(env, otherId); const olang = fget(ou,"lang","ru");
        await tgSendMessage(env, otherId, t(olang,"delpair_cancelled"));
    }
}

async function handlePairDeleteConfirm(env, chatId, fromId) {
    const u = await getUser(env, fromId);
    const lang = fget(u,"lang","ru");
    const pairCode = fget(u,"pairCode","");
    if (!pairCode) return tgSendMessage(env, chatId, t(lang,"delpair_need_pair"));

    const pair = await getPairDoc(env, pairCode);
    const pendingBy = fget(pair,"deleteRequestedBy",0);
    if (!pendingBy) return tgSendMessage(env, chatId, t(lang,"delpair_nothing_pending"));

    // только второй участник может подтвердить (не тот, кто запросил)
    if (Number(pendingBy) === Number(fromId)) {
        // он же может отменить — через "pairdel:cancel"
        return tgSendMessage(env, chatId, t(lang,"delpair_already_pending"));
    }

    const otherId = Number(pendingBy);
    await finalizePairDelete(env, otherId, fromId, pairCode);
}

// ───────────────────────────────
// Добавление позиции — только в своё меню
// ───────────────────────────────
const flows = new Map();
function flowGet(uid){ return flows.get(uid); }
function flowSet(uid,v){ flows.set(uid,v); }
function flowClear(uid){ flows.delete(uid); }

async function handleAddItemStart(env, chatId, fromId) {
    const uDoc = await getUser(env, fromId);
    const lang = fget(uDoc, "lang", "ru");
    const role = fget(uDoc, "role", "");
    if (!role) {
        await tgSendMessage(env, chatId, t(lang, "role_required"));
        await sendRoleChoice(env, chatId, lang);
        return;
    }
    flowSet(fromId, { stage: 2, draft: { ownerRole: role } });
    await tgSendMessage(env, chatId, t(lang, "add_flow_title"));
}
async function handleFlowText(env, chatId, fromId, text) {
    const s = flowGet(fromId);
    if (!s) {
        // может быть в режиме комментария к заказу
        const used = await handleCommentFlowText(env, chatId, fromId, text);
        return used;
    }

    const uDoc = await getUser(env, fromId);
    const lang = fget(uDoc, "lang", "ru");
    const msg = (text || "").trim();

    if (s.stage === 2) {
        s.draft.title = msg; s.stage = 3;
        await tgSendMessage(env, chatId, t(lang, "add_flow_desc"));
        return true;
    }
    if (s.stage === 3) {
        s.draft.description = msg; s.stage = 4;
        await tgSendMessage(env, chatId, t(lang, "add_flow_price"));
        return true;
    }
    if (s.stage === 4) {
        s.draft.priceLove = msg; s.stage = 5;
        await tgSendMessage(env, chatId, t(lang, "add_flow_photo"));
        return true;
    }
    return true;
}
async function handleFlowPhoto(env, chatId, fromId, fileId) {
    const s = flowGet(fromId);
    if (!s || s.stage !== 5) return false;

    const uDoc = await getUser(env, fromId);
    if (!uDoc) { await tgSendMessage(env, chatId, I18N.ru.first_start_tip); return true; }
    const lang = fget(uDoc, "lang", "ru");
    const role = fget(uDoc, "role", "");
    if (!role) { await tgSendMessage(env, chatId, t(lang, "role_required")); return true; }

    if (s.draft.ownerRole !== role) {
        await tgSendMessage(env, chatId, t(lang, "you_can_only_add_to_own"));
        s.draft.ownerRole = role;
    }

    const pairCode = fget(uDoc, "pairCode", "");
    const id = `${role === "boy" ? "B" : "G"}-${Date.now().toString().slice(-6)}`;

    await fsCreate(env, "menuItems", id, {
        id, pairCode,
        ownerRole: s.draft.ownerRole,
        title: s.draft.title,
        description: s.draft.description,
        priceLove: s.draft.priceLove,
        photoFileId: fileId,
        createdAt: Date.now()
    });
    await tgSendMessage(env, chatId, t(lang, "item_added", id));
    flowClear(fromId); return true;
}

// ───────────────────────────────
// Заказы: создание, просмотр, статусы, комментарии
// ───────────────────────────────
async function handleOrder(env, chatId, fromId, itemId) {
    const uDoc = await getUser(env, fromId);
    const lang = fget(uDoc, "lang", "ru");
    if (!uDoc) return tgSendMessage(env, chatId, t(lang, "first_start_tip"));

    const pairCode = fget(uDoc, "pairCode", "");
    const itemDoc = await fsGet(env, `menuItems/${itemId}`);
    if (!itemDoc) return tgSendMessage(env, chatId, "Позиция не найдена");
    const toRole = fget(itemDoc, "ownerRole", "boy");
    const id = `ORD-${Date.now()}`;

    await fsCreate(env, "orders", id, {
        id, pairCode, itemId,
        fromUserId: fromId,
        toRole,
        status: "new",
        comment: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: fromId
    });

    // уведомим получателя
    const mates = await fsRunQuery(env, {
        from: [{ collectionId: "users" }],
        where: { compositeFilter: { op:"AND", filters: [
                    { fieldFilter: { field:{ fieldPath:"pairCode" }, op:"EQUAL", value:{ stringValue: pairCode } } },
                    { fieldFilter: { field:{ fieldPath:"role" }, op:"EQUAL", value:{ stringValue: toRole } } },
                ]}},
        limit: 2
    });
    if (mates.length) {
        const receiverId = Number(fget(mates[0], "telegramId", 0));
        if (receiverId) {
            await tgSendMessage(env, receiverId, t(lang, "order_new_for_receiver", itemId), {
                inline_keyboard: [
                    [{ text: t(lang, "orders_view"), callback_data: `orderview:${id}` }],
                    [{ text: t(lang, "btn_accept"), callback_data: `orderstatus:${id}:accepted` }],
                    [{ text: t(lang, "btn_reject"), callback_data: `orderstatus:${id}:rejected` }]
                ]
            });
        }
    }
    await tgSendMessage(env, chatId, t(lang, "order_ok_for_sender"));
}

function fmtDate(ts, lang) {
    try {
        const d = new Date(Number(ts));
        const locales = lang === "uk" ? "uk-UA" : lang === "en" ? "en-GB" : "ru-RU";
        return d.toLocaleString(locales, { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
    } catch { return String(ts); }
}

async function renderOrderCard(env, chatId, viewerId, orderId) {
    const oDoc = await fsGet(env, `orders/${orderId}`);
    if (!oDoc) return;
    const fromUserId = fget(oDoc,"fromUserId",0);
    const toRole = fget(oDoc,"toRole","boy");
    const status = fget(oDoc,"status","new");
    const comment = fget(oDoc,"comment","");
    const createdAt = fget(oDoc,"createdAt",0);

    const uDoc = await getUser(env, viewerId);
    const lang = fget(uDoc,"lang","ru");
    const myRole = fget(uDoc,"role","");

    const itemId = fget(oDoc,"itemId","");
    const itemDoc = await fsGet(env, `menuItems/${itemId}`);
    const title = itemDoc ? fget(itemDoc,"title","") : "";
    const priceLove = itemDoc ? fget(itemDoc,"priceLove","") : "";

    const text = `<b>${t(lang,"order_card_title", orderId)}</b>\n` +
        t(lang, "order_card_body", title, itemId, priceLove, fromUserId, toRole, status, comment, fmtDate(createdAt,lang));

    // кнопки: если зритель — получатель (его роль == toRole), то дать действия
    let kb = { inline_keyboard: [[{ text:"🏠", callback_data:"home" }]] };
    if (myRole && myRole === toRole) {
        const row1 = [{ text: t(lang,"btn_accept"), callback_data: `orderstatus:${orderId}:accepted` }];
        const row2 = [{ text: t(lang,"btn_reject"), callback_data: `orderstatus:${orderId}:rejected` }];
        const row3 = [{ text: t(lang,"btn_done"),   callback_data: `orderstatus:${orderId}:done` }];
        kb = { inline_keyboard: [row1,row2,row3,[{ text:"🏠", callback_data:"home" }]] };
    }
    await tgSendMessage(env, chatId, text, kb);
}

// ── Комментарии к смене статуса (flow)
const commentFlows = new Map(); // key: userId -> { orderId, nextStatus, requireReason }
function commentFlowSet(uid, v){ commentFlows.set(uid, v); }
function commentFlowGet(uid){ return commentFlows.get(uid); }
function commentFlowClear(uid){ commentFlows.delete(uid); }

async function handleCommentFlowText(env, chatId, fromId, text) {
    const f = commentFlowGet(fromId);
    if (!f) return false;
    const uDoc = await getUser(env, fromId);
    const lang = fget(uDoc,"lang","ru");
    const msg = (text||"").trim();

    if (f.requireReason && (!msg || msg === "-")) {
        await tgSendMessage(env, chatId, t(lang,"reason_required"));
        return true;
    }
    const comment = (msg === "-" ? "" : msg);
    await updateOrderStatus(env, chatId, fromId, f.orderId, f.nextStatus, comment);
    commentFlowClear(fromId);
    return true;
}

async function orderStatusPrompt(env, chatId, fromId, orderId, nextStatus) {
    const uDoc = await getUser(env, fromId);
    const lang = fget(uDoc,"lang","ru");

    if (nextStatus === "rejected") {
        commentFlowSet(fromId, { orderId, nextStatus, requireReason: true });
        await tgSendMessage(env, chatId, t(lang,"enter_reason_reject"));
    } else {
        commentFlowSet(fromId, { orderId, nextStatus, requireReason: false });
        await tgSendMessage(env, chatId, t(lang,"enter_comment_optional"));
    }
}

async function updateOrderStatus(env, chatId, actorId, orderId, status, comment) {
    const oDoc = await fsGet(env, `orders/${orderId}`);
    if (!oDoc) return;
    const pairCode = fget(oDoc,"pairCode","");
    const fromUserId = fget(oDoc,"fromUserId",0);

    await fsPatch(env, `orders/${orderId}`, {
        status,
        comment: comment || "",
        updatedAt: Date.now(),
        updatedBy: actorId
    });

    // уведомить инициатора
    const actorDoc = await getUser(env, actorId);
    const lang = fget(actorDoc,"lang","ru");
    if (fromUserId) {
        await tgSendMessage(env, fromUserId, t(lang,"status_changed_notify", orderId, status));
        if (comment) {
            await tgSendMessage(env, fromUserId, "💬 " + comment);
        }
    }
    await tgSendMessage(env, chatId, t(lang,"status_saved"));
}

// ───────────────────────────────
// История заказов — курсорная пагинация
// ───────────────────────────────
function encodeCursor(createdAt, id){
    return `${createdAt}|${id}`;
}
function decodeCursor(s){
    if (!s) return null;
    const [a,b] = s.split("|");
    return { createdAt: Number(a), id: b };
}

async function queryOrdersPage(env, pairCode, filter, myRole, myId, cursor) {
    const filters = [
        { fieldFilter:{ field:{fieldPath:"pairCode"}, op:"EQUAL", value:{ stringValue: pairCode } } }
    ];
    if (filter === "in") {
        filters.push({ fieldFilter:{ field:{fieldPath:"toRole"}, op:"EQUAL", value:{ stringValue: myRole } } });
    } else if (filter === "out") {
        filters.push({ fieldFilter:{ field:{fieldPath:"fromUserId"}, op:"EQUAL", value:{ integerValue:String(myId) } } });
    }

    const structuredQuery = {
        from: [{ collectionId: "orders" }],
        where: filters.length>1 ? { compositeFilter:{ op:"AND", filters } } : filters[0],
        orderBy: [
            { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
            { field: { fieldPath: "id" },        direction: "DESCENDING" }
        ],
        limit: PAGE_SIZE
    };

    if (cursor) {
        // Firestore REST не имеет startAfter напрямую.
        // Используем startAt по последней записи и пропускаем её через offset=1.
        structuredQuery.startAt = {
            values: [
                { integerValue: String(cursor.createdAt) },
                { stringValue: cursor.id }
            ],
            before: false
        };
        structuredQuery.offset = 1;
    }

    return await fsRunQuery(env, structuredQuery);
}

async function handleOrders(env, chatId, fromId, filter="all", cursorStr=null) {
    const uDoc = await getUser(env, fromId);
    if (!uDoc) return tgSendMessage(env, chatId, I18N.ru.first_start_tip);
    const lang = fget(uDoc, "lang", "ru");
    const pairCode = fget(uDoc, "pairCode", "");
    const myRole = fget(uDoc, "role", "");

    const cursor = decodeCursor(cursorStr);
    const docs = await queryOrdersPage(env, pairCode, filter, myRole, fromId, cursor);

    if (!docs.length && !cursor) {
        await tgSendMessage(env, chatId, t(lang,"orders_empty"), { inline_keyboard: [[{ text:"🏠", callback_data:"home"}]] });
        return;
    }

    let lines = [t(lang,"orders_header")];
    let lastCursor = null;

    for (const d of docs) {
        const id = d.name.split("/").pop();
        const itemId = fget(d,"itemId","");
        const fromUserId = fget(d,"fromUserId",0);
        const toRole = fget(d,"toRole","");
        const status = fget(d,"status","new");
        const createdAt = fget(d,"createdAt",0);

        let title = "";
        const itemDoc = await fsGet(env, `menuItems/${itemId}`);
        if (itemDoc) title = fget(itemDoc,"title","");

        lines.push(t(lang,"order_line", id, itemId, title, fromUserId, toRole, status, fmtDate(createdAt,lang)));
        lastCursor = encodeCursor(createdAt, id);
    }

    const text = lines.join("\n\n");
    const kb = { inline_keyboard: [] };

    // Управление страницами: Дальше / Сначала
    const navRow = [];
    if (docs.length === PAGE_SIZE) {
        navRow.push({ text: t(lang,"orders_next"), callback_data: `orders:${filter}:next:${lastCursor}` });
    }
    navRow.push({ text: t(lang,"orders_reset"), callback_data: `orders:${filter}:reset` });
    if (navRow.length) kb.inline_keyboard.push(navRow);

    // Кнопки фильтров
    kb.inline_keyboard.push([
        { text:t(lang,"orders_filter_in"),  callback_data:"orders:in:reset"  },
        { text:t(lang,"orders_filter_out"), callback_data:"orders:out:reset" },
        { text:t(lang,"orders_filter_all"), callback_data:"orders:all:reset" }
    ]);

    // Кнопка открыть последнюю заказ
    kb.inline_keyboard.push([{ text:"🏠", callback_data:"home" }]);

    await tgSendMessage(env, chatId, text, kb);
}

// ───────────────────────────────
// Экспорт в CSV
// ───────────────────────────────
function csvEscape(val) {
    const s = (val === null || val === undefined) ? "" : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}
function toCSV(rows) {
    return rows.map(r => r.map(csvEscape).join(",")).join("\n");
}

async function exportMenuCSV(env, chatId, userId) {
    const uDoc = await getUser(env, userId);
    const pairCode = fget(uDoc,"pairCode","");
    const docs = await fsRunQuery(env, {
        from: [{ collectionId: "menuItems" }],
        where: { fieldFilter:{ field:{fieldPath:"pairCode"}, op:"EQUAL", value:{ stringValue: pairCode } } },
        orderBy: [{ field:{fieldPath:"createdAt"}, direction:"DESCENDING" }],
        limit: 1000
    });
    const rows = [["id","ownerRole","title","description","priceLove","createdAt"]];
    for (const d of docs) {
        const id = d.name.split("/").pop();
        rows.push([
            id,
            fget(d,"ownerRole",""),
            fget(d,"title",""),
            fget(d,"description",""),
            fget(d,"priceLove",""),
            fget(d,"createdAt","")
        ]);
    }
    const csv = toCSV(rows);
    await tgSendDocument(env, chatId, "menu.csv", csv, "text/csv");
}

async function exportOrdersCSV(env, chatId, userId) {
    const uDoc = await getUser(env, userId);
    const pairCode = fget(uDoc,"pairCode","");
    const docs = await fsRunQuery(env, {
        from: [{ collectionId: "orders" }],
        where: { fieldFilter:{ field:{fieldPath:"pairCode"}, op:"EQUAL", value:{ stringValue: pairCode } } },
        orderBy: [{ field:{fieldPath:"createdAt"}, direction:"DESCENDING" }],
        limit: 2000
    });
    const rows = [["id","itemId","fromUserId","toRole","status","comment","createdAt","updatedAt","updatedBy"]];
    for (const d of docs) {
        const id = d.name.split("/").pop();
        rows.push([
            id,
            fget(d,"itemId",""),
            fget(d,"fromUserId",""),
            fget(d,"toRole",""),
            fget(d,"status",""),
            fget(d,"comment",""),
            fget(d,"createdAt",""),
            fget(d,"updatedAt",""),
            fget(d,"updatedBy","")
        ]);
    }
    const csv = toCSV(rows);
    await tgSendDocument(env, chatId, "orders.csv", csv, "text/csv");
}

// ───────────────────────────────
// Router
// ───────────────────────────────
export default {
    async fetch(request, env) {
        if (request.method === "POST") {
            if (env.TG_SECRET) {
                const sh = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
                if (sh !== env.TG_SECRET) return new Response("forbidden", { status: 403 });
            }
            const update = await request.json();

            if (update.message) {
                const m = update.message;
                const chatId = m.chat.id, fromId = m.from.id;
                const text = m.text || "";

                // Фото для шага добавления
                if (m.photo && m.photo.length) {
                    const fileId = m.photo[m.photo.length - 1].file_id;
                    const handledAdd = await handleFlowPhoto(env, chatId, fromId, fileId);
                    if (!handledAdd) await tgSendMessage(env, chatId, "Фото получено, но вы не в режиме добавления позиции.");
                    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
                }

                // Текст: сначала проверим, не ждём ли комментарий к заказу
                const usedComment = await handleCommentFlowText(env, chatId, fromId, text);
                if (usedComment) return new Response(JSON.stringify({ ok:true }), { headers:{ "Content-Type":"application/json" }});

                // Команды
                if (text.startsWith("/start")) {
                    const payload = text.split(" ")[1] || "";
                    await handleStart(env, chatId, fromId, payload);
                } else if (text.startsWith("/create_boy")) {
                    await handleCreate(env, chatId, fromId, "boy");
                } else if (text.startsWith("/create_girl")) {
                    await handleCreate(env, chatId, fromId, "girl");
                } else if (text.startsWith("/join")) {
                    const code = text.split(" ")[1];
                    await handleJoin(env, chatId, fromId, code);
                } else if (text.startsWith("/orders")) {
                    await handleOrders(env, chatId, fromId, "all", null);
                } else if (text.startsWith("/export_menu")) {
                    await exportMenuCSV(env, chatId, fromId);
                } else if (text.startsWith("/export_orders")) {
                    await exportOrdersCSV(env, chatId, fromId);
                } else {
                    const used = await handleFlowText(env, chatId, fromId, text);
                    if (!used) {
                        const uDoc = await getUser(env, fromId);
                        const lang = fget(uDoc, "lang", "ru");
                        await tgSendMessage(env, chatId, t(lang, "unknown_cmd"));
                    }
                }
            }

            if (update.callback_query) {
                const q = update.callback_query;
                const chatId = q.message.chat.id, fromId = q.from.id;
                const data = q.data || "";

                try { await tgAnswerCallbackQuery(env, q.id); } catch (e) {}

                if (data.startsWith("lang:")) {
                    const lang = data.split(":")[1];
                    if (["ru","uk","en"].includes(lang)) {
                        await setUser(env, fromId, { telegramId: fromId, lang });
                        await tgSendMessage(env, chatId, t(lang, "start_help"), {
                            inline_keyboard: [[{ text:"🏠", callback_data:"home" }]]
                        });
                    } else {
                        await tgSendMessage(env, chatId, I18N.ru.start_choose);
                    }
                    return new Response(JSON.stringify({ ok:true }), { headers:{ "Content-Type":"application/json" }});
                }

                if (data === "home") {
                    await handleHome(env, chatId, fromId);
                } else if (data.startsWith("menu:")) {
                    const [, role, pageStr] = data.split(":");
                    await handleShowMenu(env, chatId, fromId, role, Number(pageStr || 0));
                } else if (data === "item:add") {
                    await handleAddItemStart(env, chatId, fromId);
                } else if (data.startsWith("order:")) {
                    const itemId = data.split(":")[1];
                    await handleOrder(env, chatId, fromId, itemId);
                } else if (data.startsWith("orders:")) {
                    // format: orders:<filter>:(reset|next[:cursor])
                    const parts = data.split(":");
                    const filter = parts[1] || "all";
                    const mode = parts[2] || "reset";
                    if (mode === "reset") {
                        await handleOrders(env, chatId, fromId, filter, null);
                    } else if (mode === "next") {
                        const cur = parts[3] || null;
                        await handleOrders(env, chatId, fromId, filter, cur);
                    }
                } else if (data.startsWith("setrole:")) {
                    const role = data.split(":")[1]; // "boy" | "girl"
                    const uDoc = await getUser(env, fromId);
                    const lang = fget(uDoc, "lang", "ru");
                    await setUser(env, fromId, { telegramId: fromId, role });
                    await tgSendMessage(env, chatId, t(lang, "role_saved"));
                } else if (data.startsWith("invite:")) {
                    const type = data.split(":")[1]; // "partner" | "others"
                    const uDoc = await getUser(env, fromId);
                    const lang = fget(uDoc, "lang", "ru");
                    if (type === "partner") {
                        const pairCode = fget(uDoc, "pairCode", null);
                        if (!pairCode) { await tgSendMessage(env, chatId, t(lang, "first_start_tip")); }
                        else {
                            const partnerLink = botDeepLink(env, `join-${pairCode}`);
                            await tgSendMessage(env, chatId, `${t(lang, "invite_partner_message")} ${partnerLink}`);
                        }
                    } else if (type === "others") {
                        const refLink = botDeepLink(env, `ref-${fromId}`);
                        await tgSendMessage(env, chatId, `${t(lang, "invite_others_message")}\n\n${refLink}`);
                    }
                } else if (data.startsWith("orderview:")) {
                    const orderId = data.split(":")[1];
                    await renderOrderCard(env, chatId, fromId, orderId);
                } else if (data.startsWith("orderstatus:")) {
                    // orderstatus:<orderId>:<status>
                    const [, orderId, nextStatus] = data.split(":");
                    await orderStatusPrompt(env, chatId, fromId, orderId, nextStatus);
                } else if (data === "pairdel:start") {
                    await handlePairDeleteStart(env, chatId, fromId);
                } else if (data === "pairdel:confirm") {
                    await handlePairDeleteConfirm(env, chatId, fromId);
                } else if (data === "pairdel:cancel") {
                    await handlePairDeleteCancel(env, chatId, fromId);
                }
            }

            return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
        }
        return new Response("ok");
    },
};