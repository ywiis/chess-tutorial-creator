// متغيرات عامة
let currentUser = null;
window.isAdmin = false;

// معالج حدث تحميل الصفحة
$(window).on('load', function() {
    console.log('تم تحميل الصفحة بالكامل');
    
    // التحقق من وجود مستخدم حالي
    if (!firebase.auth().currentUser) {
        console.log('لا يوجد مستخدم مسجل الدخول، عرض نافذة تسجيل الدخول');
        
        // التأكد من عرض نافذة تسجيل الدخول بالشكل الصحيح
        setTimeout(function() {
            $('#auth-container').css({
                'display': 'flex',
                'opacity': '1',
                'visibility': 'visible',
                'position': 'fixed',
                'top': '0',
                'left': '0',
                'right': '0',
                'bottom': '0',
                'z-index': '1000'
            });
            
            $('#app-container').hide();
            resetAuthForm();
        }, 100);
    }
});

// استمع لحالة تسجيل الدخول
auth.onAuthStateChanged((user) => {
    if (user) {
        // المستخدم مسجل الدخول
        currentUser = user;
        console.log("تم تسجيل الدخول:", user.email);
        
        // التحقق مما إذا كان المستخدم مسؤولاً
        checkAdminStatus(user.uid);
        
        // تحديث واجهة المستخدم
        $('#user-info').text(`مرحباً ${user.email}`);
        
        // التأكد من إظهار حاوية التطبيق وإخفاء المصادقة
        $('#app-container').show();
        $('#auth-container').hide();
        
        // استعادة الصفحة الأخيرة التي تمت زيارتها إذا كانت مخزنة
        const lastVisitedPage = localStorage.getItem('lastVisitedPage');
        let storedParams = {};
        
        try {
            const paramsStr = localStorage.getItem('lastVisitedPageParams');
            if (paramsStr) {
                storedParams = JSON.parse(paramsStr);
            }
        } catch (e) {
            console.error("خطأ في تحليل معلمات الصفحة المخزنة:", e);
        }
        
        // بعد تسجيل الدخول، انتقل إلى الصفحة المخزنة إذا وجدت وإلا انتقل إلى 'lessons'
        setTimeout(() => {
            if (window.pageManager) {
                if (lastVisitedPage && window.pageManager.pages[lastVisitedPage]) {
                    console.log("الانتقال إلى الصفحة المخزنة بعد تسجيل الدخول:", lastVisitedPage, storedParams);
                    window.pageManager.navigateTo(lastVisitedPage, storedParams);
                } else {
                    // انتقل إلى الدروس المحفوظة كصفحة افتراضية
                    window.pageManager.navigateTo('lessons');
                }
            }
        }, 500);
        
        // إعادة تهيئة لوحة الشطرنج بعد ظهور الواجهة
        setTimeout(() => {
            console.log("إعادة تهيئة لوحات الشطرنج بعد تسجيل الدخول");
            
            // التأكد من وجود الدالة قبل استدعائها
            if (typeof initEditorBoard === 'function') {
                initEditorBoard();
            } else if (typeof window.initEditorBoard === 'function') {
                window.initEditorBoard();
            }
            
            if (typeof initViewerBoard === 'function') {
                initViewerBoard();
            } else if (typeof window.initViewerBoard === 'function') {
                window.initViewerBoard();
            }
            
            // إذا كان المستخدم في تبويب المحرر، تأكد من رؤية اللوحة
            if ($('#editor-tab').hasClass('active')) {
                $('#editor-board').css('visibility', 'visible').show();
                if (typeof editorBoard !== 'undefined' && editorBoard !== null) {
                    editorBoard.resize();
                }
            }
            
            // إذا كان المستخدم في تبويب العارض، تأكد من رؤية اللوحة
            if ($('#viewer-tab').hasClass('active')) {
                $('#viewer-board').css('visibility', 'visible').show();
                if (typeof viewerBoard !== 'undefined' && viewerBoard !== null) {
                    viewerBoard.resize();
                }
            }
        }, 800);
    } else {
        // المستخدم غير مسجل الدخول
        currentUser = null;
        window.isAdmin = false;
        
        // إظهار حاوية المصادقة بشكل واضح
        $('#auth-container').css({
            'display': 'flex',
            'opacity': '1',
            'visibility': 'visible'
        });
        
        // إخفاء واجهة التطبيق وضوابط المسؤول
        $('#app-container').hide();
        $('#admin-controls').hide();
        
        // إعادة تعيين حالة أزرار تسجيل الدخول عند تسجيل الخروج
        resetAuthForm();
        
        console.log('تم عرض نافذة تسجيل الدخول بنجاح');
    }
});

// معالجة تسجيل الدخول وإنشاء الحساب
$(document).ready(function() {
    // زر تسجيل الدخول (عند إرسال النموذج)
    $('#auth-form').on('submit', function(e) {
        e.preventDefault(); // منع الإرسال الافتراضي
        handleLogin();
    });

    // زر إنشاء حساب جديد
    $('#signup-btn').on('click', function() {
        handleSignup();
    });
});

// وظيفة معالجة تسجيل الدخول
function handleLogin() {
    const email = $('#auth-email').val();
    const password = $('#auth-password').val();

    if (!validateAuthInput(email, password)) return;

    // إظهار مؤشر التحميل وتعطيل الأزرار
    setAuthLoading(true, 'جاري تسجيل الدخول...');

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            showAuthMessage('تم تسجيل الدخول بنجاح', 'success');
            // لا حاجة لإعادة تمكين الأزرار هنا، onAuthStateChanged سيتولى الأمر
        })
        .catch((error) => {
            console.error('خطأ في تسجيل الدخول:', error.code, error.message);
            
            // تحسين التعامل مع الأخطاء لتقديم رسائل أكثر توجيهًا للمستخدم
            if (error.code === 'auth/user-not-found') {
                // عرض رسالة تخبر المستخدم أن البريد غير مسجل مع زر توجيه لإنشاء حساب جديد
                showRegistrationPrompt(email);
            } else {
                // عرض رسالة الخطأ العادية لباقي الأخطاء
                showAuthMessage(getAuthErrorMessage(error.code), 'error');
            }
            
            setAuthLoading(false); // إعادة تمكين الأزرار عند الخطأ
        });
}

// وظيفة معالجة إنشاء حساب جديد
function handleSignup() {
    const email = $('#auth-email').val();
    const password = $('#auth-password').val();

    if (!validateAuthInput(email, password)) return;

    // إظهار مؤشر التحميل وتعطيل الأزرار
    setAuthLoading(true, 'جاري إنشاء الحساب...');

    // استدعاء الدالة signUp الموجودة
    signUp(email, password); 
}

// وظيفة للتحقق من مدخلات المصادقة
function validateAuthInput(email, password) {
    if (!email || !password) {
        showAuthMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return false;
    }
    if (password.length < 6) {
        showAuthMessage('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل', 'error');
        return false;
    }
    return true;
}

// وظيفة لضبط حالة التحميل للأزرار
function setAuthLoading(isLoading, message = '') {
    $('#login-btn').prop('disabled', isLoading);
    $('#signup-btn').prop('disabled', isLoading);
    if (isLoading) {
        $('#login-btn').text(message);
    } else {
        $('#login-btn').text('تسجيل الدخول');
    }
}

// وظيفة لإعادة تعيين نموذج تسجيل الدخول
function resetAuthForm() {
    // إعادة تعيين النص والحالة للأزرار
    $('#login-btn').prop('disabled', false).text('تسجيل الدخول');
    $('#signup-btn').prop('disabled', false);
    
    // مسح حقول الإدخال
    $('#auth-email').val('');
    $('#auth-password').val('');
    
    // إعادة تعيين عنوان النموذج
    $('#auth-title').text('تسجيل الدخول');
    
    // إخفاء أي رسائل خطأ
    $('#auth-message').hide();
    
    console.log('تم إعادة تعيين نموذج تسجيل الدخول');
}

// تسجيل الخروج
$('#logout-btn').on('click', function() {
    auth.signOut()
        .then(() => {
            console.log('تم تسجيل الخروج بنجاح');

            // حذف بيانات التخزين المحلي للصفحة الأخيرة
            localStorage.removeItem('lastVisitedPage');
            localStorage.removeItem('lastVisitedPageParams');
            
            // إعادة تعيين URL إلى الحالة الأساسية
            history.pushState({}, '', window.location.pathname);
            
            // إعادة تعيين مدير الصفحات إذا كان موجودًا
            if (window.pageManager) {
                window.pageManager.history = [];
                window.pageManager.currentPage = null;

                // إخفاء جميع الصفحات المدارة
                Object.values(window.pageManager.pages).forEach(pageElement => {
                    if (pageElement) {
                        pageElement.style.display = 'none';
                        pageElement.classList.remove('fade-in', 'fade-out', 'active');
                    }
                });
            }
            
            // إظهار حاوية المصادقة بطريقة صحيحة
            $('#app-container').hide();
            $('#auth-container').css({
                'display': 'flex',
                'opacity': '1',
                'visibility': 'visible',
                'position': 'fixed',
                'top': '0',
                'left': '0',
                'right': '0',
                'bottom': '0',
                'z-index': '1000'
            });

            // إعادة تعيين نموذج المصادقة
            resetAuthForm();
        })
        .catch((error) => {
            console.error('خطأ في تسجيل الخروج:', error);
            alert('حدث خطأ أثناء تسجيل الخروج، يرجى المحاولة مرة أخرى');
        });
});

// وظيفة إنشاء حساب جديد
function signUp(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // تم إنشاء الحساب بنجاح
            const user = userCredential.user;
            
            // إنشاء سجل للمستخدم في قاعدة البيانات
            database.ref('users/' + user.uid).set({
                email: user.email,
                isAdmin: false,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            showAuthMessage('تم إنشاء حساب جديد بنجاح، يمكنك الآن تسجيل الدخول', 'success');
            // لا حاجة لإعادة تمكين الأزرار هنا، onAuthStateChanged سيتولى الأمر عند تسجيل الدخول التلقائي
        })
        .catch((error) => {
            // حدث خطأ أثناء إنشاء الحساب
            console.error('خطأ في إنشاء الحساب (createUserWithEmailAndPassword):', error.code, error.message); 
            showAuthMessage(getAuthErrorMessage(error.code), 'error');
            setAuthLoading(false); // إعادة تمكين الأزرار عند الخطأ
        });
}

// عرض رسالة المصادقة
function showAuthMessage(message, type) {
    const messageElement = $('#auth-message');
    messageElement.text(message);
    messageElement.removeClass('error success').addClass(type);
    messageElement.show();
    
    // إخفاء الرسالة بعد 5 ثوان
    setTimeout(() => {
        messageElement.fadeOut();
    }, 5000);
}

// وظيفة جديدة لعرض اقتراح إنشاء حساب عندما يكون البريد الإلكتروني غير مسجل
function showRegistrationPrompt(email) {
    const messageElement = $('#auth-message');
    messageElement.html(`
        البريد الإلكتروني غير مسجل. 
        <button id="quick-signup-btn" class="btn primary" style="margin-right: 10px; padding: 5px 10px; font-size: 0.9rem;">
            إنشاء حساب جديد
        </button>
    `);
    messageElement.removeClass('error success').addClass('error');
    messageElement.show();
    
    // إضافة معالج حدث للزر داخل الرسالة
    $('#quick-signup-btn').on('click', function(e) {
        e.preventDefault();
        // إعداد النموذج لإنشاء حساب جديد
        $('#auth-title').text('إنشاء حساب جديد');
        $('#auth-email').val(email); // استخدام البريد الذي تم إدخاله بالفعل
        $('#auth-password').val(''); // مسح كلمة المرور للأمان
        $('#auth-password').focus(); // التركيز على حقل كلمة المرور
        messageElement.hide(); // إخفاء رسالة الخطأ
    });
}

// الحصول على رسالة الخطأ بالعربية
function getAuthErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'البريد الإلكتروني مستخدم بالفعل';
        case 'auth/invalid-email':
            return 'صيغة البريد الإلكتروني غير صحيحة';
        case 'auth/user-not-found':
            return 'لم يتم العثور على المستخدم، هل تريد إنشاء حساب جديد؟';
        case 'auth/wrong-password':
            return 'كلمة المرور غير صحيحة، يرجى التحقق والمحاولة مرة أخرى';
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة جدًا، يجب أن تتكون من 6 أحرف على الأقل';
        case 'auth/too-many-requests':
            return 'تم تعطيل الوصول لهذا الحساب مؤقتًا بسبب محاولات تسجيل دخول متكررة، يرجى المحاولة لاحقًا';
        case 'auth/network-request-failed':
            return 'فشل الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى';
        default:
            return 'حدث خطأ أثناء المصادقة، يرجى المحاولة مرة أخرى';
    }
}

// التحقق من حالة المسؤول
function checkAdminStatus(uid) {
    // التحقق من وجود المستخدم في قاعدة البيانات
    database.ref('users/' + uid).once('value')
        .then((snapshot) => {
            const userData = snapshot.val();
            
            if (!userData) {
                // إذا لم يوجد بيانات المستخدم، نقوم بإنشائها
                database.ref('users/' + uid).set({
                    email: currentUser.email,
                    isAdmin: false,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                window.isAdmin = false;
                $('#admin-controls').hide();
                
                // تطبيق صلاحيات المستخدم العادي
                applyUserPermissions(false);
                
                console.log('تم إنشاء بيانات المستخدم لأول مرة - ليس مسؤولاً');
                
                // التحقق مما إذا كان هذا هو أول مستخدم في النظام
                checkIfFirstUser(uid);
                return;
            }
            
            if (userData.isAdmin) {
                window.isAdmin = true;
                $('#admin-controls').show();
                // إضافة علامة (مسؤول) بجوار اسم المستخدم
                $('#user-info').text(`مرحباً ${currentUser.email} (مسؤول)`);
                
                // تطبيق صلاحيات المسؤول
                applyUserPermissions(true);
                
                console.log('المستخدم هو مسؤول');
            } else {
                window.isAdmin = false;
                $('#admin-controls').hide();
                
                // تطبيق صلاحيات المستخدم العادي
                applyUserPermissions(false);
                
                console.log('المستخدم ليس مسؤولاً');
            }
        })
        .catch((error) => {
            console.error('خطأ في التحقق من حالة المسؤول:', error);
        });
}

// تطبيق صلاحيات المستخدم
function applyUserPermissions(isAdminUser) {
    console.log("تطبيق صلاحيات المستخدم - حالة المسؤول:", isAdminUser);
    
    // تحديث المتغير العام
    window.isAdmin = isAdminUser;
    
    if (isAdminUser) {
        // صلاحيات المسؤول - كل شيء متاح
        console.log("تطبيق صلاحيات المسؤول - جميع الميزات متاحة");
        
        // إظهار تبويبات المحرر والدروس
        $('.tab-btn[data-tab="editor"]').show();
        $('.tab-btn[data-tab="lessons"]').show();
        
        // عرض تبويب المحرر إذا كان نشطًا
        if ($('.tab-btn[data-tab="editor"]').hasClass('active')) {
            $('#editor-tab').addClass('active');
        }

        // إتاحة إضافة دروس جديدة
        $('#new-lesson-btn, #export-lesson, #import-btn').show();

    } else {
        // صلاحيات المستخدم العادي - فقط عرض الدروس
        console.log("تطبيق صلاحيات المستخدم العادي - عرض الدروس فقط");
        
        // إخفاء تبويب المحرر وتعطيله تمامًا
        $('.tab-btn[data-tab="editor"]').hide();
        $('#editor-tab').removeClass('active').hide();
        
        // تنشيط تبويب الدروس والانتقال إليه
        $('.tab-btn[data-tab="lessons"]').addClass('active');
        $('#lessons-tab').addClass('active').show();
        
        // إخفاء إضافة دروس جديدة
        $('#new-lesson-btn, #export-lesson, #import-btn').hide();
        
        // تعديل عنوان القسم للمستخدم العادي
        $('#lessons-tab > h2').text('الدروس المتاحة');

        // تحميل الدروس بعد التأكد من إظهار التبويب الصحيح
        if (typeof loadUserLessons === 'function') {
            console.log("استدعاء loadUserLessons للمستخدم العادي من applyUserPermissions");
            loadUserLessons();
        }
    }
    
    // استخدام الوظيفة العامة للتحقق من صلاحيات المستخدم وتطبيقها
    if (typeof window.checkAdminRights === 'function') {
        setTimeout(window.checkAdminRights, 100);
    }

    // تحميل الدروس للمسؤول أيضًا بعد تطبيق الصلاحيات
    if (isAdminUser && typeof loadUserLessons === 'function') {
         console.log("استدعاء loadUserLessons للمسؤول من applyUserPermissions");
         loadUserLessons();
    }
}

// التحقق مما إذا كان هذا هو أول مستخدم في النظام
function checkIfFirstUser(currentUid) {
    database.ref('users').once('value')
        .then((snapshot) => {
            // عدد المستخدمين في النظام
            const userCount = snapshot.numChildren();
            
            // إذا كان هذا هو المستخدم الوحيد، نجعله مسؤولاً
            if (userCount === 1) {
                database.ref('users/' + currentUid).update({
                    isAdmin: true
                })
                .then(() => {
                    console.log('تم تعيين أول مستخدم كمسؤول');
                    window.isAdmin = true;
                    $('#admin-controls').show();
                    $('#user-info').text(`مرحباً ${currentUser.email} (مسؤول)`);
                    
                    // إظهار رسالة للمستخدم
                    alert('تم تعيينك كأول مسؤول للنظام');
                })
                .catch((error) => {
                    console.error('خطأ في تعيين المسؤول:', error);
                });
            }
        })
        .catch((error) => {
            console.error('خطأ في التحقق من عدد المستخدمين:', error);
        });
}

// إدارة المستخدمين (للمسؤولين فقط)
$('#manage-users-btn').on('click', function() {
    if (!window.isAdmin) {
        alert('عذراً، هذه الوظيفة متاحة للمسؤولين فقط');
        return;
    }
    
    // لنفترض أننا سننتقل إلى صفحة إدارة المستخدمين
    loadUsers();
});

// تحميل قائمة المستخدمين (للمسؤولين فقط)
function loadUsers() {
    if (!window.isAdmin) return;
    
    database.ref('users').once('value')
        .then((snapshot) => {
            const users = snapshot.val();
            const lessonsContainer = $('#lessons-container');
            lessonsContainer.empty();
            
            if (!users) {
                lessonsContainer.html('<p>لا يوجد مستخدمين.</p>');
                return;
            }
            
            lessonsContainer.html('<h3>إدارة المستخدمين</h3>');
            
            Object.keys(users).forEach(uid => {
                const user = users[uid];
                const userCard = $(`
                    <div class="user-card" data-id="${uid}">
                        <h3>${user.email}</h3>
                        <div class="user-actions">
                            <button class="btn ${user.isAdmin ? 'secondary' : 'primary'} toggle-admin" data-id="${uid}" data-admin="${user.isAdmin}">
                                ${user.isAdmin ? 'إلغاء صلاحية المسؤول' : 'تعيين كمسؤول'}
                            </button>
                        </div>
                    </div>
                `);
                
                lessonsContainer.append(userCard);
            });
        })
        .catch((error) => {
            console.error('خطأ في تحميل المستخدمين:', error);
        });
}

// تبديل حالة المسؤول
$(document).on('click', '.toggle-admin', function(e) {
    e.stopPropagation();
    
    if (!window.isAdmin) {
        alert('عذراً، هذه الوظيفة متاحة للمسؤولين فقط');
        return;
    }
    
    const uid = $(this).data('id');
    const currentlyAdmin = $(this).data('admin') === true;
    
    database.ref('users/' + uid).update({
        isAdmin: !currentlyAdmin
    })
    .then(() => {
        alert(`تم ${!currentlyAdmin ? 'تعيين' : 'إلغاء تعيين'} المستخدم كمسؤول بنجاح`);
        loadUsers(); // إعادة تحميل قائمة المستخدمين
    })
    .catch((error) => {
        console.error('خطأ في تغيير حالة المسؤول:', error);
        alert('حدث خطأ أثناء تغيير حالة المسؤول');
    });
});

// عرض جميع الدروس (للمسؤولين فقط)
$('#all-lessons-btn').on('click', function() {
    if (!window.isAdmin) {
        alert('عذراً، هذه الوظيفة متاحة للمسؤولين فقط');
        return;
    }
    
    loadAllLessons();
});

// تحميل جميع الدروس (للمسؤول فقط)
function loadAllLessons() {
    if (!window.isAdmin) {
        console.warn('محاولة غير مصرح بها للوصول إلى جميع الدروس');
        return;
    }
    
    console.log('تحميل جميع الدروس للمسؤول');
    
    database.ref('lessons').once('value')
        .then((snapshot) => {
            const lessonsByUser = snapshot.val() || {};
            const lessonsContainer = $('#lessons-container');
            lessonsContainer.empty();
            
            let allLessons = [];
            
            // تجميع جميع الدروس من جميع المستخدمين
            Object.keys(lessonsByUser).forEach(userId => {
                const userLessons = lessonsByUser[userId];
                if (userLessons) {
                    Object.keys(userLessons).forEach(lessonId => {
                        allLessons.push({
                            userId: userId,
                            lessonId: lessonId,
                            lesson: userLessons[lessonId]
                        });
                    });
                }
            });
            
            if (allLessons.length === 0) {
                lessonsContainer.html('<p>لا توجد دروس.</p>');
                return;
            }
            
            // فرز الدروس حسب تاريخ التحديث
            allLessons.sort((a, b) => {
                return new Date(b.lesson.updatedAt || 0) - new Date(a.lesson.updatedAt || 0);
            });
            
            allLessons.forEach(item => {
                const { userId, lessonId, lesson } = item;
                
                // إنشاء بطاقة الدرس
                const lessonCard = $('<div>')
                    .addClass('lesson-card admin-lesson-card')
                    .attr('data-user-id', userId)
                    .attr('data-lesson-id', lessonId);
                
                const title = $('<h3>').text(lesson.title);
                const stepsCount = $('<div>').addClass('steps-count').text(`${lesson.steps.length} خطوة`);
                const actionsDiv = $('<div>').addClass('lesson-actions');
                
                // إضافة الأزرار الثلاثة بنفس الترتيب والشكل كما في loadUserLessons
                const editButton = $('<button>')
                    .addClass('btn secondary edit-btn')
                    .attr('data-user-id', userId)
                    .attr('data-id', lessonId)
                    .text('تعديل');
                
                const viewButton = $('<button>')
                    .addClass('btn primary view-lesson')
                    .attr('data-user-id', userId)
                    .attr('data-id', lessonId)
                    .text('عرض');
                
                const deleteButton = $('<button>')
                    .addClass('btn delete-lesson')
                    .attr('data-user-id', userId)
                    .attr('data-id', lessonId)
                    .text('حذف');
                
                // إضافة الأزرار بالترتيب المطلوب
                actionsDiv.append(editButton, viewButton, deleteButton);
                
                // تجميع البطاقة
                lessonCard.append(title, stepsCount, actionsDiv);
                lessonsContainer.append(lessonCard);
            });
            
            console.log('تم تحميل', allLessons.length, 'درس من جميع المستخدمين');
        })
        .catch((error) => {
            console.error('خطأ في تحميل جميع الدروس:', error);
            $('#lessons-container').html('<p>حدث خطأ أثناء تحميل الدروس.</p>');
        });
}
