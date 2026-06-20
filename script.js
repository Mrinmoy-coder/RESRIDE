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
// --- AUTH & CLOUD SYNC LOGIC ---
let wallet = 0; 
let points = 0;
let rideHistory = [];
let isVaultLocked = true; // Safety lock to prevent 0 overwriting your real money
let isRideMoving;
let autoReceiptTimer;
let lastTrip;

// BACKGROUND HANDSHAKE: Automatically restores balance if the app hung during login
// --- ENHANCED VAULT HANDSHAKE ---
// This ensures that if the internet flickers, the balance restores automatically
const vaultRestorer = setInterval(async () => {
    if (window.auth && window.auth.currentUser) {
        // Only pull from cloud if the vault is currently locked or balance is out of sync
        if (isVaultLocked || (navigator.onLine && !isRideMoving)) {
            console.log("RESRIDE_AI: Checking Cloud Vault integrity...");
            await window.syncUserData(window.auth.currentUser.uid);
            
            // If sync was successful, we can slow down the check interval to save battery
            if (!isVaultLocked) {
                console.log("RESRIDE_AI: Sync stable. System heartbeat active.");
            }
        }
    }
}, 30000); // Checks every 30 seconds for a silent background handshake
window.syncUserData = async function(uid) {
    
    // 1. IDENTITY CHECK: Show the User's Google Name
    const user = window.auth.currentUser;
    if (user) {
        const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
        const welcomeText = document.querySelector('.typewriter');
        
        if (welcomeText) {
            if (isGoogle && user.displayName) {
                welcomeText.innerHTML = `Welcome, ${user.displayName}! <span style="color: #27c93f; font-size: 0.7rem; border: 1px solid #27c93f; padding: 2px 5px; border-radius: 10px; margin-left: 10px;">Google Verified</span>`;
            } else {
                welcomeText.innerText = `Hello, Welcome to RESRIDE !!!`;
            }
        }
    }

    // 2. VAULT SYNC: Load the money and history
    const userRef = window.dbRef.doc(window.db, "users", uid);
    const userSnap = await window.dbRef.getDoc(userRef);

   if (!userSnap.exists()) {
    console.warn("User document not found — skipping overwrite");
    return; // ⛔ DO NOT CREATE / DO NOT RESET
}

const data = userSnap.data();
wallet = Number(data.wallet);
points = Number(data.points);
rideHistory = data.history || [];

    isVaultLocked = false; // UNLOCK: Now it is safe to save
    updateWalletUI(); 
    renderHistory();
}

async function saveToCloud() {
    // DO NOT SAVE if the vault is still locked (prevents 0 overwrite)
    if (!window.auth.currentUser || isVaultLocked) return;

    const userRef = window.dbRef.doc(window.db, "users", window.auth.currentUser.uid);
    await window.dbRef.updateDoc(userRef, {
        wallet: Number(wallet),
        points: Number(points),
        history: rideHistory
    });
}
window.toggleAuthMode = function() {
    const isRegister = document.getElementById('register-actions').style.display === 'block';
    document.getElementById('register-actions').style.display = isRegister ? 'none' : 'block';
    document.getElementById('login-actions').style.display = isRegister ? 'block' : 'none';
    document.getElementById('auth-title').innerText = isRegister ? 'RESRIDE Login' : 'Create Account';
};
// Add 'sendEmailVerification' to your Firebase imports at the top of script.js
window.handleGoogleLogin = function() {
    // This calls the popup initialized in your index.html
    window.signInWithPopup(window.auth, window.googleProvider)
        .catch((error) => {
            // If it fails, we MUST alert why
            alert("Google Login Failed: " + error.message);
            // Reset the login title if it changed
            document.getElementById('auth-title').innerText = "RESRIDE Login";
        });
}

window.handleAuth = function(mode) {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const btn = event.target; 
    const originalText = btn.innerText;

    if(!email || !pass) { alert("Please fill fields."); return; }
    
    btn.disabled = true;
    btn.innerText = "Processing...";

 if(mode === 'login') {
    window.signInWithEmailAndPassword(window.auth, email, pass)
        .then(() => {
            // Success is handled by onAuthStateChanged in index.html
        })
        .catch(err => {
            alert("Login Error: " + err.message);
            // RESET THE BUTTON so you can try again
            btn.disabled = false;
            btn.innerText = originalText;
            
            // Red border feedback
            document.getElementById('auth-email').style.borderColor = '#ff5f56';
            document.getElementById('auth-pass').style.borderColor = '#ff5f56';
            setTimeout(() => {
                document.getElementById('auth-email').style.borderColor = '';
                document.getElementById('auth-pass').style.borderColor = '';
            }, 2000);
        });
}else {
        window.createUserWithEmailAndPassword(window.auth, email, pass)
.then(async (cred) => {
    const userRef = window.dbRef.doc(window.db, "users", cred.user.uid);
    await window.dbRef.setDoc(userRef, {
        wallet: 0,
        points: 0,
        history: []
    });
})
.catch(err => {
    alert("Registration Error: " + err.message);
    btn.disabled = false;
    btn.innerText = originalText;
});

    }
}
window.forgotPassword = function() {
    const email = document.getElementById('auth-email').value;
    if (!email) { alert("Type email first."); return; }
    window.sendPasswordResetEmail(window.auth, email)
        .then(() => alert("Reset link sent!"));
};

window.handleLogout = function() {
    if (confirm("Log out?")) {
        isVaultLocked = true; // lock saving
        window.signOut(window.auth).then(() => location.reload());
    }
};


window.updateWalletUI = function() {
    document.getElementById('bal-amount').innerText = wallet;
    document.getElementById('eco-pts').innerText = points;
};

window.updateSubPlaces = function(type) {
    const city = document.getElementById(`${type}-city`).value;
    const sub = document.getElementById(`${type}-sub`);
    sub.innerHTML = '<option value="">Select Hub Location</option>';
    if (city && subPlaces[city]) {
        sub.disabled = false;
        subPlaces[city].forEach(p => {
            let opt = document.createElement("option");
            opt.value = p;
            opt.innerHTML = p;
            sub.appendChild(opt);
        });
    } else {
        sub.disabled = true;
    }
};

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

    let distance = 0;
    if (startCity === endCity) {
        distance = 15;
    } else {
        const matrix = {
            "Kolkata-Durgapur": 175,
            "Kolkata-Siliguri": 560,
            "Kolkata-Malda": 330,
            "Kolkata-Howrah": 12
        };
        distance = matrix[`${startCity}-${endCity}`] || matrix[`${endCity}-${startCity}`] || 250;
    }
    let baseFare = (rideType === 'Emergency') ? 12 : 6;
    
    // Core Family Multiplier Engine Lifecycle Logic
    let familyMultiplier = 1 + ((passengerCount - 1) * 0.15); 
    let initialFare = Math.round(((distance * baseFare) * aiCtx * familyMultiplier) + quality);
    let finalFare = initialFare;
    let couponAppliedText = "";

    // =========================================================================
    // SECURE DEDUCTION CHECK: Jamai Sasthi Dynamic Voucher Matrix
    // =========================================================================
    if (typeof requiredDistanceThreshold !== 'undefined' && typeof activeFestivalDiscount !== 'undefined' && activeFestivalDiscount > 0) {
        if (distance >= requiredDistanceThreshold) {
            finalFare = Math.max(0, initialFare - activeFestivalDiscount);
            couponAppliedText = `
                <div style="margin: 8px 0; padding: 8px; background: rgba(39, 201, 63, 0.15); border: 1px dashed #27c93f; border-radius: 6px; font-size: 0.75rem; font-family: monospace;">
                    <span style="color: #27c93f; font-weight: bold;">✔ COUPON VERIFIED:</span> Flat ₹${activeFestivalDiscount} Deducted.
                    <br><span style="color: rgba(255,255,255,0.6);">Gross: ₹${initialFare} | Discounted Delta: -₹${activeFestivalDiscount}</span>
                </div>
            `;
        } else {
            couponAppliedText = `
                <div style="margin: 8px 0; padding: 8px; background: rgba(255, 95, 86, 0.1); border: 1px dashed #ff5f56; border-radius: 6px; font-size: 0.75rem; font-family: monospace; color: #fff;">
                    <span style="color: #ff5f56; font-weight: bold;">❌ PACK LOCKED:</span> Route (${distance}km) doesn't meet the required threshold of ${requiredDistanceThreshold}km.
                </div>
            `;
        }
    }
    // =========================================================================

    if (wallet < finalFare) {
        alert("Insufficient balance! Please recharge.");
        return;
    }

    let travelMins = Math.round((distance / 60) * 60);
    let timing = (rideType === 'Emergency')
        ? { pickupDelay: 5, travelTime: travelMins }
        : { pickupDelay: 15, travelTime: travelMins };
    
    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;

    // Fire simulation sequence using the real mutated lower total amount
    startRideSimulation(rideType, finalFare, startSub, endSub, timing, timeInput, quality);

    // Render the final output systematically to avoid async string collisions
    const receiptTemplate = `
        <div style="border: 1px solid #DAA520; padding: 12px; border-radius: 8px; background: rgba(43, 22, 0, 0.3); margin-top: 10px; color: #fff; font-family: 'Inter', sans-serif; text-align: left;">
            <p style="color: #DAA520; font-weight: bold; margin: 0 0 5px 0; font-size: 0.8rem; letter-spacing: 1px;">🎫 GATEWAY FARE AUDIT RECEIPT</p>
            <div style="font-size: 0.75rem; line-height: 1.5; opacity: 0.95;">
                • Route Trajectory: ${startSub} → ${endSub} (${distance} km)<br>
                • Base Algorithm Fare: ₹${initialFare}<br>
                ${couponAppliedText}
                • <strong style="color: #FFD700; font-size: 0.85rem;">Net Ledger Settlement: ₹${finalFare}</strong>
            </div>
        </div>
    `;

    // Prepend nicely without erasing operational background hooks
    log.innerHTML = `<p style="color:#38bdf8; border: 1px solid #38bdf8; padding: 5px; border-radius: 5px; margin-bottom: 10px;">
        📡 HUB SENSOR: System calibrating dispatch for ${rideType} priority...
    </p>` + receiptTemplate + log.innerHTML;
};
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
    const reachTime = formatTime((h * 60) + m + timing.pickupDelay + timing.travelTime);

    document.getElementById('label-start').innerText = start;
    document.getElementById('label-end').innerText = end;
    isRideMoving = true;
    clearTimeout(autoReceiptTimer);
    log.innerHTML = `
        <div style="border: 1px solid #38bdf8; padding: 10px; border-radius: 8px; background: rgba(56, 189, 248, 0.05); margin-bottom: 10px; animation: fadeIn 0.5s;">
            <p style="color: #38bdf8; font-weight: bold; margin: 0;">[DUAL_CHAMBER_ACTIVATED]</p>
            <p style="font-size: 0.7rem; color: #fff; margin: 5px 0 0 0;">> Chamber 1: ${passengerCount} Members (Family Lounge)</p>
            <p style="font-size: 0.7rem; color: #27c93f; margin: 2px 0 0 0;">> Chamber 2: Emergency User (Bio-Restroom Mode)</p>
        </div>
    ` + log.innerHTML;

    // RESET CAR POSITION
   // --- THE FIX: RESET CAR TO STARTING POSITION INSTANTLY ---
car.style.transition = 'none'; // Remove transition so it jumps back instantly
car.style.left = '0%';         // Move back to start
void car.offsetWidth;          // "Magic" line to force the browser to apply the 0% immediately

// Now apply the movement for the current ride
car.style.transition = 'left 5s linear';
car.style.left = '85%';
car.style.color = (type === 'Emergency') ? '#ff0055' : '#38bdf8';
car.classList.add('vehicle-moving');

    setTimeout(() => {
        
        if(!isRideMoving) return; 

        // --- THE CRITICAL FIX: Add a destination ---
       car.style.transition = 'left 5s linear';
        car.style.left = '85%'; // The car now has  a place to go!
        car.classList.add('vehicle-moving');

        log.innerHTML = `<p style="color:#25d366; font-size:0.7rem; margin-top:5px; border: 1px solid #25d366; padding: 4px; border-radius: 4px;">🔗 LIVE TRACKING: <a href="javascript:void(0)" onclick="alert('Trip ID: ${tripId}')" style="color:#fff;">resride.track/${tripId}</a></p>` + log.innerHTML;

        autoReceiptTimer = setTimeout(() => {
            if(isRideMoving) {
                wallet -= fare;
                points += (quality > 100 ? 100 : 50);
                lastTrip.status = "Completed";
                rideHistory.unshift({ 
                    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), 
                    from: start, to: end, fare: fare 
                });
                
                // Sync Local & Cloud storage
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', points);
                localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
                
                updateWalletUI();
                renderHistory();
                saveToCloud(); 

                log.innerHTML = `
                <div style="margin-top:10px; padding:10px; border:1px dashed #27c93f; background:rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 ARRIVED AT HUB: ${end}</p>
                    <p>Fare: ₹${fare} | Points Earned: +${quality > 100 ? 100 : 50}</p>
                </div>` + log.innerHTML;
                
                isRideMoving = false;
                car.classList.remove('vehicle-moving'); // Stop the animation glow
            }
        }, 5000); 
    }, 100); 
    

    log.innerHTML = `<div style="margin-bottom:15px; border-left:3px solid ${type === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
        <p style="color:#fff; font-weight:bold;">> ${type.toUpperCase()} DISPATCH: ${tripId}</p>
        <p style="color: #0ff; font-size: 0.8rem;">> 🚗 Waiting Time: ${timing.pickupDelay}m | 🏁 Reach Time: ${reachTime}</p>
    </div>` + log.innerHTML;
}


window.rechargeWallet = async () => {
    let amt = prompt("Amount (₹):");
    if (!amt || isNaN(amt)) return;
    wallet += Number(amt);
    updateWalletUI();
    await saveToCloud();
};

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
};

window.renderHistory = function() {
    const list = document.getElementById('history-list');
    list.innerHTML = rideHistory.length
        ? rideHistory.map(r =>
            `<div>${r.time} | ${r.from} → ${r.to} | ₹${r.fare}</div>`
        ).join('')
        : "No activity found.";
};

window.clearHistory = async () => {
    if (confirm("Clear history?")) {
        rideHistory = [];
        await saveToCloud();
        renderHistory();
    }
};

window.toggleAboutModal = () =>
    document.getElementById('aboutModal').style.display =
        document.getElementById('aboutModal').style.display === 'flex' ? 'none' : 'flex';

window.toggleContactModal = () =>
    document.getElementById('contactModal').style.display =
        document.getElementById('contactModal').style.display === 'flex' ? 'none' : 'flex';

/* ✅ TELEMETRY SHARE — UNOMITTED */
window.shareTelemetry = function() {
    if (!lastTrip.from || !lastTrip.id) {
        alert("No active trip.");
        return;
    }
    const shareText = `🚀 *RESRIDE Premium Mobility*\n📍 *From:* ${lastTrip.from}\n🏁 *To:* ${lastTrip.to}\nID: ${lastTrip.id}`;
    window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
        '_blank'
    );
};

//* --- ENHANCED 2026 FEATURE LOGIC --- */

// ATTACH TO WINDOW OBJECT FOR GITHUB COMPATIBILITY
// Add this function to your JS to handle the new Ram Navami screen
// ATTACH TO WINDOW OBJECT FOR JAMAI SASTHI PROTOCOL
// ATTACH TO WINDOW OBJECT FOR JAMAI SASTHI PROTOCOL
// Global Festival State Tracking variables
let activeFestivalDiscount = 0;
let requiredDistanceThreshold = 0;

// Dynamic Voucher Selection Engine
window.claimFestivalPack = function(discountAmount, distanceLimit) {
    activeFestivalDiscount = discountAmount;
    requiredDistanceThreshold = distanceLimit;
    
    alert(`Success: ₹${discountAmount} Discount Pack loaded. This discount requires a distance threshold of ${distanceLimit}km to activate processing calculations.`);
};

// Application Bootstrap Interface Lifecycle
// UPDATE: Make the initial alert block read the variable dynamically
// UPDATE: Make the initial alert block read the variable dynamically
window.launchFestivalApp = function() {
    const overlay = document.getElementById('jamai-sasthi-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        setTimeout(() => {
            overlay.style.display = 'none';
            
            const log = document.getElementById('system-log');
            if (log) {
                log.innerHTML = `
                    <div style="border-left: 3px solid #DAA520; padding: 6px 12px; background: rgba(218, 165, 32, 0.05); margin-bottom: 10px; animation: fadeIn 0.4s;">
                        <p style="color: #DAA520; font-weight: bold; font-size:0.7rem; margin:0;">[JAMAI_SASTHI_DISPATCH_ACTIVE]</p>
                        <p style="color: #fff; font-size: 0.65rem; margin:2px 0 0 0;">Auspicious commute limits activated. Current Active Multiplier Discount: ₹${activeFestivalDiscount}.</p>
                    </div>
                ` + log.innerHTML;
            }
        }, 1200);
    }
};
let passengerCount = 1;

window.updatePassengers = function(count) {
    passengerCount = parseInt(count);
    // Visual update for the user
    document.getElementById('pass-display').innerText = `${passengerCount} Members`;
};

// --- UPDATE YOUR processRide function ---
// Inside window.processRide, change your finalFare calculation:
let familyMultiplier = 1 + (passengerCount * 0.15); // Each extra member adds 15% to fare
let finalFare = Math.round(((distance * baseFare) * aiCtx * familyMultiplier) + quality);
// =========================================================================
// INTERACTIVE PARTICLES: Asynchronous Procedural Spawning Framework
// =========================================================================
let balloonSpawnerInterval;

function initializePremiumBalloons() {
    const layerContainer = document.getElementById('balloon-dynamic-aquarium');
    if (!layerContainer) return;

    // Clear any previous interval instances safely
    clearInterval(balloonSpawnerInterval);

    // Spawns new balloons rapidly every 1.5 seconds for higher visual density
    balloonSpawnerInterval = setInterval(() => {
        // Enforce safety constraint: Stop processing spikes if the overlay is hidden
        const overlay = document.getElementById('jamai-sasthi-overlay');
        if (overlay && overlay.style.display === 'none') {
            clearInterval(balloonSpawnerInterval);
            return;
        }

        createSingleGasBalloon(layerContainer);
    }, 1500);
}

function createSingleGasBalloon(container) {
    const balloon = document.createElement('div');
    const isGold = Math.random() > 0.5;
    
    balloon.className = `interactive-balloon ${isGold ? 'balloon-type-gold' : 'balloon-type-crimson'}`;
    
    // Set completely randomized horizontal spawn coordinates across width
    const startingX = Math.random() * 90; // 0% to 90%
    balloon.style.left = `${startingX}%`;
    
    // Randomize travel velocities and horizontal swaying scales for realism
    const ascendingVelocity = 1.8 + Math.random() * 2.2; // Speed multiplier
    const swingMagnitude = 20 + Math.random() * 30;     // Sway pixel width
    const rotationMax = 5 + Math.random() * 10;          // Max angle
    
    let currentYPosition = -100; // Start below display viewport
    let cycleAngleTracker = Math.random() * 100;
    
    // Unified Frame-by-Frame Render Execution loop
    function animateFrame() {
        if (balloon.classList.contains('popped')) return;

        currentYPosition += ascendingVelocity;
        cycleAngleTracker += 0.04;
        
        // Calculate organic trigonometric sway offsets
        const calculatedSwayX = Math.sin(cycleAngleTracker) * swingMagnitude;
        const calculatedRotate = Math.cos(cycleAngleTracker) * rotationMax;
        
        balloon.style.transform = `translate3d(${calculatedSwayX}px, -${currentYPosition}px, 0) rotate(${calculatedRotate}deg)`;
        
        // Natural Top Burst Logic: If it escapes the ceiling boundary, pop it automatically
        if (currentYPosition > window.innerHeight + 150) {
            triggerPopEffect(balloon);
        } else {
            requestAnimationFrame(animateFrame);
        }
    }

    // Touch Burst Mechanism: Execute instant popping behavior upon user contact
    balloon.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        triggerPopEffect(balloon);
    });

    container.appendChild(balloon);
    requestAnimationFrame(animateFrame);
}

function triggerPopEffect(element) {
    if (element.classList.contains('popped')) return;
    
    element.classList.add('popped');
    
    // Automatically clean up DOM architecture variables to optimize device battery life
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, 150);
}

// Automatically mount and activate the engine on initial window compilation loops
document.addEventListener('DOMContentLoaded', () => {
    initializePremiumBalloons();
});
