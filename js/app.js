// تعيين متغير لتتبع إعادة تحميل الصفحة
window.addEventListener('load', function() {
    window.isPageReload = document.readyState === 'complete';
    console.log("تم تحميل الصفحة - إعادة تحميل:", window.isPageReload);
});

document.addEventListener('DOMContentLoaded', function() {
    // متغيرات عامة
    let editorChess = new Chess(); // كائن للتحكم بمنطق الشطرنج في المحرر
    let viewerChess = new Chess(); // كائن للتحكم بمنطق الشطرنج في العارض
    let currentLesson = null; // الدرس الحالي قيد التحرير
    let boardOrientation = 'white'; // اتجاه اللوحة
    let lastMove = null; // آخر حركة نفذت
    let currentLessonInViewer = null; // الدرس الحالي قيد العرض
    let currentStepIndex = -1; // مؤشر الخطوة الحالية في العارض
    let markingMove = false; // وضع تحديد الحركات
    let currentSelection = null; // النص المحدد حاليًا
    let lastStepId = 0; // آخر معرف للخطوة
    let viewerBoard = null; // تغيير من ثابت إلى متغير
    let editorBoard = null; // إضافة متغير لوحة المحرر
    let lessonsLoaded = false; // تتبع ما إذا تم تحميل الدروس بالفعل
    
    // التأكد من أن متغير isAdmin موجود
    window.isAdmin = window.isAdmin || false; 
    
    // تعريف دالة للتحقق من صلاحيات المستخدم
    window.checkAdminRights = function() {
        console.log("التحقق من صلاحيات المسؤول:", window.isAdmin);
        if (window.isAdmin === true) {
            // إظهار أزرار التعديل والحذف للمسؤول فقط
            $('.edit-lesson, .edit-btn, .delete-lesson').show();
            console.log("تم إظهار أزرار التعديل والحذف للمسؤول");
        } else {
            // إخفاء أزرار التعديل والحذف عن المستخدمين العاديين
            $('.edit-lesson, .edit-btn, .delete-lesson').hide();
            console.log("تم إخفاء أزرار التعديل والحذف عن المستخدمين العاديين");
        }
    };

    console.log("تهيئة تطبيق منشئ دروس الشطرنج");

    // دالة لتهيئة لوحة المحرر
    function initEditorBoard() {
        console.log("بدء تهيئة لوحة المحرر");
        try {
            // التحقق من وجود عنصر لوحة المحرر
            if ($('#editor-board').length === 0) {
                console.error("لم يتم العثور على عنصر لوحة المحرر في الصفحة");
                // إعادة المحاولة بعد تأخير قصير
                setTimeout(initEditorBoard, 500);
                return;
            }

            // تأكد من أن المكتبات اللازمة محملة
            if (typeof Chessboard !== 'function') {
                console.error("مكتبة Chessboard.js غير محملة!");
                setTimeout(initEditorBoard, 500);
                return;
            }

            if (typeof Chess !== 'function') {
                console.error("مكتبة Chess.js غير محملة!");
                setTimeout(initEditorBoard, 500);
                return;
            }

            // تهيئة كائن Chess.js إذا لم يكن موجوداً
            if (!editorChess) {
                editorChess = new Chess();
            }

            // التخلص من اللوحة القديمة إذا كانت موجودة
            if (editorBoard && typeof editorBoard.destroy === 'function') {
                editorBoard.destroy();
            }

            // جعل عنصر اللوحة مرئي
            $('#editor-board').css('visibility', 'visible').show();

            // تهيئة لوحة المحرر
            editorBoard = Chessboard('editor-board', {
                position: 'start',
                draggable: true,
                pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
                onDragStart: onDragStart,
                onDrop: onDrop,
                onSnapEnd: onSnapEnd
            });

            console.log("تم تهيئة لوحة المحرر بنجاح");
            
            // تأكد من أن اللوحة تظهر بشكل صحيح
            setTimeout(() => {
                if (editorBoard) {
                    editorBoard.resize();
                    console.log("تم ضبط حجم لوحة المحرر");
                    // تحديث الوضع الحالي
                    updateCurrentMoveDisplay();
                }
            }, 300);
        } catch (error) {
            console.error("خطأ في تهيئة لوحة المحرر:", error);
            // إعادة المحاولة بعد فشل التهيئة
            setTimeout(initEditorBoard, 1000);
        }
    }

    // دالة لتهيئة لوحة العارض
    function initViewerBoard() {
        console.log("بدء تهيئة لوحة العارض");
        try {
            // التحقق من وجود عنصر لوحة العارض
            if ($('#viewer-board').length === 0) {
                console.error("لم يتم العثور على عنصر لوحة العارض في الصفحة");
                return;
            }

            // تهيئة لوحة العارض
            viewerBoard = Chessboard('viewer-board', {
                position: 'start',
                draggable: false,
                pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
            });

            console.log("تم تهيئة لوحة العارض بنجاح");
            
            // تأكد من أن اللوحة تظهر بشكل صحيح
            setTimeout(() => {
                if (viewerBoard) {
                    viewerBoard.resize();
                    console.log("تم ضبط حجم لوحة العارض");
                }
            }, 300);
        } catch (error) {
            console.error("خطأ في تهيئة لوحة العارض:", error);
        }
    }

    // تهيئة لوحات الشطرنج بعد تحميل الصفحة
    $(document).ready(function() {
        console.log("الصفحة جاهزة، بدء تهيئة لوحات الشطرنج");
        
        // التحقق مما إذا كان المستخدم مسجل الدخول
        if ($('#app-container').is(':visible')) {
            initEditorBoard();
            initViewerBoard();
            
            // تحميل الدروس للمستخدمين العاديين والمسؤولين
            if (!lessonsLoaded) {
                console.log("تحميل الدروس عند بدء التطبيق");
                loadUserLessons();
            }
        } else {
            // إضافة مستمع لتهيئة اللوحات عند ظهور التطبيق
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.attributeName === 'style' && 
                        $('#app-container').is(':visible')) {
                        console.log("تم اكتشاف ظهور التطبيق، بدء تهيئة اللوحات");
                        initEditorBoard();
                        initViewerBoard();
                        
                        // تحميل الدروس بعد تسجيل الدخول
                        if (!lessonsLoaded) {
                            console.log("تحميل الدروس بعد تسجيل الدخول");
                            setTimeout(loadUserLessons, 500); // إضافة تأخير قصير للتأكد من ظهور واجهة المستخدم
                        }
                        
                        observer.disconnect();
                    }
                });
            });

            observer.observe(document.getElementById('app-container'), {
                attributes: true
            });
        }
    });

    // دالة للتحقق من إمكانية التمرير
    function checkScrollable() {
        const container = document.getElementById('full-text-display');
        if (container) {
            const scrollIndicator = document.querySelector('.scroll-indicator');
            if (container.scrollHeight > container.clientHeight) {
                scrollIndicator.style.display = 'block';
            } else {
                scrollIndicator.style.display = 'none';
            }
        }
    }

    // ===== وظائف التنقل بين التبويبات =====
    $('.tab-btn').on('click', function() {
        const targetTab = $(this).data('tab');
        
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.tab-content').removeClass('active');
        $(`#${targetTab}-tab`).addClass('active');
        
        // تنفيذ إجراءات خاصة حسب التبويب المختار
        if (targetTab === 'editor') {
            console.log("تم النقر على تبويب المحرر");
            
            // إلغاء سلوك إعادة تعيين الدرس عند النقر على تبويب المحرر
            // يتم فقط إنشاء درس جديد إذا لم يكن هناك درس حالي
            if (!currentLesson) {
                currentLesson = {
                    title: 'درس جديد',
                    fullText: '',
                    steps: []
                };
                
                $('#lesson-title').val(currentLesson.title);
                $('#full-lesson-text').html('');
                
                editorChess.reset();
                lastMove = null;
                lastStepId = 0;
                renderSteps();
            }
            
            // تحديث الوضع الحالي
            updateCurrentMoveDisplay();
            
            // إعادة تهيئة لوحة المحرر بعد التأكد من ظهور التبويب
            $('#editor-board').css('visibility', 'visible').show();
            setTimeout(function() {
                initEditorBoard();
            }, 300);
        } 
        else if (targetTab === 'lessons') {
            // إذا لم يتم تحميل الدروس بعد، قم بتحميلها
            if (!lessonsLoaded) {
                loadUserLessons();
            }
        }
    });

    // ===== التحكم بالتبويبات =====
    $('#back-btn').on('click', function() {
        $('.tab-btn[data-tab="editor"]').trigger('click');
    });

    // ===== التحكم بلوحة الشطرنج =====
    $('#flip-board').on('click', function() {
        boardOrientation = boardOrientation === 'white' ? 'black' : 'white';
        editorBoard.orientation(boardOrientation);
    });

    $('#reset-board').on('click', function() {
        editorChess.reset();
        editorBoard.position('start');
        updateCurrentMoveDisplay();
    });

    // ===== وظائف تحديد الحركات في النص =====
    $('#mark-move-btn').on('click', function() {
        markingMove = true;
        $('#mark-move-btn').addClass('active');
        $('#unmark-move-btn').removeClass('active');
        $('#full-lesson-text').focus();
    });

    $('#unmark-move-btn').on('click', function() {
        markingMove = false;
        $('#mark-move-btn').removeClass('active');
        $('#unmark-move-btn').addClass('active');
        $('#full-lesson-text').focus();
    });

    // التقاط النص المحدد
    $('#full-lesson-text').on('mouseup', function() {
        if (!markingMove) return;
        
        const selection = window.getSelection();
        if (selection.toString().trim() === '') return;

        // حفظ النص المحدد
        const range = selection.getRangeAt(0);
        currentSelection = {
            text: selection.toString(),
            range: range
        };

        // عرض النص المحدد
        $('#current-selection').text('النص المحدد: ' + currentSelection.text);
    });

    // وظائف لوحة المحرر (التقاط الحركات)
    function onDragStart(source, piece) {
        // لا تسمح بسحب القطع إذا انتهت اللعبة
        if (editorChess.game_over()) return false;

        // لا تسمح بسحب القطع غير المناسبة (حسب الدور)
        if ((editorChess.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (editorChess.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }

        return true;
    }

    function onDrop(source, target) {
        // تحقق من الحركة
        try {
            const move = editorChess.move({
                from: source,
                to: target,
                promotion: 'q' // دائمًا يتم الترقية إلى وزير (يمكن تحسين هذا لاحقًا)
            });

            if (move === null) return 'snapback';

            lastMove = {
                from: source,
                to: target,
                notation: move.san,
                fen: editorChess.fen()
            };

            updateCurrentMoveDisplay();
        } catch (e) {
            return 'snapback';
        }
    }

    function onSnapEnd() {
        editorBoard.position(editorChess.fen());
    }

    function updateCurrentMoveDisplay() {
        if (lastMove) {
            $('#current-move-display').html(`
                <div class="move-notation">الحركة: ${lastMove.notation}</div>
                <div>من: ${lastMove.from} إلى: ${lastMove.to}</div>
            `);
        } else {
            $('#current-move-display').html('لم يتم تحديد حركة بعد');
        }
    }

    // ===== وظائف إدارة الخطوات =====
    $('#add-step').on('click', function() {
        if (!lastMove) {
            alert('يرجى تنفيذ حركة على لوحة الشطرنج أولاً');
            return;
        }

        if (!currentSelection) {
            alert('يرجى تحديد نص الحركة في الشرح أولاً');
            return;
        }

        // إنشاء الدرس إذا لم يكن موجوداً
        if (!currentLesson) {
            const title = $('#lesson-title').val() || 'درس بدون عنوان';
            currentLesson = {
                title: title,
                fullText: $('#full-lesson-text').html(),
                steps: []
            };
        } else {
            // تحديث عنوان الدرس من حقل الإدخال للتأكد من حفظ تغييرات المستخدم
            currentLesson.title = $('#lesson-title').val() || currentLesson.title;
        }

        // تحديد ما إذا كانت الخطوة وهمية أم لا
        const isPhantom = $('#phantom-step').is(':checked');

        // إنشاء خطوة جديدة
        const stepId = ++lastStepId;
        const newStep = {
            id: stepId,
            explanation: $('#step-explanation').val() || '',
            selectedText: currentSelection.text,
            move: lastMove.notation,
            from: lastMove.from,
            to: lastMove.to,
            fen: lastMove.fen,
            isPhantom: isPhantom, // إضافة خاصية للخطوة الوهمية
            parentFen: isPhantom ? getLastNonPhantomFen() : null // حفظ وضع اللوحة الأصلي للخطوات الوهمية
        };

        // إضافة الخطوة إلى الدرس
        currentLesson.steps.push(newStep);
        
        // تمييز النص في الشرح
        const range = currentSelection.range;
        const span = document.createElement('span');
        span.className = isPhantom ? 'move-marker phantom' : 'move-marker';
        span.setAttribute('data-step-id', stepId);
        span.setAttribute('data-step-index', currentLesson.steps.length);
        if (isPhantom) {
            span.setAttribute('data-phantom', 'true');
        }
        span.textContent = currentSelection.text;
        
        range.deleteContents();
        range.insertNode(span);

        // تحديث النص الكامل في الدرس
        currentLesson.fullText = $('#full-lesson-text').html();
        
        // تحديث واجهة المستخدم
        renderSteps();
        
        // إعادة ضبط التحديد والنص
        currentSelection = null;
        $('#current-selection').text('لا يوجد نص محدد');
        $('#step-explanation').val('');
        $('#phantom-step').prop('checked', false);
        
        // إلغاء وضع التحديد
        markingMove = false;
        $('#mark-move-btn').removeClass('active');
    });

    // الحصول على آخر وضع FEN لخطوة غير وهمية
    function getLastNonPhantomFen() {
        if (!currentLesson || !currentLesson.steps || currentLesson.steps.length === 0) {
            return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // وضع البداية
        }

        // البحث عن آخر خطوة غير وهمية
        for (let i = currentLesson.steps.length - 1; i >= 0; i--) {
            if (!currentLesson.steps[i].isPhantom) {
                return currentLesson.steps[i].fen;
            }
        }

        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // وضع البداية إذا لم توجد خطوات غير وهمية
    }

    function renderSteps() {
        if (!currentLesson) return;
        
        const stepsContainer = $('#steps-container');
        stepsContainer.empty();
        
        // تنظيم الخطوات في أزواج (أبيض وأسود)
        let movePairs = [];
        let currentPair = null;
        
        currentLesson.steps.forEach((step, index) => {
            const moveColor = (index % 2 === 0) ? 'white' : 'black';
            
            if (moveColor === 'white') {
                currentPair = {
                    moveNumber: Math.floor(index / 2) + 1,
                    white: step,
                    black: null
                };
                movePairs.push(currentPair);
            } else {
                // إضافة الخطوة السوداء إلى آخر زوج
                if (movePairs.length > 0) {
                    movePairs[movePairs.length - 1].black = step;
                }
            }
        });
        
        // إنشاء صفوف الجدول
        movePairs.forEach((pair, pairIndex) => {
            const rowElement = $('<tr>');
            rowElement.attr('data-move-number', pair.moveNumber);
            
            // رقم الخطوة
            const numberCell = $('<td>').addClass('move-number').text(pair.moveNumber);
            rowElement.append(numberCell);
            
            // خطوة الأبيض
            const whiteCell = $('<td>').addClass('white-move');
            if (pair.white) {
                const whiteIndex = pairIndex * 2;
                whiteCell.text(pair.white.move);
                whiteCell.attr('data-step-id', pair.white.id);
                whiteCell.attr('data-index', whiteIndex);
                
                if (pair.white.isPhantom) {
                    rowElement.addClass('phantom');
                }
                
                // عند النقر على خلية، يتم تحديد الخطوة
                whiteCell.on('click', function() {
                    if (pair.white) {
                        const step = currentLesson.steps[whiteIndex];
                        
                        editorChess.load(step.fen);
                        editorBoard.position(step.fen);
                        
                        lastMove = {
                            from: step.from,
                            to: step.to,
                            notation: step.move,
                            fen: step.fen
                        };
                        
                        updateCurrentMoveDisplay();
                    }
                });
            }
            rowElement.append(whiteCell);
            
            // خطوة الأسود
            const blackCell = $('<td>').addClass('black-move');
            if (pair.black) {
                const blackIndex = pairIndex * 2 + 1;
                blackCell.text(pair.black.move);
                blackCell.attr('data-step-id', pair.black.id);
                blackCell.attr('data-index', blackIndex);
                
                if (pair.black.isPhantom) {
                    rowElement.addClass('phantom');
                }
                
                // عند النقر على خلية، يتم تحديد الخطوة
                blackCell.on('click', function() {
                    if (pair.black) {
                        const step = currentLesson.steps[blackIndex];
                        
                        editorChess.load(step.fen);
                        editorBoard.position(step.fen);
                        
                        lastMove = {
                            from: step.from,
                            to: step.to,
                            notation: step.move,
                            fen: step.fen
                        };
                        
                        updateCurrentMoveDisplay();
                    }
                });
            }
            rowElement.append(blackCell);
            
            // خلية الإجراءات
            const actionsCell = $('<td>').addClass('actions');
            
            // زر حذف وتعديل للخطوة البيضاء
            if (pair.white) {
                // زر تعديل
                const editWhiteBtn = $('<button>')
                    .addClass('edit-move-btn')
                    .attr('data-step-id', pair.white.id)
                    .attr('data-index', pairIndex * 2)
                    .attr('title', 'تعديل الخطوة')
                    .text('✏️');
                
                editWhiteBtn.on('click', function(e) {
                    e.stopPropagation();
                    const index = $(this).data('index');
                    const step = currentLesson.steps[index];
                    
                    // تحديد الخطوة للتعديل
                    editorChess.load(step.fen);
                    editorBoard.position(step.fen);
                    
                    lastMove = {
                        from: step.from,
                        to: step.to,
                        notation: step.move,
                        fen: step.fen
                    };
                    
                    updateCurrentMoveDisplay();
                    
                    // عرض تفاصيل الخطوة في محرر الخطوة
                    if (step.explanation) {
                        $('#step-explanation').val(step.explanation);
                    }
                    
                    // تمييز النص المرتبط بالخطوة في النص الكامل
                    const markerElement = $(`#full-lesson-text .move-marker[data-step-id="${step.id}"]`);
                    if (markerElement.length) {
                        // تمييز النص
                        const range = document.createRange();
                        const selection = window.getSelection();
                        range.selectNodeContents(markerElement[0]);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        // عرض النص المحدد
                        $('#current-selection').text('النص المحدد: ' + step.selectedText);
                        
                        // حفظ التحديد
                        currentSelection = {
                            text: step.selectedText,
                            range: range
                        };
                    }
                    
                    // تحديد حالة الخطوة الوهمية
                    $('#phantom-step').prop('checked', step.isPhantom || false);
                    
                    // الانتقال إلى محرر الخطوة
                    $('html, body').animate({
                        scrollTop: $('#step-editor').offset().top - 20
                    }, 300);
                });
                
                actionsCell.append(editWhiteBtn);
                
                // زر حذف
                const deleteWhiteBtn = $('<button>')
                    .addClass('delete-move-btn')
                    .attr('data-step-id', pair.white.id)
                    .attr('data-index', pairIndex * 2)
                    .attr('title', 'حذف الخطوة')
                    .text('🗑️');
                
                deleteWhiteBtn.on('click', function(e) {
                    e.stopPropagation();
                    const index = $(this).data('index');
                    const stepId = $(this).data('step-id');
                    
                    if (confirm('هل أنت متأكد من حذف هذه الخطوة؟')) {
                        // حذف الخطوة من المصفوفة
                        currentLesson.steps.splice(index, 1);
                        
                        // حذف العنصر من النص
                        const markerToRemove = $(`#full-lesson-text .move-marker[data-step-id="${stepId}"]`);
                        markerToRemove.replaceWith(markerToRemove.text());
                        
                        // تحديث النص الكامل
                        currentLesson.fullText = $('#full-lesson-text').html();
                        
                        // إعادة ترقيم الخطوات المتبقية
                        $('.move-marker').each(function(idx, marker) {
                            const markerStepId = $(marker).data('step-id');
                            const markerStepIndex = currentLesson.steps.findIndex(step => step.id === markerStepId);
                            if (markerStepIndex !== -1) {
                                $(marker).attr('data-step-index', markerStepIndex + 1);
                            }
                        });
                        
                        renderSteps();
                    }
                });
                
                actionsCell.append(deleteWhiteBtn);
            }
            
            // زر حذف وتعديل للخطوة السوداء
            if (pair.black) {
                // زر تعديل
                const editBlackBtn = $('<button>')
                    .addClass('edit-move-btn')
                    .attr('data-step-id', pair.black.id)
                    .attr('data-index', pairIndex * 2 + 1)
                    .attr('title', 'تعديل الخطوة')
                    .text('✏️');
                
                editBlackBtn.on('click', function(e) {
                    e.stopPropagation();
                    const index = $(this).data('index');
                    const step = currentLesson.steps[index];
                    
                    // تحديد الخطوة للتعديل
                    editorChess.load(step.fen);
                    editorBoard.position(step.fen);
                    
                    lastMove = {
                        from: step.from,
                        to: step.to,
                        notation: step.move,
                        fen: step.fen
                    };
                    
                    updateCurrentMoveDisplay();
                    
                    // عرض تفاصيل الخطوة في محرر الخطوة
                    if (step.explanation) {
                        $('#step-explanation').val(step.explanation);
                    }
                    
                    // تمييز النص المرتبط بالخطوة في النص الكامل
                    const markerElement = $(`#full-lesson-text .move-marker[data-step-id="${step.id}"]`);
                    if (markerElement.length) {
                        // تمييز النص
                        const range = document.createRange();
                        const selection = window.getSelection();
                        range.selectNodeContents(markerElement[0]);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        // عرض النص المحدد
                        $('#current-selection').text('النص المحدد: ' + step.selectedText);
                        
                        // حفظ التحديد
                        currentSelection = {
                            text: step.selectedText,
                            range: range
                        };
                    }
                    
                    // تحديد حالة الخطوة الوهمية
                    $('#phantom-step').prop('checked', step.isPhantom || false);
                    
                    // الانتقال إلى محرر الخطوة
                    $('html, body').animate({
                        scrollTop: $('#step-editor').offset().top - 20
                    }, 300);
                });
                
                actionsCell.append(editBlackBtn);
                
                // زر حذف
                const deleteBlackBtn = $('<button>')
                    .addClass('delete-move-btn')
                    .attr('data-step-id', pair.black.id)
                    .attr('data-index', pairIndex * 2 + 1)
                    .attr('title', 'حذف الخطوة')
                    .text('🗑️');
                
                deleteBlackBtn.on('click', function(e) {
                    e.stopPropagation();
                    const index = $(this).data('index');
                    const stepId = $(this).data('step-id');
                    
                    if (confirm('هل أنت متأكد من حذف هذه الخطوة؟')) {
                        // حذف الخطوة من المصفوفة
                        currentLesson.steps.splice(index, 1);
                        
                        // حذف العنصر من النص
                        const markerToRemove = $(`#full-lesson-text .move-marker[data-step-id="${stepId}"]`);
                        markerToRemove.replaceWith(markerToRemove.text());
                        
                        // تحديث النص الكامل
                        currentLesson.fullText = $('#full-lesson-text').html();
                        
                        // إعادة ترقيم الخطوات المتبقية
                        $('.move-marker').each(function(idx, marker) {
                            const markerStepId = $(marker).data('step-id');
                            const markerStepIndex = currentLesson.steps.findIndex(step => step.id === markerStepId);
                            if (markerStepIndex !== -1) {
                                $(marker).attr('data-step-index', markerStepIndex + 1);
                            }
                        });
                        
                        renderSteps();
                    }
                });
                
                actionsCell.append(deleteBlackBtn);
            }
            
            rowElement.append(actionsCell);
            stepsContainer.append(rowElement);
        });
    }

    // حذف خطوة
    $(document).on('click', '.delete-step', function(e) {
        e.stopPropagation();
        const index = $(this).data('index');
        const stepId = $(this).data('step-id');
        
        if (confirm('هل أنت متأكد من حذف هذه الخطوة؟')) {
            // حذف الخطوة من المصفوفة
            currentLesson.steps.splice(index, 1);
            
            // حذف العنصر من النص
            const markerToRemove = $(`#full-lesson-text .move-marker[data-step-id="${stepId}"]`);
            markerToRemove.replaceWith(markerToRemove.text());
            
            // تحديث النص الكامل
            currentLesson.fullText = $('#full-lesson-text').html();
            
            // إعادة ترقيم الخطوات المتبقية
            $('.move-marker').each(function(idx, marker) {
                const markerStepId = $(marker).data('step-id');
                const markerStepIndex = currentLesson.steps.findIndex(step => step.id === markerStepId);
                if (markerStepIndex !== -1) {
                    $(marker).attr('data-step-index', markerStepIndex + 1);
                }
            });
            
            renderSteps();
        }
    });

    // عرض خطوة على اللوحة عند النقر عليها
    $(document).on('click', '.step-item', function() {
        const index = $(this).data('index');
        const step = currentLesson.steps[index];
        
        editorChess.load(step.fen);
        editorBoard.position(step.fen);
        
        lastMove = {
            from: step.from,
            to: step.to,
            notation: step.move,
            fen: step.fen
        };
        
        updateCurrentMoveDisplay();
    });

    // النقر على حركة محددة في النص المحرر
    $(document).on('click', '#full-lesson-text .move-marker', function() {
        const stepId = parseInt($(this).data('step-id'));
        const stepIndex = currentLesson.steps.findIndex(step => step.id === stepId);
        
        if (stepIndex !== -1) {
            const step = currentLesson.steps[stepIndex];
            
            editorChess.load(step.fen);
            editorBoard.position(step.fen);
            
            lastMove = {
                from: step.from,
                to: step.to,
                notation: step.move,
                fen: step.fen
            };
            
            updateCurrentMoveDisplay();
            
            // تمييز الخطوة في القائمة
            $('.step-item').removeClass('active');
            $(`.step-item[data-index="${stepIndex}"]`).addClass('active');
        }
    });

    // النقر على حركة محددة في معاين الدرس
    $(document).on('click', '#full-text-display .move-marker', function() {
        const stepId = parseInt($(this).data('step-id'));
        
        if (!currentLessonInViewer || !currentLessonInViewer.steps) {
            console.error('لا يوجد درس حالي في المعاين');
            return;
        }
        
        const stepIndex = currentLessonInViewer.steps.findIndex(step => step.id === stepId);
        
        if (stepIndex !== -1) {
            console.log('تم النقر على نص مميز في المعاين، عرض الخطوة:', stepIndex);
            displayStep(stepIndex);
        } else {
            console.error('لم يتم العثور على الخطوة بالمعرف:', stepId);
        }
    });

    // ===== حفظ الدرس =====
    $('#save-lesson').on('click', function() {
        if (!currentUser) {
            alert('يرجى تسجيل الدخول لحفظ الدرس');
            return;
        }
        
        if (!currentLesson || !currentLesson.steps || currentLesson.steps.length === 0) {
            alert('يرجى إضافة خطوات قبل حفظ الدرس');
            return;
        }
        
        // تحديث عنوان الدرس والنص الكامل
        const userTitle = $('#lesson-title').val();
        currentLesson.title = userTitle || currentLesson.title || 'درس بدون عنوان';
        currentLesson.fullText = $('#full-lesson-text').html();
        
        // إعادة تعيين عنوان الدرس في حقل الإدخال للتأكد من ظهور العنوان الصحيح
        $('#lesson-title').val(currentLesson.title);
        
        // إضافة بيانات الوقت
        currentLesson.createdAt = currentLesson.createdAt || new Date().toISOString();
        currentLesson.updatedAt = new Date().toISOString();
        
        // إضافة معلومات المستخدم
        currentLesson.authorId = currentUser.uid;
        currentLesson.authorEmail = currentUser.email;
        
        // إنشاء معرّف فريد إذا لم يكن موجوداً
        if (!currentLesson.id) {
            currentLesson.id = 'lesson_' + Date.now();
        }
        
        // حفظ الدرس في Firebase
        database.ref('lessons/' + currentUser.uid + '/' + currentLesson.id).set(currentLesson)
            .then(() => {
                alert('تم حفظ الدرس بنجاح!');
                // إعادة تعيين علم تحميل الدروس لضمان إعادة التحميل بعد الحفظ
                lessonsLoaded = false;
                loadUserLessons(); // تحديث قائمة الدروس
            })
            .catch((error) => {
                console.error('خطأ في حفظ الدرس:', error);
                alert('حدث خطأ أثناء حفظ الدرس');
            });
    });

    // ===== عرض الدروس المتاحة (لجميع المستخدمين) =====
    function loadUserLessons() {
        // لا حاجة للتحقق من currentUser هنا لأننا نعرض جميع الدروس
        // if (!currentUser) return; 
        
        console.log("تحميل جميع الدروس المتاحة لجميع المستخدمين. حالة المسؤول:", window.isAdmin);
        
        database.ref('lessons').once('value') // قراءة جميع الدروس من المسار الرئيسي
            .then((snapshot) => {
                console.log("Snapshot من Firebase /lessons:", snapshot.val()); // تسجيل البيانات المستلمة
                const lessonsByUser = snapshot.val() || {};
                const lessonsContainer = $('#lessons-container');
                lessonsContainer.empty();
                
                let allLessons = [];
                
                // تجميع جميع الدروس من جميع المستخدمين
                Object.keys(lessonsByUser).forEach(userId => {
                    const userLessons = lessonsByUser[userId];
                    if (userLessons) {
                        Object.keys(userLessons).forEach(lessonId => {
                            // إضافة معرف المستخدم ومعرف الدرس إلى كل درس
                            allLessons.push({ 
                                ...userLessons[lessonId], // نسخ خصائص الدرس
                                id: lessonId,             // إضافة معرف الدرس
                                authorId: userId          // إضافة معرف المؤلف
                            });
                        });
                    }
                });

                console.log("تم تجميع الدروس:", allLessons); // تسجيل الدروس المجمعة

                if (allLessons.length === 0) {
                    console.log("لا توجد دروس لعرضها.");
                    lessonsContainer.html('<p>لا توجد دروس متاحة حاليًا.</p>');
                    // تعيين العلم لتجنب التحميل المتكرر
                    lessonsLoaded = true;
                    return;
                }
                
                // فرز الدروس حسب تاريخ التحديث (الأحدث أولاً)
                allLessons.sort((a, b) => {
                    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
                });

                // إعادة تسمية المتغير ليتناسب مع الكود التالي
                const lessonsArray = allLessons;
                
                // فرز الدروس حسب تاريخ التحديث
                lessonsArray.sort((a, b) => {
                    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
                });
                
                lessonsArray.forEach(lesson => {
                    // إنشاء العناصر المشتركة لبطاقة الدرس
                    // إضافة data-user-id للاستخدام في العرض/التعديل/الحذف
                    const lessonCard = $('<div>')
                        .addClass('lesson-card')
                        .attr('data-id', lesson.id)
                        .attr('data-user-id', lesson.authorId); // مهم: إضافة معرف المؤلف
                        
                    const title = $('<h3>').text(lesson.title);
                    // التأكد من وجود steps قبل الوصول إلى length
                    const stepsCount = $('<div>').addClass('steps-count').text(`${lesson.steps ? lesson.steps.length : 0} خطوة`);
                    const actionsDiv = $('<div>').addClass('lesson-actions');
                    
                    // زر العرض متاح دائمًا للجميع
                    const viewButton = $('<button>')
                        .addClass('btn primary view-lesson')
                        .attr('data-id', lesson.id)
                        .attr('data-user-id', lesson.authorId) // إضافة معرف المؤلف للزر
                        .text('عرض');
                    actionsDiv.append(viewButton);

                    // أزرار التعديل والحذف متاحة فقط للمسؤول
                    // التأكد من أن المستخدم مسؤول وليس فقط مجرد تحقق من خاصية window.isAdmin
                    if (window.isAdmin === true) {
                        const editButton = $('<button>')
                            .addClass('btn secondary edit-btn')
                            .attr('data-id', lesson.id)
                            .attr('data-user-id', lesson.authorId) // إضافة معرف المؤلف للزر
                            .text('تعديل');
                        
                        const deleteButton = $('<button>')
                            .addClass('btn delete-lesson')
                            .attr('data-id', lesson.id)
                            .attr('data-user-id', lesson.authorId) // إضافة معرف المؤلف للزر
                            .text('حذف');
                        
                        // إضافة الأزرار قبل زر العرض للمسؤول
                        actionsDiv.prepend(editButton, deleteButton); 
                        
                        console.log('تم إضافة أزرار المسؤول للدرس:', lesson.title);
                    }
                    
                    // تجميع البطاقة
                    lessonCard.append(title, stepsCount, actionsDiv);
                    lessonsContainer.append(lessonCard);
                });
                
                console.log('تم تحميل', lessonsArray.length, 'دروس');
                
                // تعيين العلم لمنع التحميل المتكرر
                lessonsLoaded = true;
                
                // التأكد من تطبيق صلاحيات المستخدم بعد إنشاء العناصر
                if (typeof window.checkAdminRights === 'function') {
                    window.checkAdminRights();
                }
            })
            .catch((error) => {
                console.error('خطأ في تحميل جميع الدروس:', error);
                $('#lessons-container').html('<p>حدث خطأ أثناء تحميل الدروس.</p>');
            });
    }

    // عرض الدرس للتعديل (يعمل مع كلا الاسمين للزر) - تعديل ليأخذ userId
    $(document).on('click', '.edit-lesson, .edit-btn', function(e) {
        e.stopPropagation();

        // التحقق من صلاحيات المستخدم
        if (window.isAdmin !== true) {
            alert('عذراً، لا تملك الصلاحية لتعديل الدروس. هذه الوظيفة متاحة للمسؤولين فقط.');
            return;
        }

        const lessonId = $(this).data('id');
        const userId = $(this).data('user-id'); // الحصول على معرف المستخدم من الزر
        
        if (!userId) {
            console.error('لم يتم العثور على معرف المستخدم لزر التعديل');
            alert('خطأ: لم يتم تحديد مؤلف الدرس.');
            return;
        }
        
        console.log('محاولة تعديل الدرس بمعرف:', lessonId, 'للمستخدم:', userId);
        
        // تحميل الدرس من Firebase باستخدام معرف المستخدم الصحيح
        database.ref('lessons/' + userId + '/' + lessonId).once('value')
            .then((snapshot) => {
                const lesson = snapshot.val();
                
                if (lesson) {
                    // إضافة معرف الدرس ومعرف المؤلف إلى الكائن المحلي
                    currentLesson = { 
                        ...lesson, 
                        id: lessonId, 
                        authorId: userId 
                    };
                    
                    // تحديث المحرر بالنص الكامل
                    $('#full-lesson-text').html(lesson.fullText || '');
                    
                    // تحديث عنوان الدرس بشكل صريح للتأكد من ظهور اسم الدرس الصحيح
                    $('#lesson-title').val(lesson.title);
                    
                    // تحديث قائمة الخطوات
                    renderSteps();
                    
                    // استخراج آخر معرف للخطوات
                    lastStepId = lesson.steps ? lesson.steps.reduce((max, step) => Math.max(max, step.id || 0), 0) : 0;
                    
                    // إعادة ضبط اللوحة
                    editorChess.reset();
                    editorBoard.position('start');
                    lastMove = null;
                    updateCurrentMoveDisplay();
                    
                    // الانتقال إلى تبويب المحرر
                    $('.tab-btn[data-tab="editor"]').trigger('click');
                } else {
                    alert('لم يتم العثور على الدرس المطلوب للتعديل.');
                }
            })
            .catch((error) => {
                console.error('خطأ في تحميل الدرس للتعديل:', error);
                alert('حدث خطأ أثناء تحميل الدرس للتعديل');
            });
    });

    // حذف درس
    $(document).on('click', '.delete-lesson', function(e) {
        e.stopPropagation();

        // التحقق من صلاحيات المستخدم
        if (window.isAdmin !== true) {
            alert('عذراً، لا تملك الصلاحية لحذف الدروس. هذه الوظيفة متاحة للمسؤولين فقط.');
            return;
        }

        const lessonId = $(this).data('id');
        const userId = $(this).data('user-id') || currentUser.uid;
        
        if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
            database.ref('lessons/' + userId + '/' + lessonId).remove()
                .then(() => {
                    alert('تم حذف الدرس بنجاح');
                    // إعادة تعيين علم تحميل الدروس لضمان إعادة التحميل
                    lessonsLoaded = false;
                    loadUserLessons(); // إعادة تحميل الدروس بعد الحذف
                })
                .catch((error) => {
                    console.error('خطأ في حذف الدرس:', error);
                    alert('حدث خطأ أثناء محاولة حذف الدرس');
                });
        }
    });

    // ===== عرض الدرس =====
    $(document).on('click', '.view-lesson, .admin-view-lesson, .lesson-card', function(e) {
        const target = $(e.target);
        
        // تجاهل النقر إذا كان على أحد الأزرار
        if (target.hasClass('edit-btn') || target.hasClass('edit-lesson') || target.hasClass('delete-lesson') || target.hasClass('toggle-admin')) {
            return;
        }
        
        // الحصول على معرّف الدرس والمستخدم
        const lessonId = $(this).data('id') || $(this).closest('.lesson-card').data('id');
        const userId = $(this).data('user-id') || $(this).closest('.lesson-card').data('user-id') || currentUser.uid;
        
        console.log('عرض الدرس بمعرف:', lessonId, 'للمستخدم:', userId);
        
        // استخدام PageManager للانتقال إلى صفحة العارض
        if (window.pageManager) {
            // انتقل إلى صفحة العارض مع تمرير معرف الدرس
            window.pageManager.navigateTo('viewer', { lessonId: lessonId });
        } else {
            // إذا كان مدير الصفحات غير متاح، استدعاء loadLesson مباشرة
            loadLesson(lessonId);
        }
    });

    // زر التصدير
    $('#export-lesson').on('click', function() {
        if (!currentLesson || !currentLesson.steps || currentLesson.steps.length === 0) {
            alert('يرجى إضافة خطوات قبل تصدير الدرس');
            return;
        }
        
        // تحديث البيانات قبل التصدير
        currentLesson.title = $('#lesson-title').val() || currentLesson.title;
        currentLesson.fullText = $('#full-lesson-text').html();
        
        // تحويل الدرس إلى JSON
        const lessonJSON = JSON.stringify(currentLesson, null, 2);
        
        // إنشاء رابط تنزيل
        const blob = new Blob([lessonJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // إنشاء عنصر رابط وهمي
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentLesson.title || 'lesson'}.json`;
        
        // إضافة العنصر إلى الصفحة والنقر عليه ثم إزالته
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // تحرير الموارد
        URL.revokeObjectURL(url);
    });
    
    // استيراد الدروس
    $('#import-btn').on('click', function() {
        $('#import-lessons').click();
    });
    
    $('#import-lessons').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedLesson = JSON.parse(e.target.result);
                
                // التحقق من بنية الدرس
                if (!importedLesson.title || !importedLesson.steps) {
                    alert('بنية ملف الدرس غير صالحة');
                    return;
                }
                
                // استخدام الدرس المستورد
                currentLesson = importedLesson;
                
                // تحديث واجهة المستخدم
                $('#lesson-title').val(currentLesson.title);
                $('#full-lesson-text').html(currentLesson.fullText || '');
                
                // استخراج آخر معرف للخطوات
                lastStepId = currentLesson.steps.reduce((max, step) => Math.max(max, step.id || 0), 0);
                
                // إعادة ضبط اللوحة
                editorChess.reset();
                editorBoard.position('start');
                lastMove = null;
                updateCurrentMoveDisplay();
                
                // تحديث قائمة الخطوات
                renderSteps();
                
                // الانتقال إلى تبويب المحرر
                $('.tab-btn[data-tab="editor"]').trigger('click');
                
                alert('تم استيراد الدرس بنجاح!');
            } catch (error) {
                console.error('خطأ في تحليل ملف الدرس:', error);
                alert('حدث خطأ أثناء قراءة ملف الدرس');
            }
        };
        reader.readAsText(file);
        
        // إعادة ضبط عنصر الإدخال للسماح باختيار نفس الملف مرة أخرى
        this.value = '';
    });

    // إضافة مستمع لحدث النقر على زر الدرس الجديد
    $('#new-lesson-btn').on('click', function() {
        // إنشاء درس جديد
        currentLesson = {
            title: 'درس جديد',
            fullText: '',
            steps: []
        };
        
        // تحديث واجهة المستخدم
        $('#lesson-title').val(currentLesson.title);
        $('#full-lesson-text').html('');
        
        // إعادة ضبط اللوحة
        editorChess.reset();
        editorBoard.position('start');
        lastMove = null;
        lastStepId = 0;
        updateCurrentMoveDisplay();
        renderSteps();
    });

    // عرض خطوة عند النقر عليها في القائمة (تمت إضافة هذا كطبقة احتياطية إضافية)
    $(document).on('click', '.viewer-step-item', function(e) {
        e.stopPropagation(); // منع انتشار الحدث
        const index = $(this).data('index');
        console.log('تم النقر على خطوة في القائمة بمؤشر:', index);
        displayStep(index);
    });
    
    // معالج إضافي للنقر على محتوى الخطوة
    $(document).on('click', '.viewer-step-item .step-content', function(e) {
        e.stopPropagation(); // منع انتشار الحدث
        const index = $(this).closest('.viewer-step-item').data('index');
        console.log('تم النقر على محتوى الخطوة بمؤشر:', index);
        displayStep(index);
    });

    // إضافة تفاعلية CSS لتحسين تجربة المستخدم
    $(document).ready(function() {
        // إضافة نمط CSS للتفاعل مع الماوس
        $('<style>')
            .text(`
                .viewer-step-item {
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .viewer-step-item:hover {
                    background-color: #f0f0f0;
                }
                .viewer-step-item.active {
                    background-color: #e3f2fd;
                    border-left: 3px solid #2196F3;
                }
            `)
            .appendTo('head');
    });

    // التنقل بين الخطوات في العارض
    $('#next-step').on('click', function() {
        console.log('تم النقر على زر التالي', {
            currentIndex: currentStepIndex,
            totalSteps: currentLessonInViewer ? currentLessonInViewer.steps.length : 0
        });
        
        if (!currentLessonInViewer || currentLessonInViewer.steps.length === 0) {
            return;
        }

        // إذا لم يتم اختيار خطوة بعد، نذهب إلى الخطوة الأولى
        if (currentStepIndex === -1 && currentLessonInViewer.steps.length > 0) {
            displayStep(0);
            return;
        }
        
        // التأكد من أننا لم نصل إلى نهاية الخطوات
        if (currentStepIndex >= currentLessonInViewer.steps.length - 1) {
            return;
        }

        // الانتقال مباشرةً إلى الخطوة التالية بدون تأكيدات
        displayStep(currentStepIndex + 1);
    });

    $('#prev-step').on('click', function() {
        console.log('تم النقر على زر السابق', {
            currentIndex: currentStepIndex
        });
        
        if (!currentLessonInViewer) {
            return;
        }

        // إذا كنا في الخطوة الأولى، نعود إلى وضع البداية
        if (currentStepIndex === 0) {
            displayStep(-1); // العودة إلى الوضع الابتدائي
            return;
        }
        
        // إذا لم يتم اختيار خطوة بعد، لا نفعل شيئاً
        if (currentStepIndex === -1) {
            return;
        }

        // الانتقال مباشرةً إلى الخطوة السابقة بدون تأكيدات
        displayStep(currentStepIndex - 1);
    });

    // تحديث حالة أزرار التنقل
    function updateNavigationButtons() {
        // زر السابق يكون معطلاً فقط إذا كان المؤشر -1 (الوضع الابتدائي)
        $('#prev-step').prop('disabled', currentStepIndex < 0);
        
        // زر التالي يكون معطلاً إذا لم يكن هناك درس أو في نهاية الخطوات
        // أو إذا كان المؤشر -1 ولكن لا توجد خطوات
        const disableNext = !currentLessonInViewer || 
                          currentStepIndex >= currentLessonInViewer.steps.length - 1 || 
                          (currentStepIndex === -1 && (!currentLessonInViewer.steps || currentLessonInViewer.steps.length === 0));
        
        $('#next-step').prop('disabled', disableNext);
    }
    
    // عرض معاينة للدرس
    $('#preview-lesson').on('click', function() {
        if (!currentLesson || !currentLesson.steps || currentLesson.steps.length === 0) {
            alert('يرجى إضافة خطوات قبل معاينة الدرس');
            return;
        }
        
        // تحديث البيانات المحلية للدرس
        currentLesson.title = $('#lesson-title').val() || currentLesson.title;
        currentLesson.fullText = $('#full-lesson-text').html();
        
        // استخدام الدرس الحالي للعرض (نسخة مستقلة)
        currentLessonInViewer = JSON.parse(JSON.stringify(currentLesson));
        currentStepIndex = -1; // تغيير من 0 إلى -1 لعدم تحديد أي خطوة
        
        console.log('معاينة الدرس:', {
            title: currentLessonInViewer.title,
            stepsCount: currentLessonInViewer.steps.length
        });
        
        // ضبط عنوان الدرس
        $('#viewer-title').text(currentLessonInViewer.title);
        
        // عرض النص الكامل
        $('#full-text-display').html(currentLessonInViewer.fullText);
        checkScrollable();
        
        // الانتقال إلى تبويب العارض أولاً
        $('.tab-content').removeClass('active');
        $('#viewer-tab').addClass('active');
        
        // إعادة إنشاء لوحة الشطرنج بشكل كامل
        setTimeout(function() {
            try {
                console.log('إعادة تهيئة لوحة الشطرنج للمعاينة');
                
                // تهيئة كائن جديد للشطرنج
                viewerChess = new Chess();
                
                // تدمير اللوحة الحالية إن وجدت
                if (viewerBoard && typeof viewerBoard.destroy === 'function') {
                    viewerBoard.destroy();
                    console.log('تم تدمير لوحة المعاينة القديمة');
                }
                
                // تأكد من وجود العنصر في DOM
                if ($('#viewer-board').length === 0) {
                    console.error('عنصر عارض الشطرنج غير موجود في صفحة المعاينة!');
                } else {
                    console.log('تم العثور على عنصر عارض الشطرنج في صفحة المعاينة');
                }
                
                // إنشاء لوحة جديدة بالوضع الافتراضي
                viewerBoard = Chessboard('viewer-board', {
                    position: 'start',
                    draggable: false,
                    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
                });
                
                if (!viewerBoard) {
                    console.error('فشل إنشاء لوحة الشطرنج للمعاينة!');
                }
                
                // إعادة ضبط قياس اللوحة
                if (viewerBoard && typeof viewerBoard.resize === 'function') {
                    viewerBoard.resize();
                    console.log('تم ضبط قياس لوحة المعاينة');
                }
                
                console.log('تم إنشاء لوحة المعاينة بنجاح');
                
                // تحديث قائمة الخطوات
                updateViewerStepsList();
                
                // تحديث حالة أزرار التنقل
                updateNavigationButtons();
                
                // إزالة التمييز من النص
                $('#full-text-display .move-marker').removeClass('active');
                
                // تمييز شرح الخطوة
                $('#step-explanation-display').text('اضغط على إحدى الخطوات لرؤيتها على اللوحة أو استخدم زر التالي');
                
                console.log('تم تهيئة واجهة المعاينة بدون تحديد خطوة');
            } catch (e) {
                console.error('خطأ أثناء تهيئة لوحة المعاينة:', e);
                console.error('تفاصيل الخطأ:', e.message, e.stack);
            }
        }, 500);
    });

    // عرض خطوة محددة
    function displayStep(index) {
        console.log('عرض الخطوة بمؤشر:', index);
        
        // حالة خاصة للعودة إلى الوضع الابتدائي
        if (index === -1) {
            // إعادة اللوحة إلى الوضع الابتدائي
            viewerChess.reset();
            viewerBoard.position('start', false);
            
            // مسح الشرح
            $('#step-explanation-display').text('اضغط على إحدى الخطوات لرؤيتها على اللوحة أو استخدم زر التالي');
            
            // إزالة التمييز من النص
            $('#full-text-display .move-marker').removeClass('active');
            
            // تحديث مؤشر الخطوة
            currentStepIndex = -1;
            
            // تحديث أزرار التنقل
            updateNavigationButtons();
            
            // إزالة التنشيط من القائمة
            $('.viewer-step-item').removeClass('active');

            // تحديث قائمة الخطوات التي تم تنفيذها فعلياً
            updateViewerStepsList();
            
            console.log('تم العودة إلى الوضع الابتدائي');
            return;
        }
        
        if (!currentLessonInViewer || index < 0 || index >= currentLessonInViewer.steps.length) {
            console.error('خطأ: الدرس غير متوفر أو المؤشر غير صالح', {
                lesson: !!currentLessonInViewer,
                index: index,
                stepsLength: currentLessonInViewer ? currentLessonInViewer.steps.length : 0
            });
            return;
        }
        
        const step = currentLessonInViewer.steps[index];
        console.log('الخطوة المطلوب عرضها:', step);
        
        try {
            // ضبط وضع اللوحة مع التحقق من صحة FEN
            if (step.fen) {
                console.log('تحميل FEN:', step.fen);
                // تحميل الوضع في كائن الشطرنج
                if (viewerChess.load(step.fen)) {
                    console.log('تم تحميل FEN بنجاح على كائن Chess');
                } else {
                    console.error('فشل تحميل FEN على كائن Chess');
                }
                
                // تحديث لوحة الشطرنج بوضع جديد
                if (viewerBoard) {
                    console.log('تحديث اللوحة');
                    let result = viewerBoard.position(step.fen, false);
                    console.log('نتيجة تحديث اللوحة:', result);
                } else {
                    console.error('لوحة العارض غير موجودة!');
                }
            } else {
                console.error('خطأ: لا يوجد FEN للخطوة', step);
            }
            
            // عرض الشرح
            $('#step-explanation-display').text(step.explanation || '');
            
            // تمييز النص المرتبط بهذه الخطوة
            $('#full-text-display .move-marker').removeClass('active');
            $(`#full-text-display .move-marker[data-step-id="${step.id}"]`).addClass('active');
            
            // تحقق من إمكانية التمرير بعد تحديث المحتوى
            checkScrollable();
            
            // تحديث مؤشر الخطوة الحالية
            currentStepIndex = index;
            
            // تحديث حالة أزرار التنقل مع مراعاة الخطوات الوهمية
            updateNavigationButtons();
            
            // تحديث قائمة الخطوات التي تم تنفيذها فعلياً
            updateViewerStepsList();
            
            // تمييز الخطوة الحالية في الجدول
            $('#viewer-steps td').removeClass('active');
            $(`#viewer-steps td[data-index="${index}"]`).addClass('active');
            
            console.log('تم عرض الخطوة بنجاح');
        } catch (e) {
            console.error('خطأ أثناء عرض الخطوة:', e);
            console.error('تفاصيل الخطأ:', e.message, e.stack);
        }
    }

    // تحديث قائمة الخطوات في العارض
    function updateViewerStepsList() {
        if (!currentLessonInViewer) return;
        
        const stepsContainer = $('#viewer-steps');
        stepsContainer.empty();
        
        // تحديد الخطوات التي سيتم عرضها (فقط الخطوات حتى الخطوة الحالية)
        let stepsToShow = [];
        
        if (currentStepIndex >= 0) {
            // معالجة حالة الخطوات الوهمية
            // إذا كانت الخطوة الحالية غير وهمية، نزيل كل الخطوات الوهمية السابقة
            if (!currentLessonInViewer.steps[currentStepIndex].isPhantom) {
                // تجميع كل الخطوات غير الوهمية حتى الخطوة الحالية
                for (let i = 0; i <= currentStepIndex; i++) {
                    const step = currentLessonInViewer.steps[i];
                    if (!step.isPhantom) {
                        stepsToShow.push({step, index: i});
                    }
                }
            } else {
                // إذا كانت الخطوة الحالية وهمية، نجمع كل الخطوات غير الوهمية
                // ثم نضيف سلسلة الخطوات الوهمية المتصلة بالخطوة الحالية
                
                // البحث عن آخر خطوة غير وهمية قبل الخطوة الحالية
                let lastNonPhantomIndex = -1;
                for (let i = currentStepIndex - 1; i >= 0; i--) {
                    if (!currentLessonInViewer.steps[i].isPhantom) {
                        lastNonPhantomIndex = i;
                        break;
                    }
                }
                
                // إضافة كل الخطوات غير الوهمية
                for (let i = 0; i <= lastNonPhantomIndex; i++) {
                    const step = currentLessonInViewer.steps[i];
                    if (!step.isPhantom) {
                        stepsToShow.push({step, index: i});
                    }
                }
                
                // إضافة الخطوات الوهمية المتصلة بالخطوة الحالية
                for (let i = lastNonPhantomIndex + 1; i <= currentStepIndex; i++) {
                    stepsToShow.push({step: currentLessonInViewer.steps[i], index: i});
                }
            }
        }
        
        // تنظيم الخطوات في أزواج (أبيض وأسود)
        let movePairs = [];
        let currentPair = null;
        
        stepsToShow.forEach((stepInfo, arrayIndex) => {
            const step = stepInfo.step;
            const index = stepInfo.index;
            const moveColor = (arrayIndex % 2 === 0) ? 'white' : 'black';
            
            if (moveColor === 'white') {
                currentPair = {
                    moveNumber: Math.floor(arrayIndex / 2) + 1,
                    white: step,
                    whiteIndex: index,
                    black: null,
                    blackIndex: -1
                };
                movePairs.push(currentPair);
            } else {
                // إضافة الخطوة السوداء إلى آخر زوج
                if (movePairs.length > 0) {
                    movePairs[movePairs.length - 1].black = step;
                    movePairs[movePairs.length - 1].blackIndex = index;
                }
            }
        });
        
        // إنشاء صفوف الجدول
        movePairs.forEach((pair) => {
            const rowElement = $('<tr>');
            rowElement.attr('data-move-number', pair.moveNumber);
            
            // رقم الخطوة
            const numberCell = $('<td>').addClass('move-number').text(pair.moveNumber);
            rowElement.append(numberCell);
            
            // خطوة الأبيض
            const whiteCell = $('<td>').addClass('white-move');
            if (pair.white) {
                whiteCell.text(pair.white.move);
                whiteCell.attr('data-step-id', pair.white.id);
                whiteCell.attr('data-index', pair.whiteIndex);
                
                if (pair.white.isPhantom) {
                    whiteCell.addClass('phantom');
                }
                
                if (pair.whiteIndex === currentStepIndex) {
                    whiteCell.addClass('active');
                }
            }
            rowElement.append(whiteCell);
            
            // خطوة الأسود
            const blackCell = $('<td>').addClass('black-move');
            if (pair.black) {
                blackCell.text(pair.black.move);
                blackCell.attr('data-step-id', pair.black.id);
                blackCell.attr('data-index', pair.blackIndex);
                
                if (pair.black.isPhantom) {
                    blackCell.addClass('phantom');
                }
                
                if (pair.blackIndex === currentStepIndex) {
                    blackCell.addClass('active');
                }
            }
            rowElement.append(blackCell);
            
            // إضافة حدث النقر على الصف
            rowElement.on('click', function(e) {
                // تحديد الخلية التي تم النقر عليها
                const target = $(e.target);
                let clickedIndex = -1;
                
                if (target.hasClass('white-move') && pair.white) {
                    clickedIndex = pair.whiteIndex;
                } else if (target.hasClass('black-move') && pair.black) {
                    clickedIndex = pair.blackIndex;
                } else if (pair.white) {
                    // إذا تم النقر على رقم الخطوة، نستخدم الخطوة البيضاء افتراضيًا
                    clickedIndex = pair.whiteIndex;
                }
                
                if (clickedIndex !== -1) {
                    console.log('تم النقر على خطوة في الجدول بمؤشر:', clickedIndex);
                    displayStep(clickedIndex);
                }
            });
            
            stepsContainer.append(rowElement);
        });
    }

    // إضافة مستمع لحدث تغيير حجم النافذة
    window.addEventListener('resize', checkScrollable);

    // مراقبة التغيير في حقل عنوان الدرس
    $('#lesson-title').on('input', function() {
        if (currentLesson) {
            currentLesson.title = $(this).val();
        }
    });

    // تهيئة نموذج المصادقة
    $(document).ready(function() {
        // إعادة تعيين نموذج تسجيل الدخول عند تحميل الصفحة
        if (typeof resetAuthForm === 'function') {
            resetAuthForm();
        } else {
            // تهيئة بديلة إذا لم تكن الدالة متوفرة
            $('#login-btn').prop('disabled', false).text('تسجيل الدخول');
            $('#signup-btn').prop('disabled', false);
            $('#auth-email').val('');
            $('#auth-password').val('');
        }
        
        // التأكد من أن النموذج جاهز للاستخدام
        $('#auth-form').off('submit').on('submit', function(e) {
            e.preventDefault();
            
            // عند إرسال النموذج، يتم دائمًا استخدام وظيفة تسجيل الدخول
            if (typeof handleLogin === 'function') {
                handleLogin();
            } else {
                const email = $('#auth-email').val();
                const password = $('#auth-password').val();
                signIn(email, password);
            }
        });
        
        // تهيئة زر إنشاء الحساب
        $('#signup-btn').off('click').on('click', function() {
            // مباشرة إنشاء حساب جديد بدون تغيير وضع النموذج
            const email = $('#auth-email').val();
            const password = $('#auth-password').val();
            
            // التحقق من صحة المدخلات
            if (!email || !password) {
                showAuthMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
                return;
            }
            
            if (password.length < 6) {
                showAuthMessage('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل', 'error');
                return;
            }
            
            // استدعاء وظيفة إنشاء الحساب مباشرة
            if (typeof handleSignup === 'function') {
                handleSignup();
            } else {
                signUp(email, password);
            }
        });
    });

    // معالج تقديم نموذج المصادقة (تسجيل الدخول / إنشاء حساب)
    function handleAuthFormSubmit(event) {
        event.preventDefault();
        
        const email = $('#auth-email').val();
        const password = $('#auth-password').val();
        
        if ($('#auth-title').text() === 'تسجيل الدخول') {
            // تسجيل الدخول
            signIn(email, password);
        } else {
            // إنشاء حساب جديد
            signUp(email, password);
        }
    }

    // وظيفة تسجيل الدخول - متوافقة مع auth.js
    function signIn(email, password) {
        // استخدام وظيفة handleLogin من auth.js
        if (typeof handleLogin === 'function') {
            return handleLogin();
        }
        
        // الاحتياط في حال عدم وجود handleLogin
        // إظهار مؤشر التحميل
        setAuthLoading(true, 'جاري تسجيل الدخول...');
        
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('تم تسجيل الدخول بنجاح');
                setAuthLoading(false);
            })
            .catch((error) => {
                console.log('خطأ في تسجيل الدخول:', error.message);
                
                // إذا كان الخطأ هو عدم وجود المستخدم، نقوم بإنشاء حساب جديد تلقائياً
                if (error.code === 'auth/user-not-found') {
                    console.log('المستخدم غير موجود، جاري إنشاء حساب جديد');
                    signUp(email, password);
                } else {
                    showAuthMessage('خطأ في تسجيل الدخول: ' + error.message, 'error');
                    setAuthLoading(false);
                }
            });
    }

    // وظيفة إنشاء حساب جديد - متوافقة مع auth.js
    function signUp(email, password) {
        // استخدام وظيفة handleSignup من auth.js
        if (typeof handleSignup === 'function') {
            return handleSignup();
        }
        
        // الاحتياط في حال عدم وجود handleSignup
        // التحقق من صحة المدخلات
        if (!email || !password) {
            showAuthMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
            return;
        }
        
        if (password.length < 6) {
            showAuthMessage('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل', 'error');
            return;
        }
        
        // إظهار مؤشر التحميل
        setAuthLoading(true, 'جاري إنشاء الحساب...');
        
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('تم إنشاء الحساب بنجاح');
                
                // إنشاء سجل للمستخدم في قاعدة البيانات
                const user = userCredential.user;
                firebase.database().ref('users/' + user.uid).set({
                    email: user.email,
                    isAdmin: false,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                showAuthMessage('تم إنشاء حساب جديد بنجاح!', 'success');
                
                // تغيير النموذج إلى وضع تسجيل الدخول
                $('#auth-title').text('تسجيل الدخول');
                $('#login-btn').text('تسجيل الدخول');
                $('#toggle-auth-btn').text('التبديل للتسجيل');
            })
            .catch((error) => {
                console.error('خطأ في إنشاء الحساب:', error.code, error.message);
                
                // عرض رسالة الخطأ
                let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
                
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'صيغة البريد الإلكتروني غير صحيحة';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'كلمة المرور ضعيفة جدًا';
                }
                
                showAuthMessage(errorMessage, 'error');
                setAuthLoading(false);
            });
    }
    
    // وظيفة مساعدة لعرض رسائل المصادقة
    function showAuthMessage(message, type) {
        if (typeof showMessage === 'function') {
            return showMessage(message, type);
        }
        
        const messageElement = $('#auth-message');
        messageElement.text(message);
        messageElement.removeClass('error success').addClass(type);
        messageElement.show();
        
        // إخفاء الرسالة بعد 5 ثوان
        setTimeout(() => {
            messageElement.fadeOut();
        }, 5000);
    }
    
    // وظيفة مساعدة لضبط حالة التحميل
    function setAuthLoading(isLoading, message = '') {
        if (typeof setLoading === 'function') {
            return setLoading(isLoading, message);
        }
        
        $('#login-btn').prop('disabled', isLoading);
        $('#signup-btn').prop('disabled', isLoading);
        
        if (isLoading) {
            $('#login-btn').text(message || 'جاري التحميل...');
        } else {
            // دائمًا نعيد تعيين زر تسجيل الدخول إلى النص الافتراضي
            $('#login-btn').text('تسجيل الدخول');
        }
    }

    // Function to handle loading a lesson for viewing
    function loadLesson(lessonId) {
        console.log('Loading lesson with ID:', lessonId);
        
        if (!currentUser) {
            console.error('User not logged in');
            alert('يرجى تسجيل الدخول أولاً');
            return;
        }

        // Default to the current user's ID, but this can be overridden for admin views
        let userId = currentUser.uid;
        
        // Check if we have a different user ID in memory (for admin views)
        if ($('.view-lesson[data-id="' + lessonId + '"]').length > 0) {
            const $button = $('.view-lesson[data-id="' + lessonId + '"]');
            if ($button.data('user-id')) {
                userId = $button.data('user-id');
            }
        }
        
        console.log('Loading lesson:', lessonId, 'for user:', userId);
        
        // Load the lesson from Firebase
        database.ref('lessons/' + userId + '/' + lessonId).once('value')
            .then((snapshot) => {
                const lesson = snapshot.val();
                
                if (lesson && lesson.steps && lesson.steps.length > 0) {
                    // Store the lesson in the global variable
                    currentLessonInViewer = lesson;
                    currentStepIndex = -1; // Start with no step selected
                    
                    console.log('Lesson loaded:', {
                        title: lesson.title,
                        stepsCount: lesson.steps.length
                    });
                    
                    // Set the lesson title
                    $('#viewer-title').text(lesson.title || 'درس بدون عنوان');
                    
                    // Display the full text with clickable moves
                    $('#full-text-display').html(lesson.fullText || '');
                    checkScrollable();
                    
                    // Update the steps list in the viewer
                    updateViewerStepsList();
                    
                    // Make sure the viewer tab is visible
                    $('#viewer-tab').css('display', 'block').addClass('active');
                    $('.tab-btn[data-tab="viewer"]').addClass('active');
                    
                    // Initialize the chessboard
                    setTimeout(function() {
                        // Initialize Chess.js
                        viewerChess = new Chess();
                        
                        // Destroy previous board if it exists
                        if (viewerBoard && typeof viewerBoard.destroy === 'function') {
                            viewerBoard.destroy();
                        }
                        
                        // Create a new board
                        viewerBoard = Chessboard('viewer-board', {
                            position: 'start',
                            draggable: false,
                            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
                        });
                        
                        // Resize after creation
                        if (viewerBoard && typeof viewerBoard.resize === 'function') {
                            viewerBoard.resize();
                        }
                        
                        // Update navigation buttons
                        updateNavigationButtons();
                    }, 300);  // Increased timeout for better rendering
                } else {
                    console.error('Error: Lesson is empty or has no steps');
                    alert('عذراً، لا يمكن عرض الدرس. الدرس فارغ أو لا يحتوي على خطوات.');
                }
            })
            .catch((error) => {
                console.error('Error loading lesson:', error);
                alert('حدث خطأ أثناء تحميل الدرس');
            });
    }

    // جعل بعض الدوال متاحة عالمياً
    window.loadLesson = loadLesson;
    window.initEditorBoard = initEditorBoard;
    window.initViewerBoard = initViewerBoard;
});

// === وظائف التصدير والاستيراد === //
// ... existing code ...
