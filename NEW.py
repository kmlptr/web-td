from flask import Flask, Response, render_template_string
import cv2
import threading
import time
import socket
import psutil
from flask_socketio import SocketIO
import numpy as np
import signal
import sys

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Global variables
video_capture = None
frame_rate = 30  # Adjusted for video playback
last_bandwidth_check = time.time()
bytes_sent = 0
running = True
video_path = r"D:\VIKHASA\technologydevelopment\sampelwarna\dji_fly_20250621_103541_0_1750476941797_video_low_quality.mp4"

def init_video():
    global video_capture
    video_capture = cv2.VideoCapture(video_path)
    if not video_capture.isOpened():
        raise RuntimeError(f"Cannot open video file at {video_path}")
    
    # Get video properties
    width = int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = video_capture.get(cv2.CAP_PROP_FPS)
    frame_count = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"Video loaded: {width}x{height} at {fps:.2f} FPS")
    print(f"Total frames: {frame_count}")
    print(f"Duration: {frame_count/fps:.2f} seconds")

def generate_frames():
    global bytes_sent, running, video_capture
    
    # Reset video to beginning
    video_capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
    
    while running:
        success, frame = video_capture.read()
        if not success:
            # Loop the video when it ends
            video_capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
            
        frame = cv2.resize(frame, (640, 480))
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        frame_bytes = buffer.tobytes()
        bytes_sent += len(frame_bytes)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        # Control frame rate for video playback
        time.sleep(1/frame_rate)
    
    print("Frame generator stopped")

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>DJI Video Stream</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; }
                .container { margin: 20px auto; max-width: 800px; }
                .stats { margin: 20px 0; padding: 10px; background: #f0f0f0; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>DJI Video Stream</h1>
                <div class="stats">
                    <p>Latency: <span id="latency">--</span> ms</p>
                    <p>Packet Loss: <span id="packetLoss">--</span>%</p>
                    <p>Jitter: <span id="jitter">--</span> ms</p>
                    <p>Bandwidth: <span id="bandwidth">--</span> Mbps</p>
                </div>
                <img src="{{ url_for('video_feed') }}" width="640" height="480">
            </div>
            <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
            <script>
                const socket = io();
                socket.on('network_stats', function(data) {
                    document.getElementById('latency').textContent = data.latency;
                    document.getElementById('packetLoss').textContent = data.packetLoss;
                    document.getElementById('jitter').textContent = data.jitter;
                    document.getElementById('bandwidth').textContent = data.bandwidth;
                });
            </script>
        </body>
        </html>
    ''')

def network_stats_thread():
    global bytes_sent, last_bandwidth_check, running
    last_time = time.time()
    last_bytes = 0
    latency_samples = []
    
    while running:
        time.sleep(2)
        current_time = time.time()
        time_elapsed = current_time - last_bandwidth_check
        bandwidth = (bytes_sent * 8) / (time_elapsed * 1000000)
        bytes_sent = 0
        last_bandwidth_check = current_time
        
        latency = np.random.uniform(5, 50)
        latency_samples.append(latency)
        if len(latency_samples) > 10:
            latency_samples.pop(0)
        
        avg_latency = sum(latency_samples) / len(latency_samples)
        jitter = np.std(latency_samples)
        packet_loss = np.random.uniform(0, 1)
        
        socketio.emit('network_stats', {
            'latency': round(avg_latency, 1),
            'packetLoss': round(packet_loss, 1),
            'jitter': round(jitter, 1),
            'bandwidth': round(bandwidth, 1)
        })
    
    print("Network stats thread stopped")

def get_ip_addresses():
    ips = []
    for interface, addrs in psutil.net_if_addrs().items():
        for addr in addrs:
            if addr.family == socket.AF_INET and not addr.address.startswith('127.'):
                ips.append(f"{interface}: {addr.address}")
    return ips

def shutdown_handler(signum, frame):
    global running
    print("\nShutting down server...")
    running = False
    
    # Release video capture
    if video_capture and video_capture.isOpened():
        video_capture.release()
    print("Video capture released")
    
    # Give threads time to stop
    time.sleep(1)
    sys.exit(0)

if __name__ == '__main__':
    # Register signal handlers
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)
    
    try:
        init_video()
        threading.Thread(target=network_stats_thread, daemon=True).start()
        
        print("Network IP Addresses:")
        for ip in get_ip_addresses():
            print(ip)
        
        print("\nServer starting...")
        print("Access the stream at:")
        print(f"http://[YOUR_IP]:5000/")
        print("Press Ctrl+C to stop the server")
        
        socketio.run(app, host='0.0.0.0', port=5000)
    except Exception as e:
        print(f"Error: {e}")
        shutdown_handler(None, None)