"""
Firebase Configuration
For production, set environment variables and provide valid credentials.
For development, uses in-memory storage.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Check if Firebase credentials are provided
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
USE_FIREBASE = bool(FIREBASE_PROJECT_ID)

class FirebaseManager:
    def __init__(self):
        self.db = None
        self.bucket = None
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return

        if USE_FIREBASE:
            try:
                import firebase_admin
                from firebase_admin import credentials, firestore, storage

                FIREBASE_CONFIG = {
                    "type": "service_account",
                    "project_id": FIREBASE_PROJECT_ID,
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID", "placeholder"),
                    "private_key": os.getenv("FIREBASE_PRIVATE_KEY", ""),
                    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL", ""),
                    "client_id": os.getenv("FIREBASE_CLIENT_ID", ""),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }

                if FIREBASE_CONFIG["private_key"]:
                    cred = credentials.Certificate(FIREBASE_CONFIG)
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': os.getenv("FIREBASE_STORAGE_BUCKET", f"{FIREBASE_PROJECT_ID}.appspot.com")
                    })
                    self.db = firestore.client()
                    self.bucket = storage.bucket()
                    print("Firebase initialized successfully")
                else:
                    print("Firebase credentials not configured, using in-memory storage")
            except Exception as e:
                print(f"Firebase initialization warning: {e}")
        else:
            print("Using in-memory storage (development mode)")

        self._initialized = True

    def get_db(self):
        if not self._initialized:
            self.initialize()
        return self.db

    def get_bucket(self):
        if not self._initialized:
            self.initialize()
        return self.bucket

# Global instance
firebase_manager = FirebaseManager()

def get_firestore_db():
    """Get Firestore database instance"""
    return firebase_manager.get_db()

def get_storage_bucket():
    """Get Firebase Storage bucket"""
    return firebase_manager.get_bucket()