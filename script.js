const SUPABASE_URL = "https://wpyxkfoxdshhpjkgctsi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweXhrZm94ZHNoaHBqa2djdHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODM4ODIsImV4cCI6MjA4OTA1OTg4Mn0.wKvdJSVqE4Sg2FoPwKE65NK6xB1eRVeE336a6rRhmj4";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload=loadDashboard
let selectedFlat = null;

function openPricingForm(flat) {
    selectedFlat = flat;
    document.getElementById("pricingModal").style.display = "block";
}

function closeModal() {
    document.getElementById("pricingModal").style.display = "none";
}
async function loadDashboard(){ 

let {data}=await supabaseClient.from("flats").select("*")

let total=data.filter(f=>f.availability!=="lobby").length
let available=data.filter(f=>f.availability==="available").length
let sold=data.filter(f=>f.availability==="sold").length

document.getElementById("totalUnits").innerText=total
document.getElementById("availableUnits").innerText=available
document.getElementById("soldUnits").innerText=sold

document.getElementById("liveAvailable").innerText="Available: "+available
document.getElementById("liveSold").innerText="Sold: "+sold
}

function openBlock(block) {
    // 1. Handle Active UI with Exact Match
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.classList.remove('active');
        // We check if the button text is exactly "Block " + the letter (e.g., "Block B")
        if (btn.innerText.trim() === `Block ${block}`) {
            btn.classList.add('active');
        }
    });

    let floors = document.getElementById("floors");
    floors.innerHTML = "<h3>Select Floor</h3>";

    let grid = document.createElement("div");
    grid.className = "floor-grid";

    let list = ["G", "1", "2", "3", "4", "5"];

    list.forEach(f => {
        let btn = document.createElement("button");
        btn.className = "floor-btn";
        btn.innerText = "Floor " + f;
        btn.onclick = (e) => {
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
        .from("flats")
        .select("*")
        .eq("block", block)
        .eq("floor", floor)
        .order("flat_number", { ascending: true });

    let flatsContainer = document.getElementById("flats");
    flatsContainer.innerHTML = "";

    // Separate based on your architectural plan
    // Usually North/West in the top row, South/East in the bottom row
    let west = data.filter(f => f.facing === "West");
    let east = data.filter(f => f.facing === "East");

    let layout = document.createElement("div");
    layout.className = "floor-layout";

    // TOP ROW (e.g., Flats 5, 6, 7, 8)
    let row1 = document.createElement("div");
    row1.className = "flat-row";
    west.forEach(f => row1.appendChild(createFlat(f)));

    // THE CORRIDOR
    let corridor = document.createElement("div");
    corridor.className = "corridor";
    corridor.innerText = "LIFT / CORRIDOR / STAIRS";

    // BOTTOM ROW (e.g., Flats 4, 3, 2, 1)
    // Note: Use .reverse() if you want the numbers to count down as in your sketch
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

    let isReserved = flat.availability.toLowerCase().includes("reserved");
    let statusClass = isReserved ? "reserved" : flat.availability;
    let statusText = flat.availability.toUpperCase();

    if (statusText.includes("(M)")) {
        statusText = statusText.replace("(M)", '<span class="mortgage-tag">(M)</span>');
    }

    div.className = "flat-card";
    div.innerHTML = `
        <div class="flat-number" style="font-size: 16px;">${flat.flat_number}</div>
        <div class="unit-info" style="font-size: 10px; color: #666; margin-bottom: 8px;">
            ${flat.bhk} • ${flat.sft} sft • <strong>${flat.facing}</strong>
        </div>
        <div class="status ${statusClass}">
            ${statusText}
        </div>
    `;

    // ✅ WHATSAPP CLICK FEATURE (FIXED FOR MOBILE)
    if (flat.availability === "available") {
        div.style.cursor = "pointer";

      div.onclick = () => {
    openPricingForm(flat);
};
    }

    return div;
}
function calculateCost(flat, rate, facingEnabled) {

    const area = flat.sft;

    // 1. Base price
    const basePrice = area * rate;

    // 2. Amenities
    let amenities = flat.bhk.includes("2") ? 600000 : 700000;

    // 3. Facing charges
    const facingCharges = facingEnabled ? area * 100 : 0;

    // 4. Total Value BEFORE GST
    const totalValue = basePrice + amenities;

    // 5. GST (5%)
    const gst = totalValue * 0.05;

    // 6. Total Amount (after GST)
    const totalAmount = totalValue + gst;

    // ========================
    // EXTRA CHARGES
    // ========================

    const maintenance = area * 3 * 12;      // ₹3 per sft * 12 months
    const corpus = area * 75;               // ₹75 per sft
    const registration = totalAmount * 0.076; // 7.6%
    const documentation = 15000;

    const totalExtra =
        facingCharges +
        maintenance +
        corpus +
        registration +
        documentation;

    // ========================
    // GRAND TOTAL
    // ========================

    const grandTotal = totalAmount + totalExtra;

    // ========================
    // PAYMENT SCHEDULE
    // ========================

    const bookingAmount = 500000;
    const twentyPercent = grandTotal * 0.20;
    const loanAmount = grandTotal - twentyPercent;

    return {
        area,
        basePrice,
        amenities,
        facingCharges,
        totalValue,
        gst,
        totalAmount,
        maintenance,
        corpus,
        registration,
        documentation,
        totalExtra,
        grandTotal,
        bookingAmount,
        twentyPercent,
        loanAmount
    };
}
function generatePriceSheet() {
    const name = document.getElementById("customerName").value;
    const rate = parseFloat(document.getElementById("pricePerSft").value);
    const facing = document.getElementById("facingCharges").checked;

    if (!name || !rate) {
        alert("Please fill all fields");
        return;
    }

    const result = calculateCost(selectedFlat, rate, facing);

    // Fill template
    document.getElementById("pdfName").innerText = name;
    document.getElementById("pdfFlat").innerText = selectedFlat.flat_number;

    document.getElementById("pdfArea").innerText = result.area;
    document.getElementById("pdfBase").innerText = result.basePrice.toLocaleString();
    document.getElementById("pdfAmenities").innerText = result.amenities.toLocaleString();
    document.getElementById("pdfTotalValue").innerText = result.totalValue.toLocaleString();
    document.getElementById("pdfGST").innerText = result.gst.toLocaleString();
    document.getElementById("pdfTotalAmount").innerText = result.totalAmount.toLocaleString();

    document.getElementById("pdfFacing").innerText = result.facingCharges.toLocaleString();
    document.getElementById("pdfMaintenance").innerText = result.maintenance.toLocaleString();
    document.getElementById("pdfCorpus").innerText = result.corpus.toLocaleString();
    document.getElementById("pdfRegistration").innerText = result.registration.toLocaleString();
    document.getElementById("pdfDoc").innerText = result.documentation.toLocaleString();

    document.getElementById("pdfExtra").innerText = result.totalExtra.toLocaleString();
    document.getElementById("pdfGrand").innerText = result.grandTotal.toLocaleString();

    document.getElementById("pdf20").innerText = result.twentyPercent.toLocaleString();
    document.getElementById("pdfLoan").innerText = result.loanAmount.toLocaleString();

    // Generate PDF
const element = document.getElementById("pdfTemplate");

// show temporarily
element.style.visibility = "visible";
element.style.position = "static";

// ⬇️ ADD setTimeout HERE
setTimeout(() => {
    html2pdf().from(element).save(`PriceSheet_${name}.pdf`).then(() => {

        element.style.visibility = "hidden";
        element.style.position = "absolute";

        const text = `Hi ${name}, sharing your flat cost sheet.`;
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

        window.open(url, "_blank");

    });
}, 300);
    closeModal();
}

async function updateFlatStatus(){

let flat=document.getElementById("flatNumber").value
let status=document.getElementById("flatStatus").value

await supabaseClient
.from("flats")
.update({availability:status})
.eq("flat_number",flat)

alert("Updated")
}

