const distanceMatrix = {
    "Kolkata": { "Howrah": 15, "Siliguri": 580, "Durgapur": 170, "Malda": 330, "Midnapore": 130, "Nadia": 110, "Murshidabad": 210 },
    "Howrah": { "Kolkata": 15, "Siliguri": 578, "Durgapur": 165, "Midnapore": 115 },
    "Siliguri": { "Kolkata": 580, "Darjeeling": 65, "Jalpaiguri": 45, "Malda": 250 },
    "Durgapur": { "Kolkata": 170, "Asansol": 40, "Bankura": 50, "Birbhum": 60 },
    "Malda": { "Kolkata": 330, "Siliguri": 250, "Murshidabad": 110 },
    "Midnapore": { "Kolkata": 130, "Digha": 95, "Haldia": 85, "Kharagpur": 15 }
};

const subPlaces = {
    "Kolkata": ["Airport (CCU)", "Sealdah Stn", "Howrah Ferry Ghat", "Esplanade Bus Stand", "Babughat Stand", "Karunamoyee", "Tollygunge Metro", "New Town", "Salt Lake Sec-V"],
    "Howrah": ["Howrah Jn (HWH)", "Santragachi Stn", "Shalimar Stn", "Nabanna", "Bally Stn", "Belur Ferry Ghat"],
    "Siliguri": ["Bagdogra Intl Airport", "NJP Railway Stn", "Siliguri Jn", "Tenzing Norgay Bus Stand", "P.C. Mittal Stand"],
    "Durgapur": ["Andal Airport", "Durgapur Stn", "City Centre SBSTC Stand", "Muchipara Bus Point"],
    "Malda": ["Malda Town Stn", "English Bazar NBSTC Stand", "Rathbari Bus Terminus"],
    "Darjeeling": ["Darjeeling Stn (DHR)", "Chowk Bazaar Bus Stand", "Ghoom Stn", "Kurseong Stn"],
    "Murshidabad": ["Berhampore Court Stn", "Lalgola Stn", "Berhampore NBSTC Stand", "Hazarduari Area", "Jiaganj Ferry Ghat"],
    "Nadia": ["Krishnanagar City Jn", "Kalyani Stn", "Ranaghat Jn", "Shantipur Stn", "Nabadwip Dham Ferry"],
    "Midnapore": ["Kharagpur Jn (KGP)", "Midnapore Railway Stn", "Digha Bus Stand", "Haldia Terminus", "Mecheda Stn"]
};

let wallet = parseInt(localStorage.getItem('resrideWallet')) || 5000;
let points = parseInt(localStorage.getItem('resridePoints')) || 0;
let rideHistory = JSON.parse(localStorage.getItem('resrideHistory')) || [];
let activeFare = 0;
let isRideMoving = false;
let autoReceiptTimer;
let lastTrip = { from: "", to: "", status: "Ready", id: "", link: "" };

document.addEventListener('DOMContentLoaded', () => {
    updateWalletUI();
    renderHistory();
});

function updateWalletUI() {
    document.getElementById('bal-amount').innerText = wallet;
    document.getElementById('eco-pts').innerText = points;
}

function updateSubPlaces(type) {
    const city = document.getElementById(`${type}-city`).value;
    const sub = document.getElementById(`${type}-sub`);
    sub.innerHTML = '<option value="">Select Hub Location</option>';
    if (city && subPlaces[city]) {
        sub.disabled = false;
        subPlaces[city].forEach(p => {
            let opt = document.createElement("option");
            opt.value = p; opt.innerHTML = p;
            sub.appendChild(opt);
        });
    } else { sub.disabled = true; }
}

/* --- MAIN APP CONTROLLER --- */
function processRide(rideType) {
    const startCity = document.getElementById('start-city').value;
    const endCity = document.getElementById('end-city').value;
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const timeInput = document.getElementById('booking-time').value;
    const quality = parseInt(document.getElementById('washroom-quality').value);
    const aiCtx = parseFloat(document.getElementById('ai-context').value);

    if (!startSub || !endSub) { alert("Please complete selection."); return; }

    // Using Modular Pricing Engine
    const activeFare = PricingEngine.calculateFare(startCity, endCity, rideType, aiCtx, quality);
    const distance = (startCity === endCity) ? 10 : (PricingEngine.distanceMatrix[startCity][endCity] || 50);
    const timing = PricingEngine.getETA(distance, rideType);

    if(wallet < activeFare) { alert("Insufficient balance!"); return; }

    // Start Simulation UI
    startRideSimulation(rideType, activeFare, startSub, endSub, timing, timeInput);
}

// Separate UI Logic from Math Logic
function startRideSimulation(type, fare, start, end, timing, startTime) {
    const tripId = "RR-" + Math.floor(Math.random() * 8999 + 1000);
    const log = document.getElementById('system-log');
    const car = document.getElementById('vehicle-icon');

    // ... (Keep your existing car movement and interval code here)
}

function shareTelemetry() {
    if (!lastTrip.from || !lastTrip.id) {
        alert("No active trip to share.");
        return;
    }
    const statusText = isRideMoving ? "🚨 LIVE TRACKING" : "✅ TRIP COMPLETED";
    const shareText = `🚀 *RESRIDE Premium Mobility*\n\n` +
        `*Status:* ${statusText}\n` +
        `*ID:* ${lastTrip.id}\n` +
        `📍 *From:* ${lastTrip.from}\n` +
        `🏁 *To:* ${lastTrip.to}\n` +
        `🔗 *Track Trip:* ${lastTrip.link}\n\n` +
        `Innovation for Safe & Premium Transit 🛡️`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
}

function submitRating(stars) {
    alert(`Feedback Received: ${stars} Stars! Thank you for using RESRIDE Premium.`);
}

function cancelRide() { 
    if (!isRideMoving) return;
    isRideMoving = false; 
    clearTimeout(autoReceiptTimer);
    document.getElementById('vehicle-icon').style.transition = 'none'; 
    document.getElementById('system-log').innerHTML = `<p style="color:#38bdf8;">✅ CANCELLED: ₹0 fee applied.</p>` + document.getElementById('system-log').innerHTML;
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = rideHistory.length ? rideHistory.map(r => `<div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0; display: flex; justify-content: space-between;"><span>${r.time} | ${r.from} → ${r.to}</span><span style="color: #38bdf8; font-weight: bold;">₹${r.fare}</span></div>`).join('') : `<p style="color: #666; font-style: italic;">No records found.</p>`;
}

function clearHistory() { if(confirm("Clear Trip History?")) { rideHistory = []; localStorage.removeItem('resrideHistory'); renderHistory(); } }
function rechargeWallet() { let amt = prompt("Amount (₹):"); if(amt) { wallet += parseInt(amt); localStorage.setItem('resrideWallet', wallet); updateWalletUI(); } }
// NEW: AI Surge Notification Logic
function showPremiumSurge() {
    const surge = document.getElementById('ai-context').value;
    const log = document.getElementById('system-log');
    if (surge > 1.0) {
        log.innerHTML = `<p style="color: #ffd700; border: 1px solid #ffd700; padding: 5px; border-radius: 5px;">
            ⚠️ PREMIUM SURGE ACTIVE: High demand detected in Hub. Pricing adjusted by ${surge}x.
        </p>` + log.innerHTML;
    }
}
function toggleAboutModal() {
    const modal = document.getElementById('aboutModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

function toggleContactModal() {
    const modal = document.getElementById('contactModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

// Close modal if user clicks outside of it
window.onclick = function(event) {
    const about = document.getElementById('aboutModal');
    const contact = document.getElementById('contactModal');
    if (event.target == about) about.style.display = "none";
    if (event.target == contact) contact.style.display = "none";
}
/* --- MODAL CONTROL LOGIC --- */
function toggleAboutModal() {
    const modal = document.getElementById('aboutModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

function toggleContactModal() {
    const modal = document.getElementById('contactModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

// Closes the window if you click outside the glass box
window.onclick = function(event) {
    const about = document.getElementById('aboutModal');
    const contact = document.getElementById('contactModal');
    if (event.target == about) about.style.display = "none";
    if (event.target == contact) contact.style.display = "none";
}
