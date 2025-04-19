/**
 * touch-handler.js - تحسين تجربة الأجهزة اللمسية
 * يوفر هذا الملف وظائف لتحسين التفاعل مع الأجهزة اللمسية وتعزيز تجربة المستخدم على الهواتف واللوحيات
 */

class TouchHandler {
    constructor() {
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.touchActiveClass = 'touch-active';
        this.touchDeviceClass = 'touch-device';
        this.init();
    }

    /**
     * تهيئة معالج اللمس
     */
    init() {
        if (!this.isTouchDevice) return;

        // إضافة فئة للجسم لتمكين تنسيقات CSS الخاصة بالأجهزة اللمسية
        document.body.classList.add(this.touchDeviceClass);
        
        // تطبيق معالجات اللمس
        this.setupTouchFeedback();
        this.optimizeTouchExperience();
        this.handleOrientationChanges();

        console.log('TouchHandler initialized for mobile device');
    }

    /**
     * إعداد تأثيرات ملاحظات المستخدم عند اللمس
     */
    setupTouchFeedback() {
        const touchElements = document.querySelectorAll('button, .btn, .chess-piece, .square, .navbar-item, .lesson-card, .move');
        
        touchElements.forEach(element => {
            // Skip if already initialized
            if (element.dataset.touchInitialized) return;
            
            element.addEventListener('touchstart', e => {
                element.classList.add(this.touchActiveClass);
            }, { passive: true });
            
            ['touchend', 'touchcancel'].forEach(event => {
                element.addEventListener(event, e => {
                    element.classList.remove(this.touchActiveClass);
                }, { passive: true });
            });
            
            // Mark as initialized
            element.dataset.touchInitialized = true;
        });
    }

    /**
     * تحسين تجربة اللمس على مختلف عناصر التطبيق
     */
    optimizeTouchExperience() {
        // Prevent zooming on form inputs on iOS
        const formElements = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, select');
        formElements.forEach(element => {
            // Skip if already initialized
            if (element.dataset.touchOptimized) return;
            
            element.style.fontSize = '16px';
            
            // Mark as optimized
            element.dataset.touchOptimized = true;
        });

        // Improve scrolling on iOS
        const scrollElements = document.querySelectorAll('.moves-container, .lesson-content, .viewer-content');
        scrollElements.forEach(element => {
            // Skip if already initialized
            if (element.dataset.scrollOptimized) return;
            
            element.style.webkitOverflowScrolling = 'touch';
            
            // Mark as optimized
            element.dataset.scrollOptimized = true;
        });

        // Prevent double-tap zoom on interactive elements
        const interactiveElements = document.querySelectorAll('button, .btn, .chess-piece, .square');
        interactiveElements.forEach(element => {
            // Skip if already initialized
            if (element.dataset.doubleTapPrevented) return;
            
            element.addEventListener('touchend', e => {
                e.preventDefault();
            }, { passive: false });
            
            // Mark as initialized
            element.dataset.doubleTapPrevented = true;
        });
    }

    /**
     * إعداد معالجة تغيير اتجاه الشاشة
     */
    handleOrientationChanges() {
        const orientationHandler = () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            const chessboard = document.querySelector('.chessboard');
            
            if (chessboard) {
                if (isLandscape) {
                    chessboard.classList.add('landscape');
                    chessboard.classList.remove('portrait');
                } else {
                    chessboard.classList.add('portrait');
                    chessboard.classList.remove('landscape');
                }
            }
        };

        // Initial check
        orientationHandler();
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            // Add small delay to ensure dimensions are updated
            setTimeout(orientationHandler, 100);
        });
        
        // Also listen for resize as fallback
        window.addEventListener('resize', orientationHandler);
    }

    /**
     * تنظيف المستمعين عند الحاجة (للاستخدام عند إزالة الصفحة)
     */
    cleanup() {
        if (!this.isTouchDevice) return;
        
        document.body.classList.remove(this.touchDeviceClass);
        
        // Additional cleanup if needed
        console.log('TouchHandler cleaned up');
    }
}

// تهيئة معالج اللمس عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    window.touchHandler = new TouchHandler();
    
    // مراقبة إضافة عناصر جديدة للصفحة لتطبيق معالجات اللمس عليها
    const observeDOM = (function() {
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        
        return function(obj, callback) {
            if (!obj || obj.nodeType !== 1) return;
            
            if (MutationObserver) {
                const mutationObserver = new MutationObserver(callback);
                mutationObserver.observe(obj, { childList: true, subtree: true });
                return mutationObserver;
            } else if (window.addEventListener) {
                obj.addEventListener('DOMNodeInserted', callback, false);
                obj.addEventListener('DOMNodeRemoved', callback, false);
            }
        };
    })();
    
    // تطبيق معالجات اللمس على العناصر الجديدة
    observeDOM(document.body, function(mutations) {
        if (window.touchHandler && window.touchHandler.isTouchDevice) {
            // تنفيذ بعد تأخير قصير للتأكد من إضافة العناصر بشكل كامل للصفحة
            setTimeout(() => {
                window.touchHandler.setupTouchFeedback();
                window.touchHandler.optimizeTouchExperience();
            }, 100);
        }
    });
}); 