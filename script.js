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
    const name = document.getElementById("customerName").value.trim();
    const rate = parseFloat(document.getElementById("pricePerSft").value);
    const facing = document.getElementById("facingCharges").checked;
    
    if (!name || !rate) { 
        alert("Please fill all fields"); 
        return; 
    }
    
    closeModal();

    const r = calculateCost(selectedFlat, rate, facing);
    const logoSrc = document.querySelector("#pdfTemplate img").src;

    // We create a container specifically styled for mobile compatibility
    const container = document.createElement("div");
    container.id = "mobile-pdf-container";
    
    // Critical styles for mobile rendering:
    // 1. Position absolute at 0,0 
    // 2. Fixed width so it doesn't "squish" on small phone screens
    // 3. Z-index -1 so the user doesn't see it pop up briefly
    container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 800px;
        background: white;
        z-index: -1;
        overflow: hidden;
    `;

    container.innerHTML = `
    <div style="font-family:'Segoe UI',Arial,sans-serif; width:100%; color:#334155; background:#ffffff; padding:40px; box-sizing:border-box;">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-bottom:3px solid #1a365d; padding-bottom:20px; margin-bottom:25px;">
        <tr>
          <td>
            <img src="${logoSrc}" style="height:60px; display:block;" />
            <div style="font-size:10px; color:#64748b; letter-spacing:2px; margin-top:5px; text-transform:uppercase;">Enshining Lifestyles</div>
          </td>
          <td align="right">
            <div style="font-size:22px; font-weight:bold; color:#1a365d; letter-spacing:1px;">SUNSHINE GREEN MEADOWS</div>
            <div style="background:#d97706; color:white; display:inline-block; padding:5px 12px; font-size:12px; font-weight:bold; margin-top:8px; border-radius:4px;">OFFICIAL COST SHEET</div>
          </td>
        </tr>
      </table>

      <table width="100%" cellspacing="0" cellpadding="12" style="margin-bottom:20px; border:1px solid #e2e8f0;">
        <tr style="background:#f8fafc;">
          <td style="width:30%; color:#d97706; font-weight:bold; font-size:12px; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Customer Name</td>
          <td style="border-bottom:1px solid #e2e8f0; font-weight:600; font-size:16px;">${name}</td>
        </tr>
        <tr>
          <td style="color:#d97706; font-weight:bold; font-size:12px; text-transform:uppercase;">Flat Details</td>
          <td style="font-weight:600; font-size:16px;">Flat No: ${selectedFlat.flat_number} (${selectedFlat.bhk})</td>
        </tr>
      </table>

      <table width="100%" cellspacing="0" cellpadding="10" style="margin-bottom:20px; border:1px solid #e2e8f0;">
        <tr style="background:#1a365d; color:white;">
          <th align="left">Description</th>
          <th align="right">Amount (₹)</th>
        </tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Area (${r.area} Sft) @ ₹${rate}/sft</td><td align="right" style="font-weight:600;">${r.basePrice.toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Amenities & Parking</td><td align="right" style="font-weight:600;">${r.amenities.toLocaleString()}</td></tr>
        <tr style="background:#f1f5f9; font-weight:bold;"><td>Total Value</td><td align="right">${r.totalValue.toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">GST (5%)</td><td align="right" style="font-weight:600;">${Math.round(r.gst).toLocaleString()}</td></tr>
        <tr style="background:#1e293b; color:white; font-size:16px; font-weight:bold;">
          <td>Total Standard Amount</td><td align="right">${Math.round(r.totalAmount).toLocaleString()}</td>
        </tr>
      </table>

      <table width="100%" cellspacing="0" cellpadding="10" style="margin-bottom:20px; border:1px solid #e2e8f0;">
        <tr style="background:#64748b; color:white;"><th align="left">Statutory & Extra Charges</th><th align="right">Amount (₹)</th></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Facing & Registration Charges</td><td align="right" style="font-weight:600;">${Math.round(r.facingCharges + r.registration).toLocaleString()}</td></tr>
        <tr><td style="border-bottom:1px solid #f1f5f9;">Maintenance & Corpus Fund</td><td align="right" style="font-weight:600;">${(r.maintenance + r.corpus).toLocaleString()}</td></tr>
        <tr style="background:#1a365d; color:white; font-size:18px; font-weight:bold;">
          <td>GRAND TOTAL</td><td align="right">${Math.round(r.grandTotal).toLocaleString()}</td>
        </tr>
      </table>

      <div style="border:1px solid #d97706; border-left:6px solid #d97706; background:#fffbeb; padding:20px; border-radius:4px;">
        <strong style="color:#92400e; font-size:14px; text-transform:uppercase;">Payment Schedule</strong>
        <table width="100%" style="margin-top:10px; font-size:14px;">
            <tr><td style="padding:4px 0;">Booking Amount</td><td align="right">₹ 5,00,000</td></tr>
            <tr><td style="padding:4px 0;">20% Milestone Amount</td><td align="right">₹ ${Math.round(r.twentyPercent).toLocaleString()}</td></tr>
            <tr><td style="padding:4px 0; font-weight:bold; border-top:1px solid #d97706;">Estimated Loan</td><td align="right" style="font-weight:bold; color:#1a365d;">₹ ${Math.round(r.loanAmount).toLocaleString()}</td></tr>
        </table>
      </div>
    </div>`;

    document.body.appendChild(container);

    // Give it a longer delay for mobile browsers to load the layout
    setTimeout(() => {
        const opt = {
            margin:      [5, 5, 5, 5],
            filename:    `PriceSheet_${name.replace(/\s+/g, '_')}.pdf`,
            image:       { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                letterRendering: true,
                // These three lines fix the "pushed to bottom" issue on mobile
                scrollY: 0,
                scrollX: 0,
                windowWidth: 800 
            },
            jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(container).save().then(() => {
            document.body.removeChild(container);
            const text = `Hi ${name}, please find the cost sheet for flat ${selectedFlat.flat_number} attached.`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
        });
    }, 1000); 
}
async function updateFlatStatus() {
    let flat   = document.getElementById("flatNumber").value;
    let status = document.getElementById("flatStatus").value;
    await supabaseClient.from("flats").update({ availability: status }).eq("flat_number", flat);
    alert("Updated");
}
