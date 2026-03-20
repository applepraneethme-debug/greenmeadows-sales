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

    document.getElementById("totalUnits").innerText    = total;
    document.getElementById("availableUnits").innerText = available;
    document.getElementById("soldUnits").innerText     = sold;

    document.getElementById("liveAvailable").innerText = "Available: " + available;
    document.getElementById("liveSold").innerText      = "Sold: " + sold;
}

function openBlock(block) {
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.trim() === `Block ${block}`) {
            btn.classList.add('active');
        }
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
        .from("flats")
        .select("*")
        .eq("block", block)
        .eq("floor", floor)
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

    if (flat.availability === "available") {
        div.style.cursor = "pointer";
        div.onclick = () => openPricingForm(flat);
    }

    return div;
}

function calculateCost(flat, rate, facingEnabled) {
    const area        = flat.sft;
    const basePrice   = area * rate;
    let   amenities   = flat.bhk.includes("2") ? 600000 : 700000;
    const facingCharges = facingEnabled ? area * 100 : 0;

    const totalValue  = basePrice + amenities;
    const gst         = totalValue * 0.05;
    const totalAmount = totalValue + gst;

    const maintenance    = area * 3 * 12;
    const corpus         = area * 75;
    const registration   = totalAmount * 0.076;
    const documentation  = 15000;

    const totalExtra  = facingCharges + maintenance + corpus + registration + documentation;
    const grandTotal  = totalAmount + totalExtra;

    const bookingAmount  = 500000;
    const twentyPercent  = grandTotal * 0.20;
    const loanAmount     = grandTotal - twentyPercent;

    return {
        area, basePrice, amenities, facingCharges,
        totalValue, gst, totalAmount,
        maintenance, corpus, registration, documentation,
        totalExtra, grandTotal,
        bookingAmount, twentyPercent, loanAmount
    };
}

function generatePriceSheet() {
    const name   = document.getElementById("customerName").value.trim();
    const rate   = parseFloat(document.getElementById("pricePerSft").value);
    const facing = document.getElementById("facingCharges").checked;

    if (!name || !rate) {
        alert("Please fill all fields");
        return;
    }

    closeModal();

    const result = calculateCost(selectedFlat, rate, facing);

    document.getElementById("pdfName").innerText         = name;
    document.getElementById("pdfFlat").innerText         = selectedFlat.flat_number;
    document.getElementById("pdfArea").innerText         = result.area.toLocaleString();
    document.getElementById("pdfBase").innerText         = result.basePrice.toLocaleString();
    document.getElementById("pdfAmenities").innerText    = result.amenities.toLocaleString();
    document.getElementById("pdfTotalValue").innerText   = result.totalValue.toLocaleString();
    document.getElementById("pdfGST").innerText          = Math.round(result.gst).toLocaleString();
    document.getElementById("pdfTotalAmount").innerText  = Math.round(result.totalAmount).toLocaleString();
    document.getElementById("pdfFacing").innerText       = result.facingCharges.toLocaleString();
    document.getElementById("pdfMaintenance").innerText  = result.maintenance.toLocaleString();
    document.getElementById("pdfCorpus").innerText       = result.corpus.toLocaleString();
    document.getElementById("pdfRegistration").innerText = Math.round(result.registration).toLocaleString();
    document.getElementById("pdfDoc").innerText          = result.documentation.toLocaleString();
    document.getElementById("pdfExtra").innerText        = Math.round(result.totalExtra).toLocaleString();
    document.getElementById("pdfGrand").innerText        = Math.round(result.grandTotal).toLocaleString();
    document.getElementById("pdf20").innerText           = Math.round(result.twentyPercent).toLocaleString();
    document.getElementById("pdfLoan").innerText         = Math.round(result.loanAmount).toLocaleString();

    // Reveal the template so html2pdf can capture it
    const element = document.getElementById("pdfTemplate");
    // reveal from off-screen
    element.style.left = "0"; element.style.top = "0"; element.style.position = "static";
    
    

    setTimeout(() => {
        const opt = {
            margin:      [10, 10, 10, 10],
            filename:    `PriceSheet_${name}.pdf`,
            image:       { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf()
            .set(opt)
            .from(element)
            .save()
            .then(() => {
                element.style.position = "absolute"; element.style.left = "-9999px";
                

                const text = `Hi ${name}, please find the cost sheet for flat ${selectedFlat.flat_number} attached.`;
                const url  = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                window.open(url, "_blank");
            });
    }, 400);
}

async function updateFlatStatus() {
    let flat   = document.getElementById("flatNumber").value;
    let status = document.getElementById("flatStatus").value;

    await supabaseClient
        .from("flats")
        .update({ availability: status })
        .eq("flat_number", flat);

    alert("Updated");
}
