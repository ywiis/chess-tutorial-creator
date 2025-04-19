// تكوين Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDtlgGr3cbTUjn0LGdWQwT-RuAA11JbWz4",
    authDomain: "chess-tutorial-creator.firebaseapp.com",
    databaseURL: "https://chess-tutorial-creator-default-rtdb.firebaseio.com", // إضافة رابط قاعدة البيانات
    projectId: "chess-tutorial-creator",
    storageBucket: "chess-tutorial-creator.firebasestorage.app",
    messagingSenderId: "1023508115812",
    appId: "1:1023508115812:web:26a6eee949e4ec71a98a71",
    measurementId: "G-HN253TY9GQ"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// الحصول على مراجع للخدمات المستخدمة
const auth = firebase.auth();
const database = firebase.database();

// ضبط اللغة
auth.languageCode = 'ar';

// ملاحظة هامة: يجب تفعيل خدمة المصادقة بالبريد الإلكتروني 
// وإنشاء قاعدة بيانات حقيقية في وحدة تحكم Firebase
/*
خطوات التفعيل:
1. انتقل إلى وحدة تحكم Firebase: https://console.firebase.google.com
2. اختر مشروعك "chess-tutorial-creator"
3. من القائمة الجانبية، اختر "Authentication" ثم "البدء"
4. فعّل طريقة "البريد الإلكتروني/كلمة المرور"
5. من القائمة الجانبية، اختر "Realtime Database" ثم "إنشاء قاعدة بيانات"
6. اختر الموقع المناسب ثم "التالي"
7. ابدأ في "وضع الاختبار" لتسهيل التطوير
8. إذا واجهت أي مشاكل، تحقق من وجود رابط قاعدة البيانات (databaseURL) في التكوين أعلاه
*/

// التحقق من اتصال Firebase
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
        console.log('متصل بقاعدة بيانات Firebase');
    } else {
        console.warn('غير متصل بقاعدة بيانات Firebase');
    }
}); 