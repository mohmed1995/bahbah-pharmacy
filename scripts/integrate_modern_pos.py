import os
import re

TARGET_FILES = [
    r'F:\صيدليه\admin_pos.html',
    r'F:\صيدليه\pharmacy_pos_management\admin_pos.html'
]

JS_LOGIC = """
// ==========================================================================
// MODERN OFFLINE-FIRST PHARMACY MODULES (2026 EDITION)
// Lead Architect + Dr. Islam + Eng. Ziad Tarek
// ==========================================================================

let activeShelfProduct = null;
let activeTableDispenseProduct = null;

// 1. VISUAL SHELF-LOCATING (2D Floor Plan + Shelf Elevation)
async function openShelfModal(prodId) {
  try {
    const res = await fetch(`/api/products/${prodId}/shelf`);
    if (!res.ok) throw new Error('Could not fetch shelf location');
    const p = await res.json();
    activeShelfProduct = p;

    document.getElementById('shelfModalProdName').innerText = p.name_en || p.name;
    document.getElementById('shelfModalProdCode').innerText = p.code || p.barcode;
    document.getElementById('shelfZoneBadge').innerText = p.zone_name || 'المنطقة A';
    document.getElementById('shelfAisleRackBadge').innerText = `${p.aisle || 'ممر 1'} - ${p.rack || 'ستاند 1'}`;
    document.getElementById('shelfLevelBadge').innerText = `رف ${p.shelf_level || 2} (مستوى اليد)`;
    document.getElementById('shelfBinBadge').innerText = p.bin || 'درج عام';

    // Move SVG 2D Floor Plan Pin
    const pin = document.getElementById('shelfTargetPin');
    if (pin) {
      const x = (p.x_coord || 25) * 3.8;
      const y = (p.y_coord || 25) * 2.8;
      pin.setAttribute('transform', `translate(${x}, ${y})`);
    }

    // Highlight Physical Shelf Level
    for (let i = 1; i <= 4; i++) {
      const row = document.getElementById(`shelfLevelRow${i}`);
      if (row) {
        if (i === (p.shelf_level || 2)) {
          row.className = 'shelf-rack-row p-2 rounded-xl border border-amber-500 bg-amber-500/20 shadow-lg shadow-amber-500/20 flex items-center justify-between text-xs transition';
          row.innerHTML = `<span class="text-amber-300 font-bold text-xs flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>رف ${i} 👈 موقع العلبة هنا!</span><span class="bg-amber-400 text-black font-black px-2 py-0.5 rounded-lg text-xs">${p.bin || 'درج'}</span>`;
        } else {
          row.className = 'shelf-rack-row p-2 rounded-xl border border-white/10 flex items-center justify-between text-xs transition';
          row.innerHTML = `<span class="text-slate-400 font-bold text-[11px]">رف ${i}</span><span class="text-slate-500 text-[10px]">مستوى عادي</span>`;
        }
      }
    }

    document.getElementById('shelfGuidanceVoice').innerText = `اتجه إلى ${p.aisle || 'ممر 1'} -> ${p.rack || 'ستاند 1'} -> الرف رقم ${p.shelf_level || 2} -> ${p.bin || 'الدرج'}`;
    document.getElementById('shelfLocatingModal').classList.remove('hidden');
  } catch (err) {
    alert('موقع الرف لهذا الصنف: منطقة الأدوية الرئيسية - رف 2');
  }
}

function closeShelfModal() {
  const m = document.getElementById('shelfLocatingModal');
  if (m) m.classList.add('hidden');
  activeShelfProduct = null;
}

function addCurrentShelfProductToCart() {
  if (!activeShelfProduct) return;
  addToCart(activeShelfProduct.code || activeShelfProduct.barcode, 'علبة');
  closeShelfModal();
}

// 2. BATCH SELECTOR (Old Price vs New Price)
async function openBatchSelector(prodId, prodName) {
  try {
    const res = await fetch(`/api/products/${prodId}/batches`);
    if (!res.ok) throw new Error();
    const batches = await res.json();
    
    const container = document.getElementById('batchListContainer');
    document.getElementById('batchModalProdName').innerText = prodName;
    container.innerHTML = '';

    if (batches.length === 0) {
      container.innerHTML = '<div class="text-slate-400 text-center py-4 text-xs">لا توجد تشغيلات مسجلة بشكل منفصل. سيتم الصرف بالسعر الرسمي.</div>';
    } else {
      batches.forEach(b => {
        const isNear = new Date(b.expiry_date) < new Date('2027-01-01');
        const card = document.createElement('div');
        card.className = 'bg-[#050814] p-3 rounded-2xl border border-white/10 hover:border-indigo-500/50 transition cursor-pointer flex items-center justify-between';
        card.onclick = () => {
          addToCartCustomPrice(b.product_id, b.sale_price, b.batch_number, b.expiry_date);
          closeBatchModal();
        };
        card.innerHTML = `
          <div>
            <div class="font-bold text-white text-xs flex items-center gap-2">
              <span>تشغيلة: ${b.batch_number}</span>
              ${isNear ? '<span class="bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.2 rounded font-bold">وشيك الصلاحية ⚠️</span>' : ''}
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">
              صلاحية: <b class="${isNear ? 'text-rose-400' : 'text-slate-200'}">${b.expiry_date}</b> | متبقي: <b class="text-cyan-400">${b.box_qty} علبة</b>
            </div>
          </div>
          <div class="text-left">
            <span class="text-sm font-black text-emerald-400">${b.sale_price.toFixed(2)} ج.م</span>
            <span class="block text-[10px] text-indigo-400 font-bold">اختيار هذه التشغيلة 👈</span>
          </div>
        `;
        container.appendChild(card);
      });
    }

    document.getElementById('batchSelectorModal').classList.remove('hidden');
  } catch (e) {
    console.error(e);
  }
}

function closeBatchModal() {
  const m = document.getElementById('batchSelectorModal');
  if (m) m.classList.add('hidden');
}

function addToCartCustomPrice(prodId, price, batchNo, expiry) {
  const p = products.find(x => x.id === prodId);
  if (!p) return;
  const itemClone = { ...p, price: price, batchNumber: batchNo, expiryDate: expiry };
  cart.push({ code: p.code, product: itemClone, unit: 'علبة', qty: 1 });
  renderCart();
  playSuccessChime();
}

// 3. CONTROLLED SUBSTANCES COMPLIANCE GATE (EDA)
function triggerTableDrugCompliance(product) {
  activeTableDispenseProduct = product;
  document.getElementById('compDrugName').innerText = product.name_en || product.name;
  document.getElementById('compTableClass').innerText = product.table_class || 'جدول 2';
  document.getElementById('compQty').value = 1;
  document.getElementById('tableDrugComplianceModal').classList.remove('hidden');
}

function closeTableComplianceModal() {
  document.getElementById('tableDrugComplianceModal').classList.add('hidden');
  activeTableDispenseProduct = null;
}

async function confirmTableDrugDispense(e) {
  e.preventDefault();
  if (!activeTableDispenseProduct) return;

  const logPayload = {
    product_id: activeTableDispenseProduct.id,
    product_name: activeTableDispenseProduct.name_en || activeTableDispenseProduct.name,
    table_class: activeTableDispenseProduct.table_class || 'Table 2',
    qty_dispensed: parseInt(document.getElementById('compQty').value, 10) || 1,
    unit_type: 'علبة',
    patient_name: document.getElementById('compPatientName').value.trim(),
    patient_national_id: document.getElementById('compNationalId').value.trim(),
    doctor_name: document.getElementById('compDoctorName').value.trim(),
    doctor_license: document.getElementById('compDoctorLicense').value.trim(),
    prescription_no: document.getElementById('compPrescriptionNo').value.trim(),
    prescription_date: new Date().toISOString().slice(0, 10),
    remaining_stock: Math.max(0, (activeTableDispenseProduct.stock_boxes || 5) - 1),
    pharmacist_name: 'د. إسلام الشريف'
  };

  try {
    await fetch('/api/table-drugs/dispense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logPayload)
    });
  } catch (err) {}

  // Add to cart with badge
  const p = activeTableDispenseProduct;
  cart.push({
    code: p.code,
    product: p,
    unit: 'علبة',
    qty: logPayload.qty_dispensed,
    tableCompliance: logPayload
  });

  closeTableComplianceModal();
  renderCart();
  playSuccessChime();
  alert(`تم تسجيل صرف ${p.name_en || p.name} في دفتر الجدول الرسمي وقيده للتفتيش الصيدلي بنجاح! ⚖️`);
}

async function renderTableDrugsLog() {
  try {
    const res = await fetch('/api/table-drugs/registry?limit=50');
    const logs = await res.json();
    const tbody = document.getElementById('tableDrugsLogBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    document.getElementById('tableDrugsBadge').innerText = logs.length;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-500">لا توجد قيود جدول مسجلة اليوم</td></tr>';
      return;
    }

    logs.forEach(l => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-white/5 transition';
      tr.innerHTML = `
        <td class="p-3 font-mono text-[11px] text-slate-400">${(l.timestamp || '').slice(0, 16).replace('T', ' ')}</td>
        <td class="p-3 font-bold text-white">${l.product_name}</td>
        <td class="p-3"><span class="bg-rose-950/80 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">${l.table_class}</span></td>
        <td class="p-3 font-bold text-cyan-300">${l.patient_name}<br><span class="text-[10px] text-slate-400 font-mono">${l.patient_national_id}</span></td>
        <td class="p-3">${l.doctor_name}</td>
        <td class="p-3 font-mono text-slate-300">${l.prescription_no}</td>
        <td class="p-3 font-black text-rose-400">${l.qty_dispensed} علبة</td>
        <td class="p-3 font-bold text-slate-200">${l.remaining_stock}</td>
        <td class="p-3 text-slate-400">${l.pharmacist_name}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {}
}

function printTableInspectionReport() {
  window.print();
}

// 4. IN-PHARMACY CLINIC SERVICES
function calculateClinicAssessment() {
  const sys = parseInt(document.getElementById('clinicBpSys').value, 10);
  const dia = parseInt(document.getElementById('clinicBpDia').value, 10);
  const pulse = parseInt(document.getElementById('clinicPulse').value, 10) || 72;
  const bpBadge = document.getElementById('bpStatusBadge');

  if (sys && dia) {
    let bpText = '', bpClass = '';
    if (sys < 120 && dia < 80) {
      bpText = '🟢 ضغط مثالي (Optimal Blood Pressure)';
      bpClass = 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40';
    } else if (sys <= 129 && dia < 80) {
      bpText = '🟡 ما قبل ارتفاع ضغط الدم (Prehypertension)';
      bpClass = 'bg-amber-950/80 text-amber-300 border border-amber-500/40';
    } else if (sys <= 139 || dia <= 89) {
      bpText = '🟠 ارتفاع ضغط دم - مرحلة أولى (Stage 1 HTN)';
      bpClass = 'bg-orange-950/80 text-orange-300 border border-orange-500/40';
    } else if (sys >= 180 || dia >= 120) {
      bpText = '🚨 أزمة ارتفاع ضغط دم طارئة (Hypertensive Crisis)';
      bpClass = 'bg-rose-950/90 text-rose-300 border border-rose-500 font-black animate-pulse';
    } else {
      bpText = '🔴 ارتفاع ضغط دم - مرحلة ثانية (Stage 2 HTN)';
      bpClass = 'bg-rose-950/80 text-rose-300 border border-rose-500/40';
    }
    bpBadge.className = `text-xs py-1.5 px-3 rounded-xl font-bold text-center ${bpClass}`;
    bpBadge.innerText = bpText;
    document.getElementById('prevBp').innerText = `${sys} / ${dia}`;
    document.getElementById('prevPulse').innerText = `${pulse} BPM`;
  }

  // Glucose
  const gluc = parseFloat(document.getElementById('clinicGlucoseValue').value);
  const glucType = document.getElementById('clinicGlucoseType').value;
  const glucBadge = document.getElementById('glucoseStatusBadge');
  if (gluc) {
    let glucText = 'طبيعي', glucClass = 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40';
    if (gluc < 70) {
      glucText = '🚨 هبوط حاد في السكر (Hypoglycemia) - ينصح بسكريات فوراً';
      glucClass = 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse';
    } else if (gluc > 200) {
      glucText = '⚠️ ارتفاع ملحوظ في السكر (Hyperglycemia)';
      glucClass = 'bg-amber-950 text-amber-300 border border-amber-500/40';
    }
    glucBadge.className = `text-xs py-1.5 px-3 rounded-xl font-bold text-center ${glucClass}`;
    glucBadge.innerText = glucText;
    document.getElementById('prevGlucose').innerText = `${gluc} mg/dL (${glucType})`;
  }

  // BMI
  const w = parseFloat(document.getElementById('clinicWeight').value);
  const h = parseFloat(document.getElementById('clinicHeight').value);
  const bmiBadge = document.getElementById('bmiStatusBadge');
  if (w && h) {
    const hM = h / 100;
    const bmi = (w / (hM * hM)).toFixed(1);
    let bmiText = '';
    if (bmi < 18.5) bmiText = `نحافة (BMI: ${bmi})`;
    else if (bmi < 25) bmiText = `وزن مثالي متناسق (BMI: ${bmi})`;
    else if (bmi < 30) bmiText = `زيادة وزن طفيفة (BMI: ${bmi})`;
    else bmiText = `سمنة (BMI: ${bmi}) - يوصى بنظام غذائي`;
    bmiBadge.className = 'text-xs py-1.5 px-3 rounded-xl bg-teal-950/80 text-teal-300 border border-teal-500/40 font-bold text-center';
    bmiBadge.innerText = bmiText;
    document.getElementById('prevBmi').innerText = bmiText;
  }

  const pName = document.getElementById('clinicPatientName').value.trim();
  if (pName) document.getElementById('prevPatient').innerText = pName;
}

function printClinicThermalCard() {
  calculateClinicAssessment();
  window.print();
}

function sendClinicWhatsApp() {
  const phone = document.getElementById('clinicPatientPhone').value.trim();
  const name = document.getElementById('clinicPatientName').value.trim() || 'العميل الكريم';
  const bp = document.getElementById('prevBp').innerText;
  const pulse = document.getElementById('prevPulse').innerText;
  const gluc = document.getElementById('prevGlucose').innerText;
  const bmi = document.getElementById('prevBmi').innerText;

  if (!phone) {
    alert('يرجى إدخال رقم واتساب المريض!');
    return;
  }

  const msg = `*صيدلية بحبح - تقرير الفحص الطبي الصيدلاني 🩺*\\n` +
    `مرحباً أستاذ: ${name}\\n` +
    `تاريخ الفحص: ${new Date().toLocaleDateString('ar-EG')}\\n\\n` +
    `📊 *نتائج القياسات الحيوية:*\\n` +
    `• ضغط الدم: ${bp}\\n` +
    `• النبض: ${pulse}\\n` +
    `• السكر بالدم: ${gluc}\\n` +
    `• كتلة الجسم: ${bmi}\\n\\n` +
    `نتمنى لكم دوام الصحة والعافية! 🌸`;

  const cleanPhone = phone.startsWith('0') ? '2' + phone : phone;
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}
"""

print('JS Logic loaded, updating targets...')
