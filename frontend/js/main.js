document.addEventListener('DOMContentLoaded', async () => {
    const deviceManager = new DeviceManager();
    const jailbreakManager = new JailbreakManager();
    
    try {
        await deviceManager.connect();
        updateConnectionStatus('connected', 'Connected to device bridge');
        
        // Setup event listeners
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                deviceManager.performDeviceAction(btn.dataset.action);
            });
        });
        
    } catch (error) {
        updateConnectionStatus('error', `Connection error: ${error.message}`);
    }
    
    // Your existing UI functions
    function updateConnectionStatus(status, message) {
        // ... existing implementation ...
    }
});
