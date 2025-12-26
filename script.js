/* --- MAIN APP CONTROLLER --- */
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

let wallet = parseInt(localStorage.getItem('resrideWallet')) || 7131;
let points = parseInt(localStorage.getItem('resridePoints')) || 550;
let rideHistory = JSON.parse(localStorage.getItem('resrideHistory')) || [];
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

function processRide(rideType) {
    const startCity = document.getElementById('start-city').value;
    const endCity = document.getElementById('end-city').value;
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const timeInput = document.getElementById('booking-time').value;
    const quality = parseInt(document.getElementById('washroom-quality').value);
    const aiCtx = parseFloat(document.getElementById('ai-context').value);
    const log = document.getElementById('system-log');

    if (!startSub || !endSub) { alert("Please complete selection."); return; }

    // FARE CALCULATION
    let distance = (startCity === endCity) ? 10 : 50; 
    let baseFare = (rideType === 'Emergency') ? 19 : 11;
    let finalFare = Math.round((distance * baseFare) * aiCtx) + quality;

    if(wallet < finalFare) { alert("Insufficient balance!"); return; }

    // SIMULATION CONFIG
    let timing = { pickupDelay: 3, travelTime: 12 };
    
    // START MOVEMENT
    startRideSimulation(rideType, finalFare, startSub, endSub, timing, timeInput, quality);

    // AI NOTIFICATION
    log.innerHTML = `<p style="color:#38bdf8; border: 1px solid #38bdf8; padding: 5px; border-radius: 5px; margin-bottom: 10px;">
        📡 HUB SENSOR: System calibrating dispatch for ${rideType} priority...
    </p>` + log.innerHTML;
}

function startRideSimulation(type, fare, start, end, timing, startTime, quality) {
    const tripId = "RR-" + Math.floor(Math.random() * 8999 + 1000);
    const log = document.getElementById('system-log');
    const car = document.getElementById('vehicle-icon');
    
    lastTrip = { from: start, to: end, status: "In Progress", id: tripId, link: `${window.location.origin}${window.location.pathname}?track=${tripId}` };

    let [h, m] = startTime.split(':').map(Number);
    const formatTime = (mins) => `${Math.floor(mins / 60) % 24}:${(mins % 60).toString().padStart(2, '0')}`;
    const pckTime = formatTime((h * 60) + m + timing.pickupDelay);
    const reachTime = formatTime((h * 60) + m + timing.pickupDelay + timing.travelTime);

    document.getElementById('label-start').innerText = start;
    document.getElementById('label-end').innerText = end;
    isRideMoving = true;
    clearTimeout(autoReceiptTimer);

    // RESET CAR POSITION
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; 
    car.style.left = '10%';
    car.style.color = (type === 'Emergency') ? '#ff0055' : '#38bdf8';
    
    void car.offsetWidth; // Trigger reflow

    // BEGIN MOVEMENT
    setTimeout(() => {
        car.style.transition = 'left 5s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        log.innerHTML = `<p style="color:#25d366; font-size:0.7rem; margin-top:5px; border: 1px solid #25d366; padding: 4px; border-radius: 4px;">🔗 LIVE TRACKING: <a href="javascript:void(0)" onclick="alert('Trip ID: ${tripId}\\nLocation: En Route to ${end}')" style="color:#fff; text-decoration:underline;">resride.track/${tripId}</a></p>` + log.innerHTML;

        autoReceiptTimer = setTimeout(() => {
            if(isRideMoving) {
                wallet -= fare;
                points += (quality > 100 ? 100 : 50);
                lastTrip.status = "Completed";
                rideHistory.unshift({ time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), from: start, to: end, fare: fare });
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', points);
                localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
                updateWalletUI();
                renderHistory();

                log.innerHTML = `
                <div style="margin-top:10px; padding:10px; border:1px dashed #27c93f; background:rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 ARRIVED AT HUB: ${end}</p>
                    <p>Fare: ₹${fare} | Points Earned: +${quality > 100 ? 100 : 50}</p>
                </div>` + log.innerHTML;
                
                isRideMoving = false;
            }
        }, 5000);
    }, 50);

    log.innerHTML = `<div style="margin-bottom:15px; border-left:3px solid ${type === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
        <p style="color:#fff; font-weight:bold;">> ${type.toUpperCase()} DISPATCH: ${tripId}</p>
        <p style="color: #0ff; font-size: 0.8rem;">> 🚗 ETA: ${pckTime} (${timing.pickupDelay}m) | 🏁 REACH: ${reachTime}</p>
    </div>` + log.innerHTML;
}

function shareTelemetry() {
    if (!lastTrip.from || !lastTrip.id) { alert("No active trip to share."); return; }
    const statusText = isRideMoving ? "🚨 LIVE TRACKING" : "✅ TRIP COMPLETED";
    const shareText = `🚀 *RESRIDE Premium Mobility*\n\n*Status:* ${statusText}\n*ID:* ${lastTrip.id}\n📍 *From:* ${lastTrip.from}\n🏁 *To:* ${lastTrip.to}\n🔗 *Track Trip:* ${lastTrip.link}\n\nInnovation for Safe & Premium Transit 🛡️`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
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
function toggleAboutModal() {
    const modal = document.getElementById('aboutModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}
function toggleContactModal() {
    const modal = document.getElementById('contactModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}
