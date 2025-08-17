const express = require('express');
const { exec } = require('child_process');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });

// Device Manager
class DeviceManager {
  constructor() {
    this.devices = new Map();
  }

  async getConnectedDevices() {
    return new Promise((resolve) => {
      exec('idevice_id -l', (error, stdout) => {
        if (error) return resolve([]);
        resolve(stdout.trim().split('\n').filter(udid => udid));
      });
    });
  }

  async getDeviceInfo(udid) {
    return new Promise((resolve) => {
      exec(`ideviceinfo -u ${udid}`, (error, stdout) => {
        if (error) return resolve(null);
        
        const info = {};
        stdout.split('\n').forEach(line => {
          const [key, value] = line.split(': ');
          if (key && value) info[key.trim()] = value.trim();
        });
        
        resolve(info);
      });
    });
  }
}

const manager = new DeviceManager();

// WebSocket Connection
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  const sendDeviceList = async () => {
    const devices = await manager.getConnectedDevices();
    const detailedDevices = [];
    
    for (const udid of devices) {
      const info = await manager.getDeviceInfo(udid);
      if (info) detailedDevices.push({ udid, ...info });
    }
    
    ws.send(JSON.stringify({
      type: 'device_update',
      devices: detailedDevices
    }));
  };
  
  // Send initial device list
  sendDeviceList();
  
  // Update every 3 seconds
  const interval = setInterval(sendDeviceList, 3000);
  
  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

// API Endpoints
app.post('/api/action', async (req, res) => {
  const { udid, action } = req.body;
  
  try {
    let command;
    switch(action) {
      case 'screenshot':
        command = `idevicescreenshot -u ${udid} screenshot_${Date.now()}.png`;
        break;
      case 'reboot':
        command = `idevicediagnostics -u ${udid} restart`;
        break;
      // Add more actions as needed
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    exec(command, (error) => {
      if (error) throw error;
      res.json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
