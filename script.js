const SUPABASE_URL = "https://wpyxkfoxdshhpjkgctsi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweXhrZm94ZHNoaHBqa2djdHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODM4ODIsImV4cCI6MjA4OTA1OTg4Mn0.wKvdJSVqE4Sg2FoPwKE65NK6xB1eRVeE336a6rRhmj4";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload = loadDashboard;
let selectedFlat = null;

function openPricingForm(flat) {
    selectedFlat = flat;
    document.getElementById("pricingModal").style.display = "block";
}

function closeModal() {
    document.getElementById("pricingModal").style.display = "none";
}

async function loadDashboard() {
    let { data } = await supabaseClient.from("flats").select("*");
    let total     = data.filter(f => f.availability !== "lobby").length;
    let available = data.filter(f => f.availability === "available").length;
    let sold      = data.filter(f => f.availability === "sold").length;
    document.getElementById("totalUnits").innerText     = total;
    document.getElementById("availableUnits").innerText = available;
    document.getElementById("soldUnits").innerText      = sold;
    document.getElementById("liveAvailable").innerText  = "Available: " + available;
    document.getElementById("liveSold").innerText       = "Sold: " + sold;
}

function openBlock(block) {
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.trim() === `Block ${block}`) btn.classList.add('active');
    });
    let floors = document.getElementById("floors");
    floors.innerHTML = "<h3>Select Floor</h3>";
    let grid = document.createElement("div");
    grid.className = "floor-grid";
    ["G", "1", "2", "3", "4", "5"].forEach(f => {
        let btn = document.createElement("button");
        btn.className = "floor-btn";
        btn.innerText = "Floor " + f;
        btn.onclick = () => {
            document.querySelectorAll('.floor-btn').forEach(fb => fb.classList.remove('active'));
            btn.classList.add('active');
            openFloor(block, f);
        };
        grid.appendChild(btn);
    });
    floors.appendChild(grid);
    document.getElementById("flats").innerHTML = "";
}

async function openFloor(block, floor) {
    let { data } = await supabaseClient
        .from("flats").select("*")
        .eq("block", block).eq("floor", floor)
        .order("flat_number", { ascending: true });
    let flatsContainer = document.getElementById("flats");
    flatsContainer.innerHTML = "";
    let west = data.filter(f => f.facing === "West");
    let east = data.filter(f => f.facing === "East");
    let layout = document.createElement("div");
    layout.className = "floor-layout";
    let row1 = document.createElement("div");
    row1.className = "flat-row";
    west.forEach(f => row1.appendChild(createFlat(f)));
    let corridor = document.createElement("div");
    corridor.className = "corridor";
    corridor.innerText = "LIFT / CORRIDOR / STAIRS";
    let row2 = document.createElement("div");
    row2.className = "flat-row";
    east.reverse().forEach(f => row2.appendChild(createFlat(f)));
    layout.appendChild(row1);
    layout.appendChild(corridor);
    layout.appendChild(row2);
    flatsContainer.appendChild(layout);
}

function createFlat(flat) {
    let div = document.createElement("div");
    if (flat.availability === "lobby") {
        div.className = "flat-card lobby-box";
        div.innerHTML = `<div style="font-size: 10px;">LOBBY</div>`;
        return div;
    }
    let isReserved  = flat.availability.toLowerCase().includes("reserved");
    let statusClass = isReserved ? "reserved" : flat.availability;
    let statusText  = flat.availability.toUpperCase();
    if (statusText.includes("(M)")) {
        statusText = statusText.replace("(M)", '<span class="mortgage-tag">(M)</span>');
    }
    div.className = "flat-card";
    div.innerHTML = `
        <div class="flat-number" style="font-size:16px;">${flat.flat_number}</div>
        <div class="unit-info" style="font-size:10px;color:#666;margin-bottom:8px;">
            ${flat.bhk} • ${flat.sft} sft • <strong>${flat.facing}</strong>
        </div>
        <div class="status ${statusClass}">${statusText}</div>`;
    if (flat.availability === "available") {
        div.style.cursor = "pointer";
        div.onclick = () => openPricingForm(flat);
    }
    return div;
}

function calculateCost(flat, rate, facingEnabled) {
    const area          = flat.sft;
    const basePrice     = area * rate;
    const amenities     = flat.bhk.includes("2") ? 600000 : 700000;
    const facingCharges = facingEnabled ? area * 100 : 0;
    const totalValue    = basePrice + amenities;
    const gst           = totalValue * 0.05;
    const totalAmount   = totalValue + gst;
    const maintenance   = area * 3 * 12;
    const corpus        = area * 75;
    const registration  = totalAmount * 0.076;
    const documentation = 15000;
    const totalExtra    = facingCharges + maintenance + corpus + registration + documentation;
    const grandTotal    = totalAmount + totalExtra;
    const twentyPercent = grandTotal * 0.20;
    const loanAmount    = grandTotal - twentyPercent;
    return { area, basePrice, amenities, facingCharges, totalValue, gst, totalAmount,
             maintenance, corpus, registration, documentation, totalExtra, grandTotal,
             bookingAmount: 500000, twentyPercent, loanAmount };
}

function generatePriceSheet() {
    const name   = document.getElementById("customerName").value.trim();
    const rate   = parseFloat(document.getElementById("pricePerSft").value);
    const facing = document.getElementById("facingCharges").checked;
    if (!name || !rate) { alert("Please fill all fields"); return; }
    closeModal();

    const r = calculateCost(selectedFlat, rate, facing);

    // Build a self-contained HTML string for the PDF — no DOM tricks needed
    const logoSrc = document.querySelector("#pdfTemplate img").src; // already base64

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;width:680px;color:#334155;background:#fff;padding:24px;">

      <!-- HEADER -->
      <table width="100%" cellspacing="0" cellpadding="0" style="border-bottom:3px solid #1a365d;padding-bottom:16px;margin-bottom:20px;">
        <tr>
          <td>
            <img src="${logoSrc}" style="height:55px;display:block;" />
            <div style="font-size:9px;color:#64748b;letter-spacing:2px;margin-top:4px;text-transform:uppercase;">Enshining Lifestyles</div>
          </td>
          <td align="right">
            <div style="font-size:18px;font-weight:bold;color:#1a365d;letter-spacing:1px;">SUNSHINE GREEN MEADOWS</div>
            <div style="background:#d97706;color:white;display:inline-block;padding:3px 10px;font-size:12px;font-weight:bold;margin-top:6px;border-radius:4px;">OFFICIAL COST SHEET</div>
          </td>
        </tr>
      </table>

      <!-- CUSTOMER INFO -->
      <table width="100%" cellspacing="0" cellpadding="8" style="margin-bottom:16px;border:1px solid #e2e8f0;">
        <tr style="background:#f8fafc;">
          <td style="width:30%;color:#d97706;font-weight:bold;font-size:11px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Customer Name</td>
          <td style="border-bottom:1px solid #e2e8f0;font-weight:600;">${name}</td>
        </tr>
        <tr>
          <td style="color:#d97706;font-weight:bold;font-size:11px;text-transform:uppercase;">Block - Floor - Flat</td>
          <td style="font-weight:600;">${selectedFlat.flat_number}</td>
        </tr>
      </table>

      <!-- STANDARD CHARGES -->
      <table width="100%" cellspacing="0" cellpadding="7" style="margin-bottom:16px;border:1px solid #e2e8f0;">
        <tr style="background:#1a365d;color:white;">
          <th align="left" style="padding:10px;">Standard Unit Description</th>
          <th align="right" style="padding:10px;">Amount (₹)</th>
        </tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Area in Sft</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${r.area.toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Base Price (per Sft)</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${r.basePrice.toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Amenities / Club House / Parking</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${r.amenities.toLocaleString()}</td></tr>
        <tr style="background:#f1f5f9;font-weight:bold;"><td>Total Value</td><td align="right">${r.totalValue.toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">GST Amount (5%)</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${Math.round(r.gst).toLocaleString()}</td></tr>
        <tr style="background:#1e293b;color:white;font-weight:bold;font-size:14px;">
          <td style="padding:10px;">Total Standard Amount</td>
          <td align="right" style="padding:10px;">${Math.round(r.totalAmount).toLocaleString()}</td>
        </tr>
      </table>

      <!-- EXTRA CHARGES -->
      <table width="100%" cellspacing="0" cellpadding="7" style="margin-bottom:16px;border:1px solid #e2e8f0;">
        <tr style="background:#64748b;color:white;">
          <th align="left" style="padding:10px;">Additional & Statutory Charges</th>
          <th align="right" style="padding:10px;">Amount (₹)</th>
        </tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Facing Charges (East/Corner)</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${r.facingCharges.toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Maintenance (12 Months)</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${r.maintenance.toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Corpus Fund</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${r.corpus.toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Registration Charges (7.6%)</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${Math.round(r.registration).toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Documentation & Processing</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${r.documentation.toLocaleString()}</td></tr>
        <tr style="background:#f1f5f9;font-weight:bold;color:#1e293b;">
          <td>Total Extra Charges</td><td align="right">${Math.round(r.totalExtra).toLocaleString()}</td>
        </tr>
      </table>

      <!-- GRAND TOTAL -->
      <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;border-radius:4px;overflow:hidden;">
        <tr style="background:#1a365d;color:white;">
          <td style="padding:16px;font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Grand Total (Inclusive of all)</td>
          <td align="right" style="padding:16px;font-size:20px;font-weight:bold;white-space:nowrap;">${Math.round(r.grandTotal).toLocaleString()}</td>
        </tr>
      </table>

      <!-- PAYMENT SCHEDULE -->
      <table width="100%" cellspacing="0" cellpadding="7" style="margin-bottom:20px;border:1px solid #e2e8f0;border-left:5px solid #d97706;">
        <tr style="background:#fffbeb;">
          <td colspan="2" style="color:#92400e;font-weight:bold;font-size:12px;text-transform:uppercase;">Payment Schedule</td>
        </tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Booking Amount</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">₹ 5,00,000</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">20% Milestone Amount (Inc. Booking)</td><td align="right" style="font-weight:600;border-bottom:1px solid #f1f5f9;">${Math.round(r.twentyPercent).toLocaleString()}</td></tr>
        <tr><td>Estimated Loan Amount</td><td align="right" style="font-weight:bold;color:#1a365d;">${Math.round(r.loanAmount).toLocaleString()}</td></tr>
      </table>

      <!-- T&C -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:4px;">
        <strong style="color:#1a365d;font-size:12px;display:block;margin-bottom:8px;text-transform:uppercase;">Important Terms & Conditions</strong>
        <ol style="margin:0;padding-left:16px;font-size:11px;color:#475569;line-height:1.8;">
          <li>The Sale of Agreement will be executed only after the successful receipt of 20% of the total payment.</li>
          <li>All cheques/payments must be made in favor of <strong style="color:#1a365d;">"Sunshine Infra Private Limited"</strong>.</li>
          <li>Corpus fund of ₹75/- per sft is mandatory and payable at the time of property handover.</li>
          <li>Statutory documentation and registration charges are subject to government norms at the time of registration.</li>
        </ol>
      </div>

    </div>`;

    // Create a fresh offscreen container, inject HTML, capture — zero DOM side effects
    const wrapper = document.createElement("div");
wrapper.style.cssText = "position:absolute;left:0;top:0;width:728px;overflow:hidden;background:#fff;z-index:-1;pointer-events:none;";
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    setTimeout(() => {
        html2pdf().set({
            margin:      [8, 8, 8, 8],
            filename:    `PriceSheet_${name}.pdf`,
            image:       { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
            jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(wrapper)
        .save()
        .then(() => {
            document.body.removeChild(wrapper);
            const text = `Hi ${name}, please find the cost sheet for flat ${selectedFlat.flat_number} attached.`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
        });
    }, 300);
}

async function updateFlatStatus() {
    let flat   = document.getElementById("flatNumber").value;
    let status = document.getElementById("flatStatus").value;
    await supabaseClient.from("flats").update({ availability: status }).eq("flat_number", flat);
    alert("Updated");
}
