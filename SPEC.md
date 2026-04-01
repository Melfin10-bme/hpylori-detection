# H. pylori Nanopaper Detection System - Specification

## Project Overview
- **Project Name**: H. pylori LSPR Detection System
- **Type**: Full-stack Web Application (Medical Diagnostic Tool)
- **Core Functionality**: Process binary electrical signals from nanopaper color changes to detect H. pylori infection from saliva samples
- **Target Users**: Medical professionals, lab technicians, healthcare administrators

## Technology Stack
- **Frontend**: React 18 + Tailwind CSS + Vite
- **Backend**: Python FastAPI
- **Database**: Firebase Firestore (real-time)
- **Storage**: Firebase Storage
- **AI/ML**: TensorFlow/Keras model
- **Deployment**: Firebase Hosting (Frontend) + Render (Backend)

## UI/UX Specification

### Color Palette
- **Primary**: `#0F766E` (Teal-700) - Medical professional feel
- **Secondary**: `#1E293B` (Slate-800) - Dashboard background
- **Accent**: `#10B981` (Emerald-500) - Positive/Normal indicators
- **Warning**: `#F59E0B` (Amber-500) - Pending states
- **Danger**: `#EF4444` (Red-500) - Abnormal/Infection detected
- **Normal Color**: `#FBBF24` (Amber-400) - Yellow for normal
- **Infected Color**: `#92400E` (Amber-800) - Brown for infection
- **Background**: `#0F172A` (Slate-900) - Dark theme
- **Card**: `#1E293B` (Slate-800) - Card backgrounds
- **Text Primary**: `#F8FAFC` (Slate-50)
- **Text Secondary**: `#94A3B8` (Slate-400)

### Typography
- **Font Family**: Inter (headings), Roboto Mono (data/signals)
- **Headings**: 24px (h1), 20px (h2), 16px (h3)
- **Body**: 14px regular, 14px medium
- **Data/Monospace**: 12px for binary signals

### Layout Structure
- **Header**: Fixed top, 64px height, logo + nav + user profile
- **Sidebar**: 240px width, collapsible, navigation
- **Main Content**: Fluid width, 24px padding
- **Cards**: 16px padding, 12px border-radius, subtle shadows
- **Responsive Breakpoints**:
  - Mobile: < 768px (sidebar hidden, hamburger menu)
  - Tablet: 768px - 1024px (collapsed sidebar)
  - Desktop: > 1024px (full layout)

### Pages & Components

#### 1. Dashboard (Home)
- **Stats Cards**: Total patients, Positive cases, Negative cases, Pending tests
- **Recent Activity**: Real-time feed of recent tests
- **Quick Actions**: New test, Generate report
- **Infection Trend Chart**: Line chart showing infection rates over time

#### 2. Patient Management
- **Patient List**: Searchable, filterable table
- **Patient Profile**:
  - Personal details (name, age, gender, contact)
  - Test history
  - Binary signal visualization (waveform display)
  - Diagnosis results with timestamps
  - Action buttons (Retest, Generate Report, Delete)

#### 3. New Test Entry
- **Patient Selection**: New or existing patient
- **Signal Input Method**:
  - Manual binary signal entry (0s and 1s)
  - Random signal generation (for demo/training)
  - Optional image upload of nanopaper
- **Analysis**: Real-time AI prediction display
- **Submit**: Save to database

#### 4. Analytics Dashboard
- **Infection Rate Pie Chart**: Positive vs Negative
- **Monthly Trend Line Chart**: Infection over time
- **Age Group Distribution**: Bar chart
- **Gender Distribution**: Donut chart

#### 5. Reports
- **Report List**: Previously generated reports
- **Generate New**: Select patient, choose format (PDF/CSV)
- **Download**: Direct download buttons

#### 6. AI Chatbot (Optional)
- **Chat Interface**: Floating button bottom-right
- **Quick Questions**: Common medical queries

### Visual Effects
- **Cards**: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3)`
- **Buttons**: Hover scale 1.02, transition 200ms
- **Signal Visualization**: Animated waveform, color-coded
- **Loading States**: Skeleton loaders, spinner animations
- **Notifications**: Toast notifications, slide-in from top-right

## Data Models

### Patient
```
{
  id: string,
  name: string,
  age: number,
  gender: "Male" | "Female" | "Other",
  email: string,
  phone: string,
  address: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Test Result
```
{
  id: string,
  patientId: string,
  binarySignal: string (comma-separated 0s and 1s),
  signalLength: number,
  prediction: "Positive" | "Negative" | "Pending",
  confidence: number (0-100),
  nanopaperColor: "Yellow" | "Brown" | "Unknown",
  imageUrl: string (optional),
  createdAt: timestamp,
  analyzedAt: timestamp
}
```

### Report
```
{
  id: string,
  patientId: string,
  testId: string,
  format: "PDF" | "CSV",
  downloadUrl: string,
  generatedAt: timestamp
}
```

## Functionality Specification

### Core Features

1. **Patient Management**
   - Create, read, update, delete patients
   - Search by name, ID
   - Filter by date range, result status

2. **Test Processing**
   - Input binary signals (simulated from nanopaper color)
   - Generate random signals for training/demo
   - Real-time AI prediction
   - Store results with timestamps

3. **AI Model Integration**
   - TensorFlow Keras model for classification
   - Input: Binary sequence (normalized)
   - Output: Probability of infection (Positive/Negative)
   - Confidence score display

4. **Real-time Updates**
   - Firestore real-time listeners
   - Live patient list updates
   - Instant notification on new results

5. **Report Generation**
   - PDF: Formatted medical report with patient details, test results, diagnosis
   - CSV: Raw data export for analysis
   - Firebase Storage for file hosting

6. **Analytics**
   - Aggregate statistics
   - Visual charts (infection trends)
   - Exportable data

### Fake Data Generation
- Generate 50+ fake patients with realistic names
- Generate random binary signals (0/1 sequences of 100 bits)
- Mix of positive (30%) and negative (70%) results
- Realistic timestamps over past 30 days

## API Endpoints (FastAPI)

### Patients
- `GET /api/patients` - List all patients
- `GET /api/patients/{id}` - Get patient details
- `POST /api/patients` - Create patient
- `PUT /api/patients/{id}` - Update patient
- `DELETE /api/patients/{id}` - Delete patient

### Tests
- `GET /api/tests` - List all tests
- `GET /api/tests/{id}` - Get test details
- `GET /api/tests/patient/{patientId}` - Get tests by patient
- `POST /api/tests` - Create new test
- `POST /api/tests/analyze` - Analyze binary signal
- `POST /api/tests/generate-random` - Generate random signal for demo

### Reports
- `GET /api/reports` - List reports
- `POST /api/reports/generate-pdf` - Generate PDF report
- `POST /api/reports/generate-csv` - Generate CSV report
- `GET /api/reports/{id}/download` - Download report

### Analytics
- `GET /api/analytics/summary` - Get summary statistics
- `GET /api/analytics/trends` - Get trend data

### Chatbot
- `POST /api/chat` - Send message to AI chatbot

## Acceptance Criteria

### Functional
- [ ] Can create new patients with complete details
- [ ] Can input binary signals and receive AI prediction
- [ ] Can view patient profile with all test history
- [ ] Real-time updates work (new data appears without refresh)
- [ ] Can generate and download PDF reports
- [ ] Can generate and download CSV reports
- [ ] Analytics charts display correct data
- [ ] Fake data generation populates system for training

### Visual
- [ ] Dark theme medical dashboard aesthetic
- [ ] Color-coded results (green for negative, red for positive)
- [ ] Signal visualization shows waveform
- [ ] Responsive on mobile/tablet/desktop
- [ ] Loading states show skeleton/spinner
- [ ] Toast notifications for actions

### Technical
- [ ] FastAPI backend runs without errors
- [ ] Firebase connection established
- [ ] AI model loads and predicts correctly
- [ ] Frontend builds without errors
- [ ] API endpoints respond correctly