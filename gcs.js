// ======================
// 1. KELAS UTAMA GCS
// ======================
class GroundControlStation {
    constructor() {
        // ----- STATE / VARIABEL UTAMA -----
        this.mapElements = {};
        this.isArmed = false;
        this.currentMode = 'STABILIZE';
        this.vehicleType = 'DRONE';
        this.lastMoveTime = Date.now();
        this.pathVisible = false;
        this.autoCenter = false;

        // ----- INISIALISASI -----
        this.init();
    }

    // ======================
    // 2. INISIALISASI UTAMA
    // ======================
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initMap();
            this.setupControls();
            this.simulateTelemetry();
        });
    }

    // ======================
    // 3. MAP DAN PATH
    // ======================
    initMap() {
        let autoCenter = false;
        let autoZoom = false;
        
        const map = L.map('map').setView([0, 0], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const vehicleMarker = L.marker([0, 0]).addTo(map);
        const vehiclePath = L.polyline([], { color: 'blue' }).addTo(map);

        this.mapElements = { map, vehicleMarker, vehiclePath, pathPoints: [] };

        // Hapus path jika tidak ada gerakan > 1 detik
        setInterval(() => {
            const now = Date.now();
            if (now - this.lastMoveTime > 1000 && this.pathVisible) {
                this.mapElements.vehiclePath.setLatLngs([]);
                this.mapElements.pathPoints = [];
                this.pathVisible = false;
            }
        }, 500);
    }

    updateMap(data) {
        const { vehicleMarker, vehiclePath, pathPoints, map } = this.mapElements;

        if (data.latitude && data.longitude) {
            const pos = [data.latitude, data.longitude];
            vehicleMarker.setLatLng(pos);
            pathPoints.push(pos);
            vehiclePath.setLatLngs(pathPoints);
            vehiclePath.setStyle({ opacity: 1 });
            this.lastMoveTime = Date.now();
            this.pathVisible = true;

            if (this.autoCenter) {
                const currentZoom = map.getZoom();
                map.setView(pos, 15);
            }
        }

        if (this.pathVisible && Date.now() - this.lastMoveTime > 1000) {
            vehiclePath.setStyle({ opacity: 0 });
            this.pathVisible = false;
        }
    }

    // ======================
    // 4. KONTROL & EVENT
    // ======================
    setupControls() {
        document.getElementById('armBtn').addEventListener('click', () => {
            const command = this.isArmed ? 'disarm' : 'arm';
            this.sendCommand(command);
        });

        document.getElementById('setModeBtn').addEventListener('click', () => {
            const mode = document.getElementById('flightMode').value;
            this.sendCommand('set_mode', { mode });
        });

        document.getElementById('roverBtn').addEventListener('click', () => {
            this.vehicleType = 'ROVER';
            this.updateDisplay('vehicleTypeValue', this.vehicleType);
            alert('Vehicle type set to ROVER (simulated)');
        });

        document.getElementById('droneBtn').addEventListener('click', () => {
            this.vehicleType = 'DRONE';
            this.updateDisplay('vehicleTypeValue', this.vehicleType);
            alert('Vehicle type set to DRONE (simulated)');
        });

        document.getElementById('toggleAutoCenterBtn').addEventListener('click', () => {
            this.autoCenter = !this.autoCenter;
            document.getElementById('toggleAutoCenterBtn').textContent =
                this.autoCenter ? 'Disable Auto-Center' : 'Enable Auto-Center';
        });
    }

    sendCommand(command, params = {}) {
        console.log(`Simulated command: ${command}`, params);

        if (command === 'arm') {
            this.isArmed = true;
            this.updateDisplay('armedStatus', 'ARMED');
            document.getElementById('armBtn').textContent = 'DISARM';
            document.getElementById('armBtn').className = 'btn btn-danger';
            alert('Drone armed (simulated)');
        } 
        else if (command === 'disarm') {
            this.isArmed = false;
            this.updateDisplay('armedStatus', 'DISARMED');
            document.getElementById('armBtn').textContent = 'ARM';
            document.getElementById('armBtn').className = 'btn btn-success';
            alert('Drone disarmed (simulated)');
        } 
        else if (command === 'set_mode') {
            this.currentMode = params.mode || 'UNKNOWN';
            this.updateDisplay('modeStatus', `MODE: ${this.currentMode}`);
            alert(`Flight mode set to ${this.currentMode} (simulated)`);
        }
    }

    // ======================
    // 5. TELEMETRI SIMULASI
    // ======================
    simulateTelemetry() {
        setInterval(() => {
            const telemetry = {
                latitude: -6.2 + Math.random() * 0.01,
                longitude: 106.8 + Math.random() * 0.01,
                altitude: 100 + Math.random() * 10,
                speed: 5 + Math.random() * 2,
                battery: Math.floor(70 + Math.random() * 30),
                heading: Math.floor(Math.random() * 360),
                mode: this.currentMode,
                armed: this.isArmed
            };

            this.updateTelemetry(telemetry);
            this.updateMap(telemetry);
        }, 1000);
    }

    updateTelemetry(data) {
        this.updateDisplay('altitudeValue', `${data.altitude.toFixed(2)} m`);
        this.updateDisplay('speedValue', `${data.speed.toFixed(1)} m/s`);
        this.updateDisplay('batteryValue', `${data.battery} %`);
        this.updateDisplay('headingValue', `${data.heading}°`);
        this.updateDisplay('gpsValue', `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`);
        this.updateDisplay('modeStatus', `MODE: ${data.mode}`);
        this.updateDisplay('armedStatus', data.armed ? 'ARMED' : 'DISARMED');

        const armBtn = document.getElementById('armBtn');
        const armedStatus = document.getElementById('armedStatus');

        if (data.armed) {
            armedStatus.className = 'armed-status armed-true';
            armBtn.className = 'btn btn-danger';
            armBtn.textContent = 'DISARM';
        } else {
            armedStatus.className = 'armed-status armed-false';
            armBtn.className = 'btn btn-success';
            armBtn.textContent = 'ARM';
        }
    }

    // ======================
    // 6. UTILITAS
    // ======================
    updateDisplay(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

// ======================
// 7. FUNGSI KAMERA
// ======================
function initCameraStream() {
    const video = document.getElementById('cameraStream');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera access is not supported in this browser.");
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => { video.srcObject = stream; })
        .catch(error => { console.error("Error accessing camera:", error); });
}
let cameraStream = null;
const cameraVideo = document.getElementById("cameraStream");
const cameraToggleBtn = document.getElementById("startCameraBtn");

cameraToggleBtn.addEventListener("click", async () => {
    if (cameraStream) {
        // 🔴 Pastikan video berhenti dulu
        cameraVideo.pause();
        cameraVideo.srcObject = null;

        // Hentikan semua track kamera
        cameraStream.getTracks().forEach(track => {
            track.stop();
            console.log(`Track ${track.kind} stopped. State: ${track.readyState}`);
        });

        cameraStream = null;

        // Ubah tombol kembali ke Start
        cameraToggleBtn.textContent = "Start Camera";
        cameraToggleBtn.style.backgroundColor = "#28a745";
    } else {
        try {
            // 🟢 Minta akses kamera
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraVideo.srcObject = cameraStream;
            await cameraVideo.play();

            // Ubah tombol jadi Stop
            cameraToggleBtn.textContent = "Stop Camera";
            cameraToggleBtn.style.backgroundColor = "#dc3545";
        } catch (err) {
            alert("Please check camera permissions: " + err.message);
        }
    }
});




// ======================
// 8. ENTRY POINT
// ======================
window.addEventListener('DOMContentLoaded', () => {
    initCameraStream();
});
    function showPage(page) {
        document.querySelectorAll('.page').forEach(el => {
            el.style.display = 'none';
        });
        document.getElementById('page-' + page).style.display = 'block';
    }


function updateValue(slider) {
    const valueSpan = slider.nextElementSibling;
    valueSpan.textContent = slider.value + "%";
}




function setActiveSidebar(el) {
    // Hapus active dari semua link
    document.querySelectorAll('.sidebar ul li a').forEach(a => a.classList.remove('active'));
    
    // Tambahkan active ke link yang diklik
    el.classList.add('active');
}

function updateValue(slider) {
    const valueDisplay = slider.nextElementSibling;
    valueDisplay.textContent = slider.value + "%";

    // Kalau mode "lock all" aktif, semua slider ikut berubah
    if (document.getElementById("lockAll").checked) {
        document.querySelectorAll('.slider-item input[type="range"]').forEach(s => {
            if (s !== slider) {
                s.value = slider.value;
                s.nextElementSibling.textContent = slider.value + "%";
            }
        });
    }
}

    
    
// Jalankan GCS
new GroundControlStation();