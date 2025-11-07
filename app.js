// ניהול מכשירים
let devices = JSON.parse(localStorage.getItem('devices')) || [];
let currentDevice = null;
let isListening = false;
let recognition = null;
let irScanning = false;
let learnedIRButtons = JSON.parse(localStorage.getItem('irButtons')) || {};
let usbDevice = null; // מכשיר USB מחובר

// אתחול
document.addEventListener('DOMContentLoaded', () => {
    initSpeechRecognition();
    loadDevices();
    setupEventListeners();
    loadIRButtons();
    reconnectUSB(); // ניסיון להתחבר למכשיר USB שמור
});

// אתחול זיהוי קול
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'he-IL';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isListening = true;
            document.getElementById('startListening').classList.add('listening');
            document.getElementById('voiceFeedback').textContent = '🎤 מאזין...';
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            document.getElementById('transcript').textContent = transcript;
            processVoiceCommand(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            document.getElementById('voiceFeedback').textContent = 'שגיאה בזיהוי קול';
        };

        recognition.onend = () => {
            isListening = false;
            document.getElementById('startListening').classList.remove('listening');
            if (isListening) {
                recognition.start();
            }
        };
    } else {
        alert('הדפדפן שלך לא תומך בזיהוי קול');
    }
}

// עיבוד פקודות קוליות
function processVoiceCommand(command) {
    const lowerCommand = command.toLowerCase();
    
    // פקודות עוצמה
    if (lowerCommand.includes('הגבר') || lowerCommand.includes('העלה עוצמה')) {
        increaseVolume();
    } else if (lowerCommand.includes('הנמך') || lowerCommand.includes('הורד עוצמה')) {
        decreaseVolume();
    } else if (lowerCommand.includes('עצור') || lowerCommand.includes('השתק')) {
        mute();
    }
    
    // פקודות טלוויזיה
    else if (lowerCommand.includes('ערוץ') && lowerCommand.match(/\d+/)) {
        const channel = lowerCommand.match(/\d+/)[0];
        changeChannel(channel);
    } else if (lowerCommand.includes('ערוץ הבא') || lowerCommand.includes('ערוץ למעלה')) {
        channelUp();
    } else if (lowerCommand.includes('ערוץ קודם') || lowerCommand.includes('ערוץ למטה')) {
        channelDown();
    }
    
    // פקודות מזגן
    else if (lowerCommand.includes('הדלק מזגן')) {
        turnOnAC();
    } else if (lowerCommand.includes('כבה מזגן')) {
        turnOffAC();
    } else if (lowerCommand.includes('טמפרטורה') && lowerCommand.match(/\d+/)) {
        const temp = lowerCommand.match(/\d+/)[0];
        setTemperature(temp);
    }
    
    // פקודות תאורה
    else if (lowerCommand.includes('הדלק אור') || lowerCommand.includes('הדלק תאורה')) {
        turnOnLight();
    } else if (lowerCommand.includes('כבה אור') || lowerCommand.includes('כבה תאורה')) {
        turnOffLight();
    }
    
    // פקודות כלליות
    else if (lowerCommand.includes('הדלק') && currentDevice) {
        turnOnDevice(currentDevice);
    } else if (lowerCommand.includes('כבה') && currentDevice) {
        turnOffDevice(currentDevice);
    }
}

// פונקציות שליטה
function increaseVolume() {
    sendCommand('volume_up');
    showFeedback('🔊 מעלה עוצמה');
}

function decreaseVolume() {
    sendCommand('volume_down');
    showFeedback('🔉 מוריד עוצמה');
}

function mute() {
    sendCommand('mute');
    showFeedback('🔇 השתקה');
}

function changeChannel(channel) {
    sendCommand('channel', channel);
    showFeedback(`📺 מעבר לערוץ ${channel}`);
}

function channelUp() {
    sendCommand('channel_up');
    showFeedback('📺 ערוץ הבא');
}

function channelDown() {
    sendCommand('channel_down');
    showFeedback('📺 ערוץ קודם');
}

function turnOnAC() {
    sendCommand('ac_on');
    showFeedback('❄️ הדלקת מזגן');
}

function turnOffAC() {
    sendCommand('ac_off');
    showFeedback('❄️ כיבוי מזגן');
}

function setTemperature(temp) {
    sendCommand('set_temp', temp);
    showFeedback(`🌡️ הגדרת טמפרטורה ל-${temp} מעלות`);
}

function turnOnLight() {
    sendCommand('light_on');
    showFeedback('💡 הדלקת תאורה');
}

function turnOffLight() {
    sendCommand('light_off');
    showFeedback('💡 כיבוי תאורה');
}

function turnOnDevice(device) {
    sendCommand('power_on', null, device);
    showFeedback(`✅ הדלקת ${device.name}`);
}

function turnOffDevice(device) {
    sendCommand('power_off', null, device);
    showFeedback(`⏹️ כיבוי ${device.name}`);
}

// שליחת פקודה למכשיר
function sendCommand(command, value = null, device = null) {
    const targetDevice = device || currentDevice || devices[0];
    
    if (!targetDevice) {
        console.log('אין מכשיר נבחר');
        return;
    }
    
    const commandData = {
        device: targetDevice.id,
        command: command,
        value: value,
        timestamp: new Date().toISOString()
    };
    
    console.log('שליחת פקודה:', commandData);
    
    // שליחה לפי סוג התחברות
    switch (targetDevice.connectionType) {
        case 'ir':
            sendIRCommand(targetDevice, command, value);
            break;
        case 'wifi':
            sendWiFiCommand(targetDevice, command, value);
            break;
        case 'bluetooth':
            sendBluetoothCommand(targetDevice, command, value);
            break;
        case 'usb':
            sendUSBCommand(command, value);
            break;
    }
}

// שליחת פקודת IR
async function sendIRCommand(device, command, value) {
    const buttonKey = `${device.id}_${command}${value ? '_' + value : ''}`;
    const irCode = learnedIRButtons[buttonKey];
    
    if (irCode) {
        console.log('שליחת קוד IR:', irCode);
        
        // אם יש מכשיר USB מחובר, שלח דרך USB
        if (usbDevice) {
            const success = await sendUSBCommand('IR_SEND', irCode);
            if (success) {
                showFeedback('✅ פקודת IR נשלחה דרך USB');
                return;
            }
        }
        
        // כאן תהיה שליחה אמיתית למכשיר IR דרך Bluetooth או אחר
        // לדוגמה: sendToIRDevice(irCode);
        showFeedback('⚠️ אין מכשיר USB מחובר. התחבר דרך USB');
    } else {
        console.log('קוד IR לא נמצא, יש לסרוק תחילה');
        showFeedback('⚠️ קוד IR לא נמצא. יש לסרוק תחילה');
    }
}

// שליחת פקודת WiFi
function sendWiFiCommand(device, command, value) {
    if (!device.ip) {
        showFeedback('⚠️ כתובת IP לא מוגדרת');
        return;
    }
    
    const url = `http://${device.ip}/api/command`;
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, value })
    }).catch(err => {
        console.error('שגיאה בשליחת פקודת WiFi:', err);
        showFeedback('⚠️ שגיאה בשליחת פקודה');
    });
}

// שליחת פקודת Bluetooth
function sendBluetoothCommand(device, command, value) {
    if (!device.bluetoothId) {
        showFeedback('⚠️ מכשיר Bluetooth לא מחובר');
        return;
    }
    
    // כאן תהיה שליחה אמיתית דרך Web Bluetooth API
    console.log('שליחת פקודת Bluetooth:', { device: device.bluetoothId, command, value });
}

// סריקת IR
function startIRScan() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('הדפדפן שלך לא תומך בגישה למצלמה/חיישן IR');
        return;
    }
    
    irScanning = true;
    document.getElementById('startIRScan').style.display = 'none';
    document.getElementById('stopIRScan').style.display = 'inline-block';
    document.getElementById('irStatus').textContent = '🔍 סורק... לחץ על כפתור בשלט';
    document.getElementById('irStatus').className = 'status-message info';
    
    // כאן תהיה סריקה אמיתית של IR
    // לדוגמה: startIRCapture();
    
    // סימולציה - לחץ על כפתור כדי ללמוד
    setupIRButtonLearning();
}

function stopIRScan() {
    irScanning = false;
    document.getElementById('startIRScan').style.display = 'inline-block';
    document.getElementById('stopIRScan').style.display = 'none';
    document.getElementById('irStatus').textContent = 'סריקה הופסקה';
    document.getElementById('irStatus').className = 'status-message';
}

function setupIRButtonLearning() {
    // יצירת כפתורים ללמידה
    const commonButtons = ['הדלק', 'כבה', 'עוצמה +', 'עוצמה -', 'ערוץ +', 'ערוץ -', 'ערוץ 1', 'ערוץ 2', 'ערוץ 3'];
    const container = document.getElementById('irButtons');
    container.innerHTML = '';
    
    commonButtons.forEach(btnName => {
        const btn = document.createElement('button');
        btn.className = 'ir-button';
        btn.textContent = btnName;
        btn.onclick = () => learnIRButton(btnName, btn);
        container.appendChild(btn);
    });
}

function learnIRButton(buttonName, buttonElement) {
    if (!irScanning) {
        alert('יש להתחיל סריקה תחילה');
        return;
    }
    
    document.getElementById('irStatus').textContent = `🎯 לחץ על כפתור "${buttonName}" בשלט שלך עכשיו...`;
    
    // סימולציה - כאן תהיה לכידת קוד IR אמיתי
    setTimeout(() => {
        const irCode = generateIRCode();
        const deviceId = currentDevice ? currentDevice.id : 'default';
        const key = `${deviceId}_${buttonName.replace(/\s+/g, '_')}`;
        learnedIRButtons[key] = irCode;
        localStorage.setItem('irButtons', JSON.stringify(learnedIRButtons));
        
        buttonElement.classList.add('learned');
        document.getElementById('irStatus').textContent = `✅ כפתור "${buttonName}" נלמד בהצלחה!`;
        document.getElementById('irStatus').className = 'status-message success';
    }, 2000);
}

function generateIRCode() {
    // סימולציה - יצירת קוד IR אקראי
    return Array.from({length: 32}, () => Math.floor(Math.random() * 2)).join('');
}

// ניהול מכשירים
function loadDevices() {
    const container = document.getElementById('devicesList');
    container.innerHTML = '';
    
    devices.forEach(device => {
        const card = createDeviceCard(device);
        container.appendChild(card);
    });
}

function createDeviceCard(device) {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.innerHTML = `
        <h3>${device.name}</h3>
        <div class="device-type">${getDeviceTypeName(device.type)} - ${getConnectionTypeName(device.connectionType)}</div>
        <div class="device-actions">
            <button class="btn-edit" onclick="editDevice('${device.id}')">ערוך</button>
            <button class="btn-delete" onclick="deleteDevice('${device.id}')">מחק</button>
            <button class="btn-primary" onclick="selectDevice('${device.id}')">בחר</button>
        </div>
    `;
    return card;
}

function getDeviceTypeName(type) {
    const names = {
        'tv': 'טלוויזיה',
        'ac': 'מזגן',
        'audio': 'מערכת שמע',
        'light': 'תאורה',
        'other': 'אחר'
    };
    return names[type] || type;
}

function getConnectionTypeName(type) {
    const names = {
        'ir': 'IR',
        'wifi': 'WiFi',
        'bluetooth': 'Bluetooth',
        'usb': 'USB'
    };
    return names[type] || type;
}

function selectDevice(deviceId) {
    currentDevice = devices.find(d => d.id === deviceId);
    showFeedback(`✅ נבחר מכשיר: ${currentDevice.name}`);
}

function deleteDevice(deviceId) {
    if (confirm('האם אתה בטוח שברצונך למחוק מכשיר זה?')) {
        devices = devices.filter(d => d.id !== deviceId);
        localStorage.setItem('devices', JSON.stringify(devices));
        loadDevices();
    }
}

function editDevice(deviceId) {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
        document.getElementById('deviceName').value = device.name;
        document.getElementById('deviceType').value = device.type;
        document.getElementById('connectionType').value = device.connectionType;
        document.getElementById('deviceIP').value = device.ip || '';
        document.getElementById('deviceModal').style.display = 'block';
        // שמירת ID לעריכה
        document.getElementById('deviceForm').dataset.editId = deviceId;
    }
}

function loadIRButtons() {
    // טעינת כפתורי IR שנלמדו
    setupIRButtonLearning();
}

// הגדרת מאזינים
function setupEventListeners() {
    // כפתור האזנה
    document.getElementById('startListening').addEventListener('click', () => {
        if (!isListening) {
            recognition.start();
        } else {
            recognition.stop();
        }
    });
    
    // הוספת מכשיר
    document.getElementById('addDeviceBtn').addEventListener('click', () => {
        document.getElementById('deviceForm').reset();
        delete document.getElementById('deviceForm').dataset.editId;
        document.getElementById('deviceModal').style.display = 'block';
    });
    
    // סגירת מודל
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('deviceModal').style.display = 'none';
    });
    
    // שמירת מכשיר
    document.getElementById('deviceForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveDevice();
    });
    
    // טאבים
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    // סריקת IR
    document.getElementById('startIRScan').addEventListener('click', startIRScan);
    document.getElementById('stopIRScan').addEventListener('click', stopIRScan);
}

function saveDevice() {
    const form = document.getElementById('deviceForm');
    const editId = form.dataset.editId;
    
    const device = {
        id: editId || Date.now().toString(),
        name: document.getElementById('deviceName').value,
        type: document.getElementById('deviceType').value,
        connectionType: document.getElementById('connectionType').value,
        ip: document.getElementById('deviceIP').value || null
    };
    
    if (editId) {
        const index = devices.findIndex(d => d.id === editId);
        if (index !== -1) {
            devices[index] = device;
        }
    } else {
        devices.push(device);
    }
    
    localStorage.setItem('devices', JSON.stringify(devices));
    loadDevices();
    document.getElementById('deviceModal').style.display = 'none';
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-panel`).classList.add('active');
}

// WiFi
function connectWiFi() {
    const ssid = document.getElementById('wifiSSID').value;
    const password = document.getElementById('wifiPassword').value;
    
    if (!ssid) {
        showStatus('wifiStatus', 'יש להזין שם רשת', 'error');
        return;
    }
    
    // כאן תהיה התחברות אמיתית
    showStatus('wifiStatus', `מתחבר ל-${ssid}...`, 'info');
    
    setTimeout(() => {
        showStatus('wifiStatus', `✅ מחובר ל-${ssid}`, 'success');
    }, 2000);
}

// Bluetooth
function scanBluetooth() {
    if (!navigator.bluetooth) {
        showStatus('bluetoothStatus', 'הדפדפן שלך לא תומך ב-Bluetooth', 'error');
        return;
    }
    
    showStatus('bluetoothStatus', 'סורק מכשירים...', 'info');
    
    navigator.bluetooth.requestDevice({
        acceptAllDevices: true
    }).then(device => {
        showStatus('bluetoothStatus', `✅ מחובר ל-${device.name}`, 'success');
        addBluetoothDevice(device);
    }).catch(err => {
        showStatus('bluetoothStatus', 'בוטל או שגיאה', 'error');
    });
}

function addBluetoothDevice(device) {
    const container = document.getElementById('bluetoothDevices');
    const div = document.createElement('div');
    div.className = 'device-card';
    div.innerHTML = `
        <h3>${device.name}</h3>
        <div class="device-type">Bluetooth</div>
    `;
    container.appendChild(div);
}

// USB Connection
async function connectUSB() {
    if (!navigator.usb) {
        showStatus('usbStatus', '❌ הדפדפן שלך לא תומך ב-WebUSB API. השתמש ב-Chrome או Edge', 'error');
        return;
    }
    
    try {
        showStatus('usbStatus', '🔍 מחפש מכשיר USB...', 'info');
        
        // בקשת גישה למכשיר USB
        // כאן תוכל להוסיף filters ספציפיים למכשיר IR שלך
        usbDevice = await navigator.usb.requestDevice({
            filters: [
                // דוגמה: מכשיר IR נפוץ
                { vendorId: 0x0bda }, // Realtek
                { vendorId: 0x1d50 }, // OpenMoko
                // אפשר להוסיף עוד vendor IDs לפי המכשיר שלך
            ]
        });
        
        showStatus('usbStatus', '🔌 מתחבר למכשיר...', 'info');
        
        // פתיחת המכשיר
        await usbDevice.open();
        
        // בחירת configuration (לרוב 1)
        await usbDevice.selectConfiguration(1);
        
        // claim interface (לרוב 0)
        await usbDevice.claimInterface(0);
        
        showStatus('usbStatus', `✅ מחובר למכשיר: ${usbDevice.productName || 'USB Device'}`, 'success');
        
        // הצגת פרטי המכשיר
        document.getElementById('usbDeviceInfo').style.display = 'block';
        document.getElementById('usbDeviceDetails').innerHTML = `
            <p><strong>יצרן:</strong> ${usbDevice.manufacturerName || 'לא זמין'}</p>
            <p><strong>מודל:</strong> ${usbDevice.productName || 'לא זמין'}</p>
            <p><strong>מספר סידורי:</strong> ${usbDevice.serialNumber || 'לא זמין'}</p>
        `;
        
        // הצגת כפתור ניתוק
        document.getElementById('disconnectUSBBtn').style.display = 'inline-block';
        
        // שמירה ב-localStorage
        localStorage.setItem('usbDevice', JSON.stringify({
            vendorId: usbDevice.vendorId,
            productId: usbDevice.productId
        }));
        
    } catch (error) {
        if (error.name === 'NotFoundError') {
            showStatus('usbStatus', '❌ לא נמצא מכשיר USB. ודא שהמכשיר מחובר', 'error');
        } else if (error.name === 'SecurityError') {
            showStatus('usbStatus', '❌ אין הרשאה לגשת למכשיר USB', 'error');
        } else {
            showStatus('usbStatus', `❌ שגיאה: ${error.message}`, 'error');
        }
        console.error('USB connection error:', error);
    }
}

// ניתוק USB
async function disconnectUSB() {
    if (usbDevice) {
        try {
            await usbDevice.close();
            usbDevice = null;
            showStatus('usbStatus', '✅ מכשיר USB נותק', 'success');
            document.getElementById('usbDeviceInfo').style.display = 'none';
            document.getElementById('disconnectUSBBtn').style.display = 'none';
            localStorage.removeItem('usbDevice');
        } catch (error) {
            showStatus('usbStatus', `❌ שגיאה בניתוק: ${error.message}`, 'error');
        }
    }
}

// שליחת פקודה דרך USB
async function sendUSBCommand(command, value = null) {
    if (!usbDevice) {
        showFeedback('⚠️ אין מכשיר USB מחובר');
        return false;
    }
    
    try {
        // כאן תהיה שליחת הפקודה למכשיר USB
        // זה תלוי בפרוטוקול של המכשיר הספציפי שלך
        
        // דוגמה: שליחת נתונים דרך USB
        const data = new Uint8Array([command, value || 0]);
        
        // שליחה ל-endpoint OUT (לרוב 1)
        await usbDevice.transferOut(1, data);
        
        console.log('פקודה נשלחה דרך USB:', { command, value });
        return true;
    } catch (error) {
        console.error('שגיאה בשליחת פקודת USB:', error);
        showFeedback('❌ שגיאה בשליחת פקודה דרך USB');
        return false;
    }
}

// ניסיון להתחבר למכשיר USB שמור
async function reconnectUSB() {
    const savedDevice = localStorage.getItem('usbDevice');
    if (savedDevice && navigator.usb) {
        try {
            const deviceInfo = JSON.parse(savedDevice);
            const devices = await navigator.usb.getDevices();
            const device = devices.find(d => 
                d.vendorId === deviceInfo.vendorId && 
                d.productId === deviceInfo.productId
            );
            
            if (device) {
                usbDevice = device;
                await device.open();
                await device.selectConfiguration(1);
                await device.claimInterface(0);
                
                document.getElementById('usbDeviceInfo').style.display = 'block';
                document.getElementById('usbDeviceDetails').innerHTML = `
                    <p><strong>יצרן:</strong> ${device.manufacturerName || 'לא זמין'}</p>
                    <p><strong>מודל:</strong> ${device.productName || 'לא זמין'}</p>
                `;
                document.getElementById('disconnectUSBBtn').style.display = 'inline-block';
                showStatus('usbStatus', '✅ התחבר מחדש למכשיר USB', 'success');
            }
        } catch (error) {
            console.error('שגיאה בהתחברות מחדש:', error);
        }
    }
}

// IR Connection
function connectIR() {
    showStatus('irConnectionStatus', 'מחפש מכשיר IR...', 'info');
    
    // אם יש מכשיר USB, נסה להשתמש בו
    if (usbDevice) {
        showStatus('irConnectionStatus', '✅ משתמש במכשיר USB לחיבור IR', 'success');
    } else {
        // כאן תהיה חיפוש מכשיר IR דרך Bluetooth או אחר
        setTimeout(() => {
            showStatus('irConnectionStatus', '⚠️ אין מכשיר USB. התחבר דרך USB או Bluetooth', 'error');
        }, 2000);
    }
}

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message ${type}`;
}

function showFeedback(message) {
    document.getElementById('voiceFeedback').textContent = message;
    setTimeout(() => {
        document.getElementById('voiceFeedback').textContent = '';
    }, 3000);
}

