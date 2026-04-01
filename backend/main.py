"""
H. pylori Detection System - FastAPI Backend
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
import json
import os
import csv
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from io import BytesIO, StringIO
import base64
from datetime import timedelta
from jose import JWTError, jwt
import bcrypt

from firebase_config import get_firestore_db, get_storage_bucket
from models.ai_model import analyze_signal, generate_random_signal, get_detector

# ============= Authentication Config =============
SECRET_KEY = "h-pylori-detection-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

app = FastAPI(title="H. pylori Detection API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (for development without Firebase)
patients_db = {}
tests_db = {}
reports_db = {}
users_db = {}
appointments_db = {}

# User roles
class UserRole:
    ADMIN = "Admin"
    DOCTOR = "Doctor"
    LAB_TECHNICIAN = "LabTechnician"
    PATIENT = "Patient"

# ============= Auth Models =============

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = UserRole.DOCTOR

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    createdAt: str

# Initialize Firebase
try:
    db = get_firestore_db()
    bucket = get_storage_bucket()
except Exception as e:
    print(f"Firebase initialization: {e}")
    db = None
    bucket = None

# ============= Pydantic Models =============

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PatientResponse(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    email: str
    phone: str
    address: str
    createdAt: str
    updatedAt: str

class TestCreate(BaseModel):
    patientId: str
    binarySignal: str
    imageUrl: Optional[str] = ""

class TestResponse(BaseModel):
    id: str
    patientId: str
    patientName: Optional[str] = ""
    binarySignal: str
    signalLength: int
    prediction: str
    confidence: float
    nanopaperColor: str
    imageUrl: str
    createdAt: str
    analyzedAt: str

class AnalysisRequest(BaseModel):
    binarySignal: str

class ReportGenerate(BaseModel):
    patientId: str
    testId: str
    format: str  # "PDF" or "CSV"

class ChatMessage(BaseModel):
    message: str

# ============= Helper Functions =============

def generate_id():
    return str(uuid.uuid4())

def get_timestamp():
    return datetime.now().isoformat()

def save_to_firebase(collection: str, data: dict):
    """Save data to Firebase Firestore"""
    if db:
        try:
            doc_ref = db.collection(collection).document(data['id'])
            doc_ref.set(data)
            return True
        except Exception as e:
            print(f"Firebase save error: {e}")
    return False

def get_from_firebase(collection: str, doc_id: str = None):
    """Get data from Firebase Firestore"""
    if db:
        try:
            if doc_id:
                doc = db.collection(collection).document(doc_id).get()
                if doc.exists:
                    return doc.to_dict()
            else:
                docs = db.collection(collection).stream()
                return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Firebase get error: {e}")
    return None

# ============= API Endpoints =============

@app.get("/")
def root():
    return {
        "message": "H. pylori Detection API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": get_timestamp()}

# ============= Auth Endpoints =============

@app.post("/api/auth/register")
def register(request: RegisterRequest):
    """Register a new user"""
    # Check if username exists
    for user in users_db.values():
        if user['username'] == request.username:
            raise HTTPException(status_code=400, detail="Username already exists")

    user_id = generate_id()
    hashed_password = get_password_hash(request.password)

    user_data = {
        "id": user_id,
        "username": request.username,
        "email": request.email,
        "password": hashed_password,
        "role": request.role,
        "createdAt": get_timestamp()
    }

    if db:
        save_to_firebase('users', user_data)
    else:
        users_db[user_id] = user_data

    # Create token
    access_token = create_access_token(data={"sub": user_id, "username": request.username, "role": request.role})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user_id,
            "username": request.username,
            "email": request.email,
            "role": request.role
        }
    )

@app.post("/api/auth/login")
def login(request: LoginRequest):
    """Login user"""
    # Find user by username
    user = None
    for u in users_db.values():
        if u['username'] == request.username:
            user = u
            break

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(request.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create token
    access_token = create_access_token(data={"sub": user['id'], "username": user['username'], "role": user['role']})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role']
        }
    )

@app.get("/api/auth/me")
def get_current_user(authorization: str = None):
    """Get current user info"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    user = users_db.get(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user['id'],
        "username": user['username'],
        "email": user['email'],
        "role": user['role']
    }

@app.get("/api/users", response_model=List[UserResponse])
def get_users():
    """Get all users (admin only)"""
    return [
        {
            "id": u['id'],
            "username": u['username'],
            "email": u['email'],
            "role": u['role'],
            "createdAt": u.get('createdAt', '')
        }
        for u in users_db.values()
    ]

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str):
    """Delete user"""
    if user_id in users_db:
        del users_db[user_id]
        return {"message": "User deleted successfully"}
    raise HTTPException(status_code=404, detail="User not found")

# ============= Patient Endpoints =============

@app.get("/api/patients", response_model=List[PatientResponse])
def get_patients():
    """Get all patients"""
    if db:
        docs = db.collection('patients').stream()
        patients = [doc.to_dict() for doc in docs]
        return patients

    return list(patients_db.values())

@app.get("/api/patients/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str):
    """Get patient by ID"""
    if db:
        doc = db.collection('patients').document(patient_id).get()
        if doc.exists:
            return doc.to_dict()

    if patient_id in patients_db:
        return patients_db[patient_id]

    raise HTTPException(status_code=404, detail="Patient not found")

@app.post("/api/patients", response_model=PatientResponse)
def create_patient(patient: PatientCreate):
    """Create new patient"""
    patient_id = generate_id()
    timestamp = get_timestamp()

    patient_data = {
        "id": patient_id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "email": patient.email or "",
        "phone": patient.phone or "",
        "address": patient.address or "",
        "createdAt": timestamp,
        "updatedAt": timestamp
    }

    if db:
        save_to_firebase('patients', patient_data)
    else:
        patients_db[patient_id] = patient_data

    return patient_data

@app.put("/api/patients/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: str, patient: PatientUpdate):
    """Update patient"""
    existing = get_patient(patient_id)

    update_data = patient.dict(exclude_unset=True)
    update_data["updatedAt"] = get_timestamp()

    for key, value in update_data.items():
        if value is not None:
            existing[key] = value

    if db:
        db.collection('patients').document(patient_id).update(update_data)
    else:
        patients_db[patient_id] = existing

    return existing

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: str):
    """Delete patient"""
    if db:
        db.collection('patients').document(patient_id).delete()

    if patient_id in patients_db:
        del patients_db[patient_id]

    return {"message": "Patient deleted successfully"}

# ============= Test Endpoints =============

@app.get("/api/tests", response_model=List[TestResponse])
def get_tests(patient_id: str = None):
    """Get all tests, optionally filtered by patient"""
    if db:
        if patient_id:
            docs = db.collection('tests').where('patientId', '==', patient_id).stream()
        else:
            docs = db.collection('tests').stream()
        tests = [doc.to_dict() for doc in docs]

        # Add patient names
        for test in tests:
            if db:
                patient_doc = db.collection('patients').document(test['patientId']).get()
                if patient_doc.exists:
                    test['patientName'] = patient_doc.to_dict().get('name', 'Unknown')
        return tests

    tests = list(tests_db.values())
    if patient_id:
        tests = [t for t in tests if t['patientId'] == patient_id]

    # Add patient names from in-memory db
    for test in tests:
        patient = patients_db.get(test['patientId'], {})
        test['patientName'] = patient.get('name', 'Unknown')

    return tests

@app.get("/api/tests/{test_id}", response_model=TestResponse)
def get_test(test_id: str):
    """Get test by ID"""
    if db:
        doc = db.collection('tests').document(test_id).get()
        if doc.exists:
            test = doc.to_dict()
            patient_doc = db.collection('patients').document(test['patientId']).get()
            if patient_doc.exists:
                test['patientName'] = patient_doc.to_dict().get('name', 'Unknown')
            return test

    if test_id in tests_db:
        test = tests_db[test_id]
        patient = patients_db.get(test['patientId'], {})
        test['patientName'] = patient.get('name', 'Unknown')
        return test

    raise HTTPException(status_code=404, detail="Test not found")

@app.post("/api/tests", response_model=TestResponse)
def create_test(test: TestCreate):
    """Create new test and analyze signal"""
    test_id = generate_id()
    timestamp = get_timestamp()

    # Analyze the binary signal
    analysis = analyze_signal(test.binarySignal)

    test_data = {
        "id": test_id,
        "patientId": test.patientId,
        "binarySignal": test.binarySignal,
        "signalLength": len(test.binarySignal.split(',')),
        "prediction": analysis['prediction'],
        "confidence": analysis['confidence'],
        "nanopaperColor": analysis['nanopaper_color'],
        "imageUrl": test.imageUrl or "",
        "createdAt": timestamp,
        "analyzedAt": timestamp
    }

    if db:
        save_to_firebase('tests', test_data)
    else:
        tests_db[test_id] = test_data

    # Get patient name
    patient = get_patient(test.patientId)
    test_data['patientName'] = patient.get('name', 'Unknown')

    return test_data

@app.post("/api/tests/analyze")
def analyze_test_signal(request: AnalysisRequest):
    """Analyze binary signal without saving"""
    analysis = analyze_signal(request.binarySignal)
    stats = get_detector().get_signal_stats(request.binarySignal)

    return {
        "analysis": analysis,
        "stats": stats
    }

@app.post("/api/tests/generate-random")
def generate_random_test_signal():
    """Generate random binary signal for testing/demo"""
    signal = generate_random_signal()
    analysis = analyze_signal(signal)

    return {
        "binarySignal": signal,
        "signalLength": len(signal.split(',')),
        "analysis": analysis
    }

# ============= Report Endpoints =============

@app.get("/api/reports")
def get_reports():
    """Get all reports"""
    if db:
        docs = db.collection('reports').stream()
        return [doc.to_dict() for doc in docs]

    return list(reports_db.values())

@app.post("/api/reports/generate-pdf")
def generate_pdf_report(request: ReportGenerate):
    """Generate PDF report for patient test"""
    # Get test and patient data
    test = get_test(request.testId)
    patient = get_patient(request.patientId)

    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#0F766E'),
        spaceAfter=30
    )
    story.append(Paragraph("H. pylori Detection Report", title_style))
    story.append(Spacer(1, 20))

    # Patient Information
    story.append(Paragraph("Patient Information", styles['Heading2']))
    patient_data = [
        ['Name:', patient['name']],
        ['Age:', str(patient['age'])],
        ['Gender:', patient['gender']],
        ['Email:', patient.get('email', 'N/A')],
        ['Phone:', patient.get('phone', 'N/A')],
    ]
    t = Table(patient_data, colWidths=[120, 300])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))

    # Test Results
    story.append(Paragraph("Test Results", styles['Heading2']))
    result_color = colors.green if test['prediction'] == 'Negative' else colors.red
    result_data = [
        ['Test ID:', test['id'][:8] + '...'],
        ['Date:', test['analyzedAt']],
        ['Result:', test['prediction']],
        ['Confidence:', f"{test['confidence']}%"],
        ['Nanopaper Color:', test['nanopaperColor']],
    ]
    t2 = Table(result_data, colWidths=[120, 300])
    t2.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (1, 2), (1, 2), result_color),
    ]))
    story.append(t2)
    story.append(Spacer(1, 20))

    # Diagnosis
    story.append(Paragraph("Diagnosis", styles['Heading2']))
    diagnosis = "No H. pylori infection detected." if test['prediction'] == 'Negative' else "H. pylori infection DETECTED."
    story.append(Paragraph(diagnosis, styles['Normal']))
    story.append(Spacer(1, 30))

    # Footer
    story.append(Paragraph("This is a computer-generated report.", styles['Italic']))
    story.append(Paragraph(f"Generated on: {get_timestamp()}", styles['Italic']))

    doc.build(story)

    # Save to storage
    report_id = generate_id()
    buffer.seek(0)

    if bucket:
        try:
            blob = bucket.blob(f'reports/{report_id}.pdf')
            blob.upload_from_file(buffer, content_type='application/pdf')
            download_url = blob.public_url
        except Exception as e:
            print(f"Storage error: {e}")
            download_url = f"data:application/pdf;base64,{base64.b64encode(buffer.getvalue()).decode()}"
    else:
        download_url = f"data:application/pdf;base64,{base64.b64encode(buffer.getvalue()).decode()}"

    # Save report metadata
    report_data = {
        "id": report_id,
        "patientId": request.patientId,
        "testId": request.testId,
        "format": "PDF",
        "downloadUrl": download_url,
        "generatedAt": get_timestamp()
    }

    if db:
        save_to_firebase('reports', report_data)
    else:
        reports_db[report_id] = report_data

    return report_data

@app.post("/api/reports/generate-csv")
def generate_csv_report(request: ReportGenerate):
    """Generate CSV report for patient test"""
    test = get_test(request.testId)
    patient = get_patient(request.patientId)

    # Create CSV content
    csv_data = [
        ["H. pylori Detection Report"],
        [""],
        ["Patient Information"],
        ["Name", patient['name']],
        ["Age", patient['age']],
        ["Gender", patient['gender']],
        ["Email", patient.get('email', '')],
        ["Phone", patient.get('phone', '')],
        [""],
        ["Test Results"],
        ["Test ID", test['id']],
        ["Date", test['analyzedAt']],
        ["Result", test['prediction']],
        ["Confidence", f"{test['confidence']}%"],
        ["Nanopaper Color", test['nanopaperColor']],
        ["Binary Signal", test['binarySignal']],
    ]

    # Convert to CSV string
    csv_buffer = StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerows(csv_data)
    csv_string = csv_buffer.getvalue()

    report_id = generate_id()

    if bucket:
        try:
            blob = bucket.blob(f'reports/{report_id}.csv')
            blob.upload_from_string(csv_string, content_type='text/csv')
            download_url = blob.public_url
        except Exception as e:
            print(f"Storage error: {e}")
            download_url = f"data:text/csv;base64,{base64.b64encode(csv_string.encode()).decode()}"
    else:
        download_url = f"data:text/csv;base64,{base64.b64encode(csv_string.encode()).decode()}"

    report_data = {
        "id": report_id,
        "patientId": request.patientId,
        "testId": request.testId,
        "format": "CSV",
        "downloadUrl": download_url,
        "generatedAt": get_timestamp()
    }

    if db:
        save_to_firebase('reports', report_data)
    else:
        reports_db[report_id] = report_data

    return report_data

# ============= Analytics Endpoints =============

@app.get("/api/analytics/summary")
def get_analytics_summary():
    """Get summary statistics"""
    if db:
        tests = list(db.collection('tests').stream())
        tests_data = [t.to_dict() for t in tests]
    else:
        tests_data = list(tests_db.values())

    total = len(tests_data)
    positive = sum(1 for t in tests_data if t.get('prediction') == 'Positive')
    negative = sum(1 for t in tests_data if t.get('prediction') == 'Negative')
    pending = sum(1 for t in tests_data if t.get('prediction') == 'Pending')

    return {
        "totalTests": total,
        "positiveCases": positive,
        "negativeCases": negative,
        "pendingTests": pending,
        "infectionRate": round((positive / total * 100) if total > 0 else 0, 2)
    }

@app.get("/api/analytics/trends")
def get_analytics_trends():
    """Get trend data for charts"""
    if db:
        tests = list(db.collection('tests').stream())
        tests_data = [t.to_dict() for t in tests]
    else:
        tests_data = list(tests_db.values())

    # Group by date
    date_counts = {}
    for test in tests_data:
        date = test.get('analyzedAt', '')[:10]
        if date:
            if date not in date_counts:
                date_counts[date] = {'positive': 0, 'negative': 0, 'total': 0}
            date_counts[date]['total'] += 1
            if test.get('prediction') == 'Positive':
                date_counts[date]['positive'] += 1
            else:
                date_counts[date]['negative'] += 1

    # Sort by date and take last 30 days
    sorted_dates = sorted(date_counts.keys())[-30:]

    return {
        "labels": sorted_dates,
        "positive": [date_counts[d]['positive'] for d in sorted_dates],
        "negative": [date_counts[d]['negative'] for d in sorted_dates],
        "total": [date_counts[d]['total'] for d in sorted_dates]
    }

# ============= Appointment Endpoints =============

class AppointmentCreate(BaseModel):
    patientId: str
    date: str
    time: str
    notes: str = ""

class AppointmentUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    patientId: str
    patientName: str
    date: str
    time: str
    notes: str
    status: str
    createdAt: str

@app.get("/api/appointments", response_model=List[AppointmentResponse])
def get_appointments(patient_id: str = None):
    """Get all appointments, optionally filtered by patient"""
    appointments = list(appointments_db.values())
    if patient_id:
        appointments = [a for a in appointments if a['patientId'] == patient_id]

    # Add patient names
    for apt in appointments:
        patient = patients_db.get(apt['patientId'], {})
        apt['patientName'] = patient.get('name', 'Unknown')

    return appointments

@app.post("/api/appointments", response_model=AppointmentResponse)
def create_appointment(appointment: AppointmentCreate):
    """Create new appointment"""
    appointment_id = generate_id()
    timestamp = get_timestamp()

    appointment_data = {
        "id": appointment_id,
        "patientId": appointment.patientId,
        "date": appointment.date,
        "time": appointment.time,
        "notes": appointment.notes,
        "status": "Scheduled",
        "createdAt": timestamp
    }

    appointments_db[appointment_id] = appointment_data

    # Get patient name
    patient = patients_db.get(appointment.patientId, {})
    appointment_data['patientName'] = patient.get('name', 'Unknown')

    return appointment_data

@app.put("/api/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(appointment_id: str, appointment: AppointmentUpdate):
    """Update appointment"""
    if appointment_id not in appointments_db:
        raise HTTPException(status_code=404, detail="Appointment not found")

    existing = appointments_db[appointment_id]
    update_data = appointment.dict(exclude_unset=True)

    for key, value in update_data.items():
        if value is not None:
            existing[key] = value

    appointments_db[appointment_id] = existing

    # Get patient name
    patient = patients_db.get(existing['patientId'], {})
    existing['patientName'] = patient.get('name', 'Unknown')

    return existing

@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: str):
    """Delete appointment"""
    if appointment_id in appointments_db:
        del appointments_db[appointment_id]
        return {"message": "Appointment deleted successfully"}
    raise HTTPException(status_code=404, detail="Appointment not found")

# ============= Chatbot Endpoints =============

@app.post("/api/chat")
def chat_with_bot(message: ChatMessage):
    """Simple AI chatbot for doctor interaction"""
    msg = message.message.lower()

    # Simple rule-based responses
    responses = {
        "hello": "Hello! I'm the H. pylori Detection Assistant. How can I help you today?",
        "hi": "Hello! I'm the H. pylori Detection Assistant. How can I help you today?",
        "what is h pylori": "H. pylori (Helicobacter pylori) is a bacteria that infects the stomach and can cause ulcers and stomach cancer. It's one of the most common bacterial infections worldwide.",
        "h pylori symptoms": "Common symptoms include stomach pain, bloating, nausea, loss of appetite, and frequent burping. Many people with H. pylori have no symptoms.",
        "how does the test work": "Our system analyzes binary signals from immunoplasmonic nanopaper that changes color when exposed to saliva samples. Yellow indicates no infection, brown indicates infection detected.",
        "treatment": "H. pylori treatment typically involves a combination of antibiotics and proton pump inhibitors. Please consult with a gastroenterologist for proper treatment.",
        "prevention": "To prevent H. pylori infection: wash hands frequently, drink clean water, avoid contaminated food, and maintain good hygiene practices.",
        "accuracy": "Our AI model achieves high accuracy in detecting H. pylori infection from the nanopaper color change signals. Results should be confirmed by a healthcare professional.",
        "default": "Thank you for your message. For specific medical advice, please consult with a healthcare professional. I can help with questions about the H. pylori detection system."
    }

    # Find matching response
    for key, response in responses.items():
        if key in msg:
            return {"response": response, "timestamp": get_timestamp()}

    return {"response": responses["default"], "timestamp": get_timestamp()}

# ============= Batch Testing Endpoints =============

class BatchTestRequest(BaseModel):
    patientId: str
    signals: List[str]

@app.post("/api/tests/batch")
def batch_create_tests(request: BatchTestRequest):
    """Create multiple tests at once"""
    results = []

    for signal in request.signals:
        test_id = generate_id()
        timestamp = get_timestamp()

        analysis = analyze_signal(signal)

        test_data = {
            "id": test_id,
            "patientId": request.patientId,
            "binarySignal": signal,
            "signalLength": len(signal.split(',')),
            "prediction": analysis['prediction'],
            "confidence": analysis['confidence'],
            "nanopaperColor": analysis['nanopaper_color'],
            "imageUrl": "",
            "createdAt": timestamp,
            "analyzedAt": timestamp
        }

        tests_db[test_id] = test_data
        results.append(test_data)

    # Get patient name
    patient = patients_db.get(request.patientId, {})
    patient_name = patient.get('name', 'Unknown')
    for r in results:
        r['patientName'] = patient_name

    return {
        "message": f"Created {len(results)} tests",
        "tests": results
    }

@app.get("/api/tests/{test_id}/compare")
def compare_test(test_id: str):
    """Compare a test with previous tests of the same patient"""
    if test_id not in tests_db:
        raise HTTPException(status_code=404, detail="Test not found")

    test = tests_db[test_id]
    patient_id = test['patientId']

    # Get all tests for this patient
    patient_tests = [
        t for t in tests_db.values()
        if t['patientId'] == patient_id
    ]

    # Sort by date
    patient_tests.sort(key=lambda x: x.get('createdAt', ''), reverse=True)

    return {
        "currentTest": test,
        "history": patient_tests[:10]
    }

# ============= Image Analysis Endpoints =============

@app.post("/api/tests/analyze-image")
def analyze_image(file: UploadFile = File(...)):
    """Analyze nanopaper image (simulated)"""
    signal = generate_random_signal()
    analysis = analyze_signal(signal)

    return {
        "analysis": analysis,
        "signal": signal,
        "message": "Image analyzed (simulated)"
    }

# ============= Fake Data Generation =============

@app.post("/api/generate-fake-data")
def generate_fake_data(num_patients: int = 50):
    """Generate fake patient data for training/demo"""
    import random

    first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
                   "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
                   "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
                   "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
                   "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
                   "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa"]

    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
                  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
                  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
                  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"]

    genders = ["Male", "Female", "Other"]
    domains = ["gmail.com", "yahoo.com", "outlook.com", "email.com"]

    created_patients = 0

    for i in range(num_patients):
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        name = f"{first_name} {last_name}"

        patient_data = {
            "id": generate_id(),
            "name": name,
            "age": random.randint(18, 80),
            "gender": random.choice(genders),
            "email": f"{first_name.lower()}.{last_name.lower()}{i}@random.choice(domains)",
            "phone": f"+1-{random.randint(200,999)}-{random.randint(100,999)}-{random.randint(1000,9999)}",
            "address": f"{random.randint(1,999)} {random.choice(['Main', 'Oak', 'Pine', 'Maple', 'Cedar'])} Street, {random.choice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'])}",
            "createdAt": get_timestamp(),
            "updatedAt": get_timestamp()
        }

        if db:
            save_to_firebase('patients', patient_data)
        else:
            patients_db[patient_data['id']] = patient_data

        created_patients += 1

        # Create 1-3 tests per patient
        num_tests = random.randint(1, 3)
        for _ in range(num_tests):
            # Generate random signal (weighted towards negative for realism)
            if random.random() < 0.3:  # 30% positive
                signal = ','.join([str(random.randint(0, 1)) for _ in range(100)])
                signal = ''.join(['1' if random.random() < 0.6 else '0' for _ in range(100)])
            else:
                signal = ','.join([str(random.randint(0, 1)) for _ in range(100)])
                signal = ''.join(['0' if random.random() < 0.6 else '1' for _ in range(100)])

            signal = ','.join(list(signal))

            analysis = analyze_signal(signal)

            test_data = {
                "id": generate_id(),
                "patientId": patient_data['id'],
                "binarySignal": signal,
                "signalLength": 100,
                "prediction": analysis['prediction'],
                "confidence": analysis['confidence'],
                "nanopaperColor": analysis['nanopaper_color'],
                "imageUrl": "",
                "createdAt": get_timestamp(),
                "analyzedAt": get_timestamp()
            }

            if db:
                save_to_firebase('tests', test_data)
            else:
                tests_db[test_data['id']] = test_data

    return {
        "message": f"Successfully generated {created_patients} fake patients with tests",
        "patientsCreated": created_patients
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)