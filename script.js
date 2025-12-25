// MASSIVE TRANSIT EXPANSION: Railway Stations & Bus Stands 
const distanceMatrix = {
    "Kolkata": { "Howrah": 15, "Siliguri": 580, "Durgapur": 170, "Malda": 330, "Midnapore": 130, "Nadia": 110, "Murshidabad": 210 },
    "Howrah": { "Kolkata": 15, "Siliguri": 578, "Durgapur": 165, "Midnapore": 115 },
    "Siliguri": { "Kolkata": 580, "Malda": 250, "Darjeeling": 65, "Jalpaiguri": 45, "CoochBehar": 145, "Alipurduar": 165 },
    "Durgapur": { "Kolkata": 170, "Asansol": 40, "Bankura": 50, "Birbhum": 60, "Purulia": 120 },
    "Malda": { "Kolkata": 330, "Siliguri": 250, "Murshidabad": 110, "Raiganj": 75 },
    "Midnapore": { "Kolkata": 130, "Howrah": 115, "Jhargram": 40, "Digha": 90, "Haldia": 80 }
};

const subPlaces = {
    "Kolkata": ["Netaji Subhash Airport (CCU)", "Sealdah Stn (Main/South)", "Kolkata Stn (Chitpur)", "Esplanade Central Bus Terminus", "Babughat Bus Stand", "Karunamoyee (Salt Lake) Bus Stand", "Shyambazar 5-Point Crossing", "Gariahat Junction"],
    "Howrah": ["Howrah Junction (HWH)", "Santragachi Stn", "Shalimar Stn", "Nabanna Bus Terminus", "Belur Math Area", "Bally Stn"],
    "Siliguri": ["Bagdogra Intl Airport", "NJP Railway Stn", "Siliguri Jn Stn", "Tenzing Norgay Central Bus Stand", "P.C. Mittal Bus Stand", "Panitanki (Nepal Border Transit)"],
    "Durgapur": ["Kazi Nazrul Islam Airport (Andal)", "Durgapur Railway Stn", "City Centre SBSTC Bus Terminus", "Muchipara Bus Stand", "DPL Colony"],
    "Malda": ["Malda Town Stn", "English Bazar NBSTC Bus Stand", "Rathbari Bus Terminus", "Gaur Area"],
    "Darjeeling": ["Darjeeling Stn (DHR)", "Chowk Bazaar Bus Stand", "Batasia Loop Stn", "Ghoom Station"],
    "Murshidabad": ["Berhampore Court Stn", "Lalgola Stn", "Hazarduari Bus Stand", "Berhampore NBSTC Bus Stand"],
    "Nadia": ["Krishnanagar City Jn", "Kalyani Stn", "Ranaghat Jn", "Krishnanagar Bus Stand", "Shantipur Stn"],
    "Purulia": ["Purulia Junction", "Adra Stn", "Purulia Central Bus Stand", "Joychandi Pahar Stn"],
    "Birbhum": ["Bolpur-Shantiniketan Stn", "Rampurhat Jn Stn", "Suri Bus Stand", "Sainthia Jn"],
    "Bankura": ["Bankura Junction", "Bishnupur Stn", "Bankura SBSTC Bus Stand", "Sonamukhi Stn"],
    "Midnapore": ["Kharagpur Jn (KGP)", "Midnapore Railway Stn", "Digha Flag Stn", "Digha Bus Stand", "Haldia Bus Terminus"],
    "CoochBehar": ["New Cooch Behar Jn", "Cooch Behar Airport", "NBSTC Central Terminal", "Dinhata Stn"],
    "Alipurduar": ["Alipurduar Junction", "New Alipurduar Stn", "Hasimara Stn", "Jaldapara Bus Point"],
    "Jalpaiguri": ["Jalpaiguri Road Stn", "Maynaguri Stn", "Dhupguri Bus Stand", "Malbazar Jn"],
    "North24Pgs": ["Barasat Jn", "Barrackpore Stn", "Habra Bus Stand", "Basirhat Stn", "Madhyamgram Bus Stand"],
    "South24Pgs": ["Sonarpur Jn", "Canning Stn", "Diamond Harbour Bus Stand", "Baruipur Stn", "Amtala Bus Stand"]
};

let wallet = parseInt(localStorage.getItem('resrideWallet')) || 5000;
let points = parseInt(localStorage.getItem('resridePoints')) || 0;
let rideHistory = JSON.parse(localStorage.getItem('resrideHistory')) || [];
let activeFare = 0;
let isRideMoving = false;
let autoReceiptTimer;

document.addEventListener('DOMContentLoaded', () => {
    updateWalletUI();
    renderHistory();
});

function updateWalletUI() {
    const balEl = document.getElementById('bal-amount');
    const ptsEl = document.getElementById('eco-pts'); 
    if (balEl) balEl.innerText = wallet;
    if (ptsEl) ptsEl.innerText = points;
}

function updateSubPlaces(type) {
    const citySelect = document.getElementById(`${type}-city`);
    const subSelect = document.getElementById(`${type}-sub`);
    const selectedCity = citySelect.value;
    subSelect.innerHTML = '<option value="">Select Stn/Bus Stand</option>';
    if (selectedCity && subPlaces[selectedCity]) {
        subSelect.disabled = false;
        subPlaces[selectedCity].forEach(place => {
            let opt = document.createElement("option");
            opt.value = place; opt.innerHTML = place;
            subSelect.appendChild(opt);
        });
    } else { subSelect.disabled = true; }
}

function processRide(rideType) {
    const startCity = document.getElementById('start-city').value;
    const endCity = document.getElementById('end-city').value;
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const timeInput = document.getElementById('booking-time').value;
    const quality = document.getElementById('washroom-quality').value;
    const log = document.getElementById('system-log');
    const car = document.getElementById('vehicle-icon');

    if (!startSub || !endSub) {
        alert("Please select your Transit Hub.");
        return;
    }

    const trafficSeed = Math.random();
    let trafficTag = trafficSeed > 0.7 ? "TRAFFIC DETECTED" : "CLEAR ROADS";
    const aiCtx = parseFloat(document.getElementById('ai-context').value);
    
    // ULTRA ECONOMICAL PRICING: ₹6 per km for the Indian Middle Class
    let distance = (startCity === endCity) ? 8 : (distanceMatrix[startCity][endCity] || 50);
    let baseFare = distance * 6; 
    let surge = (rideType === 'Emergency' ? 1.1 : 1.0) * aiCtx;
    activeFare = Math.round((baseFare * surge) + (quality * 30)); 

    if(wallet < activeFare) {
        alert("Insufficient balance! Please recharge.");
        return;
    }

    // Time Calculations for ETA
    let [h, m] = timeInput.split(':').map(Number);
    const formatTime = (mins) => `${Math.floor(mins / 60) % 24}:${(mins % 60).toString().padStart(2, '0')}`;
    const pckTime = formatTime((h * 60) + m + 3);
    const reachTime = formatTime((h * 60) + m + 3 + Math.round((distance / 50) * 60));

    // Car Movement Reset
    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;
    isRideMoving = true;
    clearTimeout(autoReceiptTimer);

    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; 
    car.style.left = '10%';
    car.style.color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    
    void car.offsetWidth; // Force Reflow

    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        autoReceiptTimer = setTimeout(() => {
            if(isRideMoving) {
                wallet -= activeFare;
                points += 50;
                rideHistory.unshift({ time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), from: startSub, to: endSub, fare: activeFare });
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', points);
                localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
                updateWalletUI();
                renderHistory();

                log.innerHTML = `<div style="margin-top:10px; padding:10px; border:1px dashed #27c93f; background:rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 ARRIVED AT ${endSub}</p>
                    <p>Total Fare: ₹${activeFare} (Middle-Class Saver Applied)</p>
                </div>` + log.innerHTML;
                isRideMoving = false;
            }
        }, 4000);
    }, 50);

    log.innerHTML = `<div style="margin-bottom:20px; border-left:3px solid ${rideType === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
        <p style="color:#fff; font-weight:bold;">> DISPATCHING TO HUB: ${startSub}</p>
        <p style="font-size:0.75rem; color:#aaa;">📍 Route Status: ${trafficTag} | Discount Rates Active</p>
        <p style="color: #0ff;">> 🚗 PICKUP: ${pckTime} | 🏁 REACH: ${reachTime}</p>
    </div>` + log.innerHTML;
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = rideHistory.length ? rideHistory.map(ride => `<div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0; display: flex; justify-content: space-between;"><span>${ride.time} | ${ride.from} → ${ride.to}</span><span style="color: #38bdf8;">₹${ride.fare}</span></div>`).join('') : `<p style="color: #666; font-style: italic;">No records found.</p>`;
}

function clearHistory() { rideHistory = []; localStorage.removeItem('resrideHistory'); renderHistory(); }
function rechargeWallet() { let amt = prompt("Enter Amount (₹):"); if(amt) { wallet += parseInt(amt); localStorage.setItem('resrideWallet', wallet); updateWalletUI(); } }
function cancelRide() { isRideMoving = false; clearTimeout(autoReceiptTimer); alert("Ride Aborted."); }
