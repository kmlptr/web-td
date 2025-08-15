// ======================
// 1. KELAS UTAMA GCS
// ======================
class GroundControlStation {
    constructor() {
        this.mapElements = {};
        this.isArmed = false;
        this.currentMode = 'STABILIZE';
        this.vehicleType = 'DRONE';
        this.lastMoveTime = Date.now();
        this.pathVisible = false;
        this.autoCenter = false;
        this.telemetryTimer = null;
        this.init();
    }

    // ======================
    // 2. INISIALISASI UTAMA
    // ======================
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initMap();
            this.setupControls();
            this.startTelemetryLoop();
        });
    }

    // ======================
    // 3. MAP DAN PATH
    // ======================
    initMap() {
        const map = L.map('map').setView([0, 0], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const vehicleMarker = L.marker([0, 0]).addTo(map);
        const vehiclePath = L.polyline([], { color: 'blue' }).addTo(map);

        this.mapElements = { map, vehicleMarker, vehiclePath, pathPoints: [] };

        setInterval(() => {
            const now = Date.now();
            if (now - this.lastMoveTime > 200 && this.pathVisible) {
                this.mapElements.vehiclePath.setLatLngs([]);
                this.mapElements.pathPoints = [];
                this.pathVisible = false;
            }
        }, 500);
    }

    updateMap(data) {
        const { vehicleMarker, vehiclePath, pathPoints, map } = this.mapElements;

        // Tetap update walau koordinat 0
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            const pos = [data.latitude, data.longitude];
            vehicleMarker.setLatLng(pos);
            pathPoints.push(pos);
            vehiclePath.setLatLngs(pathPoints);
            vehiclePath.setStyle({ opacity: 1 });
            this.lastMoveTime = Date.now();
            this.pathVisible = true;

            if (this.autoCenter) {
                map.setView(pos, 20);
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
        } 
        else if (command === 'disarm') {
            this.isArmed = false;
            this.updateDisplay('armedStatus', 'DISARMED');
            document.getElementById('armBtn').textContent = 'ARM';
            document.getElementById('armBtn').className = 'btn btn-success';
        } 
        else if (command === 'set_mode') {
            this.currentMode = params.mode || 'UNKNOWN';
            this.updateDisplay('modeStatus', `MODE: ${this.currentMode}`);
        }
    }

    // ======================
    // 5. LOOP TELEMETRI
    // ======================
    startTelemetryLoop() {
        const fetchTelemetry = () => {
            fetch('http://localhost:8000/telemetry')
                .then(res => res.json())
                .then(data => {
                    this.updateTelemetry(data);
                    this.updateMap(data);
                })
                .catch(err => console.error("Gagal ambil telemetry:", err));
        };

        this.telemetryTimer = setInterval(fetchTelemetry, 200);
    }

    updateTelemetry(data) {
        if (!data || typeof data !== 'object') return;

        // Status ARM / DISARM
        if (typeof data.armed === 'boolean') {
            this.isArmed = data.armed;

            const armedStatusElement = document.getElementById('armedStatus');
            if (armedStatusElement) {
                armedStatusElement.textContent = this.isArmed ? 'ARMED' : 'DISARMED';
                armedStatusElement.classList.toggle('armed-true', this.isArmed);
                armedStatusElement.classList.toggle('armed-false', !this.isArmed);
            }

            const armBtn = document.getElementById('armBtn');
            if (armBtn) {
                armBtn.textContent = this.isArmed ? 'DISARM' : 'ARM';
                armBtn.className = this.isArmed ? 'btn btn-danger' : 'btn btn-success';
            }
        }

        // Mode
        if (typeof data.mode === 'string') {
            this.currentMode = data.mode;
            this.updateDisplay('modeStatus', `MODE: ${this.currentMode}`);
        }

        // Telemetry numeric data
        this.updateDisplay(
            'altitudeValue',
            typeof data.altitude === 'number' ? `${data.altitude.toFixed(2)} m` : "-"
        );
        this.updateDisplay(
            'speedValue',
            typeof data.speed === 'number' ? `${data.speed.toFixed(1)} m/s` : "-"
        );
        this.updateDisplay(
            'headingValue',
            typeof data.heading === 'number' ? `${data.heading}°` : "-"
        );
        this.updateDisplay(
            'gpsValue',
            (typeof data.latitude === 'number' && typeof data.longitude === 'number')
                ? `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
                : "-"
        );

        // Motors
        const motors = data.motors || {};
        this.updateDisplay('motor1', `${motors.motor1 ?? 0}%`);
        this.updateDisplay('motor2', `${motors.motor2 ?? 0}%`);
        this.updateDisplay('motor3', `${motors.motor3 ?? 0}%`);
        this.updateDisplay('motor4', `${motors.motor4 ?? 0}%`);
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
        cameraVideo.pause();
        cameraVideo.srcObject = null;
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        cameraToggleBtn.textContent = "Start Camera";
        cameraToggleBtn.style.backgroundColor = "#28a745";
    } else {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraVideo.srcObject = cameraStream;
            await cameraVideo.play();
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

// ======================
// 9. FUNGSI HALAMAN & SLIDER
// ======================
function showPage(page) {
    document.querySelectorAll('.page').forEach(el => el.style.display = 'none');
    document.getElementById('page-' + page).style.display = 'block';
}

function updateValue(slider) {
    const valueDisplay = slider.nextElementSibling;
    valueDisplay.textContent = slider.value + "%";

    if (document.getElementById("lockAll").checked) {
        document.querySelectorAll('.slider-item input[type="range"]').forEach(s => {
            if (s !== slider) {
                s.value = slider.value;
                s.nextElementSibling.textContent = slider.value + "%";
            }
        });
    }
}

function setActiveSidebar(el) {
    document.querySelectorAll('.sidebar ul li a').forEach(a => a.classList.remove('active'));
    el.classList.add('active');
}



// Jalankan GCS
new GroundControlStation();
