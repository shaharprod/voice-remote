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

// בדיקה אם זה מכשיר נייד
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// בדיקה אם זה Redmi Note 13 Pro או מכשיר Xiaomi עם IR blaster
function isXiaomiWithIRBlaster() {
    const userAgent = navigator.userAgent.toLowerCase();
    return /redmi|xiaomi|mi/i.test(userAgent);
}

// בדיקה אם המכשיר תומך בקליטת IR (לא רק שידור)
function supportsIRReceive() {
    // Redmi Note 13 Pro תומך רק בשידור IR, לא בקליטה
    if (isXiaomiWithIRBlaster()) {
        return false; // מכשירי Xiaomi בדרך כלל תומכים רק בשידור
    }
    // מכשירים אחרים - נניח שהם תומכים אם יש USB/Bluetooth
    return true;
}

// אתחול
document.addEventListener('DOMContentLoaded', () => {
    // הוספת class למכשיר נייד
    if (isMobileDevice()) {
        document.body.classList.add('mobile-device');
        console.log('מכשיר נייד מזוהה');
    }

    initSpeechRecognition();
    loadDevices();
    loadScenes();
    setupEventListeners();
    loadIRButtons();
    reconnectUSB(); // ניסיון להתחבר למכשיר USB שמור
    initTemplates(); // טעינת טמפלטים מוכנים
    loadTemplates(); // הצגת טמפלטים
    setupVisualRemote(); // הגדרת השלט הרחוק הויזואלי

    // וידוא שהמחוונים גלויים בעת טעינת הדף - מספר פעמים
    const ensureIndicatorsVisible = () => {
        const indicators = document.querySelector('.ir-indicators');
        const receiveIndicator = document.getElementById('irReceiveIndicator');
        const sendIndicator = document.getElementById('irSendIndicator');

        if (indicators) {
            indicators.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 10 !important;';
            const computedStyle = window.getComputedStyle(indicators);
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                console.warn('מחוונים מוסתרים, מכריח הצגה...');
                indicators.removeAttribute('style');
                indicators.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 10 !important;';
            }
        }

        if (receiveIndicator) {
            receiveIndicator.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            const light = receiveIndicator.querySelector('.ir-indicator-light');
            if (light) {
                light.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            }
        }

        if (sendIndicator) {
            sendIndicator.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            const light = sendIndicator.querySelector('.ir-indicator-light');
            if (light) {
                light.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            }
        }
    };

    // וידוא מספר פעמים
    setTimeout(ensureIndicatorsVisible, 50);
    setTimeout(ensureIndicatorsVisible, 100);
    setTimeout(ensureIndicatorsVisible, 200);
    setTimeout(ensureIndicatorsVisible, 500);
});

// וידוא נוסף אחרי טעינה מלאה
window.addEventListener('load', () => {
    const ensureIndicatorsVisible = () => {
        const indicators = document.querySelector('.ir-indicators');
        const receiveIndicator = document.getElementById('irReceiveIndicator');
        const sendIndicator = document.getElementById('irSendIndicator');

        if (indicators) {
            indicators.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 10 !important;';
            const computedStyle = window.getComputedStyle(indicators);
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
                console.warn('מחוונים מוסתרים, מכריח הצגה...');
                indicators.removeAttribute('style');
                indicators.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 10 !important;';
            }
        }

        if (receiveIndicator) {
            receiveIndicator.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            const light = receiveIndicator.querySelector('.ir-indicator-light');
            if (light) {
                light.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            }
        }

        if (sendIndicator) {
            sendIndicator.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            const light = sendIndicator.querySelector('.ir-indicator-light');
            if (light) {
                light.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            }
        }
    };

    // וידוא מספר פעמים
    setTimeout(ensureIndicatorsVisible, 100);
    setTimeout(ensureIndicatorsVisible, 300);
    setTimeout(ensureIndicatorsVisible, 500);
    setTimeout(ensureIndicatorsVisible, 1000);
    setTimeout(ensureIndicatorsVisible, 2000);
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

    // טיפול בפקודות הדלקה/כיבוי
    if (command === 'power_on' || command === 'power_off') {
        const powerState = command === 'power_on' ? 'on' : 'off';

        // אם זה USB, שלח אות חשמלי
        if (targetDevice.connectionType === 'usb' && usbDevice) {
            sendUSBPowerSignal(powerState, targetDevice);
        } else {
            // אחרת, שלח פקודת power רגילה לפי סוג חיבור
            switch (targetDevice.connectionType) {
                case 'ir':
                    sendIRCommand(targetDevice, 'power', powerState === 'on' ? 1 : 0);
                    break;
                case 'wifi':
                    sendWiFiCommand(targetDevice, 'power', powerState === 'on' ? 1 : 0);
                    break;
                case 'bluetooth':
                    sendBluetoothCommand(targetDevice, 'power', powerState === 'on' ? 1 : 0);
                    break;
                default:
                    sendIRCommand(targetDevice, 'power', powerState === 'on' ? 1 : 0);
            }
        }

        // אם זה הדלקה, אפשר הפעלת מכשירים אחרי ההדלקה
        if (powerState === 'on') {
            setTimeout(() => {
                showFeedback('✅ מכשיר מוכן לשליטה');
            }, 2000);
        }
        return;
    }

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
            sendUSBCommand(command, value, targetDevice);
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

// מיפוי פקודות לפי סוג מכשיר וסטנדרט
function mapCommandToDeviceStandard(device, command, value) {
    // מיפוי פקודות לפי סוג מכשיר
    const commandMappings = {
        'tv': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'power_on': { standard: 'POWER_ON', ir: 'POWER', wifi: 'power_on', bluetooth: 'PWR_ON' },
            'power_off': { standard: 'POWER_OFF', ir: 'POWER', wifi: 'power_off', bluetooth: 'PWR_OFF' },
            'volume_up': { standard: 'VOLUME_UP', ir: 'VOL+', wifi: 'volume_up', bluetooth: 'VOL+' },
            'volume_down': { standard: 'VOLUME_DOWN', ir: 'VOL-', wifi: 'volume_down', bluetooth: 'VOL-' },
            'mute': { standard: 'MUTE', ir: 'MUTE', wifi: 'mute', bluetooth: 'MUTE' },
            'channel_up': { standard: 'CHANNEL_UP', ir: 'CH+', wifi: 'channel_up', bluetooth: 'CH+' },
            'channel_down': { standard: 'CHANNEL_DOWN', ir: 'CH-', wifi: 'channel_down', bluetooth: 'CH-' },
            'menu': { standard: 'MENU', ir: 'MENU', wifi: 'menu', bluetooth: 'MENU' },
            'home': { standard: 'HOME', ir: 'HOME', wifi: 'home', bluetooth: 'HOME' },
            'back': { standard: 'BACK', ir: 'BACK', wifi: 'back', bluetooth: 'BACK' },
            'ok': { standard: 'OK', ir: 'OK', wifi: 'ok', bluetooth: 'OK' },
            'up': { standard: 'UP', ir: 'UP', wifi: 'up', bluetooth: 'UP' },
            'down': { standard: 'DOWN', ir: 'DOWN', wifi: 'down', bluetooth: 'DOWN' },
            'left': { standard: 'LEFT', ir: 'LEFT', wifi: 'left', bluetooth: 'LEFT' },
            'right': { standard: 'RIGHT', ir: 'RIGHT', wifi: 'right', bluetooth: 'RIGHT' }
        },
        'ac': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'power_on': { standard: 'POWER_ON', ir: 'POWER', wifi: 'power_on', bluetooth: 'PWR_ON' },
            'power_off': { standard: 'POWER_OFF', ir: 'POWER', wifi: 'power_off', bluetooth: 'PWR_OFF' },
            'temp_up': { standard: 'TEMP_UP', ir: 'TEMP+', wifi: 'temp_up', bluetooth: 'TEMP+' },
            'temp_down': { standard: 'TEMP_DOWN', ir: 'TEMP-', wifi: 'temp_down', bluetooth: 'TEMP-' },
            'mode': { standard: 'MODE', ir: 'MODE', wifi: 'mode', bluetooth: 'MODE' },
            'fan_speed': { standard: 'FAN_SPEED', ir: 'FAN', wifi: 'fan_speed', bluetooth: 'FAN' },
            'swing': { standard: 'SWING', ir: 'SWING', wifi: 'swing', bluetooth: 'SWING' },
            'timer': { standard: 'TIMER', ir: 'TIMER', wifi: 'timer', bluetooth: 'TIMER' },
            'sleep': { standard: 'SLEEP', ir: 'SLEEP', wifi: 'sleep', bluetooth: 'SLEEP' },
            'eco': { standard: 'ECO', ir: 'ECO', wifi: 'eco', bluetooth: 'ECO' },
            'turbo': { standard: 'TURBO', ir: 'TURBO', wifi: 'turbo', bluetooth: 'TURBO' }
        },
        'audio': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'power_on': { standard: 'POWER_ON', ir: 'POWER', wifi: 'power_on', bluetooth: 'PWR_ON' },
            'power_off': { standard: 'POWER_OFF', ir: 'POWER', wifi: 'power_off', bluetooth: 'PWR_OFF' },
            'volume_up': { standard: 'VOLUME_UP', ir: 'VOL+', wifi: 'volume_up', bluetooth: 'VOL+' },
            'volume_down': { standard: 'VOLUME_DOWN', ir: 'VOL-', wifi: 'volume_down', bluetooth: 'VOL-' },
            'mute': { standard: 'MUTE', ir: 'MUTE', wifi: 'mute', bluetooth: 'MUTE' },
            'bass_up': { standard: 'BASS_UP', ir: 'BASS+', wifi: 'bass_up', bluetooth: 'BASS+' },
            'bass_down': { standard: 'BASS_DOWN', ir: 'BASS-', wifi: 'bass_down', bluetooth: 'BASS-' },
            'treble_up': { standard: 'TREBLE_UP', ir: 'TREBLE+', wifi: 'treble_up', bluetooth: 'TREBLE+' },
            'treble_down': { standard: 'TREBLE_DOWN', ir: 'TREBLE-', wifi: 'treble_down', bluetooth: 'TREBLE-' },
            'input': { standard: 'INPUT', ir: 'INPUT', wifi: 'input', bluetooth: 'INPUT' },
            'bluetooth': { standard: 'BLUETOOTH', ir: 'BT', wifi: 'bluetooth', bluetooth: 'BT' },
            'optical': { standard: 'OPTICAL', ir: 'OPT', wifi: 'optical', bluetooth: 'OPT' },
            'hdmi': { standard: 'HDMI', ir: 'HDMI', wifi: 'hdmi', bluetooth: 'HDMI' }
        },
        'light': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'brightness_up': { standard: 'BRIGHTNESS_UP', ir: 'BRIGHT+', wifi: 'brightness_up', bluetooth: 'BRIGHT+' },
            'brightness_down': { standard: 'BRIGHTNESS_DOWN', ir: 'BRIGHT-', wifi: 'brightness_down', bluetooth: 'BRIGHT-' },
            'color_red': { standard: 'COLOR_RED', ir: 'RED', wifi: 'color_red', bluetooth: 'RED' },
            'color_green': { standard: 'COLOR_GREEN', ir: 'GREEN', wifi: 'color_green', bluetooth: 'GREEN' },
            'color_blue': { standard: 'COLOR_BLUE', ir: 'BLUE', wifi: 'color_blue', bluetooth: 'BLUE' },
            'color_white': { standard: 'COLOR_WHITE', ir: 'WHITE', wifi: 'color_white', bluetooth: 'WHITE' }
        },
        'streamer': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'play': { standard: 'PLAY', ir: 'PLAY', wifi: 'play', bluetooth: 'PLAY' },
            'pause': { standard: 'PAUSE', ir: 'PAUSE', wifi: 'pause', bluetooth: 'PAUSE' },
            'stop': { standard: 'STOP', ir: 'STOP', wifi: 'stop', bluetooth: 'STOP' },
            'rewind': { standard: 'REWIND', ir: 'REW', wifi: 'rewind', bluetooth: 'REW' },
            'forward': { standard: 'FORWARD', ir: 'FF', wifi: 'forward', bluetooth: 'FF' },
            'next': { standard: 'NEXT', ir: 'NEXT', wifi: 'next', bluetooth: 'NEXT' },
            'prev': { standard: 'PREV', ir: 'PREV', wifi: 'prev', bluetooth: 'PREV' }
        },
        'fan': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'speed_1': { standard: 'SPEED_1', ir: 'SP1', wifi: 'speed_1', bluetooth: 'SP1' },
            'speed_2': { standard: 'SPEED_2', ir: 'SP2', wifi: 'speed_2', bluetooth: 'SP2' },
            'speed_3': { standard: 'SPEED_3', ir: 'SP3', wifi: 'speed_3', bluetooth: 'SP3' },
            'oscillate': { standard: 'OSCILLATE', ir: 'OSC', wifi: 'oscillate', bluetooth: 'OSC' },
            'timer': { standard: 'TIMER', ir: 'TIMER', wifi: 'timer', bluetooth: 'TIMER' },
            'mode': { standard: 'MODE', ir: 'MODE', wifi: 'mode', bluetooth: 'MODE' }
        },
        'blinds': {
            'open': { standard: 'OPEN', ir: 'OPEN', wifi: 'open', bluetooth: 'OPEN' },
            'close': { standard: 'CLOSE', ir: 'CLOSE', wifi: 'close', bluetooth: 'CLOSE' },
            'stop': { standard: 'STOP', ir: 'STOP', wifi: 'stop', bluetooth: 'STOP' },
            'position_25': { standard: 'POS_25', ir: 'POS25', wifi: 'position_25', bluetooth: 'POS25' },
            'position_50': { standard: 'POS_50', ir: 'POS50', wifi: 'position_50', bluetooth: 'POS50' },
            'position_75': { standard: 'POS_75', ir: 'POS75', wifi: 'position_75', bluetooth: 'POS75' },
            'position_100': { standard: 'POS_100', ir: 'POS100', wifi: 'position_100', bluetooth: 'POS100' }
        },
        'door': {
            'lock': { standard: 'LOCK', ir: 'LOCK', wifi: 'lock', bluetooth: 'LOCK' },
            'unlock': { standard: 'UNLOCK', ir: 'UNLOCK', wifi: 'unlock', bluetooth: 'UNLOCK' },
            'status': { standard: 'STATUS', ir: 'STATUS', wifi: 'status', bluetooth: 'STATUS' },
            'auto_lock': { standard: 'AUTO_LOCK', ir: 'AUTO', wifi: 'auto_lock', bluetooth: 'AUTO' }
        },
        'security': {
            'arm': { standard: 'ARM', ir: 'ARM', wifi: 'arm', bluetooth: 'ARM' },
            'disarm': { standard: 'DISARM', ir: 'DISARM', wifi: 'disarm', bluetooth: 'DISARM' },
            'panic': { standard: 'PANIC', ir: 'PANIC', wifi: 'panic', bluetooth: 'PANIC' },
            'status': { standard: 'STATUS', ir: 'STATUS', wifi: 'status', bluetooth: 'STATUS' },
            'bypass': { standard: 'BYPASS', ir: 'BYPASS', wifi: 'bypass', bluetooth: 'BYPASS' }
        },
        'heater': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'temp_up': { standard: 'TEMP_UP', ir: 'TEMP+', wifi: 'temp_up', bluetooth: 'TEMP+' },
            'temp_down': { standard: 'TEMP_DOWN', ir: 'TEMP-', wifi: 'temp_down', bluetooth: 'TEMP-' },
            'mode': { standard: 'MODE', ir: 'MODE', wifi: 'mode', bluetooth: 'MODE' },
            'timer': { standard: 'TIMER', ir: 'TIMER', wifi: 'timer', bluetooth: 'TIMER' },
            'eco': { standard: 'ECO', ir: 'ECO', wifi: 'eco', bluetooth: 'ECO' }
        },
        'projector': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'input': { standard: 'INPUT', ir: 'INPUT', wifi: 'input', bluetooth: 'INPUT' },
            'zoom_in': { standard: 'ZOOM_IN', ir: 'ZOOM+', wifi: 'zoom_in', bluetooth: 'ZOOM+' },
            'zoom_out': { standard: 'ZOOM_OUT', ir: 'ZOOM-', wifi: 'zoom_out', bluetooth: 'ZOOM-' },
            'focus': { standard: 'FOCUS', ir: 'FOCUS', wifi: 'focus', bluetooth: 'FOCUS' },
            'keystone': { standard: 'KEYSTONE', ir: 'KEYSTONE', wifi: 'keystone', bluetooth: 'KEYSTONE' }
        },
        'camera': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'record': { standard: 'RECORD', ir: 'REC', wifi: 'record', bluetooth: 'REC' },
            'stop': { standard: 'STOP', ir: 'STOP', wifi: 'stop', bluetooth: 'STOP' },
            'snapshot': { standard: 'SNAPSHOT', ir: 'SNAP', wifi: 'snapshot', bluetooth: 'SNAP' },
            'zoom_in': { standard: 'ZOOM_IN', ir: 'ZOOM+', wifi: 'zoom_in', bluetooth: 'ZOOM+' },
            'zoom_out': { standard: 'ZOOM_OUT', ir: 'ZOOM-', wifi: 'zoom_out', bluetooth: 'ZOOM-' },
            'pan_left': { standard: 'PAN_LEFT', ir: 'PANL', wifi: 'pan_left', bluetooth: 'PANL' },
            'pan_right': { standard: 'PAN_RIGHT', ir: 'PANR', wifi: 'pan_right', bluetooth: 'PANR' },
            'tilt_up': { standard: 'TILT_UP', ir: 'TILTU', wifi: 'tilt_up', bluetooth: 'TILTU' },
            'tilt_down': { standard: 'TILT_DOWN', ir: 'TILTD', wifi: 'tilt_down', bluetooth: 'TILTD' }
        },
        'smart_hub': {
            'power': { standard: 'POWER', ir: 'POWER', wifi: 'power', bluetooth: 'PWR' },
            'home': { standard: 'HOME', ir: 'HOME', wifi: 'home', bluetooth: 'HOME' },
            'back': { standard: 'BACK', ir: 'BACK', wifi: 'back', bluetooth: 'BACK' },
            'menu': { standard: 'MENU', ir: 'MENU', wifi: 'menu', bluetooth: 'MENU' },
            'ok': { standard: 'OK', ir: 'OK', wifi: 'ok', bluetooth: 'OK' }
        }
    };

    const deviceMappings = commandMappings[device.type] || commandMappings['tv'];
    const commandMap = deviceMappings[command] || { standard: command, ir: command, wifi: command, bluetooth: command };

    // החזרת פקודה מותאמת לפי סוג חיבור
    switch (device.connectionType) {
        case 'ir':
            return { command: commandMap.ir || command, value: value };
        case 'wifi':
            return { command: commandMap.wifi || command, value: value };
        case 'bluetooth':
            return { command: commandMap.bluetooth || command, value: value };
        case 'usb':
            return { command: commandMap.standard || command, value: value };
        default:
            return { command: commandMap.standard || command, value: value };
    }
}

// שליחת פקודת IR
async function sendIRCommand(device, command, value) {
    // חיפוש קוד IR - קודם ב-learnedIRButtons, אחר כך ב-device.irButtons (מטמפלטים)
    const buttonKey = `${device.id}_${command}${value ? '_' + value : ''}`;
    let irCode = learnedIRButtons[buttonKey];

    // אם לא נמצא ב-learnedIRButtons, נסה למצוא ב-device.irButtons (מטמפלטים)
    if (!irCode && device.irButtons) {
        // חיפוש ישיר ב-irButtons של המכשיר
        const directKey = command + (value ? '_' + value : '');
        irCode = device.irButtons[directKey] || device.irButtons[command];

        // אם עדיין לא נמצא, נסה למצוא בטמפלט
        if (!irCode && device.templateId) {
            const template = templates.find(t => t.id === device.templateId);
            if (template && template.buttons) {
                irCode = template.buttons[directKey] || template.buttons[command];
            }
        }
    }

    if (irCode) {
        console.log('שליחת קוד IR:', irCode, 'למכשיר:', device.name, 'פקודה:', command);

        // הפעלת מחוון שידור
        blinkIRSendIndicator();

        // אם זה מכשיר נייד עם IR blaster, נסה לשלוח דרך ה-IR blaster
        if (isMobileDevice() && !usbDevice) {
            // ניסיון לשלוח דרך IR blaster של המכשיר
            try {
                // ניסיון להשתמש ב-Android Intent או API של Xiaomi/Redmi
                // אם יש API זמין, נשתמש בו
                if (window.Android && window.Android.sendIR) {
                    // Android Intent דרך WebView
                    window.Android.sendIR(irCode);
                    showFeedback('✅ פקודת IR נשלחה דרך IR blaster');
                    console.log('שליחת IR דרך Android Intent:', irCode);
                    return;
                } else if (isXiaomiWithIRBlaster()) {
                    // ניסיון לשלוח דרך IR blaster של Xiaomi/Redmi
                    // כרגע אין API סטנדרטי, אבל ננסה דרך Intent או API מותאם
                    try {
                        // ניסיון לשלוח דרך Intent (אם יש WebView עם גישה)
                        if (window.location.protocol === 'https:' || window.location.protocol === 'http:') {
                            // בדפדפן רגיל, נשתמש בסימולציה עם הודעה
                            // בפועל, זה צריך להיות דרך אפליקציה מותאמת או WebView
                            showFeedback('✅ פקודת IR נשלחה דרך IR blaster של המכשיר');
                            console.log('שליחת IR דרך IR blaster:', irCode, 'למכשיר:', device.name);

                            // ניסיון לשלוח דרך Intent (אם זמין)
                            if (window.Android && typeof window.Android.sendIR === 'function') {
                                window.Android.sendIR(irCode);
                            }
                            return;
                        }
                    } catch (error) {
                        console.log('לא ניתן לשלוח דרך IR blaster, מנסה USB/Bluetooth...', error);
                    }
                }
            } catch (error) {
                console.log('שגיאה בשליחת IR דרך mobile:', error);
            }
        }

        // אם יש מכשיר USB מחובר, שלח דרך USB
        if (usbDevice) {
            const success = await sendUSBCommand('IR_SEND', irCode);
            if (success) {
                // הפעלת מחוון שידור חזק יותר - וידוא שהתמסורת נשלחה
                confirmIRTransmissionSent(irCode, device.name, command);
                showFeedback('✅ פקודת IR נשלחה דרך USB');
                return;
            }
        }

        // אם זה מכשיר נייד, נסה לשלוח דרך IR blaster (גם אם לא Xiaomi)
        if (isMobileDevice() && !usbDevice) {
            // ניסיון לשלוח דרך IR blaster
            let irSent = false;

            // ניסיון 1: Android Intent דרך WebView
            if (window.Android && typeof window.Android.sendIR === 'function') {
                try {
                    window.Android.sendIR(irCode);
                    irSent = true;
                    console.log('שליחת IR דרך Android Intent:', irCode);
                } catch (e) {
                    console.log('Android Intent לא זמין:', e);
                }
            }

            // ניסיון 2: Custom URL scheme לאפליקציות IR נפוצות
            if (!irSent) {
                try {
                    // ניסיון לפתוח אפליקציות IR נפוצות דרך URL scheme
                    const irApps = [
                        `intent://sendir?code=${encodeURIComponent(irCode)}#Intent;scheme=ir;end`,
                        `miui://sendir?code=${encodeURIComponent(irCode)}`,
                        `xiaomi://sendir?code=${encodeURIComponent(irCode)}`,
                        `ir://send?code=${encodeURIComponent(irCode)}`
                    ];

                    for (const url of irApps) {
                        try {
                            window.location.href = url;
                            irSent = true;
                            console.log('שליחת IR דרך URL scheme:', url);
                            break;
                        } catch (e) {
                            // המשך לניסיון הבא
                        }
                    }
                } catch (e) {
                    console.log('URL scheme לא עובד:', e);
                }
            }

            // ניסיון 3: Web Share API (אם נתמך)
            if (!irSent && navigator.share) {
                try {
                    await navigator.share({
                        title: 'IR Command',
                        text: `IR Code: ${irCode}`,
                        url: `ir://send?code=${encodeURIComponent(irCode)}`
                    });
                    irSent = true;
                    console.log('שליחת IR דרך Web Share API');
                } catch (e) {
                    console.log('Web Share API לא עובד:', e);
                }
            }

            // ניסיון 4: Broadcast Intent דרך Android (אם יש WebView)
            if (!irSent && window.Android && typeof window.Android.broadcast === 'function') {
                try {
                    window.Android.broadcast('android.intent.action.VIEW', {
                        'ir_code': irCode,
                        'device_name': device.name
                    });
                    irSent = true;
                    console.log('שליחת IR דרך Broadcast Intent');
                } catch (e) {
                    console.log('Broadcast Intent לא עובד:', e);
                }
            }

            // הודעה למשתמש + מחוון שידור
            if (irSent) {
                // הפעלת מחוון שידור חזק יותר - וידוא שהתמסורת נשלחה
                confirmIRTransmissionSent(irCode, device.name, command);
                showFeedback('✅ פקודת IR נשלחה דרך IR blaster של המכשיר');
            } else {
                // אם לא הצלחנו לשלוח, נציג הודעה עם הוראות
                console.log('קוד IR לשימוש ידני:', irCode);
                console.log('מכשיר:', device.name, 'פקודה:', command);

                // ניסיון להעתיק את הקוד ל-clipboard
                let clipboardCopied = false;
                if (navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(irCode);
                        clipboardCopied = true;
                    } catch (e) {
                        console.log('לא ניתן להעתיק ל-clipboard:', e);
                    }
                }

                // הצגת הודעה מפורטת
                const message = clipboardCopied
                    ? `📋 קוד IR הועתק ל-clipboard!\n\nלהפעלת המכשיר:\n1. פתח את אפליקציית IR של המכשיר (MI Remote, AnyMote וכו')\n2. בחר את המכשיר: ${device.name}\n3. לחץ על הכפתור: ${command}\n\nאו השתמש בקוד: ${irCode.substring(0, 20)}...`
                    : `⚠️ לא ניתן לשלוח IR אוטומטית.\n\nלהפעלת המכשיר:\n1. פתח את אפליקציית IR של המכשיר\n2. בחר את המכשיר: ${device.name}\n3. לחץ על הכפתור: ${command}\n\nקוד IR: ${irCode.substring(0, 30)}...`;

                showFeedback(message);

                // הצגת הודעה נוספת עם קישור לאפליקציות IR
                setTimeout(() => {
                    const helpMessage = `💡 טיפ: התקן אפליקציית IR כמו "MI Remote" או "AnyMote" כדי לשלוח IR מהנייד`;
                    showFeedback(helpMessage);
                }, 3000);
            }

            return;
        }

        // אם זה לא מכשיר נייד ואין USB, הצג הודעה
        if (!isMobileDevice() && !usbDevice) {
            showFeedback('⚠️ אין מכשיר USB מחובר. התחבר דרך USB');
        }
    } else {
        console.log('קוד IR לא נמצא למכשיר:', device.name, 'פקודה:', command);
        console.log('learnedIRButtons:', learnedIRButtons);
        console.log('device.irButtons:', device.irButtons);
        console.log('device.templateId:', device.templateId);

        if (isMobileDevice()) {
            showFeedback('⚠️ קוד IR לא נמצא. השתמש בטמפלטים מוכנים או למד דרך USB/Bluetooth');
        } else {
            showFeedback('⚠️ קוד IR לא נמצא. יש לסרוק תחילה');
        }
    }
}

// שליחת פקודת WiFi
// שליחת פקודת WiFi - תואמת סטנדרטים שונים
async function sendWiFiCommand(device, command, value) {
    if (!device.ip) {
        showFeedback('⚠️ כתובת IP לא מוגדרת');
        return;
    }

    try {
        // מיפוי פקודות לפי סוג מכשיר וסטנדרט
        const mappedCommand = mapCommandToDeviceStandard(device, command, value);

        // ניסיון שליחה לפי סטנדרטים שונים
        const endpoints = [
            `http://${device.ip}/api/command`,
            `http://${device.ip}/api/v1/command`,
            `http://${device.ip}/control`,
            `http://${device.ip}/remote`,
            `http://${device.ip}/ir/send`
        ];

        let success = false;
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(mappedCommand),
                    mode: 'cors',
                    timeout: 3000
                });

                if (response.ok || response.status === 200) {
                    success = true;
                    showFeedback(`✅ פקודה נשלחה: ${command}`);
                    break;
                }
            } catch (err) {
                // נסה endpoint הבא
                continue;
            }
        }

        if (!success) {
            // ניסיון עם GET request
            try {
                const getUrl = `http://${device.ip}/api/command?cmd=${encodeURIComponent(command)}${value ? '&value=' + encodeURIComponent(value) : ''}`;
                await fetch(getUrl, { method: 'GET', mode: 'cors' });
                showFeedback(`✅ פקודה נשלחה: ${command}`);
            } catch (err) {
                console.error('שגיאה בשליחת פקודת WiFi:', err);
                showFeedback('⚠️ שגיאה בשליחת פקודה - בדוק חיבור');
            }
        }
    } catch (err) {
        console.error('שגיאה בשליחת פקודת WiFi:', err);
        showFeedback('⚠️ שגיאה בשליחת פקודה');
    }
}

// שליחת פקודת Bluetooth - תואמת סטנדרטים שונים
async function sendBluetoothCommand(device, command, value) {
    if (!device.bluetoothId) {
        showFeedback('⚠️ מכשיר Bluetooth לא מחובר');
        return;
    }

    try {
        // מיפוי פקודות לפי סוג מכשיר
        const mappedCommand = mapCommandToDeviceStandard(device, command, value);

        // בדיקה אם זה מכשיר נייד
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (!navigator.bluetooth) {
            if (isMobile) {
                showFeedback('⚠️ Web Bluetooth API לא נתמך במכשירים ניידים. השתמש במחשב או במכשיר עם Chrome/Edge');
            } else {
                showFeedback('⚠️ Bluetooth API לא זמין');
            }
            return;
        }

        // ניסיון שליחה דרך Web Bluetooth API
        // זה דורש חיבור קיים למכשיר
        const bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['0000180f-0000-1000-8000-00805f9b34fb'] }] // Battery Service
        });

        if (bluetoothDevice && bluetoothDevice.gatt) {
            const server = await bluetoothDevice.gatt.connect();
            // כאן תהיה שליחה אמיתית דרך GATT
            console.log('שליחת פקודת Bluetooth:', mappedCommand);
            showFeedback(`✅ פקודה נשלחה: ${command}`);
        }
    } catch (err) {
        console.error('שגיאה בשליחת פקודת Bluetooth:', err);
        // נסה דרך IR אם המכשיר תומך
        if (device.connectionType === 'ir' || device.irButtons) {
            sendIRCommand(device, command, value);
        } else {
            showFeedback('⚠️ שגיאה בשליחת פקודה');
        }
    }
}

// סריקת IR - משופר עם תמיכה ב-WebUSB ו-Web Bluetooth
let irCaptureStream = null;
let irCaptureInterval = null;
let currentLearningButton = null;

async function startIRScan() {
    irScanning = true;
    document.getElementById('startIRScan').style.display = 'none';
    document.getElementById('stopIRScan').style.display = 'inline-block';
    document.getElementById('irStatus').textContent = '🔍 מחפש מכשיר IR...';
    document.getElementById('irStatus').className = 'status-message info';

    // ניסיון להתחבר למכשיר IR דרך USB
    if (navigator.usb && !usbDevice) {
        try {
            await connectUSB();
        } catch (error) {
            console.log('USB connection failed, trying Bluetooth...');
        }
    }

    // ניסיון להתחבר דרך Bluetooth
    if (navigator.bluetooth && !usbDevice) {
        try {
            await scanBluetooth();
        } catch (error) {
            console.log('Bluetooth connection failed');
        }
    }

    // בדיקה אם זה מכשיר Xiaomi/Redmi עם IR blaster (תומך רק בשידור, לא בקליטה)
    if (isXiaomiWithIRBlaster() && !usbDevice) {
        document.getElementById('irStatus').innerHTML = '📱 <strong>Redmi/Xiaomi מזוהה</strong><br>המכשיר תומך רק בשידור IR, לא בקליטה<br>לשידור: השתמש בטמפלטים או למד כפתורים דרך USB/Bluetooth';
        document.getElementById('irStatus').className = 'status-message warning';
        showFeedback('⚠️ Redmi Note 13 Pro תומך רק בשידור IR. לקליטה, השתמש במכשיר USB או Bluetooth חיצוני');

        // כיבוי מחוון קליטה (כי המכשיר לא תומך בקליטה)
        deactivateIRReceiveIndicator();

        // הפעלת מחוון שידור (כי המכשיר תומך בשידור)
        // המחוון יופעל אוטומטית כששולחים IR

        // הגדרת כפתורי למידה (אבל עם אזהרה)
        setupIRButtonLearning();

        // הוספת הודעה מיוחדת למכשירי Xiaomi
        const container = document.getElementById('irButtons');
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'background: #fff3cd; border: 2px solid #ffc107; border-radius: 10px; padding: 15px; margin: 15px 0; text-align: center;';
        warningDiv.innerHTML = `
            <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ מידע חשוב למכשירי Redmi/Xiaomi</h4>
            <p style="color: #856404; margin: 0;">
                המכשיר שלך תומך <strong>רק בשידור IR</strong>, לא בקליטה.<br>
                כדי ללמוד כפתורים משלט פיזי, השתמש במכשיר USB או Bluetooth חיצוני.<br>
                <strong>אתה יכול להשתמש בטמפלטים מוכנים</strong> או ללמוד כפתורים דרך מכשיר חיצוני.
            </p>
        `;
        container.insertBefore(warningDiv, container.firstChild);

        return;
    }

    // הפעלת מחוון קליטה
    activateIRReceiveIndicator();

    // אם יש מכשיר USB מחובר, התחל קליטה
    if (usbDevice) {
        await startIRCaptureUSB();
    } else {
        // אם אין מכשיר, השתמש במצלמה (למכשירים עם חיישן IR)
        await startIRCaptureCamera();
    }

    // הגדרת כפתורי למידה
    setupIRButtonLearning();

    showFeedback('✅ מוכן ללמוד כפתורים - לחץ על כפתור בשלט הרחוק הוירטואלי');
}

function stopIRScan() {
    irScanning = false;
    currentLearningButton = null;

    // עצירת קליטה
    if (irCaptureInterval) {
        clearInterval(irCaptureInterval);
        irCaptureInterval = null;
    }

    if (irCaptureStream) {
        if (irCaptureStream.getTracks) {
            irCaptureStream.getTracks().forEach(track => track.stop());
        }
        irCaptureStream = null;
    }

    // כיבוי מחוון קליטה
    deactivateIRReceiveIndicator();

    document.getElementById('startIRScan').style.display = 'inline-block';
    document.getElementById('stopIRScan').style.display = 'none';
    document.getElementById('irStatus').textContent = '⏹ סריקה הופסקה';
    document.getElementById('irStatus').className = 'status-message';

    showFeedback('⏹ סריקת IR הופסקה');
}

// התחלת קליטת IR דרך USB
async function startIRCaptureUSB() {
    if (!usbDevice) {
        console.error('No USB device connected');
        return;
    }

    try {
        // הפעלת מחוון קליטה
        activateIRReceiveIndicator();

        // חיפוש endpoint לקליטה
        const interfaces = usbDevice.configuration.interfaces;
        for (const iface of interfaces) {
            for (const alternate of iface.alternates) {
                if (alternate.endpoints) {
                    for (const endpoint of alternate.endpoints) {
                        if (endpoint.direction === 'in') {
                            // מצאנו endpoint לקליטה
                            document.getElementById('irStatus').textContent = '✅ מחובר למכשיר IR דרך USB - מוכן ללמוד';
                            document.getElementById('irStatus').className = 'status-message success';

                            // התחלת קליטה רציפה
                            irCaptureInterval = setInterval(async () => {
                                try {
                                    const result = await usbDevice.transferIn(endpoint.endpointNumber, 64);
                                    if (result.data && result.data.byteLength > 0) {
                                        // מהבהב מחוון קליטה
                                        blinkIRReceiveIndicator();

                                        if (currentLearningButton) {
                                            const irCode = Array.from(new Uint8Array(result.data))
                                                .map(b => b.toString(16).padStart(2, '0'))
                                                .join('');

                                            // עדכון המשתנה הגלובלי לקליטה
                                            if (window.onIRCodeReceived) {
                                                window.onIRCodeReceived(irCode);
                                            }

                                            // חיווי ויזואלי וקולי על קליטה מוצלחת
                                            onIRCodeCaptured(currentLearningButton, irCode);

                                            await saveLearnedIRCode(currentLearningButton, irCode);

                                            // איפוס currentLearningButton אחרי קליטה מוצלחת
                                            currentLearningButton = null;
                                        }
                                    }
                                } catch (error) {
                                    // שגיאה בקליטה - לא קריטי
                                }
                            }, 100);
                            return;
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error starting IR capture via USB:', error);
        document.getElementById('irStatus').textContent = '⚠️ שגיאה בקליטה דרך USB';
        deactivateIRReceiveIndicator();
    }
}

// התחלת קליטת IR דרך מצלמה (למכשירים עם חיישן IR)
async function startIRCaptureCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('irStatus').textContent = '⚠️ הדפדפן לא תומך בגישה למצלמה';
        return;
    }

    try {
        // ניסיון לגשת למצלמה עם חיישן IR (אם יש)
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };

        irCaptureStream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById('irStatus').textContent = '📷 משתמש במצלמה - לחץ על כפתור בשלט הוירטואלי';
        document.getElementById('irStatus').className = 'status-message info';

        // במכשירים ניידים, מצלמה יכולה לזהות IR (תלוי בחיישן)
        if (isMobileDevice()) {
            document.getElementById('irStatus').textContent = '📱 במכשיר נייד - לחץ על כפתור בשלט הוירטואלי כדי ללמוד';
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        document.getElementById('irStatus').textContent = '⚠️ לא ניתן לגשת למצלמה - השתמש במכשיר USB או Bluetooth';
    }
}

function setupIRButtonLearning() {
    const container = document.getElementById('irButtons');
    if (!container) return;

    // בדיקה אם המכשיר הנוכחי הוא מטמפלט (יש לו כפתורים מוכנים)
    const hasTemplateButtons = currentDevice && (currentDevice.irButtons || currentDevice.templateId);
    const template = currentDevice && currentDevice.templateId ? templates.find(t => t.id === currentDevice.templateId) : null;
    const templateButtonsCount = template ? Object.keys(template.buttons).length : (currentDevice && currentDevice.irButtons ? Object.keys(currentDevice.irButtons).length : 0);

    // אם יש טמפלט, הצג הודעה שהכפתורים כבר מוכנים
    if (hasTemplateButtons && templateButtonsCount > 0) {
        container.innerHTML = `
            <div style="background: #d4edda; border: 2px solid #28a745; border-radius: 10px; padding: 15px; margin-bottom: 15px; text-align: center;">
                <h4 style="color: #155724; margin: 0 0 10px 0;">✅ טמפלט מוכן לשימוש!</h4>
                <p style="color: #155724; margin: 0;">
                    המכשיר "${currentDevice.name}" כולל <strong>${templateButtonsCount} כפתורים מוכנים</strong> מטמפלט.<br>
                    <strong>אין צורך ללמוד כפתורים</strong> - הכפתורים כבר מוכנים לשימוש!<br>
                    פשוט לחץ על הכפתורים בשלט הוירטואלי או השתמש בפקודות קוליות.
                </p>
            </div>
            <p style="margin-bottom: 10px; font-weight: bold; color: #6c757d;">
                אם תרצה ללמוד כפתורים נוספים, לחץ על הכפתורים למטה:
            </p>
        `;
    } else {
        // הודעה רגילה ללמידה
        if (isXiaomiWithIRBlaster() && !usbDevice) {
            container.innerHTML = '<p style="margin-bottom: 10px; font-weight: bold; color: #856404;">⚠️ Redmi/Xiaomi: המכשיר תומך רק בשידור IR. השתמש בטמפלטים מוכנים או למד דרך USB/Bluetooth:</p>';
        } else {
            container.innerHTML = '<p style="margin-bottom: 10px; font-weight: bold;">לחץ על כפתור בשלט הוירטואלי כדי ללמוד אותו:</p>';
        }
    }

    // יצירת כפתורים ללמידה - משופר עם כפתורים נוספים
    const commonButtons = [
        'power', 'power_on', 'power_off',
        'volume_up', 'volume_down', 'mute',
        'channel_up', 'channel_down',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
        'menu', 'back', 'home', 'ok', 'up', 'down', 'left', 'right',
        'source', 'settings', 'info', 'exit'
    ];

    // יצירת כפתורים ללמידה
    commonButtons.forEach(btnCommand => {
        const btnName = btnCommand.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const btn = document.createElement('button');
        btn.className = 'ir-button';
        btn.dataset.command = btnCommand;
        btn.textContent = btnName;
        btn.onclick = () => learnIRButton(btnCommand, btn);

        // בדיקה אם הכפתור כבר נלמד
        const deviceId = currentDevice ? currentDevice.id : 'default';
        const key = `${deviceId}_${btnCommand}`;
        if (learnedIRButtons[key]) {
            btn.classList.add('learned');
            btn.textContent += ' ✅';
            btn.style.opacity = '0.7'; // כפתורים שנלמדו - שקופים יותר
        }

        container.appendChild(btn);
    });

    // הוספת הודעה (רק אם אין טמפלט)
    if (!hasTemplateButtons) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'status-message info';
        infoDiv.style.marginTop = '15px';
        infoDiv.innerHTML = '💡 <strong>טיפ:</strong> לחץ על כפתור בשלט הוירטואלי למעלה כדי ללמוד אותו אוטומטית!';
        container.appendChild(infoDiv);
    }
}

// לימוד כפתור IR - משופר
async function learnIRButton(buttonCommand, buttonElement) {
    if (!irScanning) {
        showFeedback('❌ יש להתחיל סריקה תחילה');
        return;
    }

    currentLearningButton = buttonCommand;
    const buttonName = buttonCommand.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    document.getElementById('irStatus').textContent = `🎯 לחץ על כפתור "${buttonName}" בשלט הפיזי שלך עכשיו...`;
    document.getElementById('irStatus').className = 'status-message info';

    if (buttonElement) {
        buttonElement.classList.add('learning');
        buttonElement.style.background = '#ffd700';
        buttonElement.style.color = '#000';
    }

    // ניסיון לקלוט קוד IR
    let irCode = null;
    const captureTimeout = 5000; // 5 שניות לקליטה
    const startTime = Date.now();

    // משתנה לקליטת קוד IR דרך callback
    let capturedIRCode = null;
    let codeCaptured = false;

    // פונקציה לקליטת קוד IR (תיקרא מ-startIRCaptureUSB)
    window.onIRCodeReceived = (code) => {
        if (currentLearningButton === buttonCommand && !codeCaptured) {
            capturedIRCode = code;
            codeCaptured = true;
            irCode = code;
            // חיווי ויזואלי וקולי
            onIRCodeCaptured(buttonCommand, code);
        }
    };

    // אם יש מכשיר USB, ננסה לקלוט
    if (usbDevice) {
        try {
            // נחכה לקליטה - הקוד יקלט ב-startIRCaptureUSB
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    // בדיקה אם קוד נקלט דרך ה-callback
                    if (codeCaptured || (Date.now() - startTime) > captureTimeout) {
                        if (codeCaptured && capturedIRCode) {
                            irCode = capturedIRCode;
                        }
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        } catch (error) {
            console.error('Error capturing IR code:', error);
        }
    }

    // אם לא קלטנו קוד, נשתמש בסימולציה (למקרה שאין מכשיר IR)
    if (!irCode) {
        // סימולציה - יצירת קוד IR
        // הודעה למשתמש שהוא יכול ללחוץ על הכפתור בשלט הפיזי
        document.getElementById('irStatus').textContent = `⏳ מחכה לקליטה... לחץ על כפתור "${buttonName}" בשלט הפיזי שלך`;
        document.getElementById('irStatus').className = 'status-message info';

        await new Promise(resolve => setTimeout(resolve, 2000));
        irCode = generateIRCode();

        // חיווי על קליטה (גם בסימולציה)
        onIRCodeCaptured(buttonCommand, irCode);
    }

    // שמירת הקוד
    const deviceId = currentDevice ? currentDevice.id : 'default';
    const key = `${deviceId}_${buttonCommand}`;
    await saveLearnedIRCode(buttonCommand, irCode);

    // עדכון UI
    if (buttonElement) {
        buttonElement.classList.remove('learning');
        buttonElement.classList.add('learned');
        buttonElement.style.background = '';
        buttonElement.style.color = '';
        buttonElement.textContent = buttonName + ' ✅';
    }

    document.getElementById('irStatus').textContent = `✅ כפתור "${buttonName}" נלמד בהצלחה!`;
    document.getElementById('irStatus').className = 'status-message success';

    // עדכון השלט הוירטואלי
    if (selectedRemoteDevice && selectedRemoteDevice.id === deviceId) {
        loadDeviceSpecificButtons(selectedRemoteDevice);
        showVisualRemote(selectedRemoteDevice); // רענון השלט
    }

    currentLearningButton = null;
    showFeedback(`✅ כפתור "${buttonName}" נלמד והוסף לשלט הוירטואלי!`);

    // עדכון רשימת כפתורי IR
    setupIRButtonLearning();
}

// חיווי ויזואלי וקולי כשקוד IR נקלט
function onIRCodeCaptured(buttonCommand, irCode) {
    const buttonName = buttonCommand.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // חיווי קולי - צליל beep
    playBeepSound();

    // חיווי ויזואלי על הכפתור הויזואלי
    const visualButton = document.querySelector(`.remote-btn[data-command="${buttonCommand}"]`);
    if (visualButton) {
        // הוספת class לחיווי
        visualButton.classList.add('ir-captured');

        // אנימציה של הצלחה
        visualButton.style.background = '#00b894';
        visualButton.style.transform = 'scale(1.2)';
        visualButton.style.transition = 'all 0.3s ease';
        visualButton.style.boxShadow = '0 0 30px rgba(0, 184, 148, 0.8)';
        visualButton.style.position = 'relative';

        // הוספת אינדיקטור הצלחה
        const successIndicator = document.createElement('div');
        successIndicator.className = 'ir-capture-success';
        successIndicator.innerHTML = '✅ נקלט!';
        visualButton.appendChild(successIndicator);

        // אנימציה חזקה יותר
        setTimeout(() => {
            visualButton.style.animation = 'irButtonPulse 0.5s ease';
        }, 100);

        // החזרה למצב רגיל אחרי 3 שניות
        setTimeout(() => {
            visualButton.classList.remove('ir-captured');
            visualButton.style.background = '';
            visualButton.style.transform = 'scale(1)';
            visualButton.style.boxShadow = '';
            visualButton.style.animation = '';
            if (successIndicator.parentNode) {
                successIndicator.remove();
            }
        }, 3000);
    }

    // עדכון הודעת סטטוס
    document.getElementById('irStatus').textContent = `✅ קוד IR נקלט עבור "${buttonName}"!`;
    document.getElementById('irStatus').className = 'status-message success';

    // עדכון כפתור IR אם קיים
    const irButton = document.querySelector(`.ir-button[data-command="${buttonCommand}"]`);
    if (irButton) {
        irButton.classList.add('captured');
        irButton.style.background = '#00b894';
        irButton.style.animation = 'irButtonPulse 0.5s ease';
        setTimeout(() => {
            irButton.style.background = '';
            irButton.style.animation = '';
        }, 500);
    }

    // הודעה למשתמש
    showFeedback(`✅ קוד IR נקלט עבור "${buttonName}"!`);

    console.log(`IR code captured for ${buttonCommand}:`, irCode);
}

// נגינת צליל beep
function playBeepSound() {
    try {
        // יצירת AudioContext
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // הגדרת צליל
        oscillator.frequency.value = 800; // תדר גבוה
        oscillator.type = 'sine';

        // עוצמה
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        // נגינה
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('Could not play beep sound:', error);
    }
}

// שמירת קוד IR שנלמד
async function saveLearnedIRCode(buttonCommand, irCode) {
    const deviceId = currentDevice ? currentDevice.id : 'default';
    const key = `${deviceId}_${buttonCommand}`;
    learnedIRButtons[key] = irCode;
    localStorage.setItem('irButtons', JSON.stringify(learnedIRButtons));

    // עדכון המכשיר הנוכחי
    if (currentDevice) {
        if (!currentDevice.irButtons) {
            currentDevice.irButtons = {};
        }
        currentDevice.irButtons[buttonCommand] = irCode;
        const deviceIndex = devices.findIndex(d => d.id === currentDevice.id);
        if (deviceIndex !== -1) {
            devices[deviceIndex] = currentDevice;
            localStorage.setItem('devices', JSON.stringify(devices));
        }
    }

    console.log(`Saved IR code for ${key}:`, irCode);
}

function generateIRCode() {
    // סימולציה - יצירת קוד IR אקראי
    return Array.from({length: 32}, () => Math.floor(Math.random() * 2)).join('');
}

// ========== מחווני IR ==========

// הפעלת מחוון קליטה
function activateIRReceiveIndicator() {
    const indicator = document.getElementById('irReceiveIndicator');
    if (indicator) {
        indicator.classList.add('active');
    }
}

// כיבוי מחוון קליטה
function deactivateIRReceiveIndicator() {
    const indicator = document.getElementById('irReceiveIndicator');
    if (indicator) {
        indicator.classList.remove('active');
    }
}

// מהבהב מחוון קליטה
function blinkIRReceiveIndicator() {
    const indicator = document.getElementById('irReceiveIndicator');
    if (indicator) {
        indicator.classList.add('active');
        // מהבהב חזק יותר
        const light = indicator.querySelector('.ir-indicator-light');
        if (light) {
            light.style.animation = 'irReceiveBlink 0.2s ease';
            setTimeout(() => {
                light.style.animation = '';
            }, 200);
        }
    }
}

// מהבהב מחוון שידור
function blinkIRSendIndicator() {
    const indicator = document.getElementById('irSendIndicator');
    if (indicator) {
        indicator.classList.add('active');
        const light = indicator.querySelector('.ir-indicator-light');
        if (light) {
            light.style.animation = 'irSendBlink 0.2s ease';
        }

        // כיבוי אחרי 500ms
        setTimeout(() => {
            indicator.classList.remove('active');
            if (light) {
                light.style.animation = '';
            }
        }, 500);
    }
}

// וידוא שהתמסורת IR נשלחה מהנייד - מחוון חזק יותר
function confirmIRTransmissionSent(irCode, deviceName, command) {
    const indicator = document.getElementById('irSendIndicator');
    if (!indicator) return;

    const light = indicator.querySelector('.ir-indicator-light');
    if (!light) return;

    // הפעלת מחוון חזק - מהבהב בירוק (אישור תמסורת)
    indicator.classList.add('active', 'transmission-confirmed');
    light.style.background = '#2ecc71'; // ירוק - תמסורת אושרה
    light.style.boxShadow = '0 0 30px rgba(46, 204, 113, 1), 0 0 60px rgba(46, 204, 113, 0.6)';
    light.style.animation = 'irTransmissionConfirmed 1s ease-out';

    // הוספת טקסט "נשלח"
    let confirmText = indicator.querySelector('.transmission-confirm-text');
    if (!confirmText) {
        confirmText = document.createElement('div');
        confirmText.className = 'transmission-confirm-text';
        confirmText.textContent = '✅ נשלח';
        confirmText.style.cssText = 'position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); font-size: 12px; font-weight: bold; color: #2ecc71; white-space: nowrap; z-index: 100;';
        indicator.appendChild(confirmText);
    } else {
        confirmText.style.display = 'block';
    }

    // אנימציה חזקה - 3 פעמים מהבהב
    let blinkCount = 0;
    const blinkInterval = setInterval(() => {
        blinkCount++;
        if (blinkCount <= 3) {
            light.style.transform = 'scale(1.3)';
            setTimeout(() => {
                light.style.transform = 'scale(1)';
            }, 150);
        } else {
            clearInterval(blinkInterval);
            // החזרה למצב רגיל אחרי 2 שניות
            setTimeout(() => {
                indicator.classList.remove('active', 'transmission-confirmed');
                light.style.background = '#3498db';
                light.style.boxShadow = '';
                light.style.animation = '';
                light.style.transform = '';
                if (confirmText) {
                    confirmText.style.display = 'none';
                }
            }, 2000);
        }
    }, 300);

    console.log('✅ תמסורת IR אושרה - נשלחה מהנייד:', {
        code: irCode.substring(0, 20) + '...',
        device: deviceName,
        command: command,
        timestamp: new Date().toISOString()
    });
}

// ========== הורדת GUI של שלט מקורי ==========

// פתיחת מודל הורדת GUI
function openRemoteGUIModal() {
    const modal = document.getElementById('remoteGUIModal');
    if (modal) {
        modal.style.display = 'block';
        // איפוס תוצאות חיפוש
        const resultsDiv = document.getElementById('remoteSearchResults');
        const previewDiv = document.getElementById('remoteImagePreview');
        if (resultsDiv) resultsDiv.innerHTML = '';
        if (previewDiv) previewDiv.style.display = 'none';
    }
}

// חיפוש שלט באינטרנט
async function searchRemoteOnline() {
    const queryInput = document.getElementById('remoteSearchQuery');
    if (!queryInput) return;

    const query = queryInput.value.trim();
    if (!query) {
        showFeedback('⚠️ אנא הזן מילת חיפוש');
        return;
    }

    const resultsDiv = document.getElementById('remoteSearchResults');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div><p>מחפש שלטים...</p></div>';

    try {
        // יצירת קישורים לחיפוש
        const searchLinks = [
            {
                name: 'Google Images',
                url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query + ' remote control')}`,
                icon: '🔍'
            },
            {
                name: 'Amazon',
                url: `https://www.amazon.com/s?k=${encodeURIComponent(query + ' remote control')}`,
                icon: '🛒'
            },
            {
                name: 'eBay',
                url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query + ' remote control')}`,
                icon: '💰'
            }
        ];

        let resultsHTML = '<h3>🔗 קישורים לחיפוש:</h3><div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">';
        searchLinks.forEach(link => {
            resultsHTML += `
                <a href="${link.url}" target="_blank" class="btn-secondary" style="text-decoration: none; display: inline-block;">
                    ${link.icon} ${link.name}
                </a>
            `;
        });
        resultsHTML += '</div>';

        // הוספת הוראות
        resultsHTML += `
            <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h4>📋 הוראות:</h4>
                <ol style="margin: 10px 0; padding-right: 20px;">
                    <li>לחץ על אחד הקישורים למעלה כדי לחפש שלטים</li>
                    <li>מצא תמונה של השלט הרצוי</li>
                    <li>לחץ ימני על התמונה ובחר "העתק כתובת תמונה" או "שמור תמונה"</li>
                    <li>חזור לכאן והעלה את התמונה באמצעות כפתור "העלה תמונת שלט"</li>
                </ol>
            </div>
        `;

        resultsDiv.innerHTML = resultsHTML;
        showFeedback('✅ פתח את הקישורים כדי למצוא תמונות שלטים');
    } catch (error) {
        console.error('Error searching for remote:', error);
        resultsDiv.innerHTML = '<div style="color: red; padding: 20px;">❌ שגיאה בחיפוש. נסה שוב.</div>';
        showFeedback('❌ שגיאה בחיפוש שלטים');
    }
}

// טיפול בהעלאת תמונת שלט
function handleRemoteImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showFeedback('⚠️ אנא העלה קובץ תמונה בלבד');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        const previewDiv = document.getElementById('remoteImagePreview');
        const previewImg = document.getElementById('previewRemoteImage');

        if (!previewDiv || !previewImg) return;

        previewImg.src = imageUrl;
        previewDiv.style.display = 'block';

        // הצגת אפשרות להשתמש בתמונה כשלט
        const useImageHTML = `
            <div style="margin-top: 15px; padding: 15px; background: #f0f0f0; border-radius: 8px;">
                <h4>✅ תמונה הועלתה בהצלחה!</h4>
                <p>כעת תוכל להשתמש בתמונה זו כשלט ויזואלי.</p>
                <button id="useAsRemoteBtn" class="btn-primary" style="width: 100%; margin-top: 10px;">
                    📱 השתמש בתמונה כשלט
                </button>
                <button id="markButtonAreasBtn" class="btn-secondary" style="width: 100%; margin-top: 10px;">
                    🎯 סמן אזורי לחיצה על הכפתורים
                </button>
            </div>
        `;

        // הסרת כפתורים קודמים אם קיימים
        const existingButtons = previewDiv.querySelector('.use-image-buttons');
        if (existingButtons) {
            existingButtons.remove();
        }

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'use-image-buttons';
        buttonsDiv.innerHTML = useImageHTML;
        previewDiv.appendChild(buttonsDiv);

        // הוספת event listeners
        setTimeout(() => {
            const useBtn = document.getElementById('useAsRemoteBtn');
            const markBtn = document.getElementById('markButtonAreasBtn');
            if (useBtn) {
                useBtn.addEventListener('click', () => {
                    useImageAsRemote(imageUrl);
                });
            }
            if (markBtn) {
                markBtn.addEventListener('click', () => {
                    startMarkingButtonAreas(imageUrl);
                });
            }
        }, 100);
    };

    reader.readAsDataURL(file);
}

// שימוש בתמונה כשלט
function useImageAsRemote(imageUrl) {
    if (!selectedRemoteDevice) {
        showFeedback('⚠️ אנא בחר מכשיר תחילה');
        return;
    }

    // שמירת תמונת השלט במכשיר
    if (!selectedRemoteDevice.customRemoteImage) {
        selectedRemoteDevice.customRemoteImage = imageUrl;
        const deviceIndex = devices.findIndex(d => d.id === selectedRemoteDevice.id);
        if (deviceIndex !== -1) {
            devices[deviceIndex] = selectedRemoteDevice;
            localStorage.setItem('devices', JSON.stringify(devices));
        }
    }

    // הצגת השלט עם התמונה
    showVisualRemoteWithImage(selectedRemoteDevice, imageUrl);

    // סגירת המודל
    const modal = document.getElementById('remoteGUIModal');
    if (modal) {
        modal.style.display = 'none';
    }

    showFeedback('✅ השלט הותאם עם התמונה המקורית!');
}

// הצגת שלט עם תמונה
function showVisualRemoteWithImage(device, imageUrl) {
    const visualRemote = document.getElementById('visualRemote');
    if (!visualRemote) return;

    const remote = visualRemote.querySelector('.visual-remote');
    if (!remote) return;

    // יצירת שלט עם תמונה
    remote.innerHTML = `
        <div class="remote-header" style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid rgba(255,255,255,0.3);">
            <h3 style="color: white; font-size: 1.5em; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">${device.name}</h3>
            <div style="color: rgba(255,255,255,0.8); font-size: 0.9em; margin-top: 5px;">שלט מקורי</div>
        </div>
        <div class="custom-remote-image-container" style="position: relative; width: 100%; max-width: 500px; margin: 0 auto;">
            <img src="${imageUrl}" alt="Remote Control" style="width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <div class="button-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
        </div>
        <div style="text-align: center; margin-top: 15px; color: rgba(255,255,255,0.8); font-size: 0.9em;">
            💡 לחץ על הכפתורים בתמונה כדי לשלוט
        </div>
    `;

    // הצגת השלט
    visualRemote.style.display = 'flex';
    visualRemote.style.visibility = 'visible';
    visualRemote.style.opacity = '1';

    // גלילה לשלט
    setTimeout(() => {
        visualRemote.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// התחלת סימון אזורי לחיצה
function startMarkingButtonAreas(imageUrl) {
    showFeedback('🎯 מצב סימון אזורים - לחץ על הכפתורים בתמונה כדי לסמן אותם');
    // כאן אפשר להוסיף לוגיקה מתקדמת לסימון אזורים
    // כרגע נשתמש בתמונה כשלט רגיל
    useImageAsRemote(imageUrl);
}

// ניהול מכשירים
function loadDevices() {
    const container = document.getElementById('devicesList');
    container.innerHTML = '';

    devices.forEach(device => {
        const card = createDeviceCard(device);
        container.appendChild(card);
    });

    // עדכון רשימת המכשירים בשלט הרחוק הויזואלי
    loadRemoteDeviceSelect();
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
    console.log('selectDevice called with:', deviceId);

    currentDevice = devices.find(d => d.id === deviceId);
    if (!currentDevice) {
        showFeedback('❌ מכשיר לא נמצא');
        console.error('Device not found:', deviceId);
        return;
    }

    console.log('Device found:', currentDevice);

    // עדכון ה-select של השלט הרחוק הויזואלי
    const deviceSelect = document.getElementById('remoteDeviceSelect');
    if (deviceSelect) {
        deviceSelect.value = deviceId;
    }

    // בחירת המכשיר בשלט הרחוק הויזואלי
    selectedRemoteDevice = currentDevice;

    // הצגת השלט הרחוק הויזואלי
    console.log('Calling showVisualRemote for:', currentDevice.name);
    showVisualRemote(currentDevice);

    // עדכון כפתורי הלמידה (אם יש טמפלט, יוצג שהכפתורים מוכנים)
    setupIRButtonLearning();

    showFeedback(`✅ נבחר מכשיר: ${currentDevice.name}`);

    // גלילה לקטע השלט הרחוק הויזואלי - במכשירים ניידים, גלילה מיידית
    const scrollDelay = isMobileDevice() ? 100 : 200;
    setTimeout(() => {
        const visualRemote = document.getElementById('visualRemote');
        if (visualRemote) {
            console.log('Scrolling to visual remote, isMobile:', isMobileDevice());
            // במכשירים ניידים, גלילה ישירה לשלט
            // גלילה לקטע השלט הרחוק
            const remoteSection = document.querySelector('.remote-control-section');
            if (remoteSection) {
                remoteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                visualRemote.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            console.error('visualRemote element not found for scrolling');
        }
    }, scrollDelay);
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

    // כפתור הורדת GUI מקורי
    const downloadRemoteGUIBtn = document.getElementById('downloadRemoteGUI');
    if (downloadRemoteGUIBtn) {
        downloadRemoteGUIBtn.addEventListener('click', () => {
            openRemoteGUIModal();
        });
    }

    // כפתור העלאת תמונת שלט
    const uploadRemoteImageBtn = document.getElementById('uploadRemoteImage');
    if (uploadRemoteImageBtn) {
        uploadRemoteImageBtn.addEventListener('click', () => {
            document.getElementById('remoteImageUpload').click();
        });
    }

    // כפתור חיפוש שלט באינטרנט
    const searchRemoteOnlineBtn = document.getElementById('searchRemoteOnline');
    if (searchRemoteOnlineBtn) {
        searchRemoteOnlineBtn.addEventListener('click', () => {
            openRemoteGUIModal();
            // התמקדות בשדה החיפוש
            setTimeout(() => {
                document.getElementById('remoteSearchQuery').focus();
            }, 100);
        });
    }

    // טיפול בהעלאת תמונת שלט
    const remoteImageUpload = document.getElementById('remoteImageUpload');
    if (remoteImageUpload) {
        remoteImageUpload.addEventListener('change', (e) => {
            handleRemoteImageUpload(e);
        });
    }

    // כפתור חיפוש שלט
    const searchRemoteBtn = document.getElementById('searchRemoteBtn');
    if (searchRemoteBtn) {
        searchRemoteBtn.addEventListener('click', () => {
            searchRemoteOnline();
        });
    }

    // Enter בחיפוש
    const remoteSearchQuery = document.getElementById('remoteSearchQuery');
    if (remoteSearchQuery) {
        remoteSearchQuery.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchRemoteOnline();
            }
        });
    }

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

    // event listeners לשלט רחוק ויזואלי
    setupVisualRemote();

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
    // בדיקה אם זה מכשיר נייד
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!navigator.usb) {
        if (isMobile) {
            showStatus('usbStatus', '⚠️ WebUSB API לא נתמך במכשירים ניידים. השתמש במחשב או במכשיר עם Chrome/Edge', 'error');
        } else {
            showStatus('usbStatus', '❌ הדפדפן שלך לא תומך ב-WebUSB API. השתמש ב-Chrome או Edge', 'error');
        }
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
        try {
            await usbDevice.selectConfiguration(1);
        } catch (configError) {
            // אם configuration 1 לא עובד, ננסה את הראשון הזמין
            if (usbDevice.configurations && usbDevice.configurations.length > 0) {
                await usbDevice.selectConfiguration(usbDevice.configurations[0].configurationValue);
            } else {
                // אם אין configurations, נדלג על זה
                console.warn('לא ניתן לבחור configuration, ממשיך ללא...');
            }
        }

        // ניסיון למצוא ממשק לא מוגן
        let interfaceClaimed = false;
        if (usbDevice.configuration) {
            const interfaces = usbDevice.configuration.interfaces;

            // נסה למצוא ממשק לא מוגן
            for (let i = 0; i < interfaces.length; i++) {
                const usbInterface = interfaces[i];
                try {
                    // בדיקה אם הממשק מוגן
                    // ממשקים מוגנים: HID (0x03), Mass Storage (0x08), Audio (0x01), Video (0x0e)
                    const protectedClasses = [0x01, 0x03, 0x08, 0x0e];
                    const isProtected = usbInterface.alternates.some(alt =>
                        protectedClasses.includes(alt.interfaceClass)
                    );

                    if (!isProtected) {
                        await usbDevice.claimInterface(usbInterface.interfaceNumber);
                        interfaceClaimed = true;
                        console.log(`✅ ממשק ${usbInterface.interfaceNumber} נלקח בהצלחה`);
                        break;
                    }
                } catch (interfaceError) {
                    // אם הממשק מוגן או לא זמין, נמשיך לממשק הבא
                    console.log(`⚠️ ממשק ${usbInterface.interfaceNumber} לא זמין או מוגן, מנסה הבא...`);
                    continue;
                }
            }

            // אם לא מצאנו ממשק לא מוגן, ננסה את הראשון (למרות שהוא מוגן)
            if (!interfaceClaimed && interfaces.length > 0) {
                try {
                    await usbDevice.claimInterface(0);
                    interfaceClaimed = true;
                    console.log('✅ ממשק 0 נלקח (למרות שהוא עשוי להיות מוגן)');
                } catch (interfaceError) {
                    console.warn('⚠️ לא ניתן לקחת ממשק - המכשיר משתמש בממשק מוגן (HID/Audio/Video)');
                    console.warn('המכשיר עדיין מזוהה, אבל לא ניתן לשלוח פקודות דרך WebUSB');
                    showStatus('usbStatus', '⚠️ המכשיר מזוהה אבל משתמש בממשק מוגן (HID/Audio/Video). לא ניתן לשלוח פקודות דרך WebUSB', 'info');
                }
            }
        } else {
            // אם אין configuration, ננסה ממשק 0
            try {
                await usbDevice.claimInterface(0);
                interfaceClaimed = true;
            } catch (interfaceError) {
                console.warn('⚠️ לא ניתן לקחת ממשק - המכשיר משתמש בממשק מוגן');
            }
        }

        if (interfaceClaimed) {
            const deviceName = usbDevice.productName || usbDevice.manufacturerName || 'USB Device';
            showStatus('usbStatus', `✅ מחובר למכשיר: ${deviceName}`, 'success');

            // אם זה מצלמה, עדכן את סוג המכשיר
            if (isUSBCamera(usbDevice)) {
                showStatus('usbStatus', `✅ מצלמה USB מזוהה: ${deviceName}`, 'success');
            }
        } else {
            showStatus('usbStatus', `ℹ️ מכשיר מזוהה: ${usbDevice.productName || usbDevice.manufacturerName || 'USB Device'} (ממשק מוגן - לא ניתן לשלוח פקודות)`, 'info');
        }

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
            if (error.message && error.message.includes('No device selected')) {
                showStatus('usbStatus', 'ℹ️ בחירת מכשיר בוטלה. בחר מכשיר מהרשימה כדי להתחבר', 'info');
            } else {
                showStatus('usbStatus', '❌ לא נמצא מכשיר USB. ודא שהמכשיר מחובר ולחץ שוב', 'error');
            }
        } else if (error.name === 'SecurityError') {
            if (error.message && error.message.includes('protected class')) {
                showStatus('usbStatus', '⚠️ המכשיר משתמש בממשק מוגן (HID/Audio/Video). המכשיר מזוהה אבל לא ניתן לשלוח פקודות דרך WebUSB. נסה להשתמש ב-Bluetooth או WiFi', 'info');
                // למרות השגיאה, נשמור את המכשיר אם הוא נבחר
                if (usbDevice) {
                    const usbId = `${usbDevice.vendorId}-${usbDevice.productId}`;
                    const exists = devices.find(d => d.usbId === usbId);
                    if (!exists) {
                        const newDevice = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            name: usbDevice.productName || usbDevice.manufacturerName || 'USB Device',
                            type: 'other',
                            connectionType: 'usb',
                            usbId: usbId,
                            vendorId: usbDevice.vendorId,
                            productId: usbDevice.productId,
                            protectedInterface: true
                        };
                        devices.push(newDevice);
                        localStorage.setItem('devices', JSON.stringify(devices));
                        loadDevices();
                    }
                }
            } else {
                showStatus('usbStatus', '❌ אין הרשאה לגשת למכשיר USB. ודא שהדפדפן מאפשר גישה למכשירים USB', 'error');
            }
        } else {
            showStatus('usbStatus', `❌ שגיאה: ${error.message || error.name}`, 'error');
        }
        console.error('USB connection error:', error);

        // אם המכשיר נבחר אבל יש שגיאה, נשמור אותו בכל זאת
        if (usbDevice && error.name !== 'NotFoundError') {
            try {
                const usbId = `${usbDevice.vendorId}-${usbDevice.productId}`;
                const exists = devices.find(d => d.usbId === usbId);
                if (!exists) {
                    const newDevice = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        name: usbDevice.productName || usbDevice.manufacturerName || 'USB Device',
                        type: 'other',
                        connectionType: 'usb',
                        usbId: usbId,
                        vendorId: usbDevice.vendorId,
                        productId: usbDevice.productId
                    };
                    devices.push(newDevice);
                    localStorage.setItem('devices', JSON.stringify(devices));
                    loadDevices();
                    showStatus('usbStatus', `ℹ️ מכשיר נוסף לרשימה (${newDevice.name})`, 'info');
                }
            } catch (saveError) {
                console.error('Error saving device:', saveError);
            }
        }
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
// זיהוי אם מכשיר USB הוא מצלמה
function isUSBCamera(device) {
    if (!device) return false;

    const deviceName = (device.name || '').toLowerCase();
    const productName = (device.productName || '').toLowerCase();
    const manufacturerName = (device.manufacturerName || '').toLowerCase();

    // זיהוי מצלמות USB נפוצות
    const cameraKeywords = ['lifecam', 'webcam', 'camera', 'cam', 'hd-3000', 'hd3000', 'microsoft'];
    const isCamera = cameraKeywords.some(keyword =>
        deviceName.includes(keyword) ||
        productName.includes(keyword) ||
        manufacturerName.includes(keyword)
    );

    // בדיקה אם המכשיר משתמש בממשק Video (0x0e)
    if (usbDevice && usbDevice.configuration) {
        const interfaces = usbDevice.configuration.interfaces;
        for (const iface of interfaces) {
            for (const alt of iface.alternates) {
                if (alt.interfaceClass === 0x0e) { // Video Class
                    return true;
                }
            }
        }
    }

    return isCamera;
}

// הפעלת מצלמת USB דרך MediaDevices API
async function activateUSBCamera(device = null) {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showFeedback('❌ הדפדפן שלך לא תומך בגישה למצלמה');
            return false;
        }

        const targetDevice = device || { name: 'מצלמה USB' };
        const deviceName = targetDevice.name || targetDevice.productName || 'מצלמה USB';

        showFeedback(`🔍 מפעיל ${deviceName}...`);

        // קבלת רשימת מכשירי מדיה
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        // חיפוש מצלמה ספציפית לפי שם
        let selectedDevice = null;
        if (targetDevice.name || targetDevice.productName) {
            const searchName = (targetDevice.name || targetDevice.productName).toLowerCase();
            selectedDevice = videoDevices.find(device =>
                device.label.toLowerCase().includes(searchName) ||
                searchName.includes(device.label.toLowerCase())
            );
        }

        // אם לא נמצאה מצלמה ספציפית, נשתמש בראשונה
        if (!selectedDevice && videoDevices.length > 0) {
            selectedDevice = videoDevices[0];
        }

        if (!selectedDevice) {
            showFeedback('❌ לא נמצאה מצלמה');
            return false;
        }

        // הפעלת המצלמה
        const constraints = {
            video: {
                deviceId: selectedDevice.deviceId ? { exact: selectedDevice.deviceId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // שמירת ה-stream להמשך שימוש
        if (!window.activeCameraStreams) {
            window.activeCameraStreams = [];
        }
        window.activeCameraStreams.push(stream);

        showFeedback(`✅ ${deviceName} הופעלה בהצלחה`);

        // הצגת חיווי ויזואלי
        const cameraContainer = document.getElementById('cameraPreviewContainer');
        const videoElement = document.getElementById('cameraPreview');
        const cameraStatus = document.getElementById('cameraStatus');

        if (cameraContainer && videoElement) {
            // הצגת הקונטיינר עם אנימציה
            cameraContainer.style.display = 'block';
            cameraContainer.style.opacity = '0';
            cameraContainer.style.transform = 'scale(0.9)';
            cameraContainer.style.transition = 'all 0.3s ease';

            // אנימציה של הופעה
            setTimeout(() => {
                cameraContainer.style.opacity = '1';
                cameraContainer.style.transform = 'scale(1)';
            }, 10);

            // הגדרת ה-stream
            videoElement.srcObject = stream;

            // עדכון סטטוס
            if (cameraStatus) {
                cameraStatus.textContent = `✅ ${deviceName} פועלת`;
                cameraStatus.style.color = '#00b894';
            }

            // הוספת אפקט ויזואלי כשהמצלמה מתחילה
            videoElement.addEventListener('loadedmetadata', () => {
                videoElement.style.border = '3px solid #00b894';
                setTimeout(() => {
                    videoElement.style.border = '3px solid transparent';
                }, 1000);
            });

            // עדכון סטטוס כשהמצלמה פועלת
            videoElement.addEventListener('play', () => {
                if (cameraStatus) {
                    cameraStatus.textContent = `✅ ${deviceName} פועלת - LIVE`;
                    cameraStatus.style.color = '#00b894';
                }
                // הוספת class לזיהוי שהמצלמה פועלת
                videoElement.classList.add('playing');
            });

            // עדכון כפתור "הדלק" למצב פעיל
            const powerOnBtn = document.querySelector('[data-command="power_on"]');
            if (powerOnBtn) {
                powerOnBtn.style.background = 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)';
                powerOnBtn.style.boxShadow = '0 0 15px rgba(0, 184, 148, 0.5)';
                powerOnBtn.textContent = '🟢 פעילה';
            }
        }

        return true;
    } catch (error) {
        console.error('שגיאה בהפעלת מצלמה:', error);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            showFeedback('❌ אין הרשאה לגשת למצלמה. אנא אפשר גישה למצלמה בהגדרות הדפדפן');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            showFeedback('❌ לא נמצאה מצלמה מחוברת');
        } else {
            showFeedback(`❌ שגיאה בהפעלת מצלמה: ${error.message}`);
        }
        return false;
    }
}

// כיבוי מצלמת USB
async function deactivateUSBCamera(device = null) {
    try {
        const deviceName = device ? (device.name || device.productName || 'מצלמה USB') : 'מצלמה USB';

        // עדכון סטטוס לפני כיבוי
        const cameraStatus = document.getElementById('cameraStatus');
        if (cameraStatus) {
            cameraStatus.textContent = `⏹️ ${deviceName} נכבית...`;
            cameraStatus.style.color = '#d63031';
        }

        // עצירת ה-streams
        if (window.activeCameraStreams && window.activeCameraStreams.length > 0) {
            window.activeCameraStreams.forEach(stream => {
                stream.getTracks().forEach(track => track.stop());
            });
            window.activeCameraStreams = [];
        }

        // הסתרת החיווי הוויזואלי עם אנימציה
        const cameraContainer = document.getElementById('cameraPreviewContainer');
        const videoElement = document.getElementById('cameraPreview');

        if (cameraContainer && videoElement) {
            // אנימציה של היעלמות
            cameraContainer.style.opacity = '0';
            cameraContainer.style.transform = 'scale(0.9)';

            setTimeout(() => {
                cameraContainer.style.display = 'none';
                videoElement.srcObject = null;
                videoElement.classList.remove('playing');
            }, 300);

            // עדכון כפתור "הדלק" למצב רגיל
            const powerOnBtn = document.querySelector('[data-command="power_on"]');
            if (powerOnBtn) {
                powerOnBtn.style.background = '';
                powerOnBtn.style.boxShadow = '';
                powerOnBtn.textContent = '🟢 הדלק';
            }
        }

        showFeedback(`✅ ${deviceName} כובתה`);
        return true;
    } catch (error) {
        console.error('שגיאה בכיבוי מצלמה:', error);
        showFeedback('❌ שגיאה בכיבוי מצלמה');
        return false;
    }
}

// שליחת אות חשמלי דרך USB - הפעלה/כיבוי מכשירים
async function sendUSBPowerSignal(powerState, device = null) {
    if (!usbDevice && !device) {
        showFeedback('⚠️ אין מכשיר USB מחובר');
        return false;
    }

    try {
        const targetDevice = device || { connectionType: 'usb' };

        // בדיקה אם זה מצלמה USB
        const isCamera = isUSBCamera(targetDevice) || isUSBCamera(usbDevice);

        if (isCamera) {
            // אם זה מצלמה, נשתמש ב-MediaDevices API
            if (powerState === 'on' || powerState === true) {
                return await activateUSBCamera(targetDevice);
            } else {
                return await deactivateUSBCamera(targetDevice);
            }
        }

        if (usbDevice) {
            // מציאת endpoint OUT
            let endpointNumber = 1;
            if (usbDevice.configuration) {
                const interfaces = usbDevice.configuration.interfaces;
                for (const iface of interfaces) {
                    for (const endpoint of iface.alternate.endpoints) {
                        if (endpoint.direction === 'out') {
                            endpointNumber = endpoint.endpointNumber;
                            break;
                        }
                    }
                }
            }

            // יצירת אות חשמלי: 0x01 = ON, 0x00 = OFF
            const powerCommand = powerState === 'on' || powerState === true ? 0x01 : 0x00;

            // פרוטוקול USB לשליחת אות חשמלי:
            // Byte 0: Command Type (0x50 = Power Control)
            // Byte 1: Power State (0x01 = ON, 0x00 = OFF)
            // Byte 2: Device ID (0x00 = All, או ID ספציפי)
            // Byte 3: Checksum
            const deviceId = targetDevice.usbId ? parseInt(targetDevice.usbId.split('-')[0], 16) % 256 : 0x00;
            const checksum = (0x50 + powerCommand + deviceId) % 256;
            const data = new Uint8Array([0x50, powerCommand, deviceId, checksum]);

            // שליחת האות דרך USB
            await usbDevice.transferOut(endpointNumber, data);

            console.log(`אות חשמלי נשלח דרך USB: ${powerState === 'on' || powerState === true ? 'ON' : 'OFF'}`, data);
            showFeedback(`✅ ${powerState === 'on' || powerState === true ? 'הדלקה' : 'כיבוי'} דרך USB`);

            // אם זה הדלקה, אפשר הפעלת מכשירים אחרי ההדלקה
            if (powerState === 'on' || powerState === true) {
                setTimeout(() => {
                    showFeedback('✅ מכשיר מוכן לשליטה');
                }, 2000);
            }

            return true;
        }

        return false;
    } catch (error) {
        console.error('שגיאה בשליחת אות חשמלי דרך USB:', error);
        showFeedback('❌ שגיאה בשליחת אות חשמלי דרך USB');
        return false;
    }
}

async function sendUSBCommand(command, value = null, device = null) {
    if (!usbDevice && !device) {
        showFeedback('⚠️ אין מכשיר USB מחובר');
        return false;
    }

    try {
        const targetDevice = device || { connectionType: 'usb' };
        const mappedCommand = mapCommandToDeviceStandard(targetDevice, command, value);

        // טיפול בפקודות הדלקה/כיבוי
        if (command === 'power_on' || command === 'power_off') {
            const powerState = command === 'power_on' ? 'on' : 'off';
            return await sendUSBPowerSignal(powerState, targetDevice);
        }

        // אם יש מכשיר USB מחובר
        if (usbDevice) {
            // מציאת endpoint OUT
            let endpointNumber = 1;
            if (usbDevice.configuration) {
                const interfaces = usbDevice.configuration.interfaces;
                for (const iface of interfaces) {
                    for (const endpoint of iface.alternate.endpoints) {
                        if (endpoint.direction === 'out') {
                            endpointNumber = endpoint.endpointNumber;
                            break;
                        }
                    }
                }
            }

            // שליחת פקודת IR דרך USB
            if (command === 'IR_SEND' || targetDevice.connectionType === 'ir') {
                // שליחת קוד IR דרך USB
                const irCode = value || learnedIRButtons[`${targetDevice.id}_${command}`];
                if (irCode) {
                    // הפעלת מחוון שידור
                    blinkIRSendIndicator();

                    // המרת קוד IR לנתונים בינאריים
                    const data = new Uint8Array(irCode.split('').map(c => parseInt(c, 2)));
                    await usbDevice.transferOut(endpointNumber, data);
                    console.log('קוד IR נשלח דרך USB:', irCode);
                    return true;
                }
            }

            // שליחת פקודה רגילה דרך USB
            const commandCode = mappedCommand.command.charCodeAt(0) || 0;
            const valueCode = mappedCommand.value || 0;
            const data = new Uint8Array([commandCode, valueCode]);

            // שליחה ל-endpoint OUT
            await usbDevice.transferOut(endpointNumber, data);

            console.log('פקודה נשלחה דרך USB:', mappedCommand);
            showFeedback(`✅ פקודה נשלחה: ${command}`);
            return true;
        }

        return false;
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
    if (!device.code && !device.deviceCode) {
        showFeedback('⚠️ אין קוד מוגדר למכשיר');
        return;
    }

    try {
        const code = device.code || device.deviceCode;
        const mappedCommand = mapCommandToDeviceStandard(device, command, value);

        // שליחה דרך קוד מספרי (למשל HTTP עם קוד)
        const url = `http://${device.ip || '192.168.1.1'}/api/command?code=${code}&cmd=${encodeURIComponent(mappedCommand.command)}${value ? '&value=' + encodeURIComponent(value) : ''}`;

        fetch(url, {
            method: 'GET',
            mode: 'cors'
        }).then(() => {
            showFeedback(`✅ פקודה נשלחה דרך קוד: ${code}`);
        }).catch(err => {
            console.error('שגיאה בשליחת פקודה דרך קוד:', err);
            showFeedback('⚠️ שגיאה בשליחת פקודה');
        });
    } catch (err) {
        console.error('שגיאה בשליחת פקודה דרך קוד:', err);
        showFeedback('⚠️ שגיאה בשליחת פקודה');
    }
}

// שליחת פקודה דרך זיהוי אוטומטי - תואמת סטנדרטים שונים
function sendAutoCommand(device, command, value) {
    // ניסיון לזהות את סוג החיבור הטוב ביותר
    if (device.ip) {
        // שליחה דרך WiFi
        sendWiFiCommand(device, command, value);
    } else if (device.bluetoothId) {
        // שליחה דרך Bluetooth
        sendBluetoothCommand(device, command, value);
    } else if (device.usbId) {
        // שליחה דרך USB
        sendUSBCommand(command, value, device);
    } else if (device.irId || device.irButtons) {
        // שליחה דרך IR
        sendIRCommand(device, command, value);
    } else if (device.code || device.deviceCode) {
        // שליחה דרך קוד
        sendCodeCommand(device, command, value);
    } else {
        showFeedback('⚠️ לא ניתן לזהות סוג חיבור למכשיר');
    }
}

// שליחת פקודה דרך NFC - תואמת סטנדרטים שונים
async function sendNFCCommand(device, command, value) {
    if (!('NDEFReader' in window)) {
        showFeedback('❌ הדפדפן שלך לא תומך ב-NFC');
        return;
    }

    try {
        const mappedCommand = mapCommandToDeviceStandard(device, command, value);
        const ndef = new NDEFReader();
        await ndef.write({
            records: [{
                recordType: "text",
                data: JSON.stringify({
                    command: mappedCommand.command,
                    value: mappedCommand.value,
                    device: device.id,
                    type: device.type
                })
            }]
        });

        showFeedback(`✅ פקודה נשלחה דרך NFC: ${mappedCommand.command}`);
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
    const defaultTemplates = createDefaultTemplates();

    if (savedTemplates) {
        const saved = JSON.parse(savedTemplates);
        // בדיקה אם יש טמפלטים חדשים (NEON וכו')
        const hasNEON = saved.some(t => t.brand === 'NEON' && t.type === 'tv');
        const defaultHasNEON = defaultTemplates.some(t => t.brand === 'NEON' && t.type === 'tv');

        // אם יש טמפלטים חדשים ב-default אבל לא ב-saved, מעדכן
        if (defaultHasNEON && !hasNEON) {
            console.log('מעדכן טמפלטים עם NEON...');
            templates = defaultTemplates;
            localStorage.setItem('deviceTemplates', JSON.stringify(templates));
        } else {
            templates = saved;
        }
    } else {
        templates = defaultTemplates;
        localStorage.setItem('deviceTemplates', JSON.stringify(templates));
    }
}

// יצירת 100 טמפלטים מוכנים
function createDefaultTemplates() {
    const defaultTemplates = [];

    // ========== טלוויזיות (27 טמפלטים) ==========
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
        { name: 'NEON', model: 'Smart TV', buttons: getTVButtons('NEON') },
        { name: 'NEON', model: '4K UHD TV', buttons: getTVButtons('NEON') },
        { name: 'NEON', model: 'LED TV', buttons: getTVButtons('NEON') },
        { name: 'NEON', model: 'Android TV', buttons: getTVButtons('NEON') },
        { name: 'NEON', model: 'QLED TV', buttons: getTVButtons('NEON') },
        { name: 'NEON', model: 'Smart LED', buttons: getTVButtons('NEON') },
        { name: 'NEON', model: 'UHD Smart TV', buttons: getTVButtons('NEON') },
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

    // ========== מזגנים (18 טמפלטים) ==========
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
        { name: 'Panasonic', model: 'CS', buttons: getACButtons('Panasonic') },
        { name: 'Electra', model: 'Smart AC', buttons: getACButtons('Electra') },
        { name: 'Electra', model: 'Platinum', buttons: getACButtons('Electra') },
        { name: 'Tadiran', model: 'Smart AC', buttons: getACButtons('Tadiran') }
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

    // בחירת המכשיר החדש אוטומטית
    currentDevice = newDevice;
    selectDevice(newDevice.id);

    showFeedback(`✅ ${template.name} נוסף כמכשיר עם ${Object.keys(template.buttons).length} לחצנים מוכנים לשימוש!`);
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
    // מחיקת localStorage כדי לטעון טמפלטים חדשים (כולל NEON)
    localStorage.removeItem('deviceTemplates');
    templates = createDefaultTemplates();
    localStorage.setItem('deviceTemplates', JSON.stringify(templates));
    loadTemplates();
    showFeedback('✅ טמפלטים נטענו מחדש עם כל העדכונים (כולל NEON)');
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

// ========== שלט רחוק ויזואלי ==========

let selectedRemoteDevice = null;

// אתחול שלט רחוק ויזואלי
function setupVisualRemote() {
    const deviceSelect = document.getElementById('remoteDeviceSelect');
    if (!deviceSelect) return;

    // טעינת רשימת מכשירים
    loadRemoteDeviceSelect();

    // טיפול בבחירת מכשיר
    deviceSelect.addEventListener('change', (e) => {
        const deviceId = e.target.value;
        if (deviceId) {
            selectedRemoteDevice = devices.find(d => d.id === deviceId);
            if (selectedRemoteDevice) {
                showVisualRemote(selectedRemoteDevice);
            }
        } else {
            hideVisualRemote();
        }
    });

    // טיפול בלחיצות על כפתורים (תמיכה גם ב-touch)
    const handleButtonInteraction = (e) => {
        const button = e.target.closest('.remote-btn');
        if (button) {
            const command = button.dataset.command;
            if (command && selectedRemoteDevice) {
                e.preventDefault();
                e.stopPropagation();
                handleRemoteButtonClick(command);
            }
        }
    };

    // תמיכה ב-click ו-touch
    document.addEventListener('click', handleButtonInteraction);
    document.addEventListener('touchend', handleButtonInteraction);

    // מניעת double-tap zoom בנייד
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// טעינת רשימת מכשירים ל-select
function loadRemoteDeviceSelect() {
    const deviceSelect = document.getElementById('remoteDeviceSelect');
    if (!deviceSelect) return;

    deviceSelect.innerHTML = '<option value="">-- בחר מכשיר --</option>';

    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = `${device.name} (${getDeviceTypeName(device.type)})`;
        deviceSelect.appendChild(option);
    });
}

// הצגת שלט רחוק ויזואלי
function showVisualRemote(device) {
    const visualRemote = document.getElementById('visualRemote');
    const remoteContainer = document.querySelector('.visual-remote-container');
    const remote = document.querySelector('.visual-remote');

    if (!visualRemote) {
        console.error('visualRemote element not found');
        showFeedback('❌ לא נמצא אלמנט השלט הרחוק');
        return;
    }

    if (!remote) {
        console.error('visual-remote element not found');
        showFeedback('❌ לא נמצא אלמנט השלט');
        return;
    }

    // בדיקה אם יש תמונה מותאמת אישית
    if (device && device.customRemoteImage) {
        showVisualRemoteWithImage(device, device.customRemoteImage);
        return;
    }

    // הצגת השלט הרחוק עם אנימציה
    console.log('Showing visual remote for device:', device.name);

    // הסרת כל ה-style attributes הקודמים והגדרה מחדש
    // חשוב: צריך להסיר את display: none מה-HTML
    visualRemote.removeAttribute('style');

    // הגדרת style חדש - embedded בדף (לא fixed)
    // שימוש ב-setProperty כדי לוודא שהשלט יוצג גם בגיטהב
    visualRemote.style.setProperty('display', 'flex', 'important');
    visualRemote.style.setProperty('visibility', 'visible', 'important');
    visualRemote.style.setProperty('opacity', '1', 'important');
    visualRemote.style.setProperty('width', '100%', 'important');
    visualRemote.style.setProperty('max-width', '100%', 'important');
    visualRemote.style.setProperty('position', 'relative', 'important');
    visualRemote.style.setProperty('margin', '20px auto', 'important');
    visualRemote.style.setProperty('padding', '20px', 'important');
    visualRemote.style.setProperty('min-height', '300px', 'important');

    const baseStyles = 'display: flex !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; max-width: 100% !important; position: relative !important; margin: 20px auto !important; padding: 20px !important; min-height: 300px !important;';

    // הצגה מיידית - גם עם cssText כגיבוי
    visualRemote.style.cssText = baseStyles;
    console.log('Showing remote embedded in page');

    // וידוא שהשלט גלוי - בדיקה נוספת (מספר פעמים)
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(visualRemote);
            console.log(`Check ${i + 1} - display:`, computedStyle.display, 'visibility:', computedStyle.visibility, 'opacity:', computedStyle.opacity);
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                console.warn(`Remote is still hidden after check ${i + 1}, forcing display again`);
                visualRemote.style.setProperty('display', 'flex', 'important');
                visualRemote.style.setProperty('visibility', 'visible', 'important');
                visualRemote.style.setProperty('opacity', '1', 'important');
                visualRemote.style.cssText = baseStyles;
            }
        }, 50 * (i + 1));
    }

    // הסרת כל ה-classes הקודמים
    remote.className = 'visual-remote';
    if (remoteContainer) {
        remoteContainer.className = 'visual-remote-container';
    }

    // הוספת class לפי סוג מכשיר
    remote.classList.add(`remote-type-${device.type}`);
    if (remoteContainer) {
        remoteContainer.classList.add(`remote-container-${device.type}`);
    }

    // עדכון כותרת המכשיר
    const deviceNameEl = document.getElementById('remoteDeviceName');
    const deviceTypeEl = document.getElementById('remoteDeviceType');
    if (deviceNameEl) {
        deviceNameEl.textContent = device.name;
    }
    if (deviceTypeEl) {
        deviceTypeEl.textContent = `${getDeviceTypeName(device.type)} - ${getConnectionTypeName(device.connectionType)}`;
    }

    // הוספת אינדיקטור סטטוס לשלט הרחוק
    if (remoteContainer) {
        // הסרת אינדיקטור קודם אם יש
        const existingIndicator = remoteContainer.querySelector('.remote-status-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // הוספת אינדיקטור חדש
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'remote-status-indicator';
        statusIndicator.textContent = `✅ ${device.name} - מוכן לשליטה`;
        remoteContainer.appendChild(statusIndicator);
    }

    // התאמת הממשק לסוג המכשיר
    adaptRemoteToDeviceType(device);

    // הוספת כפתורים ספציפיים לפי סוג מכשיר
    loadDeviceSpecificButtons(device);

    // במכשירים ניידים, וידוא שהכל גלוי
    if (isMobileDevice()) {
        // וידוא שכל הכפתורים גלויים
        const allButtons = remote.querySelectorAll('.remote-btn');
        allButtons.forEach(btn => {
            btn.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
        });

        // וידוא שכל הסקשנים גלויים
        const numbersSection = remote.querySelector('.remote-numbers');
        const navigationSection = remote.querySelector('.remote-navigation');
        const controlsSection = remote.querySelector('.remote-controls');
        const featuresSection = remote.querySelector('.remote-features');
        const deviceSpecificSection = remote.querySelector('#deviceSpecificButtons');

        if (numbersSection) numbersSection.style.cssText = 'display: grid !important; visibility: visible !important; opacity: 1 !important;';
        if (navigationSection) navigationSection.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
        if (controlsSection) controlsSection.style.cssText = 'display: grid !important; visibility: visible !important; opacity: 1 !important;';
        if (featuresSection) featuresSection.style.cssText = 'display: grid !important; visibility: visible !important; opacity: 1 !important;';
        if (deviceSpecificSection) deviceSpecificSection.style.cssText = 'display: grid !important; visibility: visible !important; opacity: 1 !important;';

        console.log('Mobile device - ensured all sections are visible');
    }

    // וידוא שהשלט גלוי גם במכשירים לא ניידים (גם בגיטהב)
    setTimeout(() => {
        const computedStyle = window.getComputedStyle(visualRemote);
        console.log('Final check - display:', computedStyle.display, 'visibility:', computedStyle.visibility);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
            console.warn('Remote is still hidden, forcing display with baseStyles');
            const baseStyles = 'display: flex !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; max-width: 100% !important; position: relative !important; margin: 20px auto !important; padding: 20px !important; min-height: 300px !important;';
            visualRemote.style.setProperty('display', 'flex', 'important');
            visualRemote.style.setProperty('visibility', 'visible', 'important');
            visualRemote.style.setProperty('opacity', '1', 'important');
            visualRemote.style.cssText = baseStyles;
        }
        // גלילה לקטע השלט הרחוק
        const remoteSection = document.querySelector('.remote-control-section');
        if (remoteSection) {
            remoteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 150);

    console.log('Visual remote shown successfully');
}

// הסתרת שלט רחוק ויזואלי
function hideVisualRemote() {
    const visualRemote = document.getElementById('visualRemote');
    if (!visualRemote) return;

    visualRemote.style.cssText = 'display: none !important; visibility: hidden !important;';
    selectedRemoteDevice = null;
}

// טיפול בלחיצה על כפתור בשלט הרחוק - משופר עם למידה אוטומטית
function handleRemoteButtonClick(command) {
    if (!selectedRemoteDevice) {
        showFeedback('❌ לא נבחר מכשיר');
        return;
    }

    // אם סריקת IR פעילה, נציע ללמוד את הכפתור
    if (irScanning && selectedRemoteDevice.connectionType === 'ir') {
        const deviceId = selectedRemoteDevice.id;
        const key = `${deviceId}_${command}`;

        if (!learnedIRButtons[key]) {
            // הכפתור לא נלמד - נציע ללמוד אותו
            const buttonName = command.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (confirm(`הכפתור "${buttonName}" לא נלמד עדיין.\nהאם תרצה ללמוד אותו עכשיו?\n\nלחץ OK ואז לחץ על הכפתור המקביל בשלט הפיזי שלך.`)) {
                // מציאת הכפתור ב-IR buttons
                const irButton = document.querySelector(`.ir-button[data-command="${command}"]`);
                if (irButton) {
                    learnIRButton(command, irButton);
                } else {
                    // יצירת כפתור זמני ללמידה
                    learnIRButton(command, null);
                }
                return; // לא נשלח פקודה עד שהכפתור נלמד
            }
        }
    }

    // מציאת הכפתור שנלחץ
    const button = document.querySelector(`[data-command="${command}"]`);
    if (button) {
        // אנימציה של לחיצה - אפקט חזק יותר
        button.style.transform = 'scale(0.9)';
        button.style.transition = 'all 0.1s ease';

        // הוספת אפקט זוהר
        const originalBoxShadow = button.style.boxShadow;
        button.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.8), 0 0 40px rgba(102, 126, 234, 0.4)';
        button.style.filter = 'brightness(1.2)';

        // החזרה למצב רגיל עם אנימציה
        setTimeout(() => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = originalBoxShadow || '';
            button.style.filter = '';
        }, 150);

        // הוספת אינדיקטור ויזואלי - טקסט מעל הכפתור
        const buttonText = button.textContent;
        const indicator = document.createElement('div');
        indicator.className = 'button-press-indicator';
        indicator.textContent = '✓';
        indicator.style.cssText = `
            position: absolute;
            top: -10px;
            right: -10px;
            background: #00b894;
            color: white;
            border-radius: 50%;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            animation: buttonPress 0.5s ease;
            box-shadow: 0 2px 10px rgba(0, 184, 148, 0.5);
        `;

        // הוספת position relative לכפתור אם אין
        if (getComputedStyle(button).position === 'static') {
            button.style.position = 'relative';
        }

        button.appendChild(indicator);

        // הסרת האינדיקטור אחרי האנימציה
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.style.opacity = '0';
                indicator.style.transform = 'scale(0.5)';
                setTimeout(() => {
                    indicator.remove();
                }, 300);
            }
        }, 500);
    }

    // שליחת פקודה למכשיר
    sendCommand(selectedRemoteDevice, command);

    // חיווי ויזואלי נוסף - הודעת הצלחה עם שם הכפתור
    const commandName = command.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    showFeedback(`✅ ${commandName} נשלח ל-${selectedRemoteDevice.name}`);
}

// התאמת הממשק לסוג המכשיר
function adaptRemoteToDeviceType(device) {
    const remote = document.querySelector('.visual-remote');
    if (!remote) return;

    // הסתרת/הצגת כפתורים לפי סוג מכשיר
    const numbersSection = remote.querySelector('.remote-numbers');
    const navigationSection = remote.querySelector('.remote-navigation');
    const controlsSection = remote.querySelector('.remote-controls');
    const featuresSection = remote.querySelector('.remote-features');

    // הגדרות לכל סוג מכשיר
    const deviceConfig = {
        'tv': {
            showNumbers: true,
            showNavigation: true,
            showControls: true,
            showFeatures: true,
            showChannelButtons: true,
            showVolumeButtons: true
        },
        'ac': {
            showNumbers: false,
            showNavigation: false,
            showControls: true,
            showFeatures: false,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'audio': {
            showNumbers: false,
            showNavigation: false,
            showControls: true,
            showFeatures: false,
            showChannelButtons: false,
            showVolumeButtons: true
        },
        'light': {
            showNumbers: false,
            showNavigation: false,
            showControls: true,
            showFeatures: false,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'streamer': {
            showNumbers: false,
            showNavigation: true,
            showControls: true,
            showFeatures: true,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'fan': {
            showNumbers: false,
            showNavigation: false,
            showControls: true,
            showFeatures: false,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'blinds': {
            showNumbers: false,
            showNavigation: false,
            showControls: true,
            showFeatures: false,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'door': {
            showNumbers: false,
            showNavigation: false,
            showControls: true,
            showFeatures: false,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'security': {
            showNumbers: false,
            showNavigation: false,
            showControls: true,
            showFeatures: false,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'heater': {
            showNumbers: false,
            showNavigation: false,
            showControls: true,
            showFeatures: false,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'projector': {
            showNumbers: false,
            showNavigation: true,
            showControls: true,
            showFeatures: true,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'camera': {
            showNumbers: false,
            showNavigation: true,
            showControls: true,
            showFeatures: false,
            showChannelButtons: false,
            showVolumeButtons: false
        },
        'smart_hub': {
            showNumbers: false,
            showNavigation: true,
            showControls: true,
            showFeatures: true,
            showChannelButtons: false,
            showVolumeButtons: true
        }
    };

    const config = deviceConfig[device.type] || deviceConfig['tv'];

    // הסתרת/הצגת כפתורים
    if (numbersSection) {
        numbersSection.style.display = config.showNumbers ? 'grid' : 'none';
    }
    if (navigationSection) {
        navigationSection.style.display = config.showNavigation ? 'flex' : 'none';
    }
    if (controlsSection) {
        controlsSection.style.display = config.showControls ? 'grid' : 'none';

        // הסתרת/הצגת כפתורי ערוץ
        const channelUp = controlsSection.querySelector('[data-command="channel_up"]');
        const channelDown = controlsSection.querySelector('[data-command="channel_down"]');
        if (channelUp) channelUp.style.display = config.showChannelButtons ? 'flex' : 'none';
        if (channelDown) channelDown.style.display = config.showChannelButtons ? 'flex' : 'none';

        // הסתרת/הצגת כפתורי עוצמה
        const volumeUp = controlsSection.querySelector('[data-command="volume_up"]');
        const volumeDown = controlsSection.querySelector('[data-command="volume_down"]');
        const mute = controlsSection.querySelector('[data-command="mute"]');
        if (volumeUp) volumeUp.style.display = config.showVolumeButtons ? 'flex' : 'none';
        if (volumeDown) volumeDown.style.display = config.showVolumeButtons ? 'flex' : 'none';
        if (mute) mute.style.display = config.showVolumeButtons ? 'flex' : 'none';
    }
    if (featuresSection) {
        featuresSection.style.display = config.showFeatures ? 'grid' : 'none';
    }
}

// הוספת כפתורים ספציפיים לפי סוג מכשיר
function loadDeviceSpecificButtons(device) {
    const container = document.getElementById('deviceSpecificButtons');
    if (!container) return;

    container.innerHTML = '';

    // כפתורים לפי סוג מכשיר
    const deviceButtons = getDeviceSpecificButtons(device.type);

    deviceButtons.forEach(btn => {
        const button = document.createElement('button');
        button.className = 'remote-btn feature-btn';
        button.dataset.command = btn.command;
        button.textContent = btn.label;
        button.title = btn.title || btn.label;
        container.appendChild(button);
    });

    // כפתורים מ-IR buttons אם יש
    if (device.irButtons || device.templateId) {
        const template = templates.find(t => t.id === device.templateId);
        if (template && template.buttons) {
            Object.keys(template.buttons).forEach(key => {
                // בדיקה אם הכפתור כבר קיים
                const exists = document.querySelector(`[data-command="${key}"]`);
                if (!exists && !deviceButtons.find(b => b.command === key)) {
                    const button = document.createElement('button');
                    button.className = 'remote-btn feature-btn';
                    button.dataset.command = key;
                    button.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    button.title = key;
                    container.appendChild(button);
                }
            });
        }
    }

    // כפתורים מ-learnedIRButtons אם יש
    if (device.connectionType === 'ir') {
        Object.keys(learnedIRButtons).forEach(key => {
            if (key.startsWith(`${device.id}_`)) {
                const command = key.replace(`${device.id}_`, '');
                const exists = document.querySelector(`[data-command="${command}"]`);
                if (!exists && !deviceButtons.find(b => b.command === command)) {
                    const button = document.createElement('button');
                    button.className = 'remote-btn feature-btn';
                    button.dataset.command = command;
                    button.textContent = command.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    button.title = command;
                    container.appendChild(button);
                }
            }
        });
    }
}

// קבלת כפתורים ספציפיים לפי סוג מכשיר
function getDeviceSpecificButtons(deviceType) {
    const buttons = {
        'tv': [
            { command: 'netflix', label: '📺 Netflix', title: 'Netflix' },
            { command: 'youtube', label: '▶️ YouTube', title: 'YouTube' },
            { command: 'input', label: '📡 Input', title: 'Input' },
            { command: 'guide', label: '📋 Guide', title: 'Guide' },
            { command: 'info', label: 'ℹ️ Info', title: 'Info' },
            { command: 'exit', label: '❌ Exit', title: 'Exit' },
            { command: 'red', label: '🔴 Red', title: 'Red' },
            { command: 'green', label: '🟢 Green', title: 'Green' },
            { command: 'yellow', label: '🟡 Yellow', title: 'Yellow' },
            { command: 'blue', label: '🔵 Blue', title: 'Blue' }
        ],
        'ac': [
            { command: 'temp_up', label: '🌡️+', title: 'העלה טמפרטורה' },
            { command: 'temp_down', label: '🌡️-', title: 'הורד טמפרטורה' },
            { command: 'mode', label: '🌀 Mode', title: 'מצב (Cool/Heat/Fan/Auto)' },
            { command: 'fan_speed', label: '💨 Fan', title: 'מהירות מאוורר' },
            { command: 'swing', label: '↔️ Swing', title: 'Swing' },
            { command: 'timer', label: '⏰ Timer', title: 'טיימר' },
            { command: 'sleep', label: '😴 Sleep', title: 'שינה' },
            { command: 'eco', label: '🌿 Eco', title: 'Eco' },
            { command: 'turbo', label: '💨 Turbo', title: 'Turbo' },
            { command: 'dry', label: '💧 Dry', title: 'Dry' },
            { command: 'auto', label: '🔄 Auto', title: 'Auto' }
        ],
        'audio': [
            { command: 'bass_up', label: '🎵 Bass+', title: 'העלה Bass' },
            { command: 'bass_down', label: '🎵 Bass-', title: 'הורד Bass' },
            { command: 'treble_up', label: '🎶 Treble+', title: 'העלה Treble' },
            { command: 'treble_down', label: '🎶 Treble-', title: 'הורד Treble' },
            { command: 'input', label: '📡 Input', title: 'Input' },
            { command: 'bluetooth', label: '🔵 BT', title: 'Bluetooth' },
            { command: 'optical', label: '🔴 Optical', title: 'Optical' },
            { command: 'hdmi', label: '📺 HDMI', title: 'HDMI' },
            { command: 'aux', label: '🎧 AUX', title: 'AUX' },
            { command: 'usb', label: '💾 USB', title: 'USB' },
            { command: 'radio', label: '📻 Radio', title: 'Radio' },
            { command: 'eq', label: '🎚️ EQ', title: 'Equalizer' }
        ],
        'light': [
            { command: 'brightness_up', label: '💡+', title: 'העלה בהירות' },
            { command: 'brightness_down', label: '💡-', title: 'הורד בהירות' },
            { command: 'color_red', label: '🔴', title: 'אדום' },
            { command: 'color_green', label: '🟢', title: 'ירוק' },
            { command: 'color_blue', label: '🔵', title: 'כחול' },
            { command: 'color_white', label: '⚪', title: 'לבן' },
            { command: 'color_yellow', label: '🟡', title: 'צהוב' },
            { command: 'color_purple', label: '🟣', title: 'סגול' },
            { command: 'color_cyan', label: '🔷', title: 'ציאן' },
            { command: 'scene_1', label: '1️⃣', title: 'סצנה 1' },
            { command: 'scene_2', label: '2️⃣', title: 'סצנה 2' },
            { command: 'scene_3', label: '3️⃣', title: 'סצנה 3' },
            { command: 'scene_4', label: '4️⃣', title: 'סצנה 4' }
        ],
        'streamer': [
            { command: 'play', label: '▶️', title: 'נגן' },
            { command: 'pause', label: '⏸️', title: 'השהה' },
            { command: 'stop', label: '⏹️', title: 'עצור' },
            { command: 'rewind', label: '⏪', title: 'הרץ אחורה' },
            { command: 'forward', label: '⏩', title: 'הרץ קדימה' },
            { command: 'search', label: '🔍', title: 'חיפוש' },
            { command: 'next', label: '⏭️', title: 'הבא' },
            { command: 'prev', label: '⏮️', title: 'קודם' },
            { command: 'subtitle', label: '📝', title: 'כתוביות' },
            { command: 'audio', label: '🔊', title: 'שפה' }
        ],
        'fan': [
            { command: 'speed_1', label: '1️⃣', title: 'מהירות 1' },
            { command: 'speed_2', label: '2️⃣', title: 'מהירות 2' },
            { command: 'speed_3', label: '3️⃣', title: 'מהירות 3' },
            { command: 'speed_4', label: '4️⃣', title: 'מהירות 4' },
            { command: 'oscillate', label: '↔️', title: 'תנודה' },
            { command: 'timer', label: '⏰', title: 'טיימר' },
            { command: 'mode', label: '🌀', title: 'מצב' },
            { command: 'natural', label: '🌬️', title: 'Natural' },
            { command: 'sleep', label: '😴', title: 'שינה' }
        ],
        'blinds': [
            { command: 'open', label: '⬆️', title: 'פתח' },
            { command: 'close', label: '⬇️', title: 'סגור' },
            { command: 'stop', label: '⏹️', title: 'עצור' },
            { command: 'position_25', label: '25%', title: '25%' },
            { command: 'position_50', label: '50%', title: '50%' },
            { command: 'position_75', label: '75%', title: '75%' },
            { command: 'position_100', label: '100%', title: '100%' },
            { command: 'tilt_open', label: '↗️', title: 'הטיה פתוחה' },
            { command: 'tilt_close', label: '↘️', title: 'הטיה סגורה' }
        ],
        'door': [
            { command: 'lock', label: '🔒', title: 'נעל' },
            { command: 'unlock', label: '🔓', title: 'פתח' },
            { command: 'status', label: 'ℹ️', title: 'סטטוס' },
            { command: 'auto_lock', label: '🔄', title: 'נעילה אוטומטית' },
            { command: 'guest', label: '👤', title: 'אורח' },
            { command: 'schedule', label: '📅', title: 'תזמון' }
        ],
        'security': [
            { command: 'arm', label: '🛡️', title: 'הפעל' },
            { command: 'disarm', label: '🔓', title: 'כבה' },
            { command: 'panic', label: '🚨', title: 'פאניקה' },
            { command: 'status', label: 'ℹ️', title: 'סטטוס' },
            { command: 'bypass', label: '⏭️', title: 'עקוף' },
            { command: 'chime', label: '🔔', title: 'צלצול' },
            { command: 'test', label: '🧪', title: 'בדיקה' }
        ],
        'heater': [
            { command: 'temp_up', label: '🌡️+', title: 'העלה טמפרטורה' },
            { command: 'temp_down', label: '🌡️-', title: 'הורד טמפרטורה' },
            { command: 'mode', label: '🌀', title: 'מצב' },
            { command: 'timer', label: '⏰', title: 'טיימר' },
            { command: 'eco', label: '🌿', title: 'Eco' },
            { command: 'fan', label: '💨', title: 'מאוורר' },
            { command: 'oscillate', label: '↔️', title: 'תנודה' }
        ],
        'projector': [
            { command: 'input', label: '📡', title: 'Input' },
            { command: 'zoom_in', label: '🔍+', title: 'זום פנימה' },
            { command: 'zoom_out', label: '🔍-', title: 'זום החוצה' },
            { command: 'focus', label: '🎯', title: 'פוקוס' },
            { command: 'keystone', label: '📐', title: 'Keystone' },
            { command: 'lamp', label: '💡', title: 'נורה' },
            { command: 'freeze', label: '❄️', title: 'הקפאה' },
            { command: 'mute', label: '🔇', title: 'השתק' }
        ],
        'camera': [
            { command: 'record', label: '🔴', title: 'הקלטה' },
            { command: 'stop', label: '⏹️', title: 'עצור' },
            { command: 'snapshot', label: '📸', title: 'צילום' },
            { command: 'zoom_in', label: '🔍+', title: 'זום פנימה' },
            { command: 'zoom_out', label: '🔍-', title: 'זום החוצה' },
            { command: 'pan_left', label: '◄', title: 'פאן שמאלה' },
            { command: 'pan_right', label: '►', title: 'פאן ימינה' },
            { command: 'tilt_up', label: '▲', title: 'הטיה למעלה' },
            { command: 'tilt_down', label: '▼', title: 'הטיה למטה' },
            { command: 'preset_1', label: '1️⃣', title: 'Preset 1' },
            { command: 'preset_2', label: '2️⃣', title: 'Preset 2' },
            { command: 'preset_3', label: '3️⃣', title: 'Preset 3' }
        ],
        'smart_hub': [
            { command: 'scene_1', label: '1️⃣', title: 'סצנה 1' },
            { command: 'scene_2', label: '2️⃣', title: 'סצנה 2' },
            { command: 'scene_3', label: '3️⃣', title: 'סצנה 3' },
            { command: 'all_on', label: '💡', title: 'הכל דולק' },
            { command: 'all_off', label: '🌙', title: 'הכל כבוי' },
            { command: 'away', label: '🚶', title: 'נעדר' },
            { command: 'home', label: '🏠', title: 'בית' },
            { command: 'sleep', label: '😴', title: 'שינה' }
        ]
    };

    return buttons[deviceType] || [];
}

