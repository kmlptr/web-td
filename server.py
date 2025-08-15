import serial
import time
import json  # jangan lupa import json

def receive_sensor_data(serial_port="/dev/ttyUSB0", baudrate=115200):
    try:
        ser = serial.Serial(serial_port, baudrate, timeout=1)
        print(f"Listening on {serial_port} at {baudrate} baud")
    except serial.SerialException as e:
        print(f"Error opening serial port: {e}")
        return

    while True:
        try:
            line = ser.readline().decode('utf-8', errors='replace').strip()
            if line:
                print(f"Received: {line}")
                # Parsing JSON dari string
                try:
                    data = json.loads(line)
                    # Contoh akses data JSON
                    print("GPS Lat:", data['gps']['lat'], "Lon:", data['gps']['lon'])
                    print("Accel:", data['mpu']['accel'])
                    print("Altitude:", data['altitude'])
                except json.JSONDecodeError:
                    print("Received data is not valid JSON")
        except KeyboardInterrupt:
            print("Exiting...")
            break
        except Exception as e:
            print(f"Error reading data: {e}")

        time.sleep(0.1)

if __name__ == "__main__":
    receive_sensor_data(serial_port="/dev/ttyUSB0", baudrate=115200)
