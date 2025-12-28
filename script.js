/* --- MAIN APP CONTROLLER --- */
const subPlaces = {
    "Kolkata": ["Airport (CCU)", "Sealdah Stn", "Howrah Ferry Ghat", "Esplanade Bus Stand", "Karunamoyee", "Tollygunge Metro", "New Town", "Salt Lake Sec-V"],
    "Howrah": ["Howrah Jn (HWH)", "Santragachi Stn", "Nabanna", "Bally Stn"],
    "Siliguri": ["Bagdogra Intl Airport", "NJP Railway Stn", "Siliguri Jn", "Tenzing Norgay Stand"],
    "Durgapur": ["Andal Airport", "Durgapur Stn", "City Centre stand"],
    "Malda": ["Malda Town Stn", "English Bazar NBSTC Stand"],
    "Murshidabad": ["Berhampore Court Stn", "Hazarduari Area"],
    "Nadia": ["Krishnanagar City Jn", "Kalyani Stn"],
    "Midnapore": ["Kharagpur Jn (KGP)", "Digha Bus Stand"]
};

// --- AUTH & CLOUD SYNC LOGIC ---
let wallet = 0; 
let points = 0;
let rideHistory = [];
let lastTrip = { from: "", to: "", status: "Ready", id: "", link: "" };
let isRideMoving = false;
let autoReceiptTimer;

window.syncUserData = async function(uid) {
    const userRef = window.dbRef.doc(window.db, "users", uid);
    const userSnap = await window.dbRef.getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        // HANDSHAKE: This pulls your actual money into the dashboard variables
        wallet = Number(data.wallet) || 0; 
        points = Number(data.points) || 0;
        rideHistory = data.history || [];
        
        // Refresh the numbers on your screen instantly
        updateWalletUI(); 
        renderHistory();
    } else {
        // Initialize for brand new users
        await window.dbRef.setDoc(userRef, { wallet: 0, points: 0, history: [] });
    }
}
async function saveToCloud() {
    if (!window.auth.currentUser) return;
    const userRef = window.dbRef.doc(window.db, "users", window.auth.currentUser.uid);
    await window.dbRef.updateDoc(userRef, {
        wallet: wallet,
        points: points,
        history: rideHistory
    });
}

window.toggleAuthMode = function() {
    const isRegister = document.getElementById('register-actions').style.display === 'block';
    document.getElementById('register-actions').style.display = isRegister ? 'none' : 'block';
    document.getElementById('login-actions').style.display = isRegister ? 'block' : 'none';
    document.getElementById('auth-title').innerText = isRegister ? 'RESRIDE Login' : 'Create Account';
}

window.handleAuth = function(mode) {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) { alert("Please fill fields."); return; }
    
    if(mode === 'login') {
        window.signInWithEmailAndPassword(window.auth, email, pass).catch(err => alert("Error: " + err.message));
    } else {
        window.createUserWithEmailAndPassword(window.auth, email, pass).then(async (userCredential) => {
            // FIXED: Immediately sync data for the new user so the dashboard opens
            await window.syncUserData(userCredential.user.uid);
            alert("Registration Successful! Initial Balance: ₹0");
            document.getElementById('loginModal').style.display = 'none';
        }).catch(err => alert(err.message));
    }
}

window.forgotPassword = function() {
    const email = document.getElementById('auth-email').value;
    if(!email) { alert("Type email first."); return; }
    window.sendPasswordResetEmail(window.auth, email).then(() => alert("Reset link sent!"));
}

window.handleLogout = function() { if(confirm("Log out?")) { window.signOut(window.auth).then(() => location.reload()); } }

window.updateWalletUI = function() {
    document.getElementById('bal-amount').innerText = wallet;
    document.getElementById('eco-pts').innerText = points;
}

window.updateSubPlaces = function(type) {
    const city = document.getElementById(`${type}-city`).value;
    const sub = document.getElementById(`${type}-sub`);
    sub.innerHTML = '<option value="">Select Hub Location</option>';
    if (city && subPlaces[city]) {
        sub.disabled = false;
        subPlaces[city].forEach(p => {
            let opt = document.createElement("option"); opt.value = p; opt.innerHTML = p;
            sub.appendChild(opt);
        });
    } else { sub.disabled = true; }
}

window.processRide = function(rideType) {
    const startCity = document.getElementById('start-city').value;
    const endCity = document.getElementById('end-city').value;
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const timeInput = document.getElementById('booking-time').value;
    const quality = parseInt(document.getElementById('washroom-quality').value);
    const aiCtx = parseFloat(document.getElementById('ai-context').value);
    const log = document.getElementById('system-log');

    if (!startSub || !endSub) { alert("Complete Selection."); return; }

    // Professional Distance Matrix
    let distance = 0;
    if (startCity === endCity) { distance = 15; } else {
        const matrix = { "Kolkata-Durgapur": 175, "Kolkata-Siliguri": 560, "Kolkata-Malda": 330, "Kolkata-Howrah": 12 };
        distance = matrix[`${startCity}-${endCity}`] || matrix[`${endCity}-${startCity}`] || 250;
    }

    let baseFare = (rideType === 'Emergency') ? 12 : 6;
    let finalFare = Math.round((distance * baseFare) * aiCtx) + quality;

    if(wallet < finalFare) { alert("Insufficient balance! Please recharge."); return; }

    // Waiting Time: 15m Standard / 5m Emergency
    let travelMins = Math.round((distance / 60) * 60); 
    let timing = (rideType === 'Emergency') 
        ? { pickupDelay: 5, travelTime: travelMins }  
        : { pickupDelay: 15, travelTime: travelMins }; 

    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;

    startRideSimulation(rideType, finalFare, startSub, endSub, timing, timeInput, quality);

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
    const formatTime = (mins) => {
        let total = mins % 1440;
        return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
    };
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
    setTimeout(() => {
        if(!isRideMoving) return; 
        car.style.transition = 'left 5s linear';
        car.classList.add('vehicle-moving');

        log.innerHTML = `<p style="color:#25d366; font-size:0.7rem; margin-top:5px; border: 1px solid #25d366; padding: 4px; border-radius: 4px;">🔗 LIVE TRACKING: <a href="javascript:void(0)" onclick="alert('Trip ID: ${tripId}')" style="color:#fff;">resride.track/${tripId}</a></p>` + log.innerHTML;

       autoReceiptTimer = setTimeout(() => {
    if(isRideMoving) {
        wallet -= fare;
        points += (quality > 100 ? 100 : 50);
        lastTrip.status = "Completed";
        rideHistory.unshift({ time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), from: start, to: end, fare: fare });
        
        // Keep these for your dashboard's visual "perfect" state
        localStorage.setItem('resrideWallet', wallet);
        localStorage.setItem('resridePoints', points);
        localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
        
        updateWalletUI();
        renderHistory();

        // THE FIX: Save to cloud in the background WITHOUT breaking the arrival box
        saveToCloud(); 

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
        <p style="color: #0ff; font-size: 0.8rem;">> 🚗 Waiting Time: ${timing.pickupDelay}m | 🏁 Reach Time: ${reachTime}</p>
    </div>` + log.innerHTML;
}

// FIXED: UI REFRESH logic
window.rechargeWallet = async () => { 
    let amt = prompt("Amount (₹):"); 
    if(amt && !isNaN(amt)) { 
        // 1. Mathematical Addition
        wallet = Number(wallet) + Number(amt); 
        
        // 2. Refresh UI instantly
        updateWalletUI(); 
        
        // 3. PUSH to Firebase Cloud permanently
        await saveToCloud(); 
    } 
}

window.cancelRide = function() { 
    if (!isRideMoving) return;
    isRideMoving = false; 
    clearTimeout(autoReceiptTimer);
    const car = document.getElementById('vehicle-icon');
    const currentPos = window.getComputedStyle(car).getPropertyValue('left');
    car.style.transition = 'none'; car.style.left = currentPos; car.classList.remove('vehicle-moving');
    document.getElementById('system-log').innerHTML = `<p style="color:#ff5f56; border:1px solid #ff5f56; padding:5px; border-radius:5px; margin-bottom:10px;">
        ❌ SENSOR ALERT: Dispatch aborted. Fleet nodes resetting...
    </p>` + document.getElementById('system-log').innerHTML;
}

window.renderHistory = function() {
    const list = document.getElementById('history-list');
    list.innerHTML = rideHistory.length ? rideHistory.map(r => `<div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0; display:flex; justify-content:space-between;"><span>${r.time} | ${r.from} → ${r.to}</span><span style="color:#38bdf8; font-weight:bold;">₹${r.fare}</span></div>`).join('') : "No activity found.";
}

window.clearHistory = async () => { if(confirm("Clear history?")) { rideHistory = []; await saveToCloud(); renderHistory(); } }
window.toggleAboutModal = () => document.getElementById('aboutModal').style.display = (document.getElementById('aboutModal').style.display === 'flex' ? 'none' : 'flex');
window.toggleContactModal = () => document.getElementById('contactModal').style.display = (document.getElementById('contactModal').style.display === 'flex' ? 'none' : 'flex');
window.shareTelemetry = function() {
    if (!lastTrip.from || !lastTrip.id) { alert("No active trip."); return; }
    const shareText = `🚀 *RESRIDE Premium Mobility*\n📍 *From:* ${lastTrip.from}\n🏁 *To:* ${lastTrip.to}\nID: ${lastTrip.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
}
