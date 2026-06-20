/* ==========================================================================
   ATTEND - 스마트 학원 출석부 Logic
   ========================================================================== */

// Default SMS templates
const DEFAULT_SMS_TEMPLATES = {
    unchecked: "[학원 알림] {이름} 학생이 아직 등원하지 않았습니다. 확인 부탁드립니다.",
    absent: "[학원 알림] {이름} 학생이 금일 결석하였습니다. 사유가 있으신 경우 연락 부탁드립니다.",
    tardy: "[학원 알림] {이름} 학생이 {시간}에 지각하여 등원하였습니다. 지각 사유 확인 바랍니다."
};

// Application State
let state = {
    students: [],
    attendance: {}, // Date-keyed: { 'YYYY-MM-DD': { studentId: { status: 'unchecked', time: 'HH:MM' } } }
    smsTemplates: { ...DEFAULT_SMS_TEMPLATES },
    activeFilters: {
        day: [],
        school: [],
        grade: [],
        schoolGrade: []
    },
    selectedDate: '',
    searchQuery: '',
    selectedSmsTab: 'unchecked',
    selectedSmsRecipients: []
};

// Global click tracker for multi-clicks (1, 2, 3 taps)
let clickTracker = {};

// DOM Elements
const elements = {
    datePicker: document.getElementById('date-picker'),
    dateText: document.getElementById('date-text'),
    prevDateBtn: document.getElementById('prev-date-btn'),
    nextDateBtn: document.getElementById('next-date-btn'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statAttended: document.getElementById('stat-attended'),
    statAbsent: document.getElementById('stat-absent'),
    statTardy: document.getElementById('stat-tardy'),
    statUnchecked: document.getElementById('stat-unchecked'),
    statsPercentage: document.getElementById('stats-percentage'),
    statsProgressCircle: document.getElementById('stats-progress-circle'),
    
    // Actions
    excelFileInput: document.getElementById('excel-file-input'),
    downloadTemplateBtn: document.getElementById('download-template-btn'),
    pdfExportBtn: document.getElementById('pdf-export-btn'),
    smsOpenBtn: document.getElementById('sms-open-btn'),
    smsBadge: document.getElementById('sms-badge'),
    
    // Filters
    filterSchools: document.getElementById('filter-schools'),
    filterGrades: document.getElementById('filter-grades'),
    filterSchoolGrades: document.getElementById('filter-school-grades'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    
    // Search
    searchInput: document.getElementById('search-input'),
    filteredCount: document.getElementById('filtered-count'),
    
    // Grid & Empty States
    emptyStateCard: document.getElementById('empty-state-card'),
    dragDropZone: document.getElementById('drag-drop-zone'),
    loadSampleDataBtn: document.getElementById('load-sample-data-btn'),
    studentGrid: document.getElementById('student-grid'),
    
    // Student Profile Modal
    profileModal: document.getElementById('profile-modal'),
    profileModalClose: document.getElementById('profile-modal-close'),
    profileModalImg: document.getElementById('profile-modal-img'),
    profileModalPlaceholder: document.getElementById('profile-modal-avatar-placeholder'),
    profileModalName: document.getElementById('profile-modal-name'),
    profileModalSchool: document.getElementById('profile-modal-school'),
    profileModalGrade: document.getElementById('profile-modal-grade'),
    profileModalStudentPhone: document.getElementById('profile-modal-student-phone'),
    profileModalStudentCall: document.getElementById('profile-modal-student-call'),
    profileModalParentPhone: document.getElementById('profile-modal-parent-phone'),
    profileModalParentCall: document.getElementById('profile-modal-parent-call'),
    profileModalDays: document.getElementById('profile-modal-days'),
    profileAttendanceHistory: document.getElementById('profile-attendance-history'),
    studentImgUpload: document.getElementById('student-img-upload'),
    
    // SMS Modal
    smsModal: document.getElementById('sms-modal'),
    smsModalClose: document.getElementById('sms-modal-close'),
    smsTemplateTextarea: document.getElementById('sms-template-textarea'),
    smsRecipientList: document.getElementById('sms-recipient-list'),
    smsSelectedCount: document.getElementById('sms-selected-count'),
    smsSelectAllBtn: document.getElementById('sms-select-all-btn'),
    smsSendNativeBtn: document.getElementById('sms-send-native-btn'),
    smsCopyAllBtn: document.getElementById('sms-copy-all-btn'),
    saveTemplateBtn: document.getElementById('save-template-btn'),
    
    // Tab badge counters inside SMS modal
    smsTabCountUnchecked: document.getElementById('sms-tab-count-unchecked'),
    smsTabCountAbsent: document.getElementById('sms-tab-count-absent'),
    smsTabCountTardy: document.getElementById('sms-tab-count-tardy')
};

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    initDate();
    loadLocalStorage();
    setupEventListeners();
    updateUI();
});

// Setup Date Manager
function initDate() {
    const today = new Date();
    const formatted = today.toISOString().split('T')[0];
    elements.datePicker.value = formatted;
    state.selectedDate = formatted;
    updateDateDisplay();
}

function updateDateDisplay() {
    const date = new Date(state.selectedDate);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = weekdays[date.getDay()];
    
    elements.dateText.textContent = `${year}. ${month}. ${day} (${weekday})`;
    
    // Check if weekend or specific day, pre-select that weekday filter to make it convenient
    // If no active day filters are set, we will NOT force it, but let's pre-filter the weekday if empty list
    const activeDays = state.activeFilters.day;
    if (state.students.length > 0 && activeDays.length === 0) {
        // Find corresponding day block button and toggle it
        const currentKoreanDay = weekdays[date.getDay()];
        const dayBtn = document.querySelector(`.filter-block[data-filter="day"][data-value="${currentKoreanDay}"]`);
        if (dayBtn) {
            dayBtn.classList.add('active');
            state.activeFilters.day.push(currentKoreanDay);
        }
    }
}

// LocalStorage Persistence
function loadLocalStorage() {
    const savedStudents = localStorage.getItem('attend_students');
    const savedAttendance = localStorage.getItem('attend_attendance');
    const savedTemplates = localStorage.getItem('attend_sms_templates');
    
    if (savedStudents) {
        state.students = JSON.parse(savedStudents);
    }
    if (savedAttendance) {
        state.attendance = JSON.parse(savedAttendance);
    }
    if (savedTemplates) {
        state.smsTemplates = JSON.parse(savedTemplates);
    }
}

function saveLocalStorage() {
    localStorage.setItem('attend_students', JSON.stringify(state.students));
    localStorage.setItem('attend_attendance', JSON.stringify(state.attendance));
    localStorage.setItem('attend_sms_templates', JSON.stringify(state.smsTemplates));
}

// Event Listeners Setup
function setupEventListeners() {
    // Date navigation
    elements.datePicker.addEventListener('change', (e) => {
        state.selectedDate = e.target.value;
        updateDateDisplay();
        updateUI();
    });
    
    elements.prevDateBtn.addEventListener('click', () => adjustDate(-1));
    elements.nextDateBtn.addEventListener('click', () => adjustDate(1));
    
    // Drag & Drop
    const dropZone = elements.dragDropZone;
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleExcelFile(e.dataTransfer.files[0]);
        }
    });
    
    // File inputs
    elements.excelFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleExcelFile(e.target.files[0]);
        }
    });
    
    elements.downloadTemplateBtn.addEventListener('click', downloadExcelTemplate);
    elements.loadSampleDataBtn.addEventListener('click', loadSampleData);
    
    // Search
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        renderStudentGrid();
    });
    
    // Filter Blocks
    document.querySelectorAll('.filter-block[data-filter="day"]').forEach(btn => {
        btn.addEventListener('click', () => toggleFilter('day', btn.dataset.value, btn));
    });
    
    elements.clearFiltersBtn.addEventListener('click', clearAllFilters);
    
    // Modals
    elements.profileModalClose.addEventListener('click', () => elements.profileModal.style.display = 'none');
    elements.smsModalClose.addEventListener('click', () => elements.smsModal.style.display = 'none');
    
    elements.smsOpenBtn.addEventListener('click', openSmsModal);
    
    // SMS Tabs
    document.querySelectorAll('.sms-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.sms-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.selectedSmsTab = tab.dataset.tab;
            updateSmsModalContent();
        });
    });
    
    elements.smsTemplateTextarea.addEventListener('input', (e) => {
        state.smsTemplates[state.selectedSmsTab] = e.target.value;
        saveLocalStorage();
        updateSmsModalContent(false); // Update preview only, don't rebuild list
    });
    
    elements.saveTemplateBtn.addEventListener('click', () => {
        state.smsTemplates[state.selectedSmsTab] = DEFAULT_SMS_TEMPLATES[state.selectedSmsTab];
        elements.smsTemplateTextarea.value = state.smsTemplates[state.selectedSmsTab];
        saveLocalStorage();
        updateSmsModalContent(false);
    });
    
    elements.smsSelectAllBtn.addEventListener('click', toggleSmsSelectAll);
    elements.smsSendNativeBtn.addEventListener('click', sendBulkSmsNative);
    elements.smsCopyAllBtn.addEventListener('click', copyBulkSmsToClipboard);
    
    // Profile Modal Image Edit
    elements.studentImgUpload.addEventListener('change', handleStudentPhotoUpload);
    
    // PDF Export
    elements.pdfExportBtn.addEventListener('click', exportToPDF);
}

// Adjust selected date by days
function adjustDate(days) {
    const current = new Date(state.selectedDate);
    current.setDate(current.getDate() + days);
    const formatted = current.toISOString().split('T')[0];
    elements.datePicker.value = formatted;
    state.selectedDate = formatted;
    updateDateDisplay();
    updateUI();
}

// Handle Excel Import
function handleExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            
            if (json.length === 0) {
                alert('엑셀 파일에 데이터가 없습니다.');
                return;
            }
            
            // Map JSON keys to student object properties
            const mappedStudents = json.map((row, index) => {
                // Find headers dynamically
                const nameKey = Object.keys(row).find(k => k.includes('이름') || k.includes('성명') || k.toLowerCase().includes('name'));
                const schoolKey = Object.keys(row).find(k => k.includes('학교') || k.toLowerCase().includes('school'));
                const gradeKey = Object.keys(row).find(k => k.includes('학년') || k.toLowerCase().includes('grade'));
                const studentPhoneKey = Object.keys(row).find(k => k.includes('학생') || k.includes('개인') || k.includes('본인') || k.includes('휴대폰') || k.includes('연락처'));
                const parentPhoneKey = Object.keys(row).find(k => k.includes('부모') || k.includes('학부모') || k.includes('엄마') || k.includes('아빠') || k.includes('보호자'));
                const daysKey = Object.keys(row).find(k => k.includes('요일') || k.toLowerCase().includes('day'));
                
                // Parse days
                let days = [];
                if (daysKey && row[daysKey]) {
                    const daysVal = String(row[daysKey]);
                    days = daysVal.split(/[\s,·\/\+]+/).map(d => d.trim().replace('요일', '')).filter(d => ['월','화','수','목','금','토','일'].includes(d));
                }
                
                return {
                    id: 'std_' + Date.now() + '_' + index,
                    name: nameKey ? String(row[nameKey]).trim() : '이름없음',
                    school: schoolKey ? String(row[schoolKey]).trim() : '미정',
                    grade: gradeKey ? String(row[gradeKey]).trim() : '미정',
                    phone: studentPhoneKey ? formatPhoneNumber(String(row[studentPhoneKey])) : '',
                    parentPhone: parentPhoneKey ? formatPhoneNumber(String(row[parentPhoneKey])) : '',
                    days: days.length > 0 ? days : ['월', '화', '수', '목', '금'], // Default to weekdays
                    photo: null // Will be uploaded inside the app
                };
            });
            
            state.students = mappedStudents;
            saveLocalStorage();
            alert(`${mappedStudents.length}명의 학생 등록 완료!`);
            
            // Clear current filters except current day to refresh the view
            const activeDay = state.activeFilters.day;
            state.activeFilters = { day: activeDay, school: [], grade: [], schoolGrade: [] };
            
            updateUI();
        } catch (error) {
            console.error(error);
            alert('엑셀 파일을 읽는 중 오류가 발생했습니다. 올바른 형식인지 확인하세요.');
        }
    };
    reader.readAsBinaryString(file);
}

// Generate & Download Excel Template
function downloadExcelTemplate() {
    const ws_data = [
        ["이름", "학교", "학년", "학생연락처", "학부모연락처", "수강요일"],
        ["홍길동", "대치중학교", "2학년", "010-1234-5678", "010-9876-5432", "월, 수, 금"],
        ["이영희", "은마초등학교", "6학년", "010-8888-8888", "010-9999-9999", "화, 목"],
        ["김철수", "휘문고등학교", "1학년", "010-1111-2222", "010-3333-3333", "월, 화, 수, 목, 금"]
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Set column widths
    const wscols = [
        { wch: 10 }, // 이름
        { wch: 18 }, // 학교
        { wch: 10 }, // 학년
        { wch: 16 }, // 학생연락처
        { wch: 16 }, // 학부모연락처
        { wch: 15 }  // 수강요일
    ];
    ws['!cols'] = wscols;
    
    XLSX.utils.book_append_sheet(wb, ws, "학원생출석표");
    XLSX.writeFile(wb, "attend_template.xlsx");
}

// Load Mock Sample Data for testing
function loadSampleData() {
    state.students = [
        { id: 'std_1', name: '김태희', school: '서초중', grade: '3학년', phone: '010-1234-5678', parentPhone: '010-9876-5432', days: ['월', '수', '금'], photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150' },
        { id: 'std_2', name: '이민호', school: '강남초', grade: '6학년', phone: '010-2345-6789', parentPhone: '010-8765-4321', days: ['화', '목'], photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150' },
        { id: 'std_3', name: '박신혜', school: '역삼고', grade: '1학년', phone: '010-3456-7890', parentPhone: '010-7654-3210', days: ['월', '수', '금'], photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150' },
        { id: 'std_4', name: '송중기', school: '서초중', grade: '2학년', phone: '010-4567-8901', parentPhone: '010-6543-2109', days: ['월', '화', '목'], photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150' },
        { id: 'std_5', name: '송혜교', school: '역삼고', grade: '2학년', phone: '010-5678-9012', parentPhone: '010-5432-1098', days: ['수', '금', '토'], photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150' },
        { id: 'std_6', name: '정우성', school: '대치중', grade: '3학년', phone: '010-6789-0123', parentPhone: '010-4321-0987', days: ['화', '목', '토'], photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150&h=150' },
        { id: 'std_7', name: '김수현', school: '대치중', grade: '2학년', phone: '010-7890-1234', parentPhone: '010-3210-9876', days: ['월', '화', '수', '목', '금'], photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150&h=150' },
        { id: 'std_8', name: '전지현', school: '서초중', grade: '1학년', phone: '010-8901-2345', parentPhone: '010-2109-8765', days: ['토', '일'], photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150' }
    ];
    
    // Clear and reset day to match current selected date's day of week
    const date = new Date(state.selectedDate);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const currentKoreanDay = weekdays[date.getDay()];
    
    state.activeFilters = {
        day: [currentKoreanDay],
        school: [],
        grade: [],
        schoolGrade: []
    };
    
    // Re-active buttons
    document.querySelectorAll('.filter-block[data-filter="day"]').forEach(btn => {
        if (btn.dataset.value === currentKoreanDay) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    saveLocalStorage();
    updateUI();
}

// Format Phone Number
function formatPhoneNumber(str) {
    const cleaned = ('' + str).replace(/\D/g, '');
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    return str;
}

// Filter Manager
function toggleFilter(type, value, element) {
    const list = state.activeFilters[type];
    const index = list.indexOf(value);
    
    if (index > -1) {
        list.splice(index, 1);
        if (element) element.classList.remove('active');
    } else {
        list.push(value);
        if (element) element.classList.add('active');
    }
    
    renderStudentGrid();
}

function clearAllFilters() {
    state.activeFilters = {
        day: [],
        school: [],
        grade: [],
        schoolGrade: []
    };
    
    document.querySelectorAll('.filter-block').forEach(btn => btn.classList.remove('active'));
    renderStudentGrid();
}

function populateFilterBlocks() {
    // Collect unique schools & grades
    const schools = [...new Set(state.students.map(s => s.school))].filter(Boolean).sort();
    const grades = [...new Set(state.students.map(s => s.grade))].filter(Boolean).sort();
    
    // Collect unique school + grade combos
    const schoolGrades = [...new Set(state.students.map(s => {
        if (s.school && s.grade) return `${s.school} ${s.grade}`;
        return null;
    }))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko'));
    
    // Populate schools
    if (schools.length > 0) {
        elements.filterSchools.innerHTML = schools.map(school => {
            const activeClass = state.activeFilters.school.includes(school) ? 'active' : '';
            return `<button class="filter-block ${activeClass}" data-filter="school" data-value="${school}">${school}</button>`;
        }).join('');
        
        elements.filterSchools.querySelectorAll('.filter-block').forEach(btn => {
            btn.addEventListener('click', () => toggleFilter('school', btn.dataset.value, btn));
        });
    } else {
        elements.filterSchools.innerHTML = `<div class="no-filter-data">학교 정보가 없습니다.</div>`;
    }
    
    // Populate grades
    if (grades.length > 0) {
        elements.filterGrades.innerHTML = grades.map(grade => {
            const activeClass = state.activeFilters.grade.includes(grade) ? 'active' : '';
            return `<button class="filter-block ${activeClass}" data-filter="grade" data-value="${grade}">${grade}</button>`;
        }).join('');
        
        elements.filterGrades.querySelectorAll('.filter-block').forEach(btn => {
            btn.addEventListener('click', () => toggleFilter('grade', btn.dataset.value, btn));
        });
    } else {
        elements.filterGrades.innerHTML = `<div class="no-filter-data">학년 정보가 없습니다.</div>`;
    }
    
    // Populate school-grade combos
    if (schoolGrades.length > 0) {
        elements.filterSchoolGrades.innerHTML = schoolGrades.map(sg => {
            const activeClass = state.activeFilters.schoolGrade.includes(sg) ? 'active' : '';
            return `<button class="filter-block ${activeClass}" data-filter="schoolGrade" data-value="${sg}">${sg}</button>`;
        }).join('');
        
        elements.filterSchoolGrades.querySelectorAll('.filter-block').forEach(btn => {
            btn.addEventListener('click', () => toggleFilter('schoolGrade', btn.dataset.value, btn));
        });
    } else {
        elements.filterSchoolGrades.innerHTML = `<div class="no-filter-data">학교 및 학년 정보가 부족합니다.</div>`;
    }
}

// Core UI Updating
function updateUI() {
    if (state.students.length === 0) {
        elements.emptyStateCard.style.display = 'flex';
        elements.studentGrid.style.display = 'none';
        elements.clearFiltersBtn.style.visibility = 'hidden';
    } else {
        elements.emptyStateCard.style.display = 'none';
        elements.studentGrid.style.display = 'grid';
        elements.clearFiltersBtn.style.visibility = 'visible';
    }
    
    populateFilterBlocks();
    renderStudentGrid();
}

// Filter and search students list
function getFilteredStudents() {
    const filtered = state.students.filter(student => {
        // Search filter
        if (state.searchQuery && !student.name.toLowerCase().includes(state.searchQuery)) {
            return false;
        }
        
        // Day filter (student's days must contain at least one of the active day filters)
        if (state.activeFilters.day.length > 0) {
            const matchesDay = student.days.some(d => state.activeFilters.day.includes(d));
            if (!matchesDay) return false;
        }
        
        // School filter
        if (state.activeFilters.school.length > 0 && !state.activeFilters.school.includes(student.school)) {
            return false;
        }
        
        // Grade filter
        if (state.activeFilters.grade.length > 0 && !state.activeFilters.grade.includes(student.grade)) {
            return false;
        }
        
        // School-Grade combo filter
        if (state.activeFilters.schoolGrade.length > 0) {
            const comboKey = `${student.school} ${student.grade}`;
            if (!state.activeFilters.schoolGrade.includes(comboKey)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort alphabetically by name (Korean 가나다순)
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

// Render student grid
function renderStudentGrid() {
    const filtered = getFilteredStudents();
    elements.filteredCount.textContent = filtered.length;
    
    if (filtered.length === 0) {
        elements.studentGrid.innerHTML = `
            <div class="empty-state card" style="grid-column: 1 / -1;">
                <div class="empty-icon"><i class="fa-solid fa-user-slash"></i></div>
                <h3>필터에 맞는 학생이 없습니다</h3>
                <p>필터를 변경하거나 다른 이름으로 검색해보세요.</p>
            </div>`;
        updateStats();
        return;
    }
    
    // Pre-initialize daily records if missing
    if (!state.attendance[state.selectedDate]) {
        state.attendance[state.selectedDate] = {};
    }
    
    elements.studentGrid.innerHTML = filtered.map(student => {
        const record = state.attendance[state.selectedDate][student.id] || { status: 'unchecked', time: null };
        const status = record.status;
        const timeText = record.time ? record.time : '';
        
        // Create initial avatar text or show photo
        const avatarContent = student.photo 
            ? `<img src="${student.photo}" alt="${student.name}">` 
            : student.name.charAt(0);
            
        let stateClass = 'state-unchecked';
        let statusLabel = '미등원';
        let statusIcon = '<i class="fa-solid fa-minus"></i>';
        
        if (status === 'attended') {
            stateClass = 'state-attended';
            statusLabel = '출석';
            statusIcon = '<i class="fa-solid fa-circle-check"></i>';
        } else if (status === 'absent') {
            stateClass = 'state-absent';
            statusLabel = '결석';
            statusIcon = '<i class="fa-solid fa-circle-xmark"></i>';
        } else if (status === 'tardy') {
            stateClass = 'state-tardy';
            statusLabel = '지각';
            statusIcon = '<i class="fa-solid fa-clock"></i>';
        }
        
        return `
            <div class="student-card card" id="card-${student.id}">
                <div class="student-avatar" data-id="${student.id}">
                    ${avatarContent}
                </div>
                <div class="student-info">
                    <div class="student-name-row">
                        <span class="student-name" data-id="${student.id}">${student.name}</span>
                        <button class="quick-sms-btn" data-id="${student.id}" title="보호자 퀵 메시지">
                            <i class="fa-solid fa-comment-sms"></i>
                        </button>
                    </div>
                    <span class="student-meta">${student.school} · ${student.grade}</span>
                    <span class="student-phone-sub">부모: ${student.parentPhone || '연락처 없음'}</span>
                </div>
                <button class="attendance-toggle-btn ${stateClass}" data-id="${student.id}">
                    ${statusIcon}
                    <span>${statusLabel}</span>
                    ${timeText ? `<span class="btn-time-stamp">${timeText}</span>` : ''}
                </button>
            </div>`;
    }).join('');
    
    // Add Click listeners for attendance state changes
    elements.studentGrid.querySelectorAll('.attendance-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleAttendanceClick(btn.dataset.id);
        });
    });
    
    // Add Click listeners for quick SMS
    elements.studentGrid.querySelectorAll('.quick-sms-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            sendQuickSms(btn.dataset.id);
        });
    });
    
    elements.studentGrid.querySelectorAll('.student-name, .student-avatar').forEach(el => {
        el.addEventListener('click', () => {
            openStudentProfile(el.dataset.id);
        });
    });
    
    updateStats();
}

// Handle single-click cyclic rotation: unchecked -> attended -> tardy -> absent -> unchecked
function handleAttendanceClick(studentId) {
    const todayRecords = state.attendance[state.selectedDate];
    const currentRecord = todayRecords[studentId] || { status: 'unchecked', time: null };
    
    let nextStatus = 'unchecked';
    let nextTime = null;
    
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    switch (currentRecord.status) {
        case 'unchecked':
            nextStatus = 'attended';
            nextTime = timeString;
            break;
        case 'attended':
            nextStatus = 'tardy';
            nextTime = timeString;
            break;
        case 'tardy':
            nextStatus = 'absent';
            nextTime = null;
            break;
        case 'absent':
            nextStatus = 'unchecked';
            nextTime = null;
            break;
        default:
            nextStatus = 'unchecked';
            nextTime = null;
    }
    
    todayRecords[studentId] = {
        status: nextStatus,
        time: nextTime
    };
    
    saveLocalStorage();
    
    updateStudentCardUI(studentId, nextStatus, nextTime);
    updateStats();
}

// Update specific student card DOM UI to prevent full re-render
function updateStudentCardUI(studentId, nextStatus, nextTime) {
    const card = document.getElementById(`card-${studentId}`);
    if (card) {
        const toggleBtn = card.querySelector('.attendance-toggle-btn');
        if (toggleBtn) {
            toggleBtn.className = `attendance-toggle-btn state-${nextStatus}`;
            
            let statusIcon = '<i class="fa-solid fa-minus"></i>';
            let statusLabel = '미등원';
            
            if (nextStatus === 'attended') {
                statusIcon = '<i class="fa-solid fa-circle-check"></i>';
                statusLabel = '출석';
            } else if (nextStatus === 'absent') {
                statusIcon = '<i class="fa-solid fa-circle-xmark"></i>';
                statusLabel = '결석';
            } else if (nextStatus === 'tardy') {
                statusIcon = '<i class="fa-solid fa-clock"></i>';
                statusLabel = '지각';
            }
            
            toggleBtn.innerHTML = `
                ${statusIcon}
                <span>${statusLabel}</span>
                ${nextTime ? `<span class="btn-time-stamp">${nextTime}</span>` : ''}
            `;
        }
    }
}

// Quick individual SMS sending
function sendQuickSms(studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    
    if (!student.parentPhone) {
        alert('보호자 연락처가 등록되지 않은 학생입니다.');
        return;
    }
    
    const todayRecords = state.attendance[state.selectedDate] || {};
    const record = todayRecords[studentId] || { status: 'unchecked', time: '' };
    
    if (record.status === 'attended') {
        alert('출석 완료된 학생입니다. 미등원, 결석, 지각 상태일 때만 문자를 전송할 수 있습니다.');
        return;
    }
    
    const statusKey = record.status; // 'unchecked', 'absent', 'tardy'
    const template = state.smsTemplates[statusKey] || DEFAULT_SMS_TEMPLATES[statusKey];
    const bodyText = replaceTemplateTags(template, student.name, record.time || '');
    
    const smsUrl = `sms:${student.parentPhone}?body=${encodeURIComponent(bodyText)}`;
    
    navigator.clipboard.writeText(bodyText)
        .then(() => {
            alert(`보호자(${student.parentPhone})용 메시지가 클립보드에 복사되었습니다.\n기기 문자 앱으로 연결됩니다.\n\n[메시지 내용]\n${bodyText}`);
            window.location.href = smsUrl;
        })
        .catch(err => {
            console.error('Clipboard copy failed: ', err);
            window.location.href = smsUrl;
        });
}

// Update Statistics Board
function updateStats() {
    const filtered = getFilteredStudents();
    const total = filtered.length;
    
    let attended = 0;
    let absent = 0;
    let tardy = 0;
    let unchecked = 0;
    
    const todayRecords = state.attendance[state.selectedDate] || {};
    
    filtered.forEach(student => {
        const rec = todayRecords[student.id] || { status: 'unchecked' };
        if (rec.status === 'attended') attended++;
        else if (rec.status === 'absent') absent++;
        else if (rec.status === 'tardy') tardy++;
        else unchecked++;
    });
    
    elements.statTotal.textContent = `${total}명`;
    elements.statAttended.textContent = attended;
    elements.statAbsent.textContent = absent;
    elements.statTardy.textContent = tardy;
    elements.statUnchecked.textContent = unchecked;
    
    // Percentage = Checked (Attended + Absent + Tardy) / Total
    const checked = attended + absent + tardy;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    elements.statsPercentage.textContent = `${percent}%`;
    
    // Progress Ring Draw
    const circle = elements.statsProgressCircle;
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // Update SMS Target Counts and Badges
    // Count overall SMS eligible students (unchecked + absent + tardy)
    let totalSmsEligible = 0;
    state.students.forEach(student => {
        const rec = todayRecords[student.id] || { status: 'unchecked' };
        if (rec.status !== 'attended') totalSmsEligible++;
    });
    
    if (totalSmsEligible > 0) {
        elements.smsBadge.textContent = totalSmsEligible;
        elements.smsBadge.style.display = 'flex';
    } else {
        elements.smsBadge.style.display = 'none';
    }
}

// Student Profile Modal Details
let currentEditingStudentId = null;

function openStudentProfile(studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    
    currentEditingStudentId = studentId;
    
    elements.profileModalName.textContent = student.name;
    elements.profileModalSchool.textContent = student.school;
    elements.profileModalGrade.textContent = student.grade;
    elements.profileModalStudentPhone.textContent = student.phone || '등록되지 않음';
    elements.profileModalParentPhone.textContent = student.parentPhone || '등록되지 않음';
    elements.profileModalDays.textContent = student.days.join(', ') + '요일';
    
    // Calls anchors
    elements.profileModalStudentCall.href = student.phone ? `tel:${student.phone}` : '#';
    elements.profileModalParentCall.href = student.parentPhone ? `tel:${student.parentPhone}` : '#';
    
    // Photo management
    if (student.photo) {
        elements.profileModalImg.src = student.photo;
        elements.profileModalImg.style.display = 'block';
        elements.profileModalPlaceholder.style.display = 'none';
    } else {
        elements.profileModalImg.style.display = 'none';
        elements.profileModalPlaceholder.style.display = 'flex';
        elements.profileModalPlaceholder.textContent = student.name.charAt(0);
    }
    
    // Generate Attendance History
    const historyList = [];
    const dateKeys = Object.keys(state.attendance).sort().reverse();
    
    dateKeys.forEach(dateStr => {
        const dayRecord = state.attendance[dateStr][studentId];
        if (dayRecord && dayRecord.status !== 'unchecked') {
            historyList.push({
                date: dateStr,
                status: dayRecord.status,
                time: dayRecord.time
            });
        }
    });
    
    if (historyList.length > 0) {
        elements.profileAttendanceHistory.innerHTML = historyList.map(h => {
            let statusText = '출석';
            let statusClass = 'status-attended';
            if (h.status === 'absent') { statusText = '결석'; statusClass = 'status-absent'; }
            if (h.status === 'tardy') { statusText = `지각 (${h.time})`; statusClass = 'status-tardy'; }
            
            return `
                <div class="history-item ${statusClass}">
                    <span class="history-date">${h.date}</span>
                    <span class="history-status">${statusText}</span>
                </div>`;
        }).join('');
    } else {
        elements.profileAttendanceHistory.innerHTML = `<div class="no-filter-data">이전 출석 기록이 없습니다.</div>`;
    }
    
    elements.profileModal.style.display = 'flex';
}

function handleStudentPhotoUpload(e) {
    if (e.target.files.length === 0 || !currentEditingStudentId) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target.result;
        
        // Update state
        const studentIndex = state.students.findIndex(s => s.id === currentEditingStudentId);
        if (studentIndex > -1) {
            state.students[studentIndex].photo = base64;
            saveLocalStorage();
            
            // Update modal UI
            elements.profileModalImg.src = base64;
            elements.profileModalImg.style.display = 'block';
            elements.profileModalPlaceholder.style.display = 'none';
            
            // Refresh main grid cards
            renderStudentGrid();
        }
    };
    reader.readAsDataURL(file);
}

// SMS Modal Manager
function openSmsModal() {
    if (state.students.length === 0) {
        alert('등록된 학생 데이터가 없습니다. 엑셀을 먼저 업로드해주세요.');
        return;
    }
    
    // Re-synchronize recipients based on current tab
    rebuildSmsRecipientsList();
    elements.smsModal.style.display = 'flex';
}

function rebuildSmsRecipientsList() {
    const todayRecords = state.attendance[state.selectedDate] || {};
    
    // Calculate counts for tab badges
    let countUnchecked = 0;
    let countAbsent = 0;
    let countTardy = 0;
    
    state.students.forEach(student => {
        const rec = todayRecords[student.id] || { status: 'unchecked' };
        if (rec.status === 'unchecked') countUnchecked++;
        else if (rec.status === 'absent') countAbsent++;
        else if (rec.status === 'tardy') countTardy++;
    });
    
    elements.smsTabCountUnchecked.textContent = countUnchecked;
    elements.smsTabCountAbsent.textContent = countAbsent;
    elements.smsTabCountTardy.textContent = countTardy;
    
    // Build list for active tab
    const filtered = state.students.filter(student => {
        const rec = todayRecords[student.id] || { status: 'unchecked' };
        return rec.status === state.selectedSmsTab;
    });
    
    // Select all recipients of this status by default
    state.selectedSmsRecipients = filtered.map(s => s.id);
    
    updateSmsModalContent();
}

function updateSmsModalContent(rebuildList = true) {
    const currentTemplate = state.smsTemplates[state.selectedSmsTab];
    elements.smsTemplateTextarea.value = currentTemplate;
    
    const todayRecords = state.attendance[state.selectedDate] || {};
    
    if (rebuildList) {
        const filtered = state.students.filter(student => {
            const rec = todayRecords[student.id] || { status: 'unchecked' };
            return rec.status === state.selectedSmsTab;
        });
        
        if (filtered.length === 0) {
            elements.smsRecipientList.innerHTML = `<div class="no-filter-data" style="padding: 16px; text-align: center;">대상 학생이 없습니다.</div>`;
            elements.smsSelectedCount.textContent = 0;
            return;
        }
        
        elements.smsRecipientList.innerHTML = filtered.map(student => {
            const record = todayRecords[student.id] || { status: 'unchecked', time: '' };
            const isSelected = state.selectedSmsRecipients.includes(student.id);
            const previewText = replaceTemplateTags(currentTemplate, student.name, record.time || '');
            
            return `
                <div class="recipient-item" data-id="${student.id}">
                    <input type="checkbox" class="recipient-checkbox" data-id="${student.id}" ${isSelected ? 'checked' : ''}>
                    <div class="recipient-info">
                        <div>
                            <span class="recipient-name">${student.name}</span>
                            <span class="recipient-phone">${student.parentPhone || '(보호자 연락처 없음)'}</span>
                        </div>
                        <span class="recipient-preview">${previewText}</span>
                    </div>
                </div>`;
        }).join('');
        
        // Add event listeners
        elements.smsRecipientList.querySelectorAll('.recipient-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const chk = item.querySelector('.recipient-checkbox');
                if (e.target !== chk) {
                    chk.checked = !chk.checked;
                }
                toggleRecipientSelection(item.dataset.id, chk.checked);
            });
        });
    } else {
        // Just update preview texts in the list
        elements.smsRecipientList.querySelectorAll('.recipient-item').forEach(item => {
            const id = item.dataset.id;
            const student = state.students.find(s => s.id === id);
            const record = todayRecords[id] || { status: 'unchecked', time: '' };
            const preview = item.querySelector('.recipient-preview');
            if (student && preview) {
                preview.textContent = replaceTemplateTags(currentTemplate, student.name, record.time || '');
            }
        });
    }
    
    elements.smsSelectedCount.textContent = state.selectedSmsRecipients.length;
}

function toggleRecipientSelection(studentId, isChecked) {
    const idx = state.selectedSmsRecipients.indexOf(studentId);
    if (isChecked && idx === -1) {
        state.selectedSmsRecipients.push(studentId);
    } else if (!isChecked && idx > -1) {
        state.selectedSmsRecipients.splice(idx, 1);
    }
    elements.smsSelectedCount.textContent = state.selectedSmsRecipients.length;
}

function toggleSmsSelectAll() {
    const todayRecords = state.attendance[state.selectedDate] || {};
    const filtered = state.students.filter(student => {
        const rec = todayRecords[student.id] || { status: 'unchecked' };
        return rec.status === state.selectedSmsTab;
    });
    
    const checkboxes = elements.smsRecipientList.querySelectorAll('.recipient-checkbox');
    
    // If all are already selected, deselect all. Otherwise select all.
    if (state.selectedSmsRecipients.length === filtered.length) {
        state.selectedSmsRecipients = [];
        checkboxes.forEach(c => c.checked = false);
    } else {
        state.selectedSmsRecipients = filtered.map(s => s.id);
        checkboxes.forEach(c => c.checked = true);
    }
    
    elements.smsSelectedCount.textContent = state.selectedSmsRecipients.length;
}

function replaceTemplateTags(template, name, time) {
    let statusKo = '미등원';
    if (state.selectedSmsTab === 'absent') statusKo = '결석';
    else if (state.selectedSmsTab === 'tardy') statusKo = '지각';
    
    return template
        .replace(/{이름}/g, name)
        .replace(/{상태}/g, statusKo)
        .replace(/{시간}/g, time || '미등록');
}

// Bulk send native SMS
function sendBulkSmsNative() {
    if (state.selectedSmsRecipients.length === 0) {
        alert('선택된 전송 대상 학생이 없습니다.');
        return;
    }
    
    const todayRecords = state.attendance[state.selectedDate] || {};
    const currentTemplate = state.smsTemplates[state.selectedSmsTab];
    
    // Send message to each selected recipient
    // Since browser security blocks sending massive SMS automatically,
    // we open SMS app for the first one, and copy all logs.
    // If on mobile, we can chain or prompt the user for each, but doing it one by one is most robust.
    // We will copy all to clipboard as well, and trigger native SMS client.
    
    const logs = [];
    state.selectedSmsRecipients.forEach(id => {
        const student = state.students.find(s => s.id === id);
        const record = todayRecords[id] || { status: 'unchecked', time: '' };
        if (student && student.parentPhone) {
            const body = replaceTemplateTags(currentTemplate, student.name, record.time || '');
            logs.push({ phone: student.parentPhone, body: body });
        }
    });
    
    if (logs.length === 0) {
        alert('선택된 학생들 중 보호자 연락처가 등록된 학생이 없습니다.');
        return;
    }
    
    // Open native messaging client for the first student
    const first = logs[0];
    
    // Format for multiple SMS: some devices support comma (Android) or semicolon (iOS)
    // We will open first one, but save/copy the full roster to make manual sending easy.
    const smsUrl = `sms:${first.phone}?body=${encodeURIComponent(first.body)}`;
    
    // Copy the entire set of messages to clipboard for convenience
    const fullClipboardText = logs.map(l => `[수신: ${l.phone}]\n${l.body}`).join('\n\n');
    navigator.clipboard.writeText(fullClipboardText)
        .then(() => {
            alert(`총 ${logs.length}건의 메시지 전송 내역이 클립보드에 복사되었습니다!\n첫 번째 대상(${first.phone})의 문자 앱으로 연동됩니다.`);
            window.location.href = smsUrl;
        })
        .catch(err => {
            console.error('Clipboard write failed: ', err);
            window.location.href = smsUrl;
        });
}

// Copy bulk SMS to clipboard
function copyBulkSmsToClipboard() {
    if (state.selectedSmsRecipients.length === 0) {
        alert('선택된 전송 대상 학생이 없습니다.');
        return;
    }
    
    const todayRecords = state.attendance[state.selectedDate] || {};
    const currentTemplate = state.smsTemplates[state.selectedSmsTab];
    
    const textArr = [];
    state.selectedSmsRecipients.forEach(id => {
        const student = state.students.find(s => s.id === id);
        const record = todayRecords[id] || { status: 'unchecked', time: '' };
        if (student) {
            const body = replaceTemplateTags(currentTemplate, student.name, record.time || '');
            textArr.push(`[수신: ${student.parentPhone || '연락처없음'}]\n${body}`);
        }
    });
    
    const fullText = textArr.join('\n\n');
    navigator.clipboard.writeText(fullText)
        .then(() => {
            alert('선택한 대상 학생들의 문자 전송 포맷이 클립보드에 일괄 복사되었습니다!');
        })
        .catch(err => {
            alert('클립보드 복사에 실패했습니다. 권한을 확인하세요.');
        });
}

// Export Report to PDF
function exportToPDF() {
    if (state.students.length === 0) {
        alert('출석체크할 학생 명단이 없습니다. 엑셀을 등록하세요.');
        return;
    }
    
    const filtered = getFilteredStudents();
    const todayRecords = state.attendance[state.selectedDate] || {};
    
    // Build offline HTML block for PDF export
    const pdfDiv = document.createElement('div');
    pdfDiv.className = 'pdf-print-container';
    
    let statsAttended = 0;
    let statsAbsent = 0;
    let statsTardy = 0;
    let statsUnchecked = 0;
    
    filtered.forEach(s => {
        const rec = todayRecords[s.id] || { status: 'unchecked' };
        if (rec.status === 'attended') statsAttended++;
        else if (rec.status === 'absent') statsAbsent++;
        else if (rec.status === 'tardy') statsTardy++;
        else statsUnchecked++;
    });
    
    const rate = filtered.length > 0 ? Math.round(((statsAttended + statsAbsent + statsTardy) / filtered.length) * 100) : 0;
    
    const rowsHtml = filtered.map((student, idx) => {
        const rec = todayRecords[student.id] || { status: 'unchecked', time: null };
        let statusKo = '미등원';
        let statusClass = 'pdf-status-unchecked';
        
        if (rec.status === 'attended') { statusKo = '출석'; statusClass = 'pdf-status-attended'; }
        else if (rec.status === 'absent') { statusKo = '결석'; statusClass = 'pdf-status-absent'; }
        else if (rec.status === 'tardy') { statusKo = `지각 (${rec.time})`; statusClass = 'pdf-status-tardy'; }
        
        return `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td><strong>${student.name}</strong></td>
                <td>${student.school}</td>
                <td>${student.grade}</td>
                <td style="text-align: center;" class="${statusClass}">${statusKo}</td>
                <td style="text-align: center; font-size: 0.8rem;">${rec.time || '-'}</td>
                <td>${student.parentPhone || '-'}</td>
            </tr>`;
    }).join('');
    
    pdfDiv.innerHTML = `
        <div class="pdf-header">
            <div>
                <h1>출석체크 일일 보고서</h1>
                <p style="margin-top: 4px; color: #4b5563; font-size: 0.9rem;">스마트 학원 출석부 시스템 (ATTEND)</p>
            </div>
            <span>기준일자: <strong>${state.selectedDate}</strong></span>
        </div>
        
        <div class="pdf-summary">
            <div>전체 대상: <strong>${filtered.length}명</strong></div>
            <div>출석률: <strong>${rate}%</strong></div>
            <div style="margin-left: auto; display: flex; gap: 12px;">
                <span class="pdf-status-attended">출석 ${statsAttended}</span>
                <span class="pdf-status-absent">결석 ${statsAbsent}</span>
                <span class="pdf-status-tardy">지각 ${statsTardy}</span>
                <span class="pdf-status-unchecked">미등원 ${statsUnchecked}</span>
            </div>
        </div>
        
        <table class="pdf-table" style="margin-top: 20px;">
            <thead>
                <tr>
                    <th style="width: 6%; text-align: center;">번호</th>
                    <th style="width: 15%;">학생이름</th>
                    <th style="width: 15%;">학교</th>
                    <th style="width: 12%;">학년</th>
                    <th style="width: 18%; text-align: center;">출결상태</th>
                    <th style="width: 12%; text-align: center;">체크시간</th>
                    <th style="width: 22%;">학부모 연락처</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
        
        <div style="margin-top: 60px; text-align: center; color: #9ca3af; font-size: 0.75rem; border-top: 1px solid #e5e7eb; padding-top: 10px;">
            본 보고서는 ATTEND 스마트 출석체크 앱에서 생성되었습니다.
        </div>
    `;
    
    document.body.appendChild(pdfDiv);
    
    const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `${state.selectedDate}_출석보고서.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate PDF and then clean up the element
    html2pdf().from(pdfDiv).set(opt).save().then(() => {
        document.body.removeChild(pdfDiv);
    }).catch(err => {
        console.error(err);
        alert('PDF 저장 중 오류가 발생했습니다.');
        document.body.removeChild(pdfDiv);
    });
}
