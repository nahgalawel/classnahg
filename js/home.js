function readAll_ans_saveded() {
    readAll_ans_saveded_new();
    loadStudentClassrooms();
}

function escapeHtml(text) {
    if (!text) return '';
    return text.toString().replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function readAll_exam_saveded_new(action) {
    var teacher_email = localStorage.getItem('loginEmail');

    if (!teacher_email) {
        $('#exam_saved_te #exam_saved_forAdd').html('<tr><td colspan="3">الرجاء تسجيل الدخول لعرض اختباراتك المنشورة</td></tr>');
        return;
    }

    let { data, error } = await window._supabase
        .from('exams')
        .select('*')
        .eq('teacher_email', teacher_email)
        .order('id', { ascending: false });

    if (error) {
        console.error('Error fetching exams:', error.message);
        $('#exam_saved_te #exam_saved_forAdd').html('<tr><td colspan="3">خطأ في جلب الاختبارات من السحابة</td></tr>');
        return;
    }

    if (!data || data.length === 0) {
        $('#exam_saved_te #exam_saved_forAdd').html('<tr><td colspan="3">لم تقم بإنشاء أي اختبار حتى الآن</td></tr>');
        readAll_student_exams_sync([]);
        return;
    }

    syncTeacherExamsToStudentStorage(data);

    var html = '';
    data.forEach(exam => {
        html += `<tr>
            <td style="font-weight:800; text-align:right; padding-right:15px;">${exam.exam_name}</td>
            <td><code style="background:#e2e8f0; padding:3px 8px; border-radius:4px; font-weight:bold;">${exam.exam_number}</code></td>
            <td>
                <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
                    <button class="desine-btn" style="padding:5px 8px; font-size:0.75rem; background:#10b981; margin:0;" onclick="viewExamResultsByNum(${exam.exam_number})" title="النتائج"><i class="fas fa-chart-bar"></i> النتائج</button>
                    <button class="desine-btn" style="padding:5px 8px; font-size:0.75rem; background:#0284c7; margin:0;" onclick="editThisExam(${exam.exam_number})" title="تعديل"><i class="fas fa-edit"></i> تعديل</button>
                    <button class="desine-btn" style="padding:5px 8px; font-size:0.75rem; background:#ef4444; margin:0;" onclick="deleteThisExamByNum(${exam.exam_number})" title="حذف"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </td>
        </tr>`;
    });

    $('#exam_saved_te #exam_saved_forAdd').html(html);
    readAll_student_exams_sync(data);
}

function syncTeacherExamsToStudentStorage(teacherExams) {
    let savedExams = JSON.parse(localStorage.getItem('downloaded_exams') || '[]');
    
    teacherExams.forEach(tExam => {
        let exists = savedExams.some(e => e.exam_number == tExam.exam_number);
        if (!exists) {
            savedExams.push(tExam);
        } else {
            let index = savedExams.findIndex(e => e.exam_number == tExam.exam_number);
            if (index !== -1) {
                savedExams[index] = tExam;
            }
        }
    });
    localStorage.setItem('downloaded_exams', JSON.stringify(savedExams));
}

function readAll_student_exams_sync(teacherExamsData) {
    let savedExams = JSON.parse(localStorage.getItem('downloaded_exams') || '[]');
    
    if (savedExams.length === 0) {
        $('#exam_loaded_forAdd').html('<tr><td colspan="3">لم تقم بحفظ أي اختبار محلياً حتى الآن</td></tr>');
        return;
    }

    var html = '';
    savedExams.forEach(exam => {
        let studentGrades = JSON.parse(localStorage.getItem('student_grades') || '{}');
        let myGradeBox = studentGrades[exam.exam_number] 
            ? `<div style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:6px; font-weight:bold; display:inline-block; margin-top:4px;">الدرجة: ${studentGrades[exam.exam_number]}</div>` 
            : `<div style="background:#f1f5f9; color:#64748b; padding:4px 10px; border-radius:6px; font-size:0.85rem; display:inline-block; margin-top:4px;">لم تختبر بعد</div>`;

        let reviewBtn = studentGrades[exam.exam_number] 
            ? `<button class="desine-btn" style="padding:6px 12px; font-size:0.85rem; background:#8b5cf6; margin:0;" onclick="reviewExam(${exam.exam_number})">
                <i class="fas fa-eye"></i> مراجعة
               </button>` 
            : '';

        html += `<tr>
            <td style="text-align:right; padding-right:15px;"><b>${exam.exam_name}</b><br>${myGradeBox}</td>
            <td><code style="background:#e2e8f0; padding:3px 8px; border-radius:4px; font-weight:bold;">${exam.exam_number}</code></td>
            <td>
                <div style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                    <button class="desine-btn" style="padding:6px 12px; font-size:0.85rem; background:#2563eb; margin:0;" onclick="startDownloadedExam(${exam.exam_number})">
                        <i class="fas fa-play"></i> فتح
                    </button>
                    ${reviewBtn}
                </div>
            </td>
        </tr>`;
    });

    $('#exam_loaded_forAdd').html(html);
}

function viewExamResultsByNum(examNum) {
    window.currentExamNumberForResults = examNum;
    go_page('page_result');
    load_exam_results(examNum);
}

function editThisExam(examNum) {
    window.editingExamNumber = examNum;
    $('#load').show();
    
    window._supabase
        .from('exams')
        .select('*')
        .eq('exam_number', examNum)
        .single()
        .then(({ data, error }) => {
            $('#load').hide();
            if (error || !data) {
                Swal.fire('تعذر تحميل بيانات الاختبار للتعديل');
                return;
            }
            $('#t_name').val(data.exam_name);
            $('#t_info').val(data.exam_info);
            $('#t_zoom_link').val(data.zoom_link || '');
            
            if (data.settings) {
                $('#Pass_start_ckeck').prop('checked', data.settings.pass_start_check || false);
                if(data.settings.pass_start_check) $('#input_Pass').show();
                $('#t_pass_start').val(data.settings.t_pass_start || '');
                $('#Time_test_ckeck').prop('checked', data.settings.time_test_check || false);
                if(data.settings.time_test_check) $('#input_Time').show();
                $('#Time_test').val(data.settings.time_test || '');
                $('#Bank_test_ckeck').prop('checked', data.settings.bank_test_check || false);
                if(data.settings.bank_test_check) $('#input_Bank').show();
                $('#Bank_test').val(data.settings.bank_test || '');
                $('#RandomAsk').prop('checked', data.settings.random_ask || false);
                $('#RandomAnswers').prop('checked', data.settings.random_answers || false);
            }
            
            $('#form_new_ask').html('');
            questionCount = 0;
            
            if (data.exam_data && data.exam_data.questions) {
                data.exam_data.questions.forEach(q => {
                    add_ask();
                    let currentBox = $('#form_new_ask .question_box').last();
                    currentBox.find('.inputAsk').val(q.question);
                    let ansInputs = currentBox.find('.inputAns');
                    if (q.options) {
                        q.options.forEach((opt, idx) => {
                            if (ansInputs[idx]) {
                                $(ansInputs[idx]).val(opt);
                            }
                        });
                    }
                });
            }
            go_page('page_newtest');
            $('#btnAddExam').text('تحديث وحفظ التعديلات');
        });
}

async function deleteThisExamByNum(examNum) {
    const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: 'هل أنت متأكد من حذف هذا الاختبار نهائياً من السحابة؟',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });
    if (!result.isConfirmed) return;

    let { error } = await window._supabase
        .from('exams')
        .delete()
        .eq('exam_number', examNum);

    if (error) {
        Swal.fire('خطأ أثناء الحذف: ' + error.message);
    } else {
        Swal.fire('تم حذف الاختبار بنجاح');
        readAll_exam_saveded_new('update');
    }
}

function readAll_ans_saveded_new() {
    readAll_student_exams_sync([]);
}

function startDownloadedExam(exam_number) {
    let savedExams = JSON.parse(localStorage.getItem('downloaded_exams') || '[]');
    let exam = savedExams.find(e => e.exam_number == exam_number);
    if (!exam) {
        Swal.fire('الاختبار غير موجود محلياً');
        return;
    }

    if (exam.settings && exam.settings.pass_start_check === true && exam.settings.t_pass_start && exam.settings.t_pass_start.trim() !== '') {
        Swal.fire({
            title: 'هذا الاختبار محمي بكلمة مرور',
            input: 'text',
            inputPlaceholder: 'أدخل كلمة المرور',
            showCancelButton: true,
            confirmButtonText: 'دخول',
            cancelButtonText: 'إلغاء'
        }).then(result => {
            if (result.isConfirmed) {
                if (result.value !== exam.settings.t_pass_start) {
                    Swal.fire('كلمة المرور غير صحيحة!');
                    return;
                }
                _startDownloadedExam(exam);
            }
        });
    } else {
        _startDownloadedExam(exam);
    }
}

function _startDownloadedExam(exam) {
    window.currentActiveExam = exam;
    $('#show_numExam').text(exam.exam_number);
    $('#show_nameExam').text(exam.exam_name);
    $('#show_nobzaExam').text(exam.exam_info || 'لا توجد نبذة وصفية');

    if (window.examTimerInterval) clearInterval(window.examTimerInterval);
    if (exam.settings && exam.settings.time_test_check === true && exam.settings.time_test) {
        let totalMinutes = parseInt(exam.settings.time_test);
        if (totalMinutes > 0) {
            let timeLeft = totalMinutes * 60;
            $('#navTimeTest').removeClass('Dnone');
            
            window.examTimerInterval = setInterval(() => {
                let mins = Math.floor(timeLeft / 60);
                let secs = timeLeft % 60;
                $('#showTimeHere').text(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
                
                if (timeLeft <= 0) {
                    clearInterval(window.examTimerInterval);
                    Swal.fire('انتهى الوقت المحدد للاختبار!');
                    get_ans_data();
                }
                timeLeft--;
            }, 1000);
        } else {
            $('#navTimeTest').addClass('Dnone');
        }
    } else {
        $('#navTimeTest').addClass('Dnone');
    }

    let zoomBtnHtml = '';
    if (exam.zoom_link && exam.zoom_link.trim() !== '') {
        zoomBtnHtml = `<div style="text-align:center; margin-bottom:20px;">
            <a href="${exam.zoom_link}" target="_blank" class="desine-btn" style="background:#0284c7; text-decoration:none; display:inline-block; padding:12px 30px; font-size:1.05rem;">
                <i class="fas fa-video"></i> الانضمام إلى الحصة الافتراضية (Zoom / Meet)
            </a>
        </div>`;
    }

    var numbers = ['⓵', '⓶', '⓷', '⓸'];
    var qHtml = '';
    if (exam.exam_data && exam.exam_data.questions) {
        let allQuestions = [...exam.exam_data.questions];
        
        if (exam.settings && exam.settings.bank_test_check === true && exam.settings.bank_test) {
            let requiredCount = parseInt(exam.settings.bank_test);
            if (requiredCount > 0 && requiredCount < allQuestions.length) {
                allQuestions.sort(() => Math.random() - 0.5);
                allQuestions = allQuestions.slice(0, requiredCount);
            }
        }

        if (exam.settings && exam.settings.random_ask === true) {
            allQuestions.sort(() => Math.random() - 0.5);
        }

        window.currentActiveExamQuestionsList = allQuestions;

        allQuestions.forEach((q, qIndex) => {
            let optionsList = q.options ? [...q.options] : [];
            
            if (exam.settings && exam.settings.random_answers === true) {
                optionsList.sort(() => Math.random() - 0.5);
            }

            qHtml += `<div class="question_box" data-question-index="${qIndex}" style="background:#fff; padding:20px; margin:15px auto; width:95%; border-radius:12px; border:1.5px solid #e2e8f0; text-align:right;">
                <p style="font-weight:800; color:#1e293b; margin-bottom:5px;">السؤال رقم ${qIndex + 1}</p>
                <div style="width:100%; min-height:45px; padding:12px 14px; border-radius:8px; border:1.5px solid var(--border-color); background-color:#f8fafc; color:#0f172a; font-weight:750; margin-bottom:15px; white-space:pre-wrap; word-break:break-word;">${q.question || ''}</div>`;
            
            if (optionsList.length > 0) {
                optionsList.forEach((opt, oIndex) => {
                    if (opt) {
                        qHtml += `<label style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; padding:10px 14px; margin:8px 0; border-radius:8px; border:1.5px solid #cbd5e1; cursor:pointer; font-weight:750;">
                            <div style="display:flex; align-items:center;">
                                <span style="font-size:1.1rem; margin-left:10px; font-weight:800; color:#4338ca;">${numbers[oIndex] || ''}</span>
                                <span>${opt}</span>
                            </div>
                            <input type="radio" name="q_${qIndex}" value="${opt}" style="width:18px; height:18px; cursor:pointer;">
                        </label>`;
                    }
                });
            } else {
                qHtml += `<input type="text" class="inputMyApp inputAns" placeholder="اكتب إجابتك هنا" style="text-align:right;">`;
            }
            qHtml += `</div>`;
        });
    }

    $('#add_ask_here').html(zoomBtnHtml + qHtml);
    go_page('page_mytest');
}

// ===== دالة مراجعة الاختبار =====
function reviewExam(exam_number) {
    let savedExams = JSON.parse(localStorage.getItem('downloaded_exams') || '[]');
    let exam = savedExams.find(e => e.exam_number == exam_number);
    if (!exam) {
        Swal.fire('الاختبار غير موجود محلياً');
        return;
    }

    let studentSubmissions = JSON.parse(localStorage.getItem('student_submissions') || '{}');
    let myAnswers = studentSubmissions[exam_number];
    if (!myAnswers) {
        Swal.fire('لا توجد إجابات مسجلة لهذا الاختبار للمراجعة');
        return;
    }

    let gradeText = localStorage.getItem('student_grades') ? JSON.parse(localStorage.getItem('student_grades'))[exam_number] : '0 / 0';
    let activeQuestions = exam.exam_data?.questions || [];

    if (typeof openStudentFullReviewAfterSubmit === 'function') {
        openStudentFullReviewAfterSubmit(gradeText, exam_number, myAnswers, activeQuestions);
    } else {
        let numbers = ['⓵', '⓶', '⓷', '⓸'];
        let reviewHtml = `<div style="text-align:right; max-width:700px; margin:20px auto; padding:20px; background:#fff; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="text-align:center; color:var(--primary); margin-top:0;">مراجعة الاختبار</h2>
            <div style="font-size:1.6rem; font-weight:900; color:#16a34a; background:#dcfce7; padding:15px; border-radius:12px; text-align:center; margin:15px 0;">
                درجتك النهائية: ${gradeText}
            </div>
            <p style="text-align:center; color:#64748b; font-size:0.95rem; margin-bottom:20px;">استعراض إجابات الأسئلة السابقة:</p>
            <hr style="margin-bottom:20px;">`;

        activeQuestions.forEach((q, qIndex) => {
            let stdAns = myAnswers['q_' + qIndex] || 'لم يجب';
            let correctAns = (q.options && q.options.length > 0) ? q.options[0] : '';
            let isCorrect = (stdAns === correctAns && stdAns !== 'لم يجب');
            let boxBg = isCorrect ? '#f0fdf4' : '#fef2f2';
            let boxBorder = isCorrect ? '#bbf7d0' : '#fecaca';
            let badgeText = isCorrect ? '<span style="color:#16a34a; font-weight:bold;">إجابتك صحيحة ✓</span>' : '<span style="color:#dc2626; font-weight:bold;">إجابتك خاطئة ✗</span>';

            reviewHtml += `<div style="background:${boxBg}; padding:20px; margin:15px 0; border-radius:12px; border:1.5px solid ${boxBorder};">
                <p style="font-weight:800; color:#1e293b; margin-bottom:5px;">السؤال رقم ${qIndex + 1}</p>
                <div style="width:100%; min-height:45px; padding:12px 14px; border-radius:8px; border:1.5px solid var(--border-color); background-color:#f8fafc; color:#0f172a; font-weight:750; margin-bottom:15px; white-space:pre-wrap; word-break:break-word;">${q.question || ''}</div>`;
            
            if (q.options && q.options.length > 0) {
                q.options.forEach((opt, oIndex) => {
                    if (opt) {
                        let isSelected = (stdAns === opt);
                        let optStyle = isSelected ? 'border-color:#2563eb; background:#eff6ff; font-weight:800;' : 'background:#ffffff;';
                        
                        reviewHtml += `<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; margin:8px 0; border-radius:8px; border:1.5px solid #cbd5e1; ${optStyle}">
                            <div style="display:flex; align-items:center;">
                                <span style="font-size:1.1rem; margin-left:10px; font-weight:800; color:#4338ca;">${numbers[oIndex] || ''}</span>
                                <span>${opt} ${isSelected ? '(اختيارك)' : ''}</span>
                            </div>
                        </div>`;
                    }
                });
            }

            reviewHtml += `<p style="margin:10px 0 0 0; font-size:0.95rem; font-weight:bold;">حالة الإجابة: [ ${badgeText} ]</p>`;
            if (!isCorrect) {
                reviewHtml += `<p style="margin:6px 0 0 0; font-size:0.95rem; color:#16a34a; font-weight:bold;">الإجابة الصحيحة النموذجية: ${correctAns}</p>`;
            }
            reviewHtml += `</div>`;
        });

        reviewHtml += `<br>
            <button class="desine-btn" style="width:100%; background:#0f172a; padding:14px; font-size:1.1rem;" onclick="closeFullReviewAndGoHome()">
                <i class="fas fa-times-circle"></i> إغلاق ومغادرة استعراض الاختبار
            </button>
        </div>`;

        $('.my_pages > div').addClass('Dnone');
        if ($('#page_full_review').length === 0) {
            $('.my_pages').append(`<div id="page_full_review"></div>`);
        }
        $('#page_full_review').html(reviewHtml).removeClass('Dnone');
        window.scrollTo(0, 0);
    }
}

// ===== دالة تحميل الفصول المحفوظة للطالب =====
function loadStudentClassrooms() {
    let joinedClasses = JSON.parse(localStorage.getItem('my_joined_classes') || '[]');
    if (joinedClasses.length === 0) {
        $('#classrooms_loaded_forAdd').html('<tr><td colspan="2">لم تنضم إلى أي فصل دراسي حتى الآن</td></tr>');
        return;
    }

    var html = '';
    joinedClasses.forEach(cls => {
        var classNum = cls.class_code.replace('CLS-', '');
        html += `<tr>
            <td style="font-weight:800; text-align:right; padding-right:15px;">${cls.class_name}</td>
            <td>
                <div style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                    <button class="desine-btn" style="padding:6px 12px; font-size:0.85rem; background:#10b981; margin:0;" onclick="manageSingleClassroom('${cls.class_code}', '${escapeHtml(cls.class_name)}')">
                        <i class="fas fa-door-open"></i> فتح الفصل
                    </button>
                </div>
            </td>
        </tr>`;
    });

    $('#classrooms_loaded_forAdd').html(html);
}

// ==================== الفصول الإلكترونية المتقدمة ====================
function goClassroomsPage() {
    go_page('page_classrooms');
    let isTeacher = localStorage.getItem('loginState') === 'login=OK';
    
    if (isTeacher) {
        $('#teacher_class_creation_box').removeClass('Dnone').show();
        $('#student_class_section').hide();
        loadTeacherClassrooms();
    } else {
        $('#teacher_class_creation_box').addClass('Dnone').hide();
        $('#student_class_section').show();
        loadStudentJoinedClasses();
    }
}

async function createNewClassroom() {
    var className = $('#cls_name').val();
    var teacherEmail = localStorage.getItem('loginEmail');

    if (!className) {
        Swal.fire('الرجاء إدخال اسم الفصل الدراسي');
        return;
    }
    if (!teacherEmail) {
        Swal.fire('الرجاء تسجيل الدخول أولاً');
        return;
    }

    var classCode = 'CLS-' + Math.floor(1000 + Math.random() * 9000);

    $('#load').show();
    let { data, error } = await window._supabase
        .from('classrooms')
        .insert([
            {
                teacher_email: String(teacherEmail),
                class_name: String(className),
                class_code: String(classCode)
            }
        ]);
    $('#load').hide();

    if (error) {
        Swal.fire('خطأ أثناء إنشاء الفصل: ' + error.message);
    } else {
        Swal.fire('تم إنشاء الفصل بنجاح! رمز الانضمام هو: ' + classCode);
        $('#cls_name').val('');
        loadTeacherClassrooms();
    }
}

function getClassNumber(classCode) {
    if (!classCode) return '';
    return classCode.replace('CLS-', '');
}

async function loadTeacherClassrooms() {
    var rawEmail = localStorage.getItem('loginEmail');
    if (!rawEmail) return;
    var teacherEmail = rawEmail.trim().toLowerCase();

    let { data, error } = await window._supabase
        .from('classrooms')
        .select('*')
        .ilike('teacher_email', teacherEmail)
        .order('id', { ascending: false });

    if (error) {
        console.error('Error fetching classrooms:', error);
        $('#classrooms_list_add').html('<tr><td colspan="3">خطأ في جلب الفصول: ' + error.message + '</td></tr>');
        return;
    }

    if (!data || data.length === 0) {
        $('#classrooms_list_add').html('<tr><td colspan="3">لا توجد فصول مضافة حتى الآن</td></tr>');
        return;
    }

    var html = '';
    data.forEach(cls => {
        var classNum = getClassNumber(cls.class_code);
        html += `<tr>
            <td style="font-weight:800; text-align:right; padding-right:15px;">${cls.class_name}</td>
            <td><code style="background:#dbeafe; color:#1e40af; padding:3px 8px; border-radius:4px; font-weight:bold;">${classNum}</code></td>
            <td>
                <div style="display:flex; gap:4px; justify-content:center;">
                    <button class="desine-btn" style="padding:5px 8px; font-size:0.75rem; background:#2563eb; margin:0;" onclick="manageSingleClassroom('${cls.class_code}', '${escapeHtml(cls.class_name)}')"><i class="fas fa-folder-open"></i> إدارة</button>
                    <button class="desine-btn" style="padding:5px 8px; font-size:0.75rem; background:#0284c7; margin:0;" onclick="manageClassroom('${cls.class_code}', '${escapeHtml(cls.class_name)}')"><i class="fas fa-users"></i> الطلاب</button>
                </div>
            </td>
        </tr>`;
    });

    $('#classrooms_list_add').html(html);
}

async function studentJoinClassroom() {
    var stdName = $('#student_join_name').val();
    var clsCode = 'CLS-' + $('#student_join_code').val().trim();

    if (!stdName || !$('#student_join_code').val().trim()) {
        Swal.fire('الرجاء إدخال اسمك ورمز الانضمام للفصل');
        return;
    }

    let { data: clsData, error: clsErr } = await window._supabase
        .from('classrooms')
        .select('*')
        .eq('class_code', clsCode)
        .single();

    if (clsErr || !clsData) {
        Swal.fire('رمز الفصل غير صحيح أو غير موجود.');
        return;
    }

    $('#load').show();
    let { error } = await window._supabase
        .from('classroom_students')
        .insert([
            {
                class_code: clsCode,
                student_name: stdName
            }
        ]);
    $('#load').hide();

    if (error) {
        if (error.code === '23505') {
            Swal.fire('أنت منضم بالفعل إلى هذا الفصل الدراسي.');
        } else {
            Swal.fire('خطأ أثناء الانضمام: ' + error.message);
        }
    } else {
        let joinedClasses = JSON.parse(localStorage.getItem('my_joined_classes') || '[]');
        if (!joinedClasses.some(c => c.class_code === clsCode)) {
            joinedClasses.push({
                class_code: clsCode,
                class_name: clsData.class_name,
                teacher_email: clsData.teacher_email
            });
            localStorage.setItem('my_joined_classes', JSON.stringify(joinedClasses));
        }
        Swal.fire('تم الانضمام إلى الفصل بنجاح: ' + clsData.class_name);
        $('#student_join_code').val('');
        loadStudentJoinedClasses();
        loadStudentClassrooms();
        manageSingleClassroom(clsData.class_code, clsData.class_name);
    }
}

async function loadStudentJoinedClasses() {
    let joinedClasses = JSON.parse(localStorage.getItem('my_joined_classes') || '[]');
    if (joinedClasses.length === 0) {
        $('#classrooms_list_add').html('<tr><td colspan="3">لا توجد فصول منضم إليها حتى الآن</td></tr>');
    } else {
        var html = '';
        joinedClasses.forEach(cls => {
            var classNum = getClassNumber(cls.class_code);
            html += `<tr>
                <td style="font-weight:800; text-align:right; padding-right:15px;">${cls.class_name}</td>
                <td><code style="background:#dbeafe; color:#1e40af; padding:3px 8px; border-radius:4px; font-weight:bold;">${classNum}</code></td>
                <td>
                    <button class="desine-btn" style="padding:5px 12px; font-size:0.8rem; background:#10b981; margin:0;" onclick="manageSingleClassroom('${cls.class_code}', '${escapeHtml(cls.class_name)}')"><i class="fas fa-door-open"></i> فتح الفصل</button>
                </td>
            </tr>`;
        });
        $('#classrooms_list_add').html(html);
    }

    try {
        let { data, error } = await window._supabase
            .from('classrooms')
            .select('*')
            .order('id', { ascending: false });

        if (!error && data && data.length > 0) {
            let currentJoined = JSON.parse(localStorage.getItem('my_joined_classes') || '[]');
            let updated = false;
            data.forEach(cls => {
                if (!currentJoined.some(c => c.class_code === cls.class_code)) {
                    currentJoined.push({
                        class_code: cls.class_code,
                        class_name: cls.class_name,
                        teacher_email: cls.teacher_email
                    });
                    updated = true;
                }
            });
            if (updated) {
                localStorage.setItem('my_joined_classes', JSON.stringify(currentJoined));
                loadStudentJoinedClasses();
                loadStudentClassrooms();
            }
        }
    } catch (e) {
        console.log('غير متصل، نعرض البيانات المحلية فقط');
    }
}

async function manageSingleClassroom(code, name) {
    go_page('page_classroom_single');
    $('#single_cls_title').text('إدارة فصل: ' + name);
    $('#single_cls_code').text(code);
    window.currentManagingClassCode = code;

    let isTeacher = (localStorage.getItem('loginState') === 'login=OK');
    if (isTeacher) {
        $('#teacher_add_exam_to_cls_box').show();
        $('#teacher_add_content_box').show();
        $('#students_section_container').show();
    } else {
        $('#teacher_add_exam_to_cls_box').hide();
        $('#teacher_add_content_box').hide();
        $('#students_section_container').hide();
    }

    loadLocalClassroomData(code);
    loadSingleClassroomExams(code);
    loadSingleClassroomContents(code);
    loadSingleClassroomStudents(code);
}

function loadLocalClassroomData(code) {
    let localExams = JSON.parse(localStorage.getItem('my_class_exams_' + code) || '[]');
    if (localExams.length > 0) {
        let html = '<ul style="list-style:none; padding:0; text-align:right; display:flex; flex-direction:column; gap:12px;">';
        localExams.forEach(ex => {
            html += `<li style="background:#ffffff; border:1.5px solid #e2e8f0; padding:0; margin:0; border-radius:14px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                <div style="padding:16px 18px 12px 18px; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-bottom:1px solid #e2e8f0;">
                    <h5 style="margin:0 0 10px 0; color:#1e293b; font-size:1rem; font-weight:800; text-align:right;">
                        <i class="fas fa-file-alt" style="color:#3b82f6; margin-left:8px;"></i>${ex.exam_name}
                    </h5>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span style="color:#64748b; font-size:0.8rem; font-weight:600;">رقم الاختبار:</span>
                        <code style="background:#dbeafe; color:#1e40af; padding:4px 12px; border-radius:6px; font-size:0.85rem; font-weight:800;">${ex.exam_number}</code>
                    </div>
                </div>
                <div style="padding:14px 18px; background:#ffffff; display:flex; justify-content:flex-end;">
                    <button class="desine-btn" style="padding:12px 24px; font-size:0.9rem; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); margin:0; border-radius:10px; min-width:140px; font-weight:800; border:none; box-shadow:0 4px 12px rgba(37,99,235,0.3); color:#fff; cursor:pointer;" onclick="searchAndStartExamByNum(${ex.exam_number})">
                        <i class="fas fa-play-circle" style="margin-left:6px;"></i> فتح الاختبار
                    </button>
                </div>
            </li>`;
        });
        html += '</ul>';
        $('#single_cls_exams_container').html(html);
    } else {
        $('#single_cls_exams_container').html('<p style="color:#64748b;">جاري تحميل الاختبارات...</p>');
    }

    let localContents = JSON.parse(localStorage.getItem('my_class_contents_' + code) || '[]');
    if (localContents.length > 0) {
        let html = '<div style="display:flex; flex-direction:column; gap:16px;">';
        localContents.forEach(item => {
            let badgeColor = '#4338ca';
            let badgeName = '📢 إعلان وشرح';
            let icon = 'fa-bullhorn';
            if (item.content_type === 'homework') {
                badgeColor = '#dc2626';
                badgeName = '📝 واجب دراسي';
                icon = 'fa-tasks';
            } else if (item.content_type === 'link') {
                badgeColor = '#0284c7';
                badgeName = '🔗 رابط خارجي';
                icon = 'fa-link';
            }
            html += `
                <div style="background:#ffffff; border-radius:14px; border:1.5px solid #e2e8f0; overflow:hidden;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:linear-gradient(135deg, ${badgeColor}15 0%, ${badgeColor}08 100%); border-bottom:1px solid #e2e8f0;">
                        <span style="background:${badgeColor}; color:#fff; padding:4px 14px; border-radius:20px; font-size:0.75rem; font-weight:800;">
                            <i class="fas ${icon}"></i> ${badgeName}
                        </span>
                    </div>
                    <div style="padding:16px 20px 20px 20px;">
                        <h5 style="margin:0 0 6px 0; color:#1e293b; font-size:1.05rem; font-weight:800; text-align:right;">${item.title}</h5>
                        <p style="margin:8px 0 0 0; white-space:pre-wrap; color:#334155; font-weight:600; line-height:1.8;">${item.body}</p>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        $('#single_cls_content_container').html(html);
    } else {
        $('#single_cls_content_container').html('<p style="color:#64748b;">جاري تحميل المحتويات...</p>');
    }
}

async function loadSingleClassroomExams(code) {
    try {
        let { data, error } = await window._supabase
            .from('classroom_exams')
            .select('*')
            .eq('class_code', code);

        if (!error && data && data.length > 0) {
            localStorage.setItem('my_class_exams_' + code, JSON.stringify(data));
            let html = '<ul style="list-style:none; padding:0; text-align:right; display:flex; flex-direction:column; gap:12px;">';
            data.forEach(ex => {
                html += `<li style="background:#ffffff; border:1.5px solid #e2e8f0; padding:0; margin:0; border-radius:14px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <div style="padding:16px 18px 12px 18px; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-bottom:1px solid #e2e8f0;">
                        <h5 style="margin:0 0 10px 0; color:#1e293b; font-size:1rem; font-weight:800; text-align:right;">
                            <i class="fas fa-file-alt" style="color:#3b82f6; margin-left:8px;"></i>${ex.exam_name}
                        </h5>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="color:#64748b; font-size:0.8rem; font-weight:600;">رقم الاختبار:</span>
                            <code style="background:#dbeafe; color:#1e40af; padding:4px 12px; border-radius:6px; font-size:0.85rem; font-weight:800;">${ex.exam_number}</code>
                        </div>
                    </div>
                    <div style="padding:14px 18px; background:#ffffff; display:flex; justify-content:flex-end;">
                        <button class="desine-btn" style="padding:12px 24px; font-size:0.9rem; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); margin:0; border-radius:10px; min-width:140px; font-weight:800; border:none; box-shadow:0 4px 12px rgba(37,99,235,0.3); color:#fff; cursor:pointer;" onclick="searchAndStartExamByNum(${ex.exam_number})">
                            <i class="fas fa-play-circle" style="margin-left:6px;"></i> فتح الاختبار
                        </button>
                    </div>
                </li>`;
            });
            html += '</ul>';
            $('#single_cls_exams_container').html(html);
        } else {
            let localExams = JSON.parse(localStorage.getItem('my_class_exams_' + code) || '[]');
            if (localExams.length === 0) {
                $('#single_cls_exams_container').html('<p style="color:#64748b;">لا توجد اختبارات مرتبطة بهذا الفصل.</p>');
            }
        }
    } catch (e) {
        let localExams = JSON.parse(localStorage.getItem('my_class_exams_' + code) || '[]');
        if (localExams.length === 0) {
            $('#single_cls_exams_container').html('<p style="color:#64748b;">لا توجد اختبارات متاحة حالياً (غير متصل).</p>');
        }
    }
}

async function publishExamToSingleClass() {
    let examNum = $('#single_link_exam_num').val();
    let code = window.currentManagingClassCode;

    if (!examNum) {
        Swal.fire('الرجاء إدخال رقم الاختبار');
        return;
    }

    let { data: examData, error: examErr } = await window._supabase
        .from('exams')
        .select('*')
        .eq('exam_number', Number(examNum))
        .single();

    if (examErr || !examData) {
        Swal.fire('رقم الاختبار غير موجود في السحابة.');
        return;
    }

    let { error } = await window._supabase
        .from('classroom_exams')
        .insert([
            {
                class_code: code,
                exam_number: Number(examNum),
                exam_name: String(examData.exam_name)
            }
        ]);

    if (error) {
        if (error.code === '23505') {
            Swal.fire('هذا الاختبار منشور مسبقاً في هذا الفصل.');
        } else {
            Swal.fire('خطأ أثناء ربط الاختبار: ' + error.message);
        }
    } else {
        Swal.fire('تم نشر الاختبار في الفصل بنجاح!');
        $('#single_link_exam_num').val('');
        loadSingleClassroomExams(code);
    }
}

async function removeExamFromClass(relId, code) {
    const result = await Swal.fire({
        title: 'تأكيد الإزالة',
        text: 'هل تريد إزالة هذا الاختبار من الفصل؟',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، أزل',
        cancelButtonText: 'إلغاء'
    });
    if (!result.isConfirmed) return;
    let { error } = await window._supabase.from('classroom_exams').delete().eq('id', relId);
    if (!error) {
        let localExams = JSON.parse(localStorage.getItem('my_class_exams_' + code) || '[]');
        localExams = localExams.filter(e => e.id !== relId);
        localStorage.setItem('my_class_exams_' + code, JSON.stringify(localExams));
        loadSingleClassroomExams(code);
    }
}

async function loadSingleClassroomContents(code) {
    try {
        let { data } = await window._supabase
            .from('classroom_contents')
            .select('*')
            .eq('class_code', code)
            .order('id', { ascending: false });

        if (data && data.length > 0) {
            localStorage.setItem('my_class_contents_' + code, JSON.stringify(data));
            renderContents(data);
        } else {
            let localContents = JSON.parse(localStorage.getItem('my_class_contents_' + code) || '[]');
            if (localContents.length === 0) {
                $('#single_cls_content_container').html('<p style="color:#64748b; text-align:center; padding:20px; background:#f8fafc; border-radius:10px; border:1px dashed #cbd5e1;">لا توجد محتويات أو إعلانات منشورة بعد.</p>');
            } else {
                renderContents(localContents);
            }
        }
    } catch (e) {
        let localContents = JSON.parse(localStorage.getItem('my_class_contents_' + code) || '[]');
        if (localContents.length > 0) {
            renderContents(localContents);
        } else {
            $('#single_cls_content_container').html('<p style="color:#64748b; text-align:center; padding:20px;">غير متصل ولا توجد محتويات محفوظة.</p>');
        }
    }
}

function renderContents(data) {
    let html = '<div style="display:flex; flex-direction:column; gap:16px;">';
    data.forEach(item => {
        let badgeColor = item.content_type === 'homework' ? '#dc2626' : item.content_type === 'link' ? '#0284c7' : '#4338ca';
        let badgeName = item.content_type === 'homework' ? '📝 واجب دراسي' : item.content_type === 'link' ? '🔗 رابط خارجي' : '📢 إعلان وشرح';
        let icon = item.content_type === 'homework' ? 'fa-tasks' : item.content_type === 'link' ? 'fa-link' : 'fa-bullhorn';

        let bodyContent = '';
        if (item.body && (item.body.startsWith('http://') || item.body.startsWith('https://'))) {
            bodyContent = `
                <div style="margin-top:12px; text-align:center;">
                    <a href="${item.body}" target="_blank" class="desine-btn" style="background:#0284c7; display:inline-block; padding:10px 35px; text-decoration:none; border-radius:10px; font-weight:800; font-size:0.95rem; box-shadow:0 4px 12px rgba(2,132,199,0.3);">
                        <i class="fas fa-external-link-alt"></i>  فتح في المتصفح
                    </a>
                </div>
            `;
        } else {
            bodyContent = `<p style="margin:8px 0 0 0; white-space:pre-wrap; color:#334155; font-weight:600; line-height:1.8; font-size:0.95rem;">${item.body}</p>`;
        }

        html += `
            <div style="background:#ffffff; border-radius:14px; border:1.5px solid #e2e8f0; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:linear-gradient(135deg, ${badgeColor}15 0%, ${badgeColor}08 100%); border-bottom:1px solid #e2e8f0;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="background:${badgeColor}; color:#fff; padding:4px 14px; border-radius:20px; font-size:0.75rem; font-weight:800; letter-spacing:0.3px;">
                            <i class="fas ${icon}"></i> ${badgeName}
                        </span>
                    </div>
                </div>
                <div style="padding:16px 20px 20px 20px;">
                    <h5 style="margin:0 0 6px 0; color:#1e293b; font-size:1.05rem; font-weight:800; text-align:right;">
                        <i class="fas fa-tag" style="color:#64748b; margin-left:8px; font-size:0.85rem;"></i>
                        ${item.title}
                    </h5>
                    ${bodyContent}
                </div>
            </div>
        `;
    });
    html += '</div>';
    $('#single_cls_content_container').html(html);
}

async function publishContentToClass() {
    let title = $('#cls_content_title').val();
    let body = $('#cls_content_body').val();
    let code = window.currentManagingClassCode;

    if (!title || !body) {
        Swal.fire('الرجاء إدخال عنوان ومحتوى الإعلان أو الواجب');
        return;
    }

    let { error } = await window._supabase
        .from('classroom_contents')
        .insert([{ class_code: code, title: title, body: body }]);

    if (error) {
        Swal.fire('خطأ أثناء النشر: ' + error.message);
    } else {
        Swal.fire('تم نشر المحتوى بنجاح لجميع طلاب الفصل!');
        $('#cls_content_title').val('');
        $('#cls_content_body').val('');
        loadSingleClassroomContents(code);
    }
}

// ===== دالة تحميل الطلاب (معدلة لإخفاء الأسماء عن المعلمين غير المنشئين) =====
async function loadSingleClassroomStudents(code) {
    // 1. التحقق من أن المستخدم معلم
    let isTeacher = (localStorage.getItem('loginState') === 'login=OK');
    if (!isTeacher) {
        $('#single_cls_students_list').html('<p style="color:#64748b; margin:0; text-align:center;">🚫 هذا القسم متاح للمعلمين فقط.</p>');
        return;
    }

    // 2. جلب بيانات الفصل للحصول على teacher_email
    let currentTeacherEmail = localStorage.getItem('loginEmail');
    if (!currentTeacherEmail) {
        $('#single_cls_students_list').html('<p style="color:#64748b; margin:0;">يرجى تسجيل الدخول أولاً.</p>');
        return;
    }

    try {
        let { data: clsData, error: clsError } = await window._supabase
            .from('classrooms')
            .select('teacher_email')
            .eq('class_code', code)
            .single();

        if (clsError || !clsData) {
            $('#single_cls_students_list').html('<p style="color:#64748b; margin:0;">تعذر التحقق من صلاحيات الفصل.</p>');
            return;
        }

        // 3. مقارنة البريد الإلكتروني للمعلم مع بريد منشئ الفصل
        if (clsData.teacher_email.toLowerCase() !== currentTeacherEmail.toLowerCase()) {
            $('#single_cls_students_list').html('<p style="color:#dc2626; margin:0; text-align:center;">🔒 هذا الفصل ليس من إنشائك، لا يمكنك رؤية قائمة الطلاب.</p>');
            return;
        }

        // 4. إذا كان المعلم هو المنشئ، قم بجلب الطلاب وعرضهم
        let { data: studentsData, error: studentsError } = await window._supabase
            .from('classroom_students')
            .select('*')
            .eq('class_code', code);

        if (studentsError) {
            $('#single_cls_students_list').html('<p style="color:#64748b; margin:0;">حدث خطأ أثناء جلب الطلاب.</p>');
            return;
        }

        if (!studentsData || studentsData.length === 0) {
            $('#single_cls_students_list').html('<p style="color:#64748b; margin:0;">لا يوجد طلاب منضمين حتى الآن.</p>');
        } else {
            let html = '<ul style="margin:0; padding-right:20px; text-align:right;">';
            studentsData.forEach((s, idx) => {
                html += `<li><b>${idx + 1}. ${s.student_name}</b></li>`;
            });
            html += '</ul>';
            $('#single_cls_students_list').html(html);
        }
    } catch (e) {
        $('#single_cls_students_list').html('<p style="color:#64748b; margin:0;">لا يمكن تحميل الطلاب حالياً (غير متصل).</p>');
    }
}

async function searchAndStartExamByNum(examNum) {
    $('#load').show();
    let { data, error } = await window._supabase
        .from('exams')
        .select('*')
        .eq('exam_number', Number(examNum))
        .single();
    $('#load').hide();

    if (error || !data) {
        Swal.fire('تعذر فتح الاختبار');
        return;
    }

    window.currentLoadedExam = data;
    downloadExam_new();
}

async function deleteClassroom(clsId) {
    const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: 'هل أنت متأكد من حذف هذا الفصل الدراسي؟',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });
    if (!result.isConfirmed) return;

    let { error } = await window._supabase
        .from('classrooms')
        .delete()
        .eq('id', clsId);

    if (error) {
        Swal.fire('خطأ أثناء الحذف: ' + error.message);
    } else {
        Swal.fire('تم حذف الفصل بنجاح');
        loadTeacherClassrooms();
    }
}

function teacherLogout() {
    Swal.fire({
        title: 'تسجيل الخروج',
        text: 'هل أنت متأكد من رغبتك في تسجيل الخروج من وضع المعلم؟',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، سجل خروج',
        cancelButtonText: 'إلغاء'
    }).then(result => {
        if (result.isConfirmed) {
            localStorage.removeItem('loginState');
            localStorage.removeItem('loginEmail');
            localStorage.removeItem('teacher_pass_hash');
            window.loginState = '';
            window.loginEmail = '';
            $('#loginEmail').text('');
            $('#logout_btn').hide();
            Swal.fire('تم تسجيل الخروج بنجاح.');
            go_page('page_home');
        }
    });
}

$(document).ready(function() {
    readAll_ans_saveded_new();
    loadStudentClassrooms();
    if (localStorage.getItem('loginState') === 'login=OK') {
        window.loginState = 'login=OK';
        window.loginEmail = localStorage.getItem('loginEmail');
        $('#loginEmail').text('مرحباً بك: ' + window.loginEmail);
        $('#logout_btn').show();
        readAll_exam_saveded_new();
    } else {
        $('#logout_btn').hide();
        readAll_student_exams_sync([]);
    }
});
