// js/page-manager.js
class PageManager {
    constructor() {
        this.currentPage = null;
        this.history = [];
        this.pages = {
            'auth': document.getElementById('auth-container'),
            'editor': document.getElementById('editor-tab'),
            'lessons': document.getElementById('lessons-tab'),
            'viewer': document.getElementById('viewer-tab')
        };

        // تهيئة أزرار التنقل
        this.initNavigation();
    }

    initNavigation() {
        // تهيئة أزرار التنقل في شريط التنقل
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.navigateTo(tabName);
            });
        });

        // زر العودة في عارض الدرس
        const backBtn = document.getElementById('back-btn');
        if (backBtn) { // Check if the back button exists
             backBtn.addEventListener('click', () => {
                 this.goBack();
             });
        } else {
            console.warn("Element with ID 'back-btn' not found. Back button functionality might not work.");
        }


        // أزرار الدروس في صفحة الدروس المحفوظة
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-lesson-btn')) {
                const lessonId = e.target.getAttribute('data-lesson-id');
                this.navigateTo('viewer', { lessonId });
            }
        });
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('visible');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
    }

    navigateTo(pageName, params = {}) {
        if (!this.pages[pageName]) {
            console.error(`Page '${pageName}' not found in PageManager.`);
            return; // Stop if the page doesn't exist
        }

        this.showLoading(); // Show loading indicator

        // حفظ الصفحة الحالية في التخزين المحلي إذا كان المستخدم مسجل الدخول وكانت الصفحة ليست 'auth'
        if (pageName !== 'auth' && firebase.auth().currentUser) {
            localStorage.setItem('lastVisitedPage', pageName);
            
            // حفظ المعلمات أيضاً
            if (Object.keys(params).length > 0) {
                localStorage.setItem('lastVisitedPageParams', JSON.stringify(params));
            } else {
                localStorage.removeItem('lastVisitedPageParams');
            }
            console.log(`تم تخزين الصفحة في localStorage: ${pageName}`, params);
        }

        if (this.currentPage && this.pages[this.currentPage]) {
            // حفظ الصفحة الحالية في التاريخ
            this.history.push(this.currentPage);

            // إخفاء الصفحة الحالية مع تأثير انتقالي وإزالة الفئة النشطة
            const currentPageElement = this.pages[this.currentPage];
            if (currentPageElement) {
                currentPageElement.classList.remove('active'); // Remove active class first
                currentPageElement.classList.add('fade-out');
                setTimeout(() => {
                    if (currentPageElement) { // Check again
                        currentPageElement.style.display = 'none';
                        currentPageElement.classList.remove('fade-out');
                    }
                    this.showPage(pageName, params);
                }, 300); // Match CSS animation duration
            } else {
                 // If current page element doesn't exist for some reason, just show the next one
                 this.showPage(pageName, params);
            }
        } else {
            this.showPage(pageName, params);
        }

        // تحديث زر التنقل النشط
        this.updateActiveTab(pageName);

        // تحديث URL (اختياري)
        this.updateURL(pageName, params);
    }

    showPage(pageName, params = {}) {
         if (!this.pages[pageName]) {
            console.error(`Attempted to show non-existent page '${pageName}'.`);
            this.hideLoading(); // Hide loading early if page doesn't exist
            return;
        }
        // عرض الصفحة المطلوبة مع تأثير انتقالي وإضافة الفئة النشطة
        const pageElementToShow = this.pages[pageName];
        pageElementToShow.style.display = 'block'; // Set display before adding active class
        pageElementToShow.classList.add('active'); // Add active class to make it visible via CSS
        pageElementToShow.classList.add('fade-in');
        setTimeout(() => {
             if (pageElementToShow) {
                this.pages[pageName].classList.remove('fade-in');
             }
             this.hideLoading(); // Hide loading indicator after fade-in completes
        }, 300); // Match CSS animation duration

        this.currentPage = pageName;

        // حالة خاصة: إذا كان المستخدم يستعيد عرض درس بعد تحديث الصفحة
        const isRestoringViewer = pageName === 'viewer' && params.lessonId && 
                                localStorage.getItem('lastVisitedPage') === 'viewer';
        
        if (isRestoringViewer) {
            console.log("استعادة عرض الدرس بعد تحديث الصفحة:", params.lessonId);
            
            // تأكد من ظهور تبويب العارض
            $('#viewer-tab').css('display', 'block').addClass('active');
        }

        // تنفيذ إجراءات خاصة بالصفحة عند الانتقال إليها
        this.onPageEnter(pageName, params);
    }

    goBack() {
        if (this.history.length > 0) {
            const prevPage = this.history.pop();
            // Navigate back without pushing to history again
            if (this.currentPage && this.pages[this.currentPage]) {
                this.pages[this.currentPage].classList.add('fade-out');
                 setTimeout(() => {
                    if (this.pages[this.currentPage]) {
                        this.pages[this.currentPage].style.display = 'none';
                        this.pages[this.currentPage].classList.remove('fade-out');
                    }
                    this.showPage(prevPage);
                    this.updateActiveTab(prevPage);
                    this.updateURL(prevPage); // Update URL on back navigation
                }, 300);
            } else {
                 this.showPage(prevPage);
                 this.updateActiveTab(prevPage);
                 this.updateURL(prevPage);
            }
        } else {
            // إذا لم يكن هناك تاريخ، العودة إلى صفحة الدروس كافتراضي (أو المحرر)
            this.navigateTo('lessons'); // Or 'editor' might be a better default
        }
    }

    updateActiveTab(pageName) {
        // تحديث زر التنقل النشط
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === pageName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateURL(pageName, params = {}) {
        // تحديث عنوان URL للسماح باستخدام زر العودة في المتصفح
        const url = new URL(window.location);
        url.searchParams.set('page', pageName);

        // Clear old params before adding new ones
        const keysToRemove = [];
        for (const key of url.searchParams.keys()) {
            if (key !== 'page' && !(key in params)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => url.searchParams.delete(key));


        // إضافة معلمات إضافية لـ URL
        for (const key in params) {
            url.searchParams.set(key, params[key]);
        }

        // Use replaceState for back navigation to avoid duplicate history entries
        if (this.isNavigatingBack) {
             history.replaceState({}, '', url);
             this.isNavigatingBack = false; // Reset flag
        } else {
            history.pushState({}, '', url);
        }
    }

    onPageEnter(pageName, params = {}) {
        // تنفيذ إجراءات خاصة بكل صفحة عند الانتقال إليها
        switch(pageName) {
            case 'viewer':
                if (params.lessonId) {
                    console.log('تحميل الدرس في مدير الصفحات:', params.lessonId);
                    // التأكد من عرض الصفحة بشكل صحيح
                    $('#viewer-tab').css('display', 'block').addClass('active');
                    
                    // إعادة تعيين المتغير العالمي في حالة التحميل بعد تحديث الصفحة
                    // هذا سيجبر النظام على إعادة تحميل الدرس حتى لو كان متغير currentLessonInViewer موجوداً
                    if (window.location.reload || params.forceReload) {
                        window.currentLessonInViewer = null;
                    }
                    
                    // إذا كان currentLessonInViewer موجود بالفعل، فهذا يعني أن loadLesson تم استدعاؤها بالفعل
                    // ونحن نحتاج فقط للتأكد من أن التنقل تم بشكل صحيح
                    if (!window.currentLessonInViewer) {
                        // التأكد من وجود الدالة قبل استدعائها
                        if (typeof loadLesson === 'function') {
                            loadLesson(params.lessonId);
                        } else if (typeof window.loadLesson === 'function') {
                            window.loadLesson(params.lessonId);
                        } else {
                            console.error("loadLesson function is not defined or not accessible.");
                            alert("حدث خطأ في تحميل الدرس. يرجى تحديث الصفحة والمحاولة مرة أخرى.");
                        }
                    }
                    
                    // تعديل زر العودة حسب صلاحيات المستخدم
                    if (typeof isAdmin !== 'undefined' && !isAdmin) {
                        // للمستخدم العادي، زر العودة يذهب إلى قائمة الدروس
                        $('#back-btn').off('click').on('click', () => {
                            this.navigateTo('lessons');
                        });
                    } else {
                        // للمسؤول أو الحالة الافتراضية، زر العودة يعمل كالمعتاد
                        $('#back-btn').off('click').on('click', () => {
                            this.goBack();
                        });
                    }
                }
                break;
            case 'lessons':
                 // حتى عند تحديث الصفحة أو إعادة التحميل، تأكد من تحميل الدروس
                 console.log("تحميل الدروس في صفحة الدروس المحفوظة");
                 
                 // تأكد من عرض الصفحة بشكل صحيح
                 $('#lessons-tab').css('display', 'block').addClass('active');
                 
                 // التأكد من وجود الدالة قبل استدعائها
                 if (typeof loadLessons === 'function') {
                    loadLessons();
                 } else if (typeof window.loadLessons === 'function') {
                    window.loadLessons();
                 } else {
                     console.error("loadLessons function is not defined or not accessible.");
                 }
                break;
            case 'editor':
                 console.log("دخول إلى صفحة المحرر");
                 // التأكد من عرض الصفحة بشكل صحيح
                 $('#editor-tab').css('display', 'block').addClass('active');
                 
                 // تهيئة لوحة الشطرنج في المحرر
                 setTimeout(() => {
                     if (typeof initEditorBoard === 'function') {
                         console.log("استدعاء دالة تهيئة لوحة المحرر");
                         initEditorBoard();
                     } else if (typeof window.initEditorBoard === 'function') {
                         console.log("استدعاء دالة تهيئة لوحة المحرر من النافذة");
                         window.initEditorBoard();
                     } else {
                         console.error("دالة تهيئة لوحة المحرر غير معرّفة");
                     }
                 }, 300);
                 break;
             case 'auth':
                 console.log("دخول إلى صفحة تسجيل الدخول");
                 break;
        }
    }

    // التعامل مع زر العودة في المتصفح
    handlePopState() {
        const url = new URL(window.location);
        const pageName = url.searchParams.get('page'); // Get page from URL

         // Determine default page if not in URL (e.g., initial load or cleared state)
         const defaultPage = firebase.auth().currentUser ? 'lessons' : 'auth';
         const targetPage = pageName || defaultPage;


        // استعادة المعلمات من URL
        const params = {};
        for (const [key, value] of url.searchParams.entries()) {
            if (key !== 'page') {
                params[key] = value;
            }
        }

        // الانتقال إلى الصفحة دون إضافة تاريخ جديد
        // Hide all pages first, then show the target one
        Object.values(this.pages).forEach(pageEl => {
            if (pageEl) {
                 pageEl.style.display = 'none';
                 pageEl.classList.remove('active');
            }
        });

        this.currentPage = null; // Reset current page before showing the new one
        this.showPage(targetPage, params); // showPage will add .active class
        this.updateActiveTab(targetPage);
        // No history push/replace needed here as popstate handles URL
    }
}

// تهيئة مدير الصفحات عند تحميل المستند
document.addEventListener('DOMContentLoaded', () => {
    // Ensure all page elements exist before initializing
    const requiredPageIds = ['auth-container', 'editor-tab', 'lessons-tab', 'viewer-tab'];
    let allPagesExist = true;
    requiredPageIds.forEach(id => {
        if (!document.getElementById(id)) {
            console.error(`Required page element with ID '${id}' not found.`);
            allPagesExist = false;
        }
    });

    if (allPagesExist) {
        window.pageManager = new PageManager();

        // التعامل مع زر العودة في المتصفح
        window.addEventListener('popstate', (event) => {
             console.log("Popstate event triggered");
            window.pageManager.handlePopState();
        });

        // التحقق من URL عند التحميل الأولي وتحديد الصفحة
        const url = new URL(window.location);
        const initialPageFromUrl = url.searchParams.get('page');
        const currentUser = firebase.auth().currentUser;

        // استرجاع آخر صفحة تم زيارتها من localStorage
        const lastVisitedPage = localStorage.getItem('lastVisitedPage');
        console.log("آخر صفحة تمت زيارتها:", lastVisitedPage);
        
        // الحصول على المعلمات المخزنة في localStorage
        let storedParams = {};
        const storedParamsString = localStorage.getItem('lastVisitedPageParams');
        if (storedParamsString) {
            try {
                storedParams = JSON.parse(storedParamsString);
                console.log("المعلمات المخزنة:", storedParams);
            } catch (e) {
                console.error("خطأ في تحليل المعلمات المخزنة:", e);
            }
        }

        let targetInitialPage;
        let initialParams = {};
        
        // استخدام الصفحة من URL أولاً، ثم التخزين المحلي، ثم الافتراضية
        if (initialPageFromUrl && window.pageManager.pages[initialPageFromUrl]) {
             // If URL specifies a valid page, try to go there
             // But only if user is logged in or the page is 'auth'
             if (currentUser || initialPageFromUrl === 'auth') {
                 targetInitialPage = initialPageFromUrl;
                 // استرجاع المعلمات من URL
                 for (const [key, value] of url.searchParams.entries()) {
                     if (key !== 'page') {
                         initialParams[key] = value;
                     }
                 }
             } else {
                 targetInitialPage = 'auth'; // Force auth if not logged in and trying to access other pages
             }
        } else if (currentUser && lastVisitedPage && window.pageManager.pages[lastVisitedPage]) {
             // استخدام آخر صفحة تمت زيارتها إذا كان المستخدم مسجل الدخول وكانت الصفحة صالحة
             targetInitialPage = lastVisitedPage;
             initialParams = storedParams;
        } else {
             // Default logic if no valid page in URL or localStorage
             targetInitialPage = currentUser ? 'lessons' : 'auth'; // Default to lessons if logged in, else auth
        }

        console.log(`تحديد الصفحة الأولية: ${targetInitialPage}، المعلمات:`, initialParams);

        // إظهار الصفحة الأولية مباشرة دون انتقالات أو إضافة للتاريخ
        // Hide all pages first
        Object.values(window.pageManager.pages).forEach(pageEl => {
             if (pageEl && pageEl.id !== window.pageManager.pages[targetInitialPage]?.id) { // Keep auth container potentially visible if it's the target
                 pageEl.style.display = 'none';
                 pageEl.classList.remove('active');
             }
        });
        window.pageManager.currentPage = null; // Ensure no fade-out attempt
        window.pageManager.showPage(targetInitialPage, initialParams); // showPage adds .active
        window.pageManager.updateActiveTab(targetInitialPage);
         // Don't push initial state to history here, let navigateTo handle subsequent ones
         window.pageManager.hideLoading(); // Hide loading indicator after initial setup

    } else {
        console.error("PageManager could not be initialized because some required page elements are missing.");
    }
});

// دوال مساعدة للتحميل (يجب تعريفها في مكان آخر أو التأكد من وجودها)
// Placeholder functions if not defined elsewhere
if (typeof loadLesson !== 'function') {
    window.loadLesson = function(lessonId) {
        console.log(`تحميل الدرس رقم: ${lessonId} (Placeholder)`);
        // Add actual lesson loading logic here
        // Example: Fetch lesson data, update viewer content
        const viewerContent = document.querySelector('#viewer-tab .content'); // Adjust selector if needed
        if (viewerContent) {
            viewerContent.innerHTML = `<h2>Lesson ${lessonId}</h2><p>Content for lesson ${lessonId} goes here...</p>`;
        }
    }
}

if (typeof loadLessons !== 'function') {
    window.loadLessons = function() {
        console.log('تحديث قائمة الدروس (Placeholder)');
        // Add actual lessons list loading logic here
        // Example: Fetch lessons, populate the lessons list
         const lessonsList = document.getElementById('lessons-list'); // Adjust selector if needed
         if (lessonsList) {
             // Simulate loading lessons
             lessonsList.innerHTML = `
                 <li>Lesson 1 <button class="view-lesson-btn" data-lesson-id="1">View</button></li>
                 <li>Lesson 2 <button class="view-lesson-btn" data-lesson-id="2">View</button></li>
             `;
         }
    }
}

// Placeholder for loadUserData if not defined
if (typeof loadUserData !== 'function') {
    window.loadUserData = function() {
        console.log('Loading user data (Placeholder)');
        // Add logic to load user-specific data after login
    }
}
