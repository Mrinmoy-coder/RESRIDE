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
    "Howrah": ["Howrah Jn (HWH)", "Santragachi Stn", "Shalimar Stn", "Nabanna", "Bally Stn", "Belur Ferry Ghat", "Andul Stn"],
    "Siliguri": ["Bagdogra Intl Airport", "NJP Railway Stn", "Siliguri Jn", "Tenzing Norgay Bus Stand", "P.C. Mittal Stand", "Sevoke Road"],
    "Durgapur": ["Andal Airport", "Durgapur Stn", "City Centre SBSTC Stand", "Muchipara Bus Point"],
    "Malda": ["Malda Town Stn", "English Bazar NBSTC Stand", "Rathbari Bus Stand"],
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

function processRide(rideType) {
    const startCity = document.getElementById('start-city').value;
    const endCity = document.getElementById('end-city').value;
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const timeInput = document.getElementById('booking-time').value;
    const quality = parseInt(document.getElementById('washroom-quality').value);
    const log = document.getElementById('system-log');
    const car = document.getElementById('vehicle-icon');
    const aiCtx = parseFloat(document.getElementById('ai-context').value);

    if (!startSub || !endSub) {
        alert("Please complete the location selection.");
        return;
    }

    const tripId = "RR-" + Math.floor(Math.random() * 8999 + 1000);
    // FIXED 404: Using Search Params instead of a subfolder
    lastTrip = { from: startSub, to: endSub, status: "In Progress", id: tripId, link: `${window.location.origin}${window.location.pathname}?track=${tripId}` };

    // CALIBRATED PRICING: Standard (₹11/km) vs Emergency (₹19/km)
    let distance = (startCity === endCity) ? 10 : (distanceMatrix[startCity][endCity] || 50);
    let baseRate = (rideType === 'Emergency') ? 19 : 11; 
    activeFare = Math.round((distance * baseRate * aiCtx) + quality); 

    if(wallet < activeFare) {
        alert("Insufficient balance! Please recharge.");
        return;
    }

    let [h, m] = timeInput.split(':').map(Number);
    const formatTime = (mins) => `${Math.floor(mins / 60) % 24}:${(mins % 60).toString().padStart(2, '0')}`;
    const pDelay = (rideType === 'Emergency') ? 2 : 12;
    const pckTime = formatTime((h * 60) + m + pDelay);
    const reachTime = formatTime((h * 60) + m + pDelay + Math.round((distance / 45) * 60));

    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;
    isRideMoving = true;
    clearTimeout(autoReceiptTimer);

    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; 
    car.style.left = '10%';
    car.style.color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    
    void car.offsetWidth; 

    setTimeout(() => {
        car.style.transition = 'left 5s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        log.innerHTML = `<p style="color:#25d366; font-size:0.7rem; margin-top:5px; border: 1px solid #25d366; padding: 4px; border-radius: 4px;">🔗 LIVE TRACKING: <a href="javascript:void(0)" onclick="alert('Trip ID: ${tripId}\\nStatus: Live Tracking Active\\nDestination: ${endSub}')" style="color:#fff; text-decoration:underline;">resride.track/${tripId}</a></p>` + log.innerHTML;

        autoReceiptTimer = setTimeout(() => {
            if(isRideMoving) {
                wallet -= activeFare;
                points += (quality > 50 ? 100 : 50);
                lastTrip.status = "Completed";
                rideHistory.unshift({ time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), from: startSub, to: endSub, fare: activeFare });
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', points);
                localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
                updateWalletUI();
                renderHistory();

                log.innerHTML = `
                <div style="margin-top:10px; padding:10px; border:1px dashed #27c93f; background:rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 ARRIVED AT HUB: ${endSub}</p>
                    <p>Fare: ₹${activeFare} | Points Earned: +${quality > 50 ? 100 : 50}</p>
                    <div style="display:flex; gap:6px; margin-top:10px;">
                        ${[1,2,3,4,5].map(i => `<button onclick="submitRating(${i})" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.1rem;">★</button>`).join('')}
                    </div>
                </div>` + log.innerHTML;
                
                isRideMoving = false;
            }
        }, 5000);
    }, 50);

    log.innerHTML = `<div style="margin-bottom:15px; border-left:3px solid ${rideType === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
        <p style="color:#fff; font-weight:bold;">> ${rideType.toUpperCase()} DISPATCH: ${tripId}</p>
        <p style="color: #0ff; font-size: 0.8rem;">> 🚗 ETA: ${pckTime} (${pDelay}m) | 🏁 REACH: ${reachTime}</p>
    </div>` + log.innerHTML;
}

function shareTelemetry() {
    if (!lastTrip.from || !lastTrip.id) {
        alert("No active trip data to share.");
        return;
    }
    const statusText = isRideMoving ? "🚨 LIVE TRACKING" : "✅ TRIP COMPLETED";
    const shareText = `🚀 *RESRIDE Premium Mobility Update*\n\n` +
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
