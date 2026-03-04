"""
Price Alert Checker

Ruft jede Minute den /api/alerts/check Endpunkt auf,
um aktive Preisalarme gegen aktuelle Kurse zu prüfen
und Push-Benachrichtigungen zu senden.

Konfiguration über Environment-Variablen oder .env Datei:
  ALERTS_API_URL  - Basis-URL der Trading App (z.B. https://trading.vercel.app)
  ALERTS_API_KEY  - API-Key für die /api/alerts/check Route

Usage:
  pip install requests python-dotenv
  python scripts/price_checker.py

Oder als systemd Service / Windows Task Scheduler / Docker Container
"""

import os
import sys
import time
import signal
import logging
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌ 'requests' Paket fehlt. Installiere mit: pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    # .env Datei im Projekt-Root laden
    env_path = Path(__file__).parent.parent / '.env.local'
    if env_path.exists():
        load_dotenv(env_path)
    else:
        # Fallback: .env im selben Verzeichnis
        load_dotenv()
except ImportError:
    pass  # dotenv ist optional

# ==========================================
# Konfiguration
# ==========================================

API_URL = os.getenv('ALERTS_API_URL', 'http://localhost:3000')
API_KEY = os.getenv('ALERTS_API_KEY', '')
CHECK_INTERVAL = int(os.getenv('ALERTS_CHECK_INTERVAL', '60'))  # Sekunden

# Handelszeiten (optional: nur während Börsenzeiten prüfen)
TRADING_HOURS_ONLY = os.getenv('ALERTS_TRADING_HOURS_ONLY', 'false').lower() == 'true'
TRADING_START_HOUR = int(os.getenv('ALERTS_TRADING_START', '8'))   # 08:00
TRADING_END_HOUR = int(os.getenv('ALERTS_TRADING_END', '22'))      # 22:00

# ==========================================
# Logging
# ==========================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger('price_checker')

# ==========================================
# Graceful Shutdown
# ==========================================

running = True

def signal_handler(signum, frame):
    global running
    logger.info(f"Signal {signum} empfangen, stoppe...")
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ==========================================
# Trading Hours Check
# ==========================================

def is_trading_hours() -> bool:
    """Prüft ob gerade Handelszeit ist (Mo-Fr, konfigurierbare Stunden)"""
    if not TRADING_HOURS_ONLY:
        return True
    
    now = datetime.now()
    # Wochenende (Samstag=5, Sonntag=6)
    if now.weekday() >= 5:
        return False
    
    return TRADING_START_HOUR <= now.hour < TRADING_END_HOUR

# ==========================================
# Alert Check
# ==========================================

def check_alerts() -> dict | None:
    """Ruft den Alert-Check Endpunkt auf"""
    url = f"{API_URL.rstrip('/')}/api/alerts/check"
    
    try:
        response = requests.post(
            url,
            headers={
                'Authorization': f'Bearer {API_KEY}',
                'Content-Type': 'application/json',
            },
            timeout=30,
        )
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            logger.error("❌ Authentifizierung fehlgeschlagen. Prüfe ALERTS_API_KEY.")
            return None
        else:
            logger.error(f"❌ HTTP {response.status_code}: {response.text[:200]}")
            return None
            
    except requests.exceptions.ConnectionError:
        logger.error(f"❌ Verbindung zu {url} fehlgeschlagen. Ist die App erreichbar?")
        return None
    except requests.exceptions.Timeout:
        logger.error("❌ Timeout beim Alert-Check (>30s)")
        return None
    except Exception as e:
        logger.error(f"❌ Unerwarteter Fehler: {e}")
        return None

# ==========================================
# Main Loop
# ==========================================

def main():
    if not API_KEY:
        logger.error("❌ ALERTS_API_KEY ist nicht gesetzt!")
        logger.error("   Setze die Variable in .env.local oder als Environment-Variable")
        sys.exit(1)
    
    logger.info("🚀 Price Alert Checker gestartet")
    logger.info(f"   API URL: {API_URL}")
    logger.info(f"   Check Interval: {CHECK_INTERVAL}s")
    logger.info(f"   Trading Hours Only: {TRADING_HOURS_ONLY}")
    if TRADING_HOURS_ONLY:
        logger.info(f"   Trading Hours: {TRADING_START_HOUR}:00 - {TRADING_END_HOUR}:00 (Mo-Fr)")
    logger.info("")
    
    consecutive_errors = 0
    max_consecutive_errors = 10
    
    while running:
        try:
            # Trading Hours Check
            if not is_trading_hours():
                logger.debug("⏸️  Außerhalb der Handelszeiten, überspringe...")
                time.sleep(CHECK_INTERVAL)
                continue
            
            # Alert Check durchführen
            result = check_alerts()
            
            if result:
                consecutive_errors = 0
                checked = result.get('checked', 0)
                triggered = result.get('triggered', 0)
                sent = result.get('notificationsSent', 0)
                
                if triggered > 0:
                    logger.info(f"🔔 {triggered} Alert(s) ausgelöst! ({sent} Notification(s) gesendet)")
                else:
                    logger.info(f"✅ {checked} Alerts geprüft – keine Treffer")
            else:
                consecutive_errors += 1
                if consecutive_errors >= max_consecutive_errors:
                    logger.error(f"❌ {max_consecutive_errors} aufeinanderfolgende Fehler. Erhöhe Interval...")
                    time.sleep(CHECK_INTERVAL * 5)
                    consecutive_errors = 0
                    continue
            
        except Exception as e:
            logger.error(f"❌ Fehler in Main Loop: {e}")
            consecutive_errors += 1
        
        # Warten bis zum nächsten Check
        # Sleep in kleinen Schritten für schnelleres Shutdown
        for _ in range(CHECK_INTERVAL):
            if not running:
                break
            time.sleep(1)
    
    logger.info("👋 Price Alert Checker beendet")

if __name__ == '__main__':
    main()
