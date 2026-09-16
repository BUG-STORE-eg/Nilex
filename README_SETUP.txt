NILEX v3 - حسابات داخلية بدون Confirmation Email

مهم:
ملفات GitHub Pages وحدها لا تستطيع إنشاء مستخدم Supabase بدون مفتاح السيرفر.
لذلك هذه النسخة تضيف Supabase Edge Function في:
supabase/functions/create-nilex-user/index.ts

قبل اختبار إنشاء الحسابات، يجب نشر الـEdge Function مرة واحدة داخل مشروع Supabase، وإضافة:
SUPABASE_SERVICE_ROLE_KEY
كـSecret للـEdge Function.

لا تضع service_role key داخل أي ملف من ملفات GitHub أو JavaScript.

بعد نشر الـFunction:
- ارفع ملفات الموقع الموجودة في مجلد NILEX_v3 إلى GitHub.
- اترك مجلد supabase/functions على جهازك/مشروع Supabase لنشر الـFunction.
- التسجيل يستخدم username مثل alone.
- البريد التقني: alone@nilex.local.
- يتم تأكيد الحساب تلقائيًا من جهة السيرفر، ولا يتم إرسال Confirmation Email.
