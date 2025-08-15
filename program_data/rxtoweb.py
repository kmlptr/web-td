import socket
import json
import threading
from flask import Flask, jsonify
from flask_cors import CORS

# ======= Konfigurasi =======
UDP_IP = "0.0.0.0"
UDP_PORT = 5005
latest_data = {}  # Menyimpan data terakhir

# ======= Setup Flask =======
app = Flask(__name__)
CORS(app)

@app.route("/telemetry")
def telemetry():
    """Endpoint API untuk mengirimkan data telemetry terbaru."""
    return jsonify(latest_data)

# ======= Fungsi UDP Receiver =======
def udp_receiver():
    global latest_data
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((UDP_IP, UDP_PORT))
    print(f"[UDP] Menunggu data di {UDP_IP}:{UDP_PORT} ...")

    while True:
        try:
            data, addr = sock.recvfrom(4096)  # buffer besar biar aman
            payload = json.loads(data.decode("utf-8", errors="ignore"))

            # Ambil data dengan default value kalau tidak ada
            mode = payload.get("mode", "UNKNOWN")
            gps = payload.get("gps", {})
            motors = payload.get("motors", {})
            armed = bool(payload.get("armed", False))
            attitude = payload.get("attitude", {})
            battery = payload.get("battery", {})

            latest_data = {
                "mode": mode,
                "armed": armed,
                "latitude": gps.get("lat", 0.0),
                "longitude": gps.get("lon", 0.0),
                "altitude": gps.get("alt_rel", 0.0),
                "satellites": gps.get("satellites", 0),
                "heading": gps.get("heading", 0),
                "speed": gps.get("speed", 0.0),
                "motors": {
                    "motor1": motors.get("motor1", 0),
                    "motor2": motors.get("motor2", 0),
                    "motor3": motors.get("motor3", 0),
                    "motor4": motors.get("motor4", 0),
                },
                "attitude": {
                    "pitch": attitude.get("pitch", 0.0),
                    "roll": attitude.get("roll", 0.0)
                },
                "battery": {
                    "percent": battery.get("percent", 0),
                    "voltage": battery.get("voltage", 0.0)
                }
            }

            print(f"[UDP] Data dari {addr}: {latest_data}")

        except json.JSONDecodeError:
            print("[UDP] Data diterima bukan JSON valid.")
        except Exception as e:
            print(f"[UDP] Error: {e}")

# ======= Jalankan UDP Receiver di Thread Terpisah =======
udp_thread = threading.Thread(target=udp_receiver, daemon=True)
udp_thread.start()

# ======= Jalankan Flask =======
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
