// State Management
let students = JSON.parse(localStorage.getItem('cleaning_students')) || INITIAL_STUDENTS;
let attendanceData = JSON.parse(localStorage.getItem('cleaning_attendance')) || {};
let customHolidays = JSON.parse(localStorage.getItem('cleaning_holidays')) || DEFAULT_HOLIDAYS;
let isAdminLoggedIn = false;
let currentChart = null;
let currentViewMode = 'daily';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('currentDate').value = today;
  
  initYearSelect();
  renderDailyView();
  lucide.createIcons();
});

// Helper: Check Weekend or Holiday
function checkIsHoliday(dateStr) {
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
  const holidayName = customHolidays[dateStr] || null;

  return {
    isHoliday: isWeekend || !!holidayName,
    isWeekend: isWeekend,
    holidayName: holidayName
  };
}

// Switch between Daily and Monthly views
function switchView(mode) {
  currentViewMode = mode;
  const dailyView = document.getElementById('dailyView');
  const monthlyView = document.getElementById('monthlyView');
  const tabDaily = document.getElementById('tabDaily');
  const tabMonthly = document.getElementById('tabMonthly');
  const datePickerContainer = document.getElementById('datePickerContainer');
  const monthPickerContainer = document.getElementById('monthPickerContainer');
  const dailyActions = document.getElementById('dailyActions');

  if (mode === 'daily') {
    dailyView.classList.remove('hidden');
    monthlyView.classList.add('hidden');
    tabDaily.className = "px-4 py-2 text-sm font-medium rounded-lg bg-white shadow-sm text-slate-900 transition flex items-center space-x-2";
    tabMonthly.className = "px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center space-x-2";
    datePickerContainer.classList.remove('hidden');
    monthPickerContainer.classList.add('hidden');
    dailyActions.classList.remove('hidden');
    renderDailyView();
  } else {
    dailyView.classList.add('hidden');
    monthlyView.classList.remove('hidden');
    tabDaily.className = "px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center space-x-2";
    tabMonthly.className = "px-4 py-2 text-sm font-medium rounded-lg bg-white shadow-sm text-slate-900 transition flex items-center space-x-2";
    datePickerContainer.classList.add('hidden');
    monthPickerContainer.classList.remove('hidden');
    dailyActions.classList.add('hidden');
    renderMonthlyView();
  }
}

// Year dropdown setup
function initYearSelect() {
  const yearSelect = document.getElementById('selectYear');
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `พ.ศ. ${y + 543}`;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  document.getElementById('selectMonth').value = new Date().getMonth();
}

// Render Daily Attendance
function renderDailyView() {
  const selectedDate = document.getElementById('currentDate').value;
  document.getElementById('displaySelectedDate').textContent = formatDateThai(selectedDate);
  
  const holidayInfo = checkIsHoliday(selectedDate);
  const banner = document.getElementById('holidayBanner');
  
  if (holidayInfo.isHoliday) {
    banner.classList.remove('hidden');
    if (holidayInfo.isWeekend) {
      document.getElementById('holidayTitle').textContent = "วันหยุดเสาร์ - อาทิตย์";
      document.getElementById('holidayDesc').textContent = "วันนี้เป็นวันหยุดประจำสัปดาห์ ไม่นำมาคิดคำนวณวันทำการ";
    } else {
      document.getElementById('holidayTitle').textContent = `วันหยุดราชการ: ${holidayInfo.holidayName}`;
      document.getElementById('holidayDesc').textContent = "วันนี้เป็นวันหยุดนักขัตฤกษ์/วันหยุดพิเศษ";
    }
  } else {
    banner.classList.add('hidden');
  }

  const dayData = attendanceData[selectedDate] || {};
  const tbody = document.getElementById('attendanceTableBody');
  tbody.innerHTML = '';

  let doneCount = 0;

  students.forEach((student, index) => {
    const record = dayData[student.id] || { checked: false, note: '' };
    if (record.checked) doneCount++;

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition cursor-pointer";
    tr.onclick = (e) => {
      if (e.target.tagName !== 'INPUT') {
        toggleCheck(student.id);
      }
    };

    tr.innerHTML = `
      <td class="py-3.5 px-4 text-center text-slate-500 font-medium">${index + 1}</td>
      <td class="py-3.5 px-4 text-slate-600 font-mono text-xs">${student.id}</td>
      <td class="py-3.5 px-4 font-medium text-slate-800">${student.name}</td>
      <td class="py-3.5 px-4 text-center">
        <input type="checkbox" ${record.checked ? 'checked' : ''} 
               onchange="toggleCheck('${student.id}')"
               class="w-5 h-5 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500">
      </td>
      <td class="py-3.5 px-4">
        <input type="text" value="${record.note || ''}" 
               placeholder="ระบุหมายเหตุ/โซนความสะอาด..." 
               onchange="updateNote('${student.id}', this.value)"
               onclick="event.stopPropagation()"
               class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-emerald-500 focus:border-emerald-500">
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Update Daily Summary Cards
  const total = students.length;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent = doneCount;
  document.getElementById('statPending').textContent = total - doneCount;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  document.getElementById('statPercent').textContent = `${percent}%`;
}

// Attendance Check Handlers
function toggleCheck(studentId) {
  const selectedDate = document.getElementById('currentDate').value;
  if (!attendanceData[selectedDate]) attendanceData[selectedDate] = {};
  if (!attendanceData[selectedDate][studentId]) {
    attendanceData[selectedDate][studentId] = { checked: true, note: '' };
  } else {
    attendanceData[selectedDate][studentId].checked = !attendanceData[selectedDate][studentId].checked;
  }
  saveAttendance();
  renderDailyView();
}

function updateNote(studentId, noteText) {
  const selectedDate = document.getElementById('currentDate').value;
  if (!attendanceData[selectedDate]) attendanceData[selectedDate] = {};
  if (!attendanceData[selectedDate][studentId]) {
    attendanceData[selectedDate][studentId] = { checked: false, note: noteText };
  } else {
    attendanceData[selectedDate][studentId].note = noteText;
  }
  saveAttendance();
}

function markAll(status) {
  const selectedDate = document.getElementById('currentDate').value;
  if (!attendanceData[selectedDate]) attendanceData[selectedDate] = {};
  students.forEach(s => {
    const existingNote = attendanceData[selectedDate][s.id]?.note || '';
    attendanceData[selectedDate][s.id] = { checked: status, note: existingNote };
  });
  saveAttendance();
  renderDailyView();
}

function onDateChange() {
  renderDailyView();
}

function saveAttendance() {
  localStorage.setItem('cleaning_attendance', JSON.stringify(attendanceData));
}

// Render Monthly Statistics
function renderMonthlyView() {
  const month = parseInt(document.getElementById('selectMonth').value);
  const year = parseInt(document.getElementById('selectYear').value);
  
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  document.getElementById('monthlyTitleText').textContent = `${monthNames[month]} พ.ศ. ${year + 543}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDaysCount = 0;
  const workingDateStrings = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hol = checkIsHoliday(dateStr);
    if (!hol.isHoliday) {
      workingDaysCount++;
      workingDateStrings.push(dateStr);
    }
  }

  document.getElementById('monthlyWorkingDays').textContent = `${workingDaysCount} วัน`;

  const tbody = document.getElementById('monthlyTableBody');
  tbody.innerHTML = '';

  let grandTotalChecked = 0;
  const maxPossible = students.length * workingDaysCount;

  students.forEach((student, index) => {
    let studentCheckedDays = 0;
    workingDateStrings.forEach(dateStr => {
      if (attendanceData[dateStr] && attendanceData[dateStr][student.id]?.checked) {
        studentCheckedDays++;
      }
    });

    grandTotalChecked += studentCheckedDays;
    const studentPercent = workingDaysCount > 0 ? Math.round((studentCheckedDays / workingDaysCount) * 100) : 0;
    
    let badgeClass = "bg-rose-100 text-rose-700";
    let badgeText = "ต้องปรับปรุง";
    if (studentPercent >= 80) {
      badgeClass = "bg-emerald-100 text-emerald-800";
      badgeText = "ดีเยี่ยม";
    } else if (studentPercent >= 50) {
      badgeClass = "bg-amber-100 text-amber-800";
      badgeText = "ปานกลาง";
    }

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="py-3 px-4 text-center text-slate-500 font-medium">${index + 1}</td>
      <td class="py-3 px-4 text-slate-600 font-mono text-xs">${student.id}</td>
      <td class="py-3 px-4 font-medium text-slate-800">${student.name}</td>
      <td class="py-3 px-4 text-center font-semibold text-emerald-600">${studentCheckedDays}</td>
      <td class="py-3 px-4 text-center text-slate-500">${workingDaysCount}</td>
      <td class="py-3 px-4 text-center font-bold text-slate-700">${studentPercent}%</td>
      <td class="py-3 px-4 text-center">
        <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}">${badgeText}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('monthlyTotalChecked').textContent = `${grandTotalChecked} ครั้ง`;
  const avgPercent = maxPossible > 0 ? Math.round((grandTotalChecked / maxPossible) * 100) : 0;
  document.getElementById('monthlyAvgPercent').textContent = `${avgPercent}%`;

  renderMonthlyChart(grandTotalChecked, maxPossible - grandTotalChecked);
}

// Monthly Doughnut Chart
function renderMonthlyChart(doneCount, pendingCount) {
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (currentChart) currentChart.destroy();

  currentChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['ปฏิบัติเวรรวม', 'ไม่ได้ปฏิบัติเวรรวม'],
      datasets: [{
        data: [doneCount, pendingCount < 0 ? 0 : pendingCount],
        backgroundColor: ['#22c55e', '#f1f5f9'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      cutout: '75%'
    }
  });
}

// Admin Modal Toggle & Authentication
function toggleAdminModal() {
  const modal = document.getElementById('adminModal');
  modal.classList.toggle('hidden');
  if (isAdminLoggedIn) renderAdminHolidays();
}

function loginAdmin() {
  const u = document.getElementById('adminUser').value;
  const p = document.getElementById('adminPass').value;
  
  if (u === 'gun' && p === '11111111') {
    isAdminLoggedIn = true;
    document.getElementById('adminLoginForm').classList.add('hidden');
    document.getElementById('adminPanelContent').classList.remove('hidden');
    document.getElementById('adminBtnText').textContent = 'ผู้ดูแลระบบ (gun)';
    document.getElementById('loginError').classList.add('hidden');
    renderAdminHolidays();
  } else {
    document.getElementById('loginError').classList.remove('hidden');
  }
}

function logoutAdmin() {
  isAdminLoggedIn = false;
  document.getElementById('adminLoginForm').classList.remove('hidden');
  document.getElementById('adminPanelContent').classList.add('hidden');
  document.getElementById('adminBtnText').textContent = 'ไอที แอดมิน (gun)';
  document.getElementById('adminUser').value = '';
  document.getElementById('adminPass').value = '';
}

// Custom Holiday Management
function renderAdminHolidays() {
  const list = document.getElementById('holidayList');
  list.innerHTML = '';
  Object.keys(customHolidays).sort().forEach(dateKey => {
    const div = document.createElement('div');
    div.className = "flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200";
    div.innerHTML = `
      <span><strong>${dateKey}</strong>: ${customHolidays[dateKey]}</span>
      <button onclick="deleteHoliday('${dateKey}')" class="text-rose-600 hover:text-rose-800 text-xs font-semibold">ลบ</button>
    `;
    list.appendChild(div);
  });
}

function addCustomHoliday() {
  const d = document.getElementById('newHolidayDate').value;
  const name = document.getElementById('newHolidayName').value;
  if (d && name) {
    customHolidays[d] = name;
    localStorage.setItem('cleaning_holidays', JSON.stringify(customHolidays));
    renderAdminHolidays();
    if (currentViewMode === 'daily') renderDailyView();
    else renderMonthlyView();
  }
}

function deleteHoliday(dateKey) {
  delete customHolidays[dateKey];
  localStorage.setItem('cleaning_holidays', JSON.stringify(customHolidays));
  renderAdminHolidays();
  if (currentViewMode === 'daily') renderDailyView();
  else renderMonthlyView();
}

// Student Management (Add & Reset)
function addStudent() {
  const id = document.getElementById('newStudentId').value.trim();
  const name = document.getElementById('newStudentName').value.trim();
  if (id && name) {
    students.push({ id, name });
    localStorage.setItem('cleaning_students', JSON.stringify(students));
    document.getElementById('newStudentId').value = '';
    document.getElementById('newStudentName').value = '';
    alert(`เพิ่มนักเรียน ${name} เรียบร้อยแล้ว`);
    if (currentViewMode === 'daily') renderDailyView();
    else renderMonthlyView();
  }
}

function resetSystemData() {
  if (confirm('คุณต้องการรีเซ็ตข้อมูลนักเรียนกลับเป็นค่าตั้งต้น 34 คนใช่หรือไม่?')) {
    students = INITIAL_STUDENTS;
    customHolidays = DEFAULT_HOLIDAYS;
    localStorage.setItem('cleaning_students', JSON.stringify(students));
    localStorage.setItem('cleaning_holidays', JSON.stringify(customHolidays));
    renderAdminHolidays();
    if (currentViewMode === 'daily') renderDailyView();
    else renderMonthlyView();
    alert('รีเซ็ตข้อมูลตั้งต้นเรียบร้อยแล้ว');
  }
}

// Date Formatter Helper
function formatDateThai(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return `${d.getDate()} ${months[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
}