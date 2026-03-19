const SUPABASE_URL = "https://wpyxkfoxdshhpjkgctsi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweXhrZm94ZHNoaHBqa2djdHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODM4ODIsImV4cCI6MjA4OTA1OTg4Mn0.wKvdJSVqE4Sg2FoPwKE65NK6xB1eRVeE336a6rRhmj4";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload=loadDashboard

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

    // Determine the Class and Text
    let isReserved = flat.availability.toLowerCase().includes("reserved");
    let statusClass = isReserved ? "reserved" : flat.availability;
    let displayStatus = flat.availability.toUpperCase();
    
    if (displayStatus.includes("(M)")) {
        displayStatus = displayStatus.replace("(M)", '<span class="mortgage-tag">(M)</span>');
    }

    div.className = `flat-card ${statusClass}`;
    
    // THE WHATSAPP INTEGRATION
    // We only add the click event if the flat is AVAILABLE
 if (flat.availability === "available") {
    div.onclick = () => {
        // Use encodeURIComponent to make sure the message works on all phones
        let message = encodeURIComponent(
            `*Sunshine Green Meadows - Flat Inquiry*\n\n` +
            `*Flat:* ${flat.flat_number}\n` +
            `*Configuration:* ${flat.bhk}\n` +
            `*Area:* ${flat.sft} Sft\n` +
            `*Facing:* ${flat.facing}\n\n` +
            `This unit is currently *AVAILABLE*.`
        );
        
        // This 'wa.me' link works better on both Android and iPhone
        window.location.href = `https://wa.me/?text=${message}`;
    };
}

    div.innerHTML = `
        <div class="flat-number" style="font-size: 16px;">${flat.flat_number}</div>
        <div class="unit-info" style="font-size: 10px; color: #666; margin-bottom: 8px;">
            ${flat.bhk} • ${flat.sft} sft • <strong>${flat.facing}</strong>
        </div>
        <div class="status ${statusClass}">
            ${displayStatus}
        </div>
    `;
    return div;
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
