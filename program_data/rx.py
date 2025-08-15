import socket
import json

UDP_IP = "0.0.0.0"
UDP_PORT = 5005

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

print(f"Menunggu data pada {UDP_IP}:{UDP_PORT} ...")

while True:
    data, addr = sock.recvfrom(1024)
    try:
        payload = json.loads(data.decode())

        # Ambil data
        mode = payload.get("mode", "UNKNOWN")  # Mode default UNKNOWN jika tidak ada
        gps = payload.get("gps", {})
        motors = payload.get("motors", {})

        print("\n=== Data Diterima dari", addr, "===")
        print(f"Mode      : {mode}")
        print(f"Latitude  : {gps.get('lat')}")
        print(f"Longitude : {gps.get('lon')}")
        print(f"Alt (Rel) : {gps.get('alt_rel')} m")
        print(f"Satellites: {gps.get('satellites')}")
        print(f"Heading   : {gps.get('heading')}")
        print(f"Speed     : {gps.get('speed')} m/s")

        # Print persentase motor
        for m, val in motors.items():
            print(f"{m} : {val:.1f}%")

    except Exception as e:
        print("Gagal memproses data:", e)
