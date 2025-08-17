class DeviceManager {
    constructor() {
        this.devices = new Map();
        this.socket = null;
        this.currentModalDevice = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = new WebSocket('ws://localhost:8080');
            
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'device_update') {
                    this.processDeviceUpdate(data.devices);
                }
            };
            
            this.socket.onopen = () => resolve(true);
            this.socket.onerror = (error) => reject(error);
        });
    }

    processDeviceUpdate(deviceList) {
        // Add new devices
        deviceList.forEach(deviceData => {
            if (!this.devices.has(deviceData.udid)) {
                this.addDevice(deviceData);
            } else {
                this.updateDevice(deviceData);
            }
        });
        
        // Remove disconnected devices
        const currentUDIDs = deviceList.map(d => d.udid);
        Array.from(this.devices.keys()).forEach(udid => {
            if (!currentUDIDs.includes(udid)) {
                this.removeDevice(udid);
            }
        });
    }

    addDevice(deviceData) {
        const device = {
            udid: deviceData.udid,
            name: deviceData.DeviceName || 'Unknown',
            model: deviceData.ProductType || 'Unknown',
            ios: deviceData.ProductVersion || '0.0',
            type: deviceData.Transport === 'USB' ? 'usb' : 'wifi',
            battery: parseInt(deviceData.BatteryCurrentCapacity) || 0,
            charging: deviceData.BatteryIsCharging === 'true',
            storage: {
                total: Math.floor(parseInt(deviceData.TotalDiskCapacity) / (1024 * 1024 * 1024)) || 0,
                used: Math.floor(parseInt(deviceData.UsedDiskCapacity) / (1024 * 1024 * 1024)) || 0
            },
            trusted: deviceData.HostAttached !== 'false'
        };
        
        this.devices.set(device.udid, device);
        this.updateDeviceUI(device);
        this.onDeviceConnected(device);
    }

    // Keep all your existing UI update methods
    // updateDeviceUI(), showDeviceModal(), etc.
    
    async performDeviceAction(action) {
        if (!this.currentModalDevice) return;
        
        try {
            const response = await fetch('http://localhost:3000/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    udid: this.currentModalDevice.udid,
                    action
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showActionStatus(`${action} completed successfully`, 'success');
            } else {
                throw new Error(result.error || 'Action failed');
            }
        } catch (error) {
            this.showActionStatus(`Error during ${action}: ${error.message}`, 'error');
        }
    }
}
