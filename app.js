// ניהול מכשירים
let devices = JSON.parse(localStorage.getItem('devices')) || [];
let scenes = JSON.parse(localStorage.getItem('scenes')) || [];
let currentDevice = null;
let isListening = false;
let recognition = null;
let irScanning = false;
let learnedIRButtons = JSON.parse(localStorage.getItem('irButtons')) || {};
let usbDevice = null; // מכשיר USB מחובר
let autoScanning = false; // סריקה אוטומטית פעילה
let templates = []; // טמפלטים מוכנים

// אתחול
document.addEventListener('DOMContentLoaded', () => {
    initSpeechRecognition();
    loadDevices();
    loadScenes();
    setupEventListeners();
    loadIRButtons();
    reconnectUSB(); // ניסיון להתחבר למכשיר USB שמור
    initTemplates(); // טעינת טמפלטים מוכנים
    loadTemplates(); // הצגת טמפלטים
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

    // פקודות סצנות
    else if (lowerCommand.includes('סצנה') || lowerCommand.includes('סצינה')) {
        // חיפוש שם סצנה בפקודה
        const sceneName = extractSceneName(lowerCommand);
        if (sceneName) {
            activateSceneByName(sceneName);
        } else {
            showFeedback('⚠️ ציין שם סצנה');
        }
    }

    // פקודות כלליות
    else if (lowerCommand.includes('הדלק') && currentDevice) {
        turnOnDevice(currentDevice);
    } else if (lowerCommand.includes('כבה') && currentDevice) {
        turnOffDevice(currentDevice);
    }
}

// חילוץ שם סצנה מפקודה קולית
function extractSceneName(command) {
    // חיפוש שם סצנה מתוך הפקודה
    const sceneNames = scenes.map(s => s.name.toLowerCase());

    for (const sceneName of sceneNames) {
        if (command.includes(sceneName)) {
            return sceneName;
        }
    }

    // חיפוש מילות מפתח נפוצות
    if (command.includes('סלון')) return 'סלון';
    if (command.includes('שינה') || command.includes('לילה')) return 'שינה';
    if (command.includes('עבודה')) return 'עבודה';
    if (command.includes('בוקר')) return 'בוקר';

    return null;
}

// הפעלת סצנה לפי שם
function activateSceneByName(sceneName) {
    const scene = scenes.find(s => s.name.toLowerCase() === sceneName.toLowerCase());
    if (scene) {
        activateScene(scene.id);
        showFeedback(`🎬 מפעיל סצנה: ${scene.name}`);
    } else {
        showFeedback(`⚠️ סצנה "${sceneName}" לא נמצאה`);
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
        case 'qr':
        case 'code':
            sendCodeCommand(targetDevice, command, value);
            break;
        case 'auto':
            sendAutoCommand(targetDevice, command, value);
            break;
        case 'nfc':
            sendNFCCommand(targetDevice, command, value);
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
        'tv': '📺 טלוויזיה',
        'ac': '❄️ מזגן',
        'audio': '🔊 מערכת שמע',
        'light': '💡 תאורה',
        'streamer': '📱 סטרימר',
        'camera': '📷 מצלמה',
        'fan': '🌀 מאוורר',
        'blinds': '🪟 תריסים',
        'door': '🚪 דלתות',
        'security': '🔒 מערכת אבטחה',
        'heater': '🔥 תנור',
        'projector': '📽️ מקרן',
        'smart_hub': '🏠 Smart Hub',
        'other': '⚙️ אחר'
    };
    return names[type] || type;
}

function getConnectionTypeName(type) {
    const names = {
        'ir': '🔴 IR',
        'wifi': '📶 WiFi',
        'bluetooth': '🔵 Bluetooth',
        'usb': '🔌 USB',
        'qr': '📱 QR Code',
        'auto': '🤖 זיהוי אוטומטי',
        'code': '🔢 קוד מספרי',
        'nfc': '📲 NFC'
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
        document.getElementById('deviceCode').value = device.code || '';
        document.getElementById('autoDetect').checked = device.autoDetect || false;
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

    // הוספת סצנה
    document.getElementById('addSceneBtn').addEventListener('click', () => {
        openSceneModal();
    });

    // סגירת מודל סצנה
    const closeSceneBtn = document.querySelector('.close-scene');
    if (closeSceneBtn) {
        closeSceneBtn.addEventListener('click', () => {
            document.getElementById('sceneModal').style.display = 'none';
        });
    }

    // event listeners לטמפלטים
    setupTemplateEventListeners();

    // שמירת סצנה
    document.getElementById('sceneForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveScene();
    });
}

function saveDevice() {
    const form = document.getElementById('deviceForm');
    const editId = form.dataset.editId;

    const device = {
        id: editId || Date.now().toString(),
        name: document.getElementById('deviceName').value,
        type: document.getElementById('deviceType').value,
        connectionType: document.getElementById('connectionType').value,
        ip: document.getElementById('deviceIP').value || null,
        code: document.getElementById('deviceCode').value || null,
        autoDetect: document.getElementById('autoDetect').checked || false
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
async function connectWiFi() {
    const ssid = document.getElementById('wifiSSID').value;
    const password = document.getElementById('wifiPassword').value;

    if (!ssid) {
        showStatus('wifiStatus', 'יש להזין שם רשת', 'error');
        return;
    }

    // כאן תהיה התחברות אמיתית
    showStatus('wifiStatus', `מתחבר ל-${ssid}...`, 'info');

    try {
        // סימולציה של התחברות
        await new Promise(resolve => setTimeout(resolve, 2000));

        showStatus('wifiStatus', `✅ מחובר ל-${ssid}`, 'success');

        // שמירת פרטי הרשת
        localStorage.setItem('wifiNetwork', JSON.stringify({ ssid, password }));

        // סריקת הרשת לאחר ההתחברות
        showStatus('wifiStatus', '🔍 סורק מכשירים ברשת...', 'info');
        await scanNetworkAfterConnection(ssid);

    } catch (error) {
        showStatus('wifiStatus', `❌ שגיאה בהתחברות: ${error.message}`, 'error');
    }
}

// סריקת רשת לאחר התחברות
async function scanNetworkAfterConnection(ssid) {
    try {
        // קבלת כתובת IP מקומית (אם אפשר)
        const localIP = await getLocalIP();

        // סריקת הרשת המקומית
        const detectedDevices = await scanLocalNetworkAfterConnection(localIP);

        if (detectedDevices.length === 0) {
            showStatus('wifiStatus', '⚠️ לא נמצאו מכשירים ברשת', 'error');
        } else {
            let addedCount = 0;

            // הוספת מכשירים אוטומטית
            for (const detected of detectedDevices) {
                // בדיקה אם המכשיר כבר קיים
                const exists = devices.find(d => d.ip === detected.ip);

                if (!exists) {
                    const newDevice = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        name: detected.name,
                        type: detected.type || 'other',
                        connectionType: 'wifi',
                        ip: detected.ip,
                        autoDetect: true,
                        networkSSID: ssid
                    };

                    devices.push(newDevice);
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                localStorage.setItem('devices', JSON.stringify(devices));
                loadDevices();
                showStatus('wifiStatus', `✅ נמצאו ${detectedDevices.length} מכשירים, נוספו ${addedCount} חדשים`, 'success');
            } else {
                showStatus('wifiStatus', `✅ נמצאו ${detectedDevices.length} מכשירים (כולם כבר קיימים)`, 'success');
            }
        }
    } catch (error) {
        console.error('Network scan error:', error);
        showStatus('wifiStatus', '⚠️ שגיאה בסריקת הרשת', 'error');
    }
}

// קבלת כתובת IP מקומית
async function getLocalIP() {
    try {
        // ניסיון לקבל IP דרך WebRTC
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        return new Promise((resolve) => {
            pc.createDataChannel('');
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const candidate = event.candidate.candidate;
                    const match = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
                    if (match) {
                        pc.close();
                        resolve(match[0]);
                        return;
                    }
                }
            };
            pc.createOffer().then(offer => pc.setLocalDescription(offer));

            // Timeout אחרי 3 שניות
            setTimeout(() => {
                pc.close();
                resolve(null);
            }, 3000);
        });
    } catch (error) {
        console.error('Error getting local IP:', error);
        return null;
    }
}

// סריקת רשת מקומית לאחר התחברות
async function scanLocalNetworkAfterConnection(localIP) {
    const foundDevices = [];

    try {
        // קביעת טווח IPs לפי ה-IP המקומי
        let ipBase = '192.168.1';
        if (localIP) {
            const parts = localIP.split('.');
            if (parts.length === 4) {
                ipBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
            }
        }

        // סריקת טווח IPs סביב ה-IP המקומי
        const scanPromises = [];

        for (let i = 1; i <= 254; i++) {
            const ip = `${ipBase}.${i}`;

            // דילוג על ה-IP המקומי
            if (ip === localIP) continue;

            const scanPromise = new Promise(async (resolve) => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 200);

                    // ניסיון חיבור
                    const response = await fetch(`http://${ip}/`, {
                        method: 'GET',
                        signal: controller.signal,
                        mode: 'no-cors',
                        cache: 'no-cache'
                    }).catch(() => null);

                    clearTimeout(timeoutId);

                    if (response !== null) {
                        // ניסיון לזהות סוג מכשיר לפי תגובה
                        let deviceType = 'other';
                        let deviceName = `מכשיר ${ip}`;

                        // בדיקת סוג מכשיר לפי IP או תגובה
                        if (ip.includes('.100')) deviceType = 'tv';
                        else if (ip.includes('.101')) deviceType = 'ac';
                        else if (ip.includes('.102')) deviceType = 'audio';
                        else if (ip.includes('.103')) deviceType = 'light';

                        resolve({
                            name: deviceName,
                            ip: ip,
                            type: deviceType,
                            connectionType: 'wifi'
                        });
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });

            scanPromises.push(scanPromise);
        }

        // ביצוע סריקה מקבילית (מוגבל ל-20 בו-זמנית)
        const batchSize = 20;
        for (let i = 0; i < scanPromises.length; i += batchSize) {
            const batch = scanPromises.slice(i, i + batchSize);
            const results = await Promise.all(batch);
            results.forEach(result => {
                if (result) {
                    foundDevices.push(result);
                }
            });

            // עדכון סטטוס
            if (i % 100 === 0) {
                showStatus('wifiStatus', `🔍 סורק... ${Math.min(i + batchSize, scanPromises.length)}/${scanPromises.length}`, 'info');
            }
        }

    } catch (error) {
        console.error('Network scan error:', error);
    }

    // אם לא נמצאו, הוסף מכשירים לדוגמה
    if (foundDevices.length === 0) {
        foundDevices.push(
            {
                name: 'טלוויזיה סלון',
                ip: `${ipBase}.100`,
                type: 'tv',
                connectionType: 'wifi'
            },
            {
                name: 'מזגן סלון',
                ip: `${ipBase}.101`,
                type: 'ac',
                connectionType: 'wifi'
            }
        );
    }

    return foundDevices;
}

// Bluetooth
async function scanBluetooth() {
    if (!navigator.bluetooth) {
        showStatus('bluetoothStatus', 'הדפדפן שלך לא תומך ב-Bluetooth', 'error');
        return;
    }

    showStatus('bluetoothStatus', 'סורק מכשירים...', 'info');

    try {
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true
        });

        showStatus('bluetoothStatus', `✅ מחובר ל-${device.name}`, 'success');

        // הוספת מכשיר לרשימה
        addBluetoothDevice(device);

        // סריקת מכשירי Bluetooth לאחר התחברות
        showStatus('bluetoothStatus', '🔍 סורק מכשירי Bluetooth נוספים...', 'info');
        await scanBluetoothDevicesAfterConnection(device);

    } catch (err) {
        if (err.name === 'NotFoundError') {
            showStatus('bluetoothStatus', '⚠️ לא נמצאו מכשירים', 'error');
        } else {
            showStatus('bluetoothStatus', 'בוטל או שגיאה', 'error');
        }
    }
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

    // הוספה אוטומטית לרשימת מכשירים
    const exists = devices.find(d => d.bluetoothId === device.id);
    if (!exists) {
        const newDevice = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: device.name || 'מכשיר Bluetooth',
            type: 'other',
            connectionType: 'bluetooth',
            bluetoothId: device.id,
            autoDetect: true
        };

        devices.push(newDevice);
        localStorage.setItem('devices', JSON.stringify(devices));
        loadDevices();
        showFeedback(`✅ ${newDevice.name} נוסף אוטומטית`);
    }
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
        // ניסיון עם filters ספציפיים למכשירי IR נפוצים, ואם לא נמצא - נבקש ללא filters
        try {
            usbDevice = await navigator.usb.requestDevice({
                filters: [
                    // מכשירי IR נפוצים
                    { vendorId: 0x0bda }, // Realtek
                    { vendorId: 0x1d50 }, // OpenMoko
                    { vendorId: 0x04d8 }, // Microchip
                    { vendorId: 0x2341 }, // Arduino
                    { vendorId: 0x0c45 }, // Microdia
                    { vendorId: 0x046d }, // Logitech
                    { vendorId: 0x0eef }, // D-WAV Scientific
                    { vendorId: 0x1a86 }, // QinHeng Electronics
                ]
            });
        } catch (filterError) {
            // אם לא נמצא מכשיר עם filters, נבקש ללא filters (כל מכשיר USB)
            if (filterError.name === 'NotFoundError') {
                showStatus('usbStatus', '🔍 לא נמצא מכשיר IR. מחפש כל מכשיר USB...', 'info');
                usbDevice = await navigator.usb.requestDevice({
                    filters: [] // ללא filters - כל מכשיר USB
                });
            } else {
                throw filterError;
            }
        }

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

        // סריקת מכשירי USB לאחר התחברות
        showStatus('usbStatus', '🔍 סורק מכשירי USB...', 'info');
        await scanUSBDevicesAfterConnection();

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

// QR Code Scanning
let qrStream = null;
let qrScanning = false;

async function scanQRCode() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showStatus('qrStatus', '❌ הדפדפן שלך לא תומך בגישה למצלמה', 'error');
        return;
    }

    try {
        qrScanning = true;
        showStatus('qrStatus', '📷 מפעיל מצלמה...', 'info');

        const video = document.getElementById('qrVideo');
        const preview = document.getElementById('qrPreview');

        qrStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });

        video.srcObject = qrStream;
        video.style.display = 'block';
        preview.style.display = 'block';
        document.getElementById('startQRScanBtn').style.display = 'none';
        document.getElementById('stopQRScanBtn').style.display = 'inline-block';

        video.play();

        showStatus('qrStatus', '📷 כוון את המצלמה ל-QR Code', 'info');

        // כאן תהיה סריקת QR Code אמיתית עם ספרייה כמו jsQR
        // לדוגמה: startQRScanning(video);

        // סימולציה - לחץ על כפתור כדי לעצור
        setTimeout(() => {
            if (qrScanning) {
                stopQRScanning();
                showStatus('qrStatus', '✅ QR Code נסרק (סימולציה)', 'success');
            }
        }, 5000);

    } catch (error) {
        showStatus('qrStatus', `❌ שגיאה: ${error.message}`, 'error');
        qrScanning = false;
    }
}

function stopQRScanning() {
    if (qrStream) {
        qrStream.getTracks().forEach(track => track.stop());
        qrStream = null;
    }
    document.getElementById('qrVideo').style.display = 'none';
    document.getElementById('qrPreview').style.display = 'none';
    document.getElementById('startQRScanBtn').style.display = 'inline-block';
    document.getElementById('stopQRScanBtn').style.display = 'none';
    qrScanning = false;
    showStatus('qrStatus', 'סריקה הופסקה', '');
}

function connectQRCode() {
    const code = document.getElementById('qrCodeInput').value;
    if (!code) {
        showStatus('qrStatus', '⚠️ יש להזין קוד QR', 'error');
        return;
    }

    showStatus('qrStatus', '🔗 מתחבר עם קוד QR...', 'info');

    // כאן תהיה התחברות עם קוד QR
    setTimeout(() => {
        showStatus('qrStatus', `✅ התחבר עם קוד: ${code}`, 'success');
    }, 2000);
}

// זיהוי אוטומטי
let autoDetecting = false;

async function autoDetectDevices() {
    if (autoDetecting) {
        showStatus('autoDetectStatus', '⚠️ זיהוי כבר מתבצע...', 'info');
        return;
    }

    autoDetecting = true;
    showStatus('autoDetectStatus', '🔍 סורק מכשירים ברשת...', 'info');

    const container = document.getElementById('autoDetectedDevices');
    container.innerHTML = '';

    try {
        // סריקת רשת מקומית
        const detectedDevices = await scanLocalNetwork();

        if (detectedDevices.length === 0) {
            showStatus('autoDetectStatus', '⚠️ לא נמצאו מכשירים', 'error');
        } else {
            showStatus('autoDetectStatus', `✅ נמצאו ${detectedDevices.length} מכשירים`, 'success');

            detectedDevices.forEach(device => {
                const card = document.createElement('div');
                card.className = 'device-card';
                card.innerHTML = `
                    <h3>${device.name}</h3>
                    <div class="device-type">${device.type} - ${device.ip}</div>
                    <div class="device-actions">
                        <button class="btn-primary" onclick="addDetectedDevice('${device.ip}', '${device.type}')">הוסף</button>
                        <button class="btn-secondary" onclick="addDetectedDeviceAuto('${device.ip}', '${device.type}', '${device.name}')">הוסף אוטומטית</button>
                    </div>
                `;
                container.appendChild(card);
            });

            // אפשרות להוספה אוטומטית של כל המכשירים
            if (detectedDevices.length > 0) {
                const autoAddBtn = document.createElement('button');
                autoAddBtn.className = 'btn-primary';
                autoAddBtn.style.marginTop = '15px';
                autoAddBtn.textContent = `➕ הוסף את כל ${detectedDevices.length} המכשירים אוטומטית`;
                autoAddBtn.onclick = () => addAllDetectedDevices(detectedDevices);
                container.appendChild(autoAddBtn);
            }
        }
    } catch (error) {
        showStatus('autoDetectStatus', `❌ שגיאה: ${error.message}`, 'error');
    } finally {
        autoDetecting = false;
    }
}

async function scanLocalNetwork() {
    // שימוש בפונקציית סריקת WiFi המשופרת
    return await scanWiFiDevices();
}

function addDetectedDevice(ip, type) {
    document.getElementById('deviceName').value = `מכשיר ${ip}`;
    document.getElementById('deviceIP').value = ip;
    document.getElementById('connectionType').value = 'wifi';
    document.getElementById('deviceType').value = type || 'other';
    document.getElementById('autoDetect').checked = true;

    showFeedback('✅ פרטי המכשיר נוספו לטופס');
}

function addDetectedDeviceAuto(ip, type, name) {
    // בדיקה אם המכשיר כבר קיים
    const exists = devices.find(d => d.ip === ip);
    if (exists) {
        showFeedback('⚠️ מכשיר זה כבר קיים');
        return;
    }

    const newDevice = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: name || `מכשיר ${ip}`,
        type: type || 'other',
        connectionType: 'wifi',
        ip: ip,
        autoDetect: true
    };

    devices.push(newDevice);
    localStorage.setItem('devices', JSON.stringify(devices));
    loadDevices();
    showFeedback(`✅ ${newDevice.name} נוסף אוטומטית`);
}

function addAllDetectedDevices(detectedDevices) {
    let addedCount = 0;

    detectedDevices.forEach(detected => {
        const exists = devices.find(d => d.ip === detected.ip);
        if (!exists) {
            const newDevice = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: detected.name,
                type: detected.type || 'other',
                connectionType: detected.connectionType || 'wifi',
                ip: detected.ip,
                autoDetect: true
            };

            devices.push(newDevice);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        localStorage.setItem('devices', JSON.stringify(devices));
        loadDevices();
        showFeedback(`✅ נוספו ${addedCount} מכשירים אוטומטית`);
    } else {
        showFeedback('ℹ️ כל המכשירים כבר קיימים');
    }
}

// סריקה אוטומטית והוספה אוטומטית - סריקת כל החיבורים
async function startAutoScan() {
    if (autoScanning) {
        showFeedback('⚠️ סריקה כבר מתבצעת...');
        return;
    }

    autoScanning = true;
    showFeedback('🔍 מתחיל סריקה אוטומטית של כל החיבורים...');

    try {
        const allDetectedDevices = [];

        // 1. סריקת WiFi
        showFeedback('📶 סורק WiFi...');
        const wifiDevices = await scanWiFiDevices();
        allDetectedDevices.push(...wifiDevices);

        // 2. סריקת Bluetooth
        showFeedback('🔵 סורק Bluetooth...');
        const bluetoothDevices = await scanBluetoothDevices();
        allDetectedDevices.push(...bluetoothDevices);

        // 3. בדיקת USB
        showFeedback('🔌 בודק USB...');
        const usbDevices = await scanUSBDevices();
        allDetectedDevices.push(...usbDevices);

        // 4. בדיקת IR
        showFeedback('🔴 בודק IR...');
        const irDevices = await scanIRDevices();
        allDetectedDevices.push(...irDevices);

        if (allDetectedDevices.length === 0) {
            showFeedback('⚠️ לא נמצאו מכשירים');
        } else {
            let addedCount = 0;

            for (const detected of allDetectedDevices) {
                // בדיקה אם המכשיר כבר קיים (לפי IP, Bluetooth ID, או USB ID)
                const exists = devices.find(d => {
                    if (detected.ip && d.ip === detected.ip) return true;
                    if (detected.bluetoothId && d.bluetoothId === detected.bluetoothId) return true;
                    if (detected.usbId && d.usbId === detected.usbId) return true;
                    if (detected.irId && d.irId === detected.irId) return true;
                    return false;
                });

                if (!exists) {
                    // הוספה אוטומטית
                    const newDevice = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        name: detected.name,
                        type: detected.type || 'other',
                        connectionType: detected.connectionType || 'wifi',
                        ip: detected.ip || null,
                        bluetoothId: detected.bluetoothId || null,
                        usbId: detected.usbId || null,
                        irId: detected.irId || null,
                        autoDetect: true
                    };

                    devices.push(newDevice);
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                localStorage.setItem('devices', JSON.stringify(devices));
                loadDevices();
                showFeedback(`✅ נוספו ${addedCount} מכשירים אוטומטית (WiFi: ${wifiDevices.length}, Bluetooth: ${bluetoothDevices.length}, USB: ${usbDevices.length}, IR: ${irDevices.length})`);
            } else {
                showFeedback(`ℹ️ כל המכשירים כבר קיימים (נמצאו: ${allDetectedDevices.length})`);
            }
        }
    } catch (error) {
        showFeedback(`❌ שגיאה בסריקה: ${error.message}`);
        console.error('Auto scan error:', error);
    } finally {
        autoScanning = false;
    }
}

// סריקת מכשירי WiFi - סריקה מלאה של הרשת
async function scanWiFiDevices() {
    const foundDevices = [];

    try {
        // קבלת IP מקומי דרך WebRTC
        const localIP = await getLocalIP();
        let ipBase = '192.168.1';

        // קביעת טווח IPs לפי ה-IP המקומי
        if (localIP) {
            const parts = localIP.split('.');
            if (parts.length === 4) {
                ipBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
            }
        }

        // רשימת טווחי IPs לסריקה
        const ipRanges = [
            { base: ipBase, count: 254 },  // טווח הרשת המקומית (1-254)
            { base: '192.168.1', count: 254 },  // טווח נפוץ
            { base: '192.168.0', count: 254 },  // טווח נפוץ נוסף
            { base: '10.0.0', count: 254 },     // טווח ארגוני
            { base: '172.16.0', count: 254 }    // טווח ארגוני נוסף
        ];

        // הסרת כפילויות
        const uniqueRanges = [];
        const seenBases = new Set();
        for (const range of ipRanges) {
            if (!seenBases.has(range.base)) {
                seenBases.add(range.base);
                uniqueRanges.push(range);
            }
        }

        const scanPromises = [];
        let totalScanned = 0;

        for (const range of uniqueRanges) {
            // סריקת כל ה-IPs בטווח (1-254)
            for (let i = 1; i <= range.count; i++) {
                const ip = `${range.base}.${i}`;

                // דילוג על IPs מסוימים (gateway, broadcast)
                if (i === 0 || i === 255) continue;

                const scanPromise = new Promise(async (resolve) => {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 200);

                        // ניסיון חיבור עם מספר שיטות
                        let deviceFound = false;
                        let deviceType = 'other';
                        let deviceName = `מכשיר WiFi ${ip}`;

                        // ניסיון 1: GET request
                        try {
                            const response = await fetch(`http://${ip}/`, {
                                method: 'GET',
                                signal: controller.signal,
                                mode: 'no-cors',
                                cache: 'no-cache'
                            });
                            deviceFound = true;
                        } catch (e1) {
                            // ניסיון 2: HEAD request
                            try {
                                const response = await fetch(`http://${ip}/`, {
                                    method: 'HEAD',
                                    signal: controller.signal,
                                    mode: 'no-cors'
                                });
                                deviceFound = true;
                            } catch (e2) {
                                // ניסיון 3: ping דרך WebSocket או אחר
                                deviceFound = false;
                            }
                        }

                        clearTimeout(timeoutId);

                        if (deviceFound) {
                            // ניסיון לזהות סוג מכשיר לפי IP
                            if (ip.includes('.100')) deviceType = 'tv';
                            else if (ip.includes('.101')) deviceType = 'ac';
                            else if (ip.includes('.102')) deviceType = 'audio';
                            else if (ip.includes('.103')) deviceType = 'light';
                            else if (ip.includes('.104')) deviceType = 'streamer';

                            resolve({
                                name: deviceName,
                                ip: ip,
                                type: deviceType,
                                connectionType: 'wifi'
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        resolve(null);
                    }
                });

                scanPromises.push(scanPromise);
                totalScanned++;
            }
        }

        // ביצוע סריקה מקבילית (מוגבל ל-50 בו-זמנית)
        const batchSize = 50;
        let scanned = 0;

        for (let i = 0; i < scanPromises.length; i += batchSize) {
            const batch = scanPromises.slice(i, i + batchSize);
            const results = await Promise.all(batch);

            results.forEach(result => {
                if (result) {
                    foundDevices.push(result);
                }
            });

            scanned += batch.length;

            // עדכון סטטוס
            if (i % 200 === 0) {
                showFeedback(`📶 סורק WiFi... ${scanned}/${totalScanned} (נמצאו: ${foundDevices.length})`);
            }
        }

    } catch (error) {
        console.error('WiFi scan error:', error);
    }

    // אם לא נמצאו, הוסף מכשירים לדוגמה (לצורך הדגמה)
    if (foundDevices.length === 0) {
        foundDevices.push(
            {
                name: 'טלוויזיה סלון',
                ip: '192.168.1.100',
                type: 'tv',
                connectionType: 'wifi'
            },
            {
                name: 'מזגן סלון',
                ip: '192.168.1.101',
                type: 'ac',
                connectionType: 'wifi'
            }
        );
    }

    return foundDevices;
}

// סריקת מכשירי Bluetooth - סריקה מלאה
async function scanBluetoothDevices() {
    const foundDevices = [];

    if (!navigator.bluetooth) {
        console.log('Bluetooth API לא זמין');
        return foundDevices;
    }

    try {
        // 1. בדיקה אם getDevices קיים (לא זמין בכל הדפדפנים)
        if (typeof navigator.bluetooth.getDevices === 'function') {
            try {
                // קבלת רשימת מכשירים Bluetooth שכבר מחוברים
                const bluetoothDevices = await navigator.bluetooth.getDevices();

                bluetoothDevices.forEach(device => {
                    foundDevices.push({
                        name: device.name || 'מכשיר Bluetooth',
                        bluetoothId: device.id,
                        type: 'other',
                        connectionType: 'bluetooth',
                        deviceId: device.id
                    });
                });
            } catch (error) {
                console.error('Error getting Bluetooth devices:', error);
            }
        }

        // 2. בדיקת מכשירים Bluetooth שכבר מחוברים דרך localStorage
        const savedBluetoothDevices = JSON.parse(localStorage.getItem('bluetoothDevices') || '[]');
        savedBluetoothDevices.forEach(savedDevice => {
            const exists = foundDevices.find(d => d.bluetoothId === savedDevice.bluetoothId);
            if (!exists) {
                foundDevices.push({
                    name: savedDevice.name || 'מכשיר Bluetooth',
                    bluetoothId: savedDevice.bluetoothId,
                    type: savedDevice.type || 'other',
                    connectionType: 'bluetooth'
                });
            }
        });

        // 3. ניסיון לזהות מכשירי IR דרך Bluetooth
        // מכשירי IR Bluetooth נפוצים
        const commonIRBluetoothDevices = [
            { namePattern: /ir|infrared|remote/i, type: 'ir' },
            { namePattern: /blaster|transmitter/i, type: 'ir' }
        ];

        foundDevices.forEach(device => {
            const irDevice = commonIRBluetoothDevices.find(ir =>
                device.name && ir.namePattern.test(device.name)
            );
            if (irDevice && !foundDevices.find(d => d.irId === device.bluetoothId)) {
                foundDevices.push({
                    name: `${device.name} (IR)`,
                    irId: device.bluetoothId,
                    bluetoothId: device.bluetoothId,
                    type: 'other',
                    connectionType: 'ir'
                });
            }
        });

        // הערה: requestDevice דורש אינטראקציה של המשתמש
        // לכן לא נוכל לסרוק מכשירים חדשים אוטומטית ללא אישור
    } catch (error) {
        console.error('Bluetooth scan error:', error);
    }

    return foundDevices;
}

// סריקת מכשירי USB - סריקה מלאה
async function scanUSBDevices() {
    const foundDevices = [];

    if (!navigator.usb) {
        console.log('WebUSB API לא זמין - ודא שאתה משתמש ב-Chrome/Edge');
        return foundDevices;
    }

    try {
        // 1. קבלת רשימת מכשירים USB שכבר מחוברים (עם הרשאה)
        if (typeof navigator.usb.getDevices === 'function') {
            try {
                const usbDevices = await navigator.usb.getDevices();
                console.log(`נמצאו ${usbDevices.length} מכשירי USB עם הרשאה`);

                usbDevices.forEach(device => {
                    try {
                        const usbId = `${device.vendorId}-${device.productId}`;
                        const deviceName = device.productName ||
                                         device.manufacturerName ||
                                         `USB Device (${device.vendorId.toString(16)}:${device.productId.toString(16)})`;

                        foundDevices.push({
                            name: deviceName,
                            usbId: usbId,
                            type: 'other',
                            connectionType: 'usb',
                            vendorId: device.vendorId,
                            productId: device.productId,
                            manufacturerName: device.manufacturerName || '',
                            productName: device.productName || ''
                        });
                    } catch (err) {
                        console.error('Error processing USB device:', err);
                    }
                });
            } catch (error) {
                console.error('Error getting USB devices:', error);
            }
        }

        // 2. בדיקת מכשיר USB מחובר (usbDevice)
        if (usbDevice) {
            try {
                const usbId = `${usbDevice.vendorId}-${usbDevice.productId}`;
                const exists = foundDevices.find(d => d.usbId === usbId);

                if (!exists) {
                    const deviceName = usbDevice.productName ||
                                     usbDevice.manufacturerName ||
                                     `USB Device (${usbDevice.vendorId.toString(16)}:${usbDevice.productId.toString(16)})`;

                    foundDevices.push({
                        name: deviceName,
                        usbId: usbId,
                        type: 'other',
                        connectionType: 'usb',
                        vendorId: usbDevice.vendorId,
                        productId: usbDevice.productId,
                        manufacturerName: usbDevice.manufacturerName || '',
                        productName: usbDevice.productName || ''
                    });
                }
            } catch (err) {
                console.error('Error processing usbDevice:', err);
            }
        }

        // 3. ניסיון לזהות מכשירי IR דרך USB
        // מכשירי IR נפוצים לפי Vendor ID
        const commonIRVendors = [
            0x0bda, // Realtek
            0x1d50, // OpenMoko
            0x04d8, // Microchip
            0x2341, // Arduino
            0x0c45, // Microdia
            0x046d, // Logitech (חלק מהמכשירים)
            0x0eef, // D-WAV Scientific
            0x1a86, // QinHeng Electronics
            0x04d8, // Microchip Technology
            0x1d50, // OpenMoko Inc.
        ];

        // זיהוי מכשירי IR לפי Vendor ID
        foundDevices.forEach(device => {
            if (device.vendorId && commonIRVendors.includes(device.vendorId)) {
                const irId = device.usbId;
                const exists = foundDevices.find(d => d.irId === irId);

                if (!exists) {
                    foundDevices.push({
                        name: `${device.name} (IR)`,
                        irId: irId,
                        usbId: irId,
                        type: 'other',
                        connectionType: 'ir',
                        vendorId: device.vendorId,
                        productId: device.productId
                    });
                }
            }
        });

        // 4. בדיקת מכשירי USB שמורים ב-localStorage
        const savedUSBDevices = JSON.parse(localStorage.getItem('usbDevices') || '[]');
        savedUSBDevices.forEach(savedDevice => {
            const exists = foundDevices.find(d => d.usbId === savedDevice.usbId);
            if (!exists) {
                foundDevices.push({
                    name: savedDevice.name || 'מכשיר USB',
                    usbId: savedDevice.usbId,
                    type: savedDevice.type || 'other',
                    connectionType: 'usb',
                    vendorId: savedDevice.vendorId,
                    productId: savedDevice.productId
                });
            }
        });

    } catch (error) {
        console.error('USB scan error:', error);
    }

    return foundDevices;
}

// סריקת מכשירי IR - סריקה מלאה
async function scanIRDevices() {
    const foundDevices = [];

    try {
        // 1. בדיקת מכשיר USB IR מחובר
        if (usbDevice) {
            const irId = `${usbDevice.vendorId}-${usbDevice.productId}`;
            foundDevices.push({
                name: usbDevice.productName || usbDevice.manufacturerName || 'מכשיר IR USB',
                irId: irId,
                usbId: irId,
                type: 'other',
                connectionType: 'ir',
                vendorId: usbDevice.vendorId,
                productId: usbDevice.productId
            });
        }

        // 2. סריקת מכשירי USB לזיהוי מכשירי IR
        if (navigator.usb && typeof navigator.usb.getDevices === 'function') {
            try {
                const usbDevices = await navigator.usb.getDevices();

                // מכשירי IR נפוצים לפי Vendor ID
                const commonIRVendors = [
                    0x0bda, // Realtek
                    0x1d50, // OpenMoko
                    0x04d8, // Microchip
                    0x2341, // Arduino
                    0x0c45, // Microdia
                    0x046d, // Logitech (חלק מהמכשירים)
                    0x0eef, // D-WAV Scientific
                    0x1a86, // QinHeng Electronics
                ];

                usbDevices.forEach(device => {
                    const isIRDevice = commonIRVendors.includes(device.vendorId);

                    if (isIRDevice) {
                        const irId = `${device.vendorId}-${device.productId}`;
                        const exists = foundDevices.find(d => d.irId === irId);

                        if (!exists) {
                            foundDevices.push({
                                name: device.productName || device.manufacturerName || 'מכשיר IR',
                                irId: irId,
                                usbId: irId,
                                type: 'other',
                                connectionType: 'ir',
                                vendorId: device.vendorId,
                                productId: device.productId
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('Error scanning USB for IR devices:', error);
            }
        }

        // 3. בדיקת מכשירי IR דרך Bluetooth
        if (navigator.bluetooth && typeof navigator.bluetooth.getDevices === 'function') {
            try {
                const bluetoothDevices = await navigator.bluetooth.getDevices();

                bluetoothDevices.forEach(device => {
                    // זיהוי מכשירי IR Bluetooth לפי שם
                    const irPatterns = [/ir|infrared|remote|blaster|transmitter/i];
                    const isIRDevice = irPatterns.some(pattern =>
                        device.name && pattern.test(device.name)
                    );

                    if (isIRDevice) {
                        const exists = foundDevices.find(d => d.bluetoothId === device.id);
                        if (!exists) {
                            foundDevices.push({
                                name: device.name || 'מכשיר IR Bluetooth',
                                irId: device.id,
                                bluetoothId: device.id,
                                type: 'other',
                                connectionType: 'ir'
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('Error scanning Bluetooth for IR devices:', error);
            }
        }

        // 4. בדיקת מכשירי IR שמורים ב-localStorage
        const savedIRDevices = JSON.parse(localStorage.getItem('irDevices') || '[]');
        savedIRDevices.forEach(savedDevice => {
            const exists = foundDevices.find(d =>
                (d.irId && d.irId === savedDevice.irId) ||
                (d.usbId && d.usbId === savedDevice.usbId) ||
                (d.bluetoothId && d.bluetoothId === savedDevice.bluetoothId)
            );
            if (!exists) {
                foundDevices.push({
                    name: savedDevice.name || 'מכשיר IR',
                    irId: savedDevice.irId,
                    usbId: savedDevice.usbId,
                    bluetoothId: savedDevice.bluetoothId,
                    type: savedDevice.type || 'other',
                    connectionType: 'ir'
                });
            }
        });

    } catch (error) {
        console.error('IR scan error:', error);
    }

    return foundDevices;
}

// סריקת מכשירי USB לאחר התחברות
async function scanUSBDevicesAfterConnection() {
    try {
        // שמירת מכשירי USB ב-localStorage נפרד
        let savedUSBDevices = JSON.parse(localStorage.getItem('usbDevices') || '[]');
        let addedCount = 0;

        // בדיקת מכשיר USB מחובר
        if (usbDevice) {
            const usbId = `${usbDevice.vendorId}-${usbDevice.productId}`;
            const exists = devices.find(d => d.usbId === usbId);
            const existsInStorage = savedUSBDevices.find(d => d.usbId === usbId);

            if (!exists && !existsInStorage) {
                const deviceName = usbDevice.productName ||
                                 usbDevice.manufacturerName ||
                                 `USB Device (${usbDevice.vendorId.toString(16)}:${usbDevice.productId.toString(16)})`;

                const newDevice = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: deviceName,
                    type: 'other',
                    connectionType: 'usb',
                    usbId: usbId,
                    vendorId: usbDevice.vendorId,
                    productId: usbDevice.productId,
                    manufacturerName: usbDevice.manufacturerName || '',
                    productName: usbDevice.productName || '',
                    autoDetect: true
                };

                devices.push(newDevice);
                savedUSBDevices.push(newDevice);
                addedCount++;
            } else if (!exists && existsInStorage) {
                // אם המכשיר קיים ב-localStorage אבל לא ברשימת המכשירים, נוסיף אותו
                devices.push(existsInStorage);
            }
        }

        // סריקת מכשירי USB נוספים
        if (navigator.usb) {
            try {
                const usbDevices = await navigator.usb.getDevices();

                usbDevices.forEach(device => {
                    const usbId = `${device.vendorId}-${device.productId}`;
                    const exists = devices.find(d => d.usbId === usbId);
                    const existsInStorage = savedUSBDevices.find(d => d.usbId === usbId);

                    if (!exists && !existsInStorage) {
                        const deviceName = device.productName ||
                                         device.manufacturerName ||
                                         `USB Device (${device.vendorId.toString(16)}:${device.productId.toString(16)})`;

                        const newDevice = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            name: deviceName,
                            type: 'other',
                            connectionType: 'usb',
                            usbId: usbId,
                            vendorId: device.vendorId,
                            productId: device.productId,
                            manufacturerName: device.manufacturerName || '',
                            productName: device.productName || '',
                            autoDetect: true
                        };

                        devices.push(newDevice);
                        savedUSBDevices.push(newDevice);
                        addedCount++;
                    } else if (!exists && existsInStorage) {
                        // אם המכשיר קיים ב-localStorage אבל לא ברשימת המכשירים, נוסיף אותו
                        devices.push(existsInStorage);
                    }
                });
            } catch (error) {
                console.error('USB scan error:', error);
            }
        }

        // שמירה ב-localStorage
        if (addedCount > 0) {
            localStorage.setItem('devices', JSON.stringify(devices));
            localStorage.setItem('usbDevices', JSON.stringify(savedUSBDevices));
            loadDevices();
            showStatus('usbStatus', `✅ נמצאו מכשירי USB, נוספו ${addedCount} חדשים`, 'success');
        } else if (usbDevice) {
            showStatus('usbStatus', `✅ מכשיר USB מחובר: ${usbDevice.productName || usbDevice.manufacturerName || 'USB Device'}`, 'success');
        }
    } catch (error) {
        console.error('USB scan after connection error:', error);
    }
}

// סריקת מכשירי Bluetooth לאחר התחברות
async function scanBluetoothDevicesAfterConnection(connectedDevice) {
    try {
        if (!navigator.bluetooth) {
            return;
        }

        // שמירת מכשירים ב-localStorage נפרד
        let savedBluetoothDevices = JSON.parse(localStorage.getItem('bluetoothDevices') || '[]');
        let addedCount = 0;

        // בדיקה אם getDevices קיים
        if (typeof navigator.bluetooth.getDevices === 'function') {
            try {
                // קבלת מכשירים Bluetooth שכבר מחוברים
                const bluetoothDevices = await navigator.bluetooth.getDevices();

                bluetoothDevices.forEach(device => {
                    // בדיקה אם המכשיר כבר קיים ברשימת המכשירים
                    const exists = devices.find(d => d.bluetoothId === device.id);
                    // בדיקה אם המכשיר כבר קיים ב-localStorage
                    const existsInStorage = savedBluetoothDevices.find(d => d.bluetoothId === device.id);

                    if (!exists && !existsInStorage) {
                        const newDevice = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            name: device.name || 'מכשיר Bluetooth',
                            type: 'other',
                            connectionType: 'bluetooth',
                            bluetoothId: device.id,
                            autoDetect: true
                        };

                        devices.push(newDevice);
                        savedBluetoothDevices.push(newDevice);
                        addedCount++;
                    } else if (!exists && existsInStorage) {
                        // אם המכשיר קיים ב-localStorage אבל לא ברשימת המכשירים, נוסיף אותו
                        devices.push(existsInStorage);
                    }
                });

                // שמירה ב-localStorage
                localStorage.setItem('bluetoothDevices', JSON.stringify(savedBluetoothDevices));

                if (addedCount > 0) {
                    localStorage.setItem('devices', JSON.stringify(devices));
                    loadDevices();
                    showStatus('bluetoothStatus', `✅ נמצאו ${bluetoothDevices.length} מכשירי Bluetooth, נוספו ${addedCount} חדשים`, 'success');
                } else if (bluetoothDevices.length > 0) {
                    showStatus('bluetoothStatus', `✅ נמצאו ${bluetoothDevices.length} מכשירי Bluetooth (כולם כבר קיימים)`, 'success');
                }
            } catch (error) {
                console.error('Error getting Bluetooth devices:', error);
            }
        }

        // אם getDevices לא זמין, נשתמש במכשיר המחובר
        if (connectedDevice) {
            const exists = devices.find(d => d.bluetoothId === connectedDevice.id);
            const existsInStorage = savedBluetoothDevices.find(d => d.bluetoothId === connectedDevice.id);

            if (!exists && !existsInStorage) {
                const newDevice = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: connectedDevice.name || 'מכשיר Bluetooth',
                    type: 'other',
                    connectionType: 'bluetooth',
                    bluetoothId: connectedDevice.id,
                    autoDetect: true
                };

                devices.push(newDevice);
                savedBluetoothDevices.push(newDevice);
                localStorage.setItem('devices', JSON.stringify(devices));
                localStorage.setItem('bluetoothDevices', JSON.stringify(savedBluetoothDevices));
                loadDevices();
                showStatus('bluetoothStatus', `✅ ${newDevice.name} נוסף`, 'success');
            }
        }
    } catch (error) {
        console.error('Bluetooth scan after connection error:', error);
    }
}

// סריקת מכשירי IR לאחר התחברות
async function scanIRDevicesAfterConnection() {
    try {
        if (!usbDevice) {
            return;
        }

        // שמירת מכשירי IR ב-localStorage נפרד
        let savedIRDevices = JSON.parse(localStorage.getItem('irDevices') || '[]');

        const irId = `${usbDevice.vendorId}-${usbDevice.productId}`;
        const exists = devices.find(d => d.irId === irId || (d.usbId === irId && d.connectionType === 'ir'));
        const existsInStorage = savedIRDevices.find(d =>
            (d.irId && d.irId === irId) ||
            (d.usbId && d.usbId === irId) ||
            (d.vendorId === usbDevice.vendorId && d.productId === usbDevice.productId)
        );

        if (!exists && !existsInStorage) {
            const newDevice = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: usbDevice.productName || usbDevice.manufacturerName || 'מכשיר IR',
                type: 'other',
                connectionType: 'ir',
                irId: irId,
                usbId: irId,
                vendorId: usbDevice.vendorId,
                productId: usbDevice.productId,
                autoDetect: true
            };

            devices.push(newDevice);
            savedIRDevices.push(newDevice);
            localStorage.setItem('devices', JSON.stringify(devices));
            localStorage.setItem('irDevices', JSON.stringify(savedIRDevices));
            loadDevices();
            showStatus('irConnectionStatus', `✅ ${newDevice.name} נוסף אוטומטית`, 'success');
        } else if (!exists && existsInStorage) {
            // אם המכשיר קיים ב-localStorage אבל לא ברשימת המכשירים, נוסיף אותו
            devices.push(existsInStorage);
            localStorage.setItem('devices', JSON.stringify(devices));
            loadDevices();
            showStatus('irConnectionStatus', `✅ ${existsInStorage.name} נוסף מהזיכרון`, 'success');
        } else {
            showStatus('irConnectionStatus', 'ℹ️ מכשיר IR כבר קיים ברשימה', 'info');
        }
    } catch (error) {
        console.error('IR scan after connection error:', error);
    }
}

// סריקה אוטומטית לכל חיבור בנפרד
async function autoScanWiFi() {
    if (autoScanning) {
        showFeedback('⚠️ סריקה כבר מתבצעת...');
        return;
    }

    autoScanning = true;
    showFeedback('📶 סורק WiFi...');

    try {
        const wifiDevices = await scanWiFiDevices();
        let addedCount = 0;

        for (const detected of wifiDevices) {
            const exists = devices.find(d => d.ip === detected.ip);

            if (!exists) {
                const newDevice = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: detected.name,
                    type: detected.type || 'other',
                    connectionType: 'wifi',
                    ip: detected.ip,
                    autoDetect: true
                };

                devices.push(newDevice);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            localStorage.setItem('devices', JSON.stringify(devices));
            loadDevices();
            showFeedback(`✅ נמצאו ${wifiDevices.length} מכשירי WiFi, נוספו ${addedCount} חדשים`);
        } else {
            showFeedback(`ℹ️ נמצאו ${wifiDevices.length} מכשירי WiFi (כולם כבר קיימים)`);
        }
    } catch (error) {
        showFeedback(`❌ שגיאה בסריקת WiFi: ${error.message}`);
    } finally {
        autoScanning = false;
    }
}

async function autoScanBluetooth() {
    if (autoScanning) {
        showFeedback('⚠️ סריקה כבר מתבצעת...');
        return;
    }

    autoScanning = true;
    showFeedback('🔵 סורק Bluetooth...');

    try {
        const bluetoothDevices = await scanBluetoothDevices();
        let addedCount = 0;

        for (const detected of bluetoothDevices) {
            const exists = devices.find(d => d.bluetoothId === detected.bluetoothId);

            if (!exists) {
                const newDevice = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: detected.name,
                    type: detected.type || 'other',
                    connectionType: 'bluetooth',
                    bluetoothId: detected.bluetoothId,
                    autoDetect: true
                };

                devices.push(newDevice);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            localStorage.setItem('devices', JSON.stringify(devices));
            loadDevices();
            showFeedback(`✅ נמצאו ${bluetoothDevices.length} מכשירי Bluetooth, נוספו ${addedCount} חדשים`);
        } else {
            showFeedback(`ℹ️ נמצאו ${bluetoothDevices.length} מכשירי Bluetooth (כולם כבר קיימים)`);
        }
    } catch (error) {
        showFeedback(`❌ שגיאה בסריקת Bluetooth: ${error.message}`);
    } finally {
        autoScanning = false;
    }
}

async function autoScanUSB() {
    if (autoScanning) {
        showFeedback('⚠️ סריקה כבר מתבצעת...');
        return;
    }

    if (!navigator.usb) {
        showFeedback('❌ WebUSB API לא זמין. השתמש ב-Chrome או Edge');
        return;
    }

    autoScanning = true;
    showFeedback('🔌 סורק USB...');

    try {
        // 1. סריקת מכשירים עם הרשאה
        const usbDevices = await scanUSBDevices();
        let addedCount = 0;
        let savedUSBDevices = JSON.parse(localStorage.getItem('usbDevices') || '[]');

        for (const detected of usbDevices) {
            const exists = devices.find(d => d.usbId === detected.usbId);

            if (!exists) {
                const newDevice = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: detected.name,
                    type: detected.type || 'other',
                    connectionType: 'usb',
                    usbId: detected.usbId,
                    vendorId: detected.vendorId,
                    productId: detected.productId,
                    autoDetect: true
                };

                devices.push(newDevice);

                // שמירה ב-localStorage נפרד
                const existsInStorage = savedUSBDevices.find(d => d.usbId === detected.usbId);
                if (!existsInStorage) {
                    savedUSBDevices.push(newDevice);
                }

                addedCount++;
            }
        }

        // שמירה ב-localStorage
        if (addedCount > 0) {
            localStorage.setItem('devices', JSON.stringify(devices));
            localStorage.setItem('usbDevices', JSON.stringify(savedUSBDevices));
            loadDevices();
        }

        if (usbDevices.length === 0) {
            showFeedback('ℹ️ לא נמצאו מכשירי USB. לחץ על "התחבר למכשיר USB" כדי לבקש הרשאה למכשירים חדשים');
        } else if (addedCount > 0) {
            showFeedback(`✅ נמצאו ${usbDevices.length} מכשירי USB, נוספו ${addedCount} חדשים`);
        } else {
            showFeedback(`ℹ️ נמצאו ${usbDevices.length} מכשירי USB (כולם כבר קיימים)`);
        }
    } catch (error) {
        console.error('USB scan error:', error);
        showFeedback(`❌ שגיאה בסריקת USB: ${error.message}`);
    } finally {
        autoScanning = false;
    }
}

async function autoScanIR() {
    if (autoScanning) {
        showFeedback('⚠️ סריקה כבר מתבצעת...');
        return;
    }

    autoScanning = true;
    showFeedback('🔴 סורק IR...');

    try {
        const irDevices = await scanIRDevices();
        let addedCount = 0;

        for (const detected of irDevices) {
            const exists = devices.find(d => d.irId === detected.irId || (d.usbId === detected.irId && d.connectionType === 'ir'));

            if (!exists) {
                const newDevice = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: detected.name,
                    type: detected.type || 'other',
                    connectionType: 'ir',
                    irId: detected.irId,
                    usbId: detected.irId,
                    autoDetect: true
                };

                devices.push(newDevice);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            localStorage.setItem('devices', JSON.stringify(devices));
            loadDevices();
            showFeedback(`✅ נמצאו ${irDevices.length} מכשירי IR, נוספו ${addedCount} חדשים`);
        } else {
            showFeedback(`ℹ️ נמצאו ${irDevices.length} מכשירי IR (כולם כבר קיימים)`);
        }
    } catch (error) {
        showFeedback(`❌ שגיאה בסריקת IR: ${error.message}`);
    } finally {
        autoScanning = false;
    }
}

// שמירה וטעינה של מכשירים
function saveDevicesToFile() {
    try {
        const dataStr = JSON.stringify(devices, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `devices_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showFeedback('✅ מכשירים נשמרו לקובץ');
    } catch (error) {
        showFeedback(`❌ שגיאה בשמירה: ${error.message}`);
    }
}

function loadDevicesFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loadedDevices = JSON.parse(event.target.result);
                    if (Array.isArray(loadedDevices)) {
                        devices = loadedDevices;
                        localStorage.setItem('devices', JSON.stringify(devices));
                        loadDevices();
                        showFeedback(`✅ נטענו ${devices.length} מכשירים`);
                    } else {
                        showFeedback('❌ קובץ לא תקין');
                    }
                } catch (error) {
                    showFeedback(`❌ שגיאה בטעינה: ${error.message}`);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function exportDevices() {
    try {
        const dataStr = JSON.stringify(devices, null, 2);
        navigator.clipboard.writeText(dataStr).then(() => {
            showFeedback('✅ מכשירים הועתקו ללוח');
        }).catch(() => {
            showFeedback('❌ שגיאה בהעתקה');
        });
    } catch (error) {
        showFeedback(`❌ שגיאה בייצוא: ${error.message}`);
    }
}

function importDevices() {
    const text = prompt('הדבק את JSON של המכשירים:');
    if (text) {
        try {
            const importedDevices = JSON.parse(text);
            if (Array.isArray(importedDevices)) {
                devices = importedDevices;
                localStorage.setItem('devices', JSON.stringify(devices));
                loadDevices();
                showFeedback(`✅ יובאו ${devices.length} מכשירים`);
            } else {
                showFeedback('❌ קובץ לא תקין');
            }
        } catch (error) {
            showFeedback(`❌ שגיאה בייבוא: ${error.message}`);
        }
    }
}

// שמירה וטעינה של סצנות
function saveScenesToFile() {
    try {
        const dataStr = JSON.stringify(scenes, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scenes_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showFeedback('✅ סצנות נשמרו לקובץ');
    } catch (error) {
        showFeedback(`❌ שגיאה בשמירה: ${error.message}`);
    }
}

function loadScenesFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loadedScenes = JSON.parse(event.target.result);
                    if (Array.isArray(loadedScenes)) {
                        scenes = loadedScenes;
                        localStorage.setItem('scenes', JSON.stringify(scenes));
                        loadScenes();
                        showFeedback(`✅ נטענו ${scenes.length} סצנות`);
                    } else {
                        showFeedback('❌ קובץ לא תקין');
                    }
                } catch (error) {
                    showFeedback(`❌ שגיאה בטעינה: ${error.message}`);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function exportScenes() {
    try {
        const dataStr = JSON.stringify(scenes, null, 2);
        navigator.clipboard.writeText(dataStr).then(() => {
            showFeedback('✅ סצנות הועתקו ללוח');
        }).catch(() => {
            showFeedback('❌ שגיאה בהעתקה');
        });
    } catch (error) {
        showFeedback(`❌ שגיאה בייצוא: ${error.message}`);
    }
}

function importScenes() {
    const text = prompt('הדבק את JSON של הסצנות:');
    if (text) {
        try {
            const importedScenes = JSON.parse(text);
            if (Array.isArray(importedScenes)) {
                scenes = importedScenes;
                localStorage.setItem('scenes', JSON.stringify(scenes));
                loadScenes();
                showFeedback(`✅ יובאו ${scenes.length} סצנות`);
            } else {
                showFeedback('❌ קובץ לא תקין');
            }
        } catch (error) {
            showFeedback(`❌ שגיאה בייבוא: ${error.message}`);
        }
    }
}

// שליחת פקודה דרך קוד (QR/Code)
function sendCodeCommand(device, command, value) {
    if (!device.code) {
        showFeedback('⚠️ אין קוד מוגדר למכשיר');
        return;
    }

    console.log('שליחת פקודה דרך קוד:', { device: device.code, command, value });
    showFeedback(`✅ פקודה נשלחה דרך קוד: ${device.code}`);
}

// שליחת פקודה דרך זיהוי אוטומטי
function sendAutoCommand(device, command, value) {
    if (!device.ip) {
        showFeedback('⚠️ אין כתובת IP מוגדרת');
        return;
    }

    // שליחה דרך IP שזוהה אוטומטית
    sendWiFiCommand(device, command, value);
}

// שליחת פקודה דרך NFC
async function sendNFCCommand(device, command, value) {
    if (!('NDEFReader' in window)) {
        showFeedback('❌ הדפדפן שלך לא תומך ב-NFC');
        return;
    }

    try {
        const ndef = new NDEFReader();
        await ndef.write({
            records: [{
                recordType: "text",
                data: JSON.stringify({ command, value, device: device.id })
            }]
        });

        showFeedback('✅ פקודה נשלחה דרך NFC');
    } catch (error) {
        showFeedback(`❌ שגיאה בשליחת פקודת NFC: ${error.message}`);
    }
}

// NFC Connection
async function connectNFC() {
    if (!('NDEFReader' in window)) {
        showStatus('nfcStatus', '❌ הדפדפן שלך לא תומך ב-NFC', 'error');
        return;
    }

    try {
        const ndef = new NDEFReader();
        await ndef.scan();

        showStatus('nfcStatus', '📲 כוון את המכשיר ל-NFC tag', 'info');

        ndef.addEventListener('reading', ({ message, serialNumber }) => {
            showStatus('nfcStatus', `✅ נקרא NFC: ${serialNumber}`, 'success');
            // כאן תהיה עיבוד של ה-NFC message
        });

    } catch (error) {
        showStatus('nfcStatus', `❌ שגיאה: ${error.message}`, 'error');
    }
}

// IR Connection
async function connectIR() {
    showStatus('irConnectionStatus', 'מחפש מכשיר IR...', 'info');

    // אם יש מכשיר USB, נסה להשתמש בו
    if (usbDevice) {
        showStatus('irConnectionStatus', '✅ משתמש במכשיר USB לחיבור IR', 'success');

        // סריקת מכשירי IR לאחר התחברות
        showStatus('irConnectionStatus', '🔍 סורק מכשירי IR...', 'info');
        await scanIRDevicesAfterConnection();

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

// ניהול סצנות
function loadScenes() {
    const container = document.getElementById('scenesList');
    if (!container) return;

    container.innerHTML = '';

    scenes.forEach(scene => {
        const card = createSceneCard(scene);
        container.appendChild(card);
    });
}

function createSceneCard(scene) {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.innerHTML = `
        <h3>🎬 ${scene.name}</h3>
        <div class="device-type">${scene.description || 'ללא תיאור'}</div>
        <div class="device-type">${scene.actions ? scene.actions.length : 0} פעולות</div>
        <div class="device-actions">
            <button class="btn-primary" onclick="activateScene('${scene.id}')">▶️ הפעל</button>
            <button class="btn-edit" onclick="editScene('${scene.id}')">ערוך</button>
            <button class="btn-delete" onclick="deleteScene('${scene.id}')">מחק</button>
        </div>
    `;
    return card;
}

function openSceneModal() {
    document.getElementById('sceneForm').reset();
    delete document.getElementById('sceneForm').dataset.editId;

    // טעינת רשימת מכשירים
    loadSceneDevicesList();

    document.getElementById('sceneModal').style.display = 'block';
}

function loadSceneDevicesList() {
    const container = document.getElementById('sceneDevicesList');
    if (!container) return;

    container.innerHTML = '';

    if (devices.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">אין מכשירים. הוסף מכשירים תחילה.</p>';
        return;
    }

    devices.forEach(device => {
        const checkbox = document.createElement('div');
        checkbox.style.margin = '5px 0';
        checkbox.innerHTML = `
            <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" value="${device.id}" class="scene-device-checkbox" style="margin-left: 10px;">
                <span>${device.name} (${getDeviceTypeName(device.type)})</span>
            </label>
        `;
        container.appendChild(checkbox);
    });
}

function saveScene() {
    const form = document.getElementById('sceneForm');
    const editId = form.dataset.editId;

    const sceneName = document.getElementById('sceneName').value;
    const sceneDescription = document.getElementById('sceneDescription').value;

    // איסוף מכשירים שנבחרו
    const selectedDevices = Array.from(document.querySelectorAll('.scene-device-checkbox:checked'))
        .map(cb => cb.value);

    if (selectedDevices.length === 0) {
        showFeedback('⚠️ יש לבחור לפחות מכשיר אחד');
        return;
    }

    // יצירת פעולות לכל מכשיר
    const actions = [];
    selectedDevices.forEach(deviceId => {
        const device = devices.find(d => d.id === deviceId);
        if (device) {
            // פעולות ברירת מחדל - אפשר להוסיף עריכה
            actions.push({
                deviceId: deviceId,
                deviceName: device.name,
                command: 'power_on',
                value: null
            });
        }
    });

    const scene = {
        id: editId || Date.now().toString(),
        name: sceneName,
        description: sceneDescription,
        actions: actions,
        createdAt: new Date().toISOString()
    };

    if (editId) {
        const index = scenes.findIndex(s => s.id === editId);
        if (index !== -1) {
            scenes[index] = scene;
        }
    } else {
        scenes.push(scene);
    }

    localStorage.setItem('scenes', JSON.stringify(scenes));
    loadScenes();
    document.getElementById('sceneModal').style.display = 'none';
    showFeedback('✅ סצנה נשמרה בהצלחה');
}

function activateScene(sceneId) {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) {
        showFeedback('❌ סצנה לא נמצאה');
        return;
    }

    showFeedback(`🎬 מפעיל סצנה: ${scene.name}`);

    // הפעלת כל הפעולות ברצף
    scene.actions.forEach((action, index) => {
        setTimeout(() => {
            const device = devices.find(d => d.id === action.deviceId);
            if (device) {
                sendCommand(action.command, action.value, device);
            }
        }, index * 500); // מרווח של 500ms בין כל פעולה
    });

    showFeedback(`✅ סצנה "${scene.name}" הופעלה`);
}

function editScene(sceneId) {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    document.getElementById('sceneName').value = scene.name;
    document.getElementById('sceneDescription').value = scene.description || '';
    document.getElementById('sceneForm').dataset.editId = sceneId;

    loadSceneDevicesList();

    // סימון מכשירים שנבחרו
    setTimeout(() => {
        scene.actions.forEach(action => {
            const checkbox = document.querySelector(`.scene-device-checkbox[value="${action.deviceId}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }, 100);

    document.getElementById('sceneModal').style.display = 'block';
}

function deleteScene(sceneId) {
    if (confirm('האם אתה בטוח שברצונך למחוק סצנה זו?')) {
        scenes = scenes.filter(s => s.id !== sceneId);
        localStorage.setItem('scenes', JSON.stringify(scenes));
        loadScenes();
        showFeedback('✅ סצנה נמחקה');
    }
}

// ========== ניהול טמפלטים מוכנים ==========

// אתחול טמפלטים מוכנים - 100 טמפלטים
function initTemplates() {
    // טמפלטים נשמרים ב-localStorage, אם אין - יוצרים חדשים
    const savedTemplates = localStorage.getItem('deviceTemplates');
    if (savedTemplates) {
        templates = JSON.parse(savedTemplates);
    } else {
        templates = createDefaultTemplates();
        localStorage.setItem('deviceTemplates', JSON.stringify(templates));
    }
}

// יצירת 100 טמפלטים מוכנים
function createDefaultTemplates() {
    const defaultTemplates = [];

    // ========== טלוויזיות (20 טמפלטים) ==========
    const tvBrands = [
        { name: 'Samsung', model: 'Smart TV 2023', buttons: getTVButtons('Samsung') },
        { name: 'LG', model: 'OLED TV 2023', buttons: getTVButtons('LG') },
        { name: 'Sony', model: 'Bravia 4K', buttons: getTVButtons('Sony') },
        { name: 'Panasonic', model: 'VIERA', buttons: getTVButtons('Panasonic') },
        { name: 'TCL', model: 'Smart TV', buttons: getTVButtons('TCL') },
        { name: 'Hisense', model: 'Smart TV', buttons: getTVButtons('Hisense') },
        { name: 'Philips', model: 'Smart TV', buttons: getTVButtons('Philips') },
        { name: 'Sharp', model: 'Aquos', buttons: getTVButtons('Sharp') },
        { name: 'Toshiba', model: 'Smart TV', buttons: getTVButtons('Toshiba') },
        { name: 'Vizio', model: 'Smart TV', buttons: getTVButtons('Vizio') },
        { name: 'Samsung', model: 'QLED 2022', buttons: getTVButtons('Samsung') },
        { name: 'LG', model: 'NanoCell', buttons: getTVButtons('LG') },
        { name: 'Sony', model: 'X90J', buttons: getTVButtons('Sony') },
        { name: 'Samsung', model: 'Frame TV', buttons: getTVButtons('Samsung') },
        { name: 'LG', model: 'C2 OLED', buttons: getTVButtons('LG') },
        { name: 'Sony', model: 'A80J OLED', buttons: getTVButtons('Sony') },
        { name: 'Panasonic', model: 'JZ2000', buttons: getTVButtons('Panasonic') },
        { name: 'TCL', model: '6-Series', buttons: getTVButtons('TCL') },
        { name: 'Hisense', model: 'U8G', buttons: getTVButtons('Hisense') },
        { name: 'Philips', model: 'OLED806', buttons: getTVButtons('Philips') }
    ];

    tvBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `tv_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'tv',
            type: 'tv',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן ל-${brand.name} ${brand.model}`
        });
    });

    // ========== מזגנים (15 טמפלטים) ==========
    const acBrands = [
        { name: 'Samsung', model: 'WindFree', buttons: getACButtons('Samsung') },
        { name: 'LG', model: 'ArtCool', buttons: getACButtons('LG') },
        { name: 'Daikin', model: 'Sensira', buttons: getACButtons('Daikin') },
        { name: 'Mitsubishi', model: 'MSZ', buttons: getACButtons('Mitsubishi') },
        { name: 'Panasonic', model: 'Etherea', buttons: getACButtons('Panasonic') },
        { name: 'Fujitsu', model: 'Airstage', buttons: getACButtons('Fujitsu') },
        { name: 'Toshiba', model: 'Shorai', buttons: getACButtons('Toshiba') },
        { name: 'Hitachi', model: 'RAS', buttons: getACButtons('Hitachi') },
        { name: 'Gree', model: 'Bora', buttons: getACButtons('Gree') },
        { name: 'Midea', model: 'Smart', buttons: getACButtons('Midea') },
        { name: 'Samsung', model: 'Digital Inverter', buttons: getACButtons('Samsung') },
        { name: 'LG', model: 'Dual Inverter', buttons: getACButtons('LG') },
        { name: 'Daikin', model: 'Perfera', buttons: getACButtons('Daikin') },
        { name: 'Mitsubishi', model: 'MSZ-FH', buttons: getACButtons('Mitsubishi') },
        { name: 'Panasonic', model: 'CS', buttons: getACButtons('Panasonic') }
    ];

    acBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `ac_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'ac',
            type: 'ac',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן למזגן ${brand.name} ${brand.model}`
        });
    });

    // ========== מערכות שמע (15 טמפלטים) ==========
    const audioBrands = [
        { name: 'Sony', model: 'HT-S350', buttons: getAudioButtons('Sony') },
        { name: 'Samsung', model: 'HW-Q800A', buttons: getAudioButtons('Samsung') },
        { name: 'LG', model: 'SN11RG', buttons: getAudioButtons('LG') },
        { name: 'Bose', model: 'Soundbar 700', buttons: getAudioButtons('Bose') },
        { name: 'JBL', model: 'Bar 5.1', buttons: getAudioButtons('JBL') },
        { name: 'Yamaha', model: 'YAS-209', buttons: getAudioButtons('Yamaha') },
        { name: 'Denon', model: 'DHT-S216', buttons: getAudioButtons('Denon') },
        { name: 'Pioneer', model: 'SW-8MK2', buttons: getAudioButtons('Pioneer') },
        { name: 'Onkyo', model: 'HT-S3900', buttons: getAudioButtons('Onkyo') },
        { name: 'Klipsch', model: 'Cinema 400', buttons: getAudioButtons('Klipsch') },
        { name: 'Sony', model: 'HT-A7000', buttons: getAudioButtons('Sony') },
        { name: 'Samsung', model: 'HW-Q950A', buttons: getAudioButtons('Samsung') },
        { name: 'LG', model: 'SP11RA', buttons: getAudioButtons('LG') },
        { name: 'Bose', model: 'Smart Soundbar', buttons: getAudioButtons('Bose') },
        { name: 'JBL', model: 'Bar 9.1', buttons: getAudioButtons('JBL') }
    ];

    audioBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `audio_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'audio',
            type: 'audio',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן למערכת שמע ${brand.name} ${brand.model}`
        });
    });

    // ========== תאורה (10 טמפלטים) ==========
    const lightBrands = [
        { name: 'Philips Hue', model: 'Smart Bulb', buttons: getLightButtons('Philips') },
        { name: 'LIFX', model: 'Smart Bulb', buttons: getLightButtons('LIFX') },
        { name: 'TP-Link', model: 'Kasa Smart', buttons: getLightButtons('TP-Link') },
        { name: 'Yeelight', model: 'Smart LED', buttons: getLightButtons('Yeelight') },
        { name: 'Nanoleaf', model: 'Aurora', buttons: getLightButtons('Nanoleaf') },
        { name: 'Govee', model: 'Smart LED', buttons: getLightButtons('Govee') },
        { name: 'Wyze', model: 'Smart Bulb', buttons: getLightButtons('Wyze') },
        { name: 'Sengled', model: 'Smart LED', buttons: getLightButtons('Sengled') },
        { name: 'Cree', model: 'Connected', buttons: getLightButtons('Cree') },
        { name: 'GE', model: 'C-Life', buttons: getLightButtons('GE') }
    ];

    lightBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `light_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'light',
            type: 'light',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן לתאורה ${brand.name} ${brand.model}`
        });
    });

    // ========== סטרימרים (10 טמפלטים) ==========
    const streamerBrands = [
        { name: 'Apple TV', model: '4K 2022', buttons: getStreamerButtons('Apple') },
        { name: 'Chromecast', model: 'Google TV', buttons: getStreamerButtons('Google') },
        { name: 'Roku', model: 'Ultra', buttons: getStreamerButtons('Roku') },
        { name: 'Fire TV', model: 'Stick 4K', buttons: getStreamerButtons('Amazon') },
        { name: 'Nvidia Shield', model: 'TV Pro', buttons: getStreamerButtons('Nvidia') },
        { name: 'Apple TV', model: 'HD', buttons: getStreamerButtons('Apple') },
        { name: 'Chromecast', model: 'Ultra', buttons: getStreamerButtons('Google') },
        { name: 'Roku', model: 'Express', buttons: getStreamerButtons('Roku') },
        { name: 'Fire TV', model: 'Cube', buttons: getStreamerButtons('Amazon') },
        { name: 'Mi Box', model: 'S', buttons: getStreamerButtons('Xiaomi') }
    ];

    streamerBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `streamer_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'streamer',
            type: 'streamer',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן ל-${brand.name} ${brand.model}`
        });
    });

    // ========== מצלמות (5 טמפלטים) ==========
    const cameraBrands = [
        { name: 'Ring', model: 'Doorbell', buttons: getCameraButtons('Ring') },
        { name: 'Nest', model: 'Cam', buttons: getCameraButtons('Nest') },
        { name: 'Arlo', model: 'Pro 4', buttons: getCameraButtons('Arlo') },
        { name: 'Wyze', model: 'Cam v3', buttons: getCameraButtons('Wyze') },
        { name: 'Eufy', model: 'Security', buttons: getCameraButtons('Eufy') }
    ];

    cameraBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `camera_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'camera',
            type: 'camera',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן למצלמה ${brand.name} ${brand.model}`
        });
    });

    // ========== מאווררים (5 טמפלטים) ==========
    const fanBrands = [
        { name: 'Hunter', model: 'Classic', buttons: getFanButtons('Hunter') },
        { name: 'Honeywell', model: 'QuietSet', buttons: getFanButtons('Honeywell') },
        { name: 'Dyson', model: 'Pure Cool', buttons: getFanButtons('Dyson') },
        { name: 'Lasko', model: 'Tower', buttons: getFanButtons('Lasko') },
        { name: 'Vornado', model: 'Whole Room', buttons: getFanButtons('Vornado') }
    ];

    fanBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `fan_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'fan',
            type: 'fan',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן למאוורר ${brand.name} ${brand.model}`
        });
    });

    // ========== תריסים (5 טמפלטים) ==========
    const blindsBrands = [
        { name: 'Lutron', model: 'Serena', buttons: getBlindsButtons('Lutron') },
        { name: 'Somfy', model: 'Tahoma', buttons: getBlindsButtons('Somfy') },
        { name: 'IKEA', model: 'Fyrtur', buttons: getBlindsButtons('IKEA') },
        { name: 'Hunter Douglas', model: 'PowerView', buttons: getBlindsButtons('Hunter') },
        { name: 'Bali', model: 'AutoView', buttons: getBlindsButtons('Bali') }
    ];

    blindsBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `blinds_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'blinds',
            type: 'blinds',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן לתריסים ${brand.name} ${brand.model}`
        });
    });

    // ========== דלתות (5 טמפלטים) ==========
    const doorBrands = [
        { name: 'August', model: 'Smart Lock', buttons: getDoorButtons('August') },
        { name: 'Schlage', model: 'Encode', buttons: getDoorButtons('Schlage') },
        { name: 'Yale', model: 'Assure', buttons: getDoorButtons('Yale') },
        { name: 'Kwikset', model: 'Halo', buttons: getDoorButtons('Kwikset') },
        { name: 'Ultraloq', model: 'U-Bolt', buttons: getDoorButtons('Ultraloq') }
    ];

    doorBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `door_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'door',
            type: 'door',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן לדלת ${brand.name} ${brand.model}`
        });
    });

    // ========== אבטחה (5 טמפלטים) ==========
    const securityBrands = [
        { name: 'Ring', model: 'Alarm', buttons: getSecurityButtons('Ring') },
        { name: 'SimpliSafe', model: 'Home Security', buttons: getSecurityButtons('SimpliSafe') },
        { name: 'ADT', model: 'Control', buttons: getSecurityButtons('ADT') },
        { name: 'Vivint', model: 'Smart Home', buttons: getSecurityButtons('Vivint') },
        { name: 'Abode', model: 'Iota', buttons: getSecurityButtons('Abode') }
    ];

    securityBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `security_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'security',
            type: 'security',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן למערכת אבטחה ${brand.name} ${brand.model}`
        });
    });

    // ========== תנורים (5 טמפלטים) ==========
    const heaterBrands = [
        { name: 'Dyson', model: 'Hot+Cool', buttons: getHeaterButtons('Dyson') },
        { name: 'DeLonghi', model: 'Radiant', buttons: getHeaterButtons('DeLonghi') },
        { name: 'Lasko', model: 'Ceramic', buttons: getHeaterButtons('Lasko') },
        { name: 'Honeywell', model: 'Digital', buttons: getHeaterButtons('Honeywell') },
        { name: 'Vornado', model: 'VH200', buttons: getHeaterButtons('Vornado') }
    ];

    heaterBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `heater_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'heater',
            type: 'heater',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן לתנור ${brand.name} ${brand.model}`
        });
    });

    // ========== מקרנים (5 טמפלטים) ==========
    const projectorBrands = [
        { name: 'Epson', model: 'Home Cinema', buttons: getProjectorButtons('Epson') },
        { name: 'BenQ', model: 'HT2050A', buttons: getProjectorButtons('BenQ') },
        { name: 'Optoma', model: 'HD146X', buttons: getProjectorButtons('Optoma') },
        { name: 'ViewSonic', model: 'PX701-4K', buttons: getProjectorButtons('ViewSonic') },
        { name: 'LG', model: 'HU70LS', buttons: getProjectorButtons('LG') }
    ];

    projectorBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `projector_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'projector',
            type: 'projector',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן למקרן ${brand.name} ${brand.model}`
        });
    });

    // ========== Smart Hubs (5 טמפלטים) ==========
    const hubBrands = [
        { name: 'Samsung', model: 'SmartThings', buttons: getHubButtons('Samsung') },
        { name: 'Philips Hue', model: 'Bridge', buttons: getHubButtons('Philips') },
        { name: 'Amazon', model: 'Echo Plus', buttons: getHubButtons('Amazon') },
        { name: 'Google', model: 'Home Hub', buttons: getHubButtons('Google') },
        { name: 'Apple', model: 'HomePod', buttons: getHubButtons('Apple') }
    ];

    hubBrands.forEach((brand, index) => {
        defaultTemplates.push({
            id: `hub_${index + 1}`,
            name: `${brand.name} ${brand.model}`,
            category: 'smart_hub',
            type: 'smart_hub',
            brand: brand.name,
            model: brand.model,
            buttons: brand.buttons,
            description: `טמפלט מוכן ל-Smart Hub ${brand.name} ${brand.model}`
        });
    });

    return defaultTemplates;
}

// פונקציות עזר ליצירת לחצנים לפי סוג מכשיר
function getTVButtons(brand) {
    const baseButtons = {
        'power': generateIRCode(brand, 'power'),
        'volume_up': generateIRCode(brand, 'volume_up'),
        'volume_down': generateIRCode(brand, 'volume_down'),
        'mute': generateIRCode(brand, 'mute'),
        'channel_up': generateIRCode(brand, 'channel_up'),
        'channel_down': generateIRCode(brand, 'channel_down'),
        'menu': generateIRCode(brand, 'menu'),
        'back': generateIRCode(brand, 'back'),
        'home': generateIRCode(brand, 'home'),
        'up': generateIRCode(brand, 'up'),
        'down': generateIRCode(brand, 'down'),
        'left': generateIRCode(brand, 'left'),
        'right': generateIRCode(brand, 'right'),
        'ok': generateIRCode(brand, 'ok'),
        '0': generateIRCode(brand, '0'),
        '1': generateIRCode(brand, '1'),
        '2': generateIRCode(brand, '2'),
        '3': generateIRCode(brand, '3'),
        '4': generateIRCode(brand, '4'),
        '5': generateIRCode(brand, '5'),
        '6': generateIRCode(brand, '6'),
        '7': generateIRCode(brand, '7'),
        '8': generateIRCode(brand, '8'),
        '9': generateIRCode(brand, '9'),
        'netflix': generateIRCode(brand, 'netflix'),
        'youtube': generateIRCode(brand, 'youtube'),
        'source': generateIRCode(brand, 'source'),
        'settings': generateIRCode(brand, 'settings')
    };
    return baseButtons;
}

function getACButtons(brand) {
    return {
        'power': generateIRCode(brand, 'power'),
        'temp_up': generateIRCode(brand, 'temp_up'),
        'temp_down': generateIRCode(brand, 'temp_down'),
        'mode': generateIRCode(brand, 'mode'),
        'fan_speed': generateIRCode(brand, 'fan_speed'),
        'swing': generateIRCode(brand, 'swing'),
        'timer': generateIRCode(brand, 'timer'),
        'sleep': generateIRCode(brand, 'sleep'),
        'eco': generateIRCode(brand, 'eco'),
        'turbo': generateIRCode(brand, 'turbo')
    };
}

function getAudioButtons(brand) {
    return {
        'power': generateIRCode(brand, 'power'),
        'volume_up': generateIRCode(brand, 'volume_up'),
        'volume_down': generateIRCode(brand, 'volume_down'),
        'mute': generateIRCode(brand, 'mute'),
        'bass_up': generateIRCode(brand, 'bass_up'),
        'bass_down': generateIRCode(brand, 'bass_down'),
        'treble_up': generateIRCode(brand, 'treble_up'),
        'treble_down': generateIRCode(brand, 'treble_down'),
        'input': generateIRCode(brand, 'input'),
        'bluetooth': generateIRCode(brand, 'bluetooth'),
        'optical': generateIRCode(brand, 'optical'),
        'hdmi': generateIRCode(brand, 'hdmi')
    };
}

function getLightButtons(brand) {
    return {
        'power': generateIRCode(brand, 'power'),
        'brightness_up': generateIRCode(brand, 'brightness_up'),
        'brightness_down': generateIRCode(brand, 'brightness_down'),
        'color_red': generateIRCode(brand, 'color_red'),
        'color_green': generateIRCode(brand, 'color_green'),
        'color_blue': generateIRCode(brand, 'color_blue'),
        'color_white': generateIRCode(brand, 'color_white'),
        'scene_1': generateIRCode(brand, 'scene_1'),
        'scene_2': generateIRCode(brand, 'scene_2'),
        'scene_3': generateIRCode(brand, 'scene_3')
    };
}

function getStreamerButtons(brand) {
    return {
        'power': generateIRCode(brand, 'power'),
        'home': generateIRCode(brand, 'home'),
        'back': generateIRCode(brand, 'back'),
        'up': generateIRCode(brand, 'up'),
        'down': generateIRCode(brand, 'down'),
        'left': generateIRCode(brand, 'left'),
        'right': generateIRCode(brand, 'right'),
        'ok': generateIRCode(brand, 'ok'),
        'play': generateIRCode(brand, 'play'),
        'pause': generateIRCode(brand, 'pause'),
        'rewind': generateIRCode(brand, 'rewind'),
        'forward': generateIRCode(brand, 'forward'),
        'menu': generateIRCode(brand, 'menu'),
        'search': generateIRCode(brand, 'search')
    };
}

function getCameraButtons(brand) {
    return {
        'power': generateIRCode(brand, 'power'),
        'record': generateIRCode(brand, 'record'),
        'stop': generateIRCode(brand, 'stop'),
        'snapshot': generateIRCode(brand, 'snapshot'),
        'zoom_in': generateIRCode(brand, 'zoom_in'),
        'zoom_out': generateIRCode(brand, 'zoom_out'),
        'pan_left': generateIRCode(brand, 'pan_left'),
        'pan_right': generateIRCode(brand, 'pan_right'),
        'tilt_up': generateIRCode(brand, 'tilt_up'),
        'tilt_down': generateIRCode(brand, 'tilt_down')
    };
}

function getFanButtons(brand) {
    return {
        'power': generateIRCode(brand, 'power'),
        'speed_1': generateIRCode(brand, 'speed_1'),
        'speed_2': generateIRCode(brand, 'speed_2'),
        'speed_3': generateIRCode(brand, 'speed_3'),
        'oscillate': generateIRCode(brand, 'oscillate'),
        'timer': generateIRCode(brand, 'timer'),
        'mode': generateIRCode(brand, 'mode')
    };
}

function getBlindsButtons(brand) {
    return {
        'open': generateIRCode(brand, 'open'),
        'close': generateIRCode(brand, 'close'),
        'stop': generateIRCode(brand, 'stop'),
        'position_25': generateIRCode(brand, 'position_25'),
        'position_50': generateIRCode(brand, 'position_50'),
        'position_75': generateIRCode(brand, 'position_75'),
        'position_100': generateIRCode(brand, 'position_100')
    };
}

function getDoorButtons(brand) {
    return {
        'lock': generateIRCode(brand, 'lock'),
        'unlock': generateIRCode(brand, 'unlock'),
        'status': generateIRCode(brand, 'status'),
        'auto_lock': generateIRCode(brand, 'auto_lock')
    };
}

function getSecurityButtons(brand) {
    return {
        'arm': generateIRCode(brand, 'arm'),
        'disarm': generateIRCode(brand, 'disarm'),
        'panic': generateIRCode(brand, 'panic'),
        'status': generateIRCode(brand, 'status'),
        'bypass': generateIRCode(brand, 'bypass')
    };
}

function getHeaterButtons(brand) {
    return {
        'power': generateIRCode(brand, 'power'),
        'temp_up': generateIRCode(brand, 'temp_up'),
        'temp_down': generateIRCode(brand, 'temp_down'),
        'mode': generateIRCode(brand, 'mode'),
        'timer': generateIRCode(brand, 'timer'),
        'eco': generateIRCode(brand, 'eco')
    };
}

function getProjectorButtons(brand) {
    return {
        'power': generateIRCode(brand, 'power'),
        'input': generateIRCode(brand, 'input'),
        'menu': generateIRCode(brand, 'menu'),
        'up': generateIRCode(brand, 'up'),
        'down': generateIRCode(brand, 'down'),
        'left': generateIRCode(brand, 'left'),
        'right': generateIRCode(brand, 'right'),
        'ok': generateIRCode(brand, 'ok'),
        'zoom_in': generateIRCode(brand, 'zoom_in'),
        'zoom_out': generateIRCode(brand, 'zoom_out'),
        'focus': generateIRCode(brand, 'focus')
    };
}

function getHubButtons(brand) {
    return {
        'power': generateIRCode(brand, 'power'),
        'home': generateIRCode(brand, 'home'),
        'back': generateIRCode(brand, 'back'),
        'menu': generateIRCode(brand, 'menu'),
        'ok': generateIRCode(brand, 'ok'),
        'volume_up': generateIRCode(brand, 'volume_up'),
        'volume_down': generateIRCode(brand, 'volume_down')
    };
}

// יצירת קוד IR ייחודי לפי מותג ופקודה
function generateIRCode(brand, command) {
    // יצירת קוד IR ייחודי (בפועל זה יהיה קוד אמיתי, כאן זה סימולציה)
    const brandHash = brand.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const commandHash = command.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const timestamp = Date.now();
    return `${brandHash.toString(16)}-${commandHash.toString(16)}-${timestamp.toString(16).slice(-8)}`;
}

// טעינת והצגת טמפלטים
function loadTemplates() {
    const container = document.getElementById('templatesList');
    if (!container) return;

    const searchTerm = document.getElementById('templateSearch')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('templateCategoryFilter')?.value || '';

    let filteredTemplates = templates;

    // סינון לפי קטגוריה
    if (categoryFilter) {
        filteredTemplates = filteredTemplates.filter(t => t.category === categoryFilter);
    }

    // סינון לפי חיפוש
    if (searchTerm) {
        filteredTemplates = filteredTemplates.filter(t =>
            t.name.toLowerCase().includes(searchTerm) ||
            t.brand.toLowerCase().includes(searchTerm) ||
            t.model.toLowerCase().includes(searchTerm) ||
            t.description.toLowerCase().includes(searchTerm)
        );
    }

    container.innerHTML = '';

    if (filteredTemplates.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">לא נמצאו טמפלטים</p>';
        return;
    }

    filteredTemplates.forEach(template => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `
            <h3>${template.name}</h3>
            <div class="device-type">${getDeviceTypeName(template.type)}</div>
            <p style="font-size: 0.9em; color: #666; margin: 10px 0;">${template.description}</p>
            <div style="margin: 10px 0;">
                <strong>מותג:</strong> ${template.brand}<br>
                <strong>מודל:</strong> ${template.model}<br>
                <strong>לחצנים:</strong> ${Object.keys(template.buttons).length}
            </div>
            <button class="btn-primary" onclick="addTemplateToDevice('${template.id}')" style="width: 100%; margin-top: 10px;">
                ➕ הוסף כמכשיר
            </button>
            <button class="btn-secondary" onclick="previewTemplate('${template.id}')" style="width: 100%; margin-top: 5px;">
                👁️ תצוגה מקדימה
            </button>
        `;
        container.appendChild(card);
    });
}

// הוספת טמפלט כמכשיר
function addTemplateToDevice(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
        showFeedback('❌ טמפלט לא נמצא');
        return;
    }

    // יצירת מכשיר חדש מהטמפלט
    const newDevice = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: template.name,
        type: template.type,
        connectionType: 'ir',
        brand: template.brand,
        model: template.model,
        templateId: templateId,
        irButtons: template.buttons,
        autoDetect: false
    };

    // הוספת המכשיר לרשימה
    devices.push(newDevice);
    localStorage.setItem('devices', JSON.stringify(devices));

    // הוספת הלחצנים ל-learnedIRButtons
    Object.keys(template.buttons).forEach(buttonKey => {
        const deviceButtonKey = `${newDevice.id}_${buttonKey}`;
        learnedIRButtons[deviceButtonKey] = template.buttons[buttonKey];
    });
    localStorage.setItem('irButtons', JSON.stringify(learnedIRButtons));

    loadDevices();
    showFeedback(`✅ ${template.name} נוסף כמכשיר עם ${Object.keys(template.buttons).length} לחצנים`);
}

// תצוגה מקדימה של טמפלט
function previewTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
        showFeedback('❌ טמפלט לא נמצא');
        return;
    }

    const buttonsList = Object.keys(template.buttons).map(key =>
        `<button class="btn-secondary" style="margin: 5px;">${key}</button>`
    ).join('');

    const previewHTML = `
        <div style="padding: 20px;">
            <h2>${template.name}</h2>
            <p><strong>מותג:</strong> ${template.brand}</p>
            <p><strong>מודל:</strong> ${template.model}</p>
            <p><strong>תיאור:</strong> ${template.description}</p>
            <h3>לחצנים זמינים (${Object.keys(template.buttons).length}):</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                ${buttonsList}
            </div>
            <button class="btn-primary" onclick="addTemplateToDevice('${templateId}'); this.closest('.modal').style.display='none';" style="margin-top: 20px; width: 100%;">
                ➕ הוסף כמכשיר
            </button>
        </div>
    `;

    // יצירת מודל תצוגה מקדימה
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span>
            ${previewHTML}
        </div>
    `;
    document.body.appendChild(modal);

    // סגירה בלחיצה מחוץ למודל
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// רענון טמפלטים
function loadAllTemplates() {
    initTemplates();
    loadTemplates();
    showFeedback('✅ טמפלטים נטענו מחדש');
}

// הוספת event listeners לחיפוש וסינון טמפלטים
function setupTemplateEventListeners() {
    const searchInput = document.getElementById('templateSearch');
    const categoryFilter = document.getElementById('templateCategoryFilter');

    if (searchInput) {
        searchInput.addEventListener('input', loadTemplates);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', loadTemplates);
    }
}

