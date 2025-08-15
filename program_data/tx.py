from pymavlink import mavutil
import socket
import json
import math  # untuk konversi radian ke derajat

# Konfigurasi IP & port Raspberry Pi
UDP_IP = "0.0.0.0"   # Ganti dengan IP Raspberry Pi atau tujuan pengiriman
UDP_PORT = 5005

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Koneksi ke SITL / Gazebo
master = mavutil.mavlink_connection('udp:127.0.0.1:14550')
master.wait_heartbeat()
print(f"Heartbeat dari sistem (system {master.target_system} component {master.target_component})")

while True:
    # Terima pesan heartbeat (untuk mode drone & status arm)
    hb_msg = master.recv_match(type='HEARTBEAT', blocking=True)
    mode_drone = master.flightmode  # Mode terdeteksi (misal: STABILIZE, GUIDED, AUTO, dll.)

    # Status armed/disarmed
    armed = bool(hb_msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)

    # Ambil data telemetri
    gps_msg = master.recv_match(type='GPS_RAW_INT', blocking=True)
    pos_msg = master.recv_match(type='GLOBAL_POSITION_INT', blocking=True)
    hud_msg = master.recv_match(type='VFR_HUD', blocking=True)
    rc_msg  = master.recv_match(type='SERVO_OUTPUT_RAW', blocking=True)
    att_msg = master.recv_match(type='ATTITUDE', blocking=True)  # Pitch & Roll
    batt_msg = master.recv_match(type='BATTERY_STATUS', blocking=True)  # Baterai

    if not (gps_msg and pos_msg and hud_msg and rc_msg and att_msg and batt_msg):
        continue

    # GPS & sat
    lat = gps_msg.lat / 1e7
    lon = gps_msg.lon / 1e7
    sat = gps_msg.satellites_visible
    fix = gps_msg.fix_type
    rel_alt = pos_msg.relative_alt / 1000.0
    heading = hud_msg.heading
    speed = hud_msg.groundspeed  # m/s

    # Motor PWM → Persentase
    motors_pwm = [rc_msg.servo1_raw, rc_msg.servo2_raw, rc_msg.servo3_raw, rc_msg.servo4_raw]
    motors_percent = {
        f"motor{i+1}": round((pwm - 1000) / 10, 1) for i, pwm in enumerate(motors_pwm)
    }

    # Pitch & Roll (radian → derajat)
    pitch = math.degrees(att_msg.pitch)
    roll = math.degrees(att_msg.roll)

    # Baterai
    battery_percent = batt_msg.battery_remaining  # dalam persen
    battery_voltage = batt_msg.voltages[0] / 1000.0  # mV → Volt

    # Buat payload JSON
    payload = {
        "mode": mode_drone,
        "armed": armed,
        "gps": {
            "lat": lat,
            "lon": lon,
            "alt_rel": rel_alt,
            "satellites": sat,
            "fix_type": fix,
            "heading": heading,
            "speed": speed
        },
        "motors": motors_percent,
        "attitude": {
            "pitch": round(pitch, 2),
            "roll": round(roll, 2)
        },
        "battery": {
            "percent": battery_percent,
            "voltage": round(battery_voltage, 2)
        }
    }

    # Kirim ke Raspberry Pi
    sock.sendto(json.dumps(payload).encode(), (UDP_IP, UDP_PORT))
    print("Terkirim:", payload)
