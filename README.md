# SystemVerse — No Docker Setup

This version runs locally using Python and Node.js. No Docker, Prometheus server, or external collector is required.

It provides live metrics from the included local demo API: each generated HTTP request is actually handled by FastAPI, updates request/error/latency counters, and creates an OpenTelemetry span printed to the backend terminal. The dashboard polls the local telemetry API every two seconds.

## Requirements
- Python 3.10+ (3.11/3.12 recommended)
- Node.js 20+ and npm
- Internet connection for first-time dependency installation

## Start the backend
Open Terminal in this extracted project folder and run:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Keep that terminal open. You should see Uvicorn running on http://127.0.0.1:8000.

## Start the frontend
Open a second Terminal window, go to the extracted project folder (the parent folder containing package.json), and run:

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173.

## Demonstrate it
1. In the right-side Demo scenarios panel, click **Generate live requests**.
2. The frontend posts real requests to the local FastAPI backend.
3. The backend records request count, errors, and latency; the dashboard refreshes every 2 seconds.
4. Click **Generate error traffic** to inject controlled HTTP 500 failures and watch error metrics rise.
5. Open http://127.0.0.1:8000/docs for the API or http://127.0.0.1:8000/metrics for simple Prometheus-format metrics.
6. Open the backend terminal to see OpenTelemetry spans printed for each operation.

## Scope
This is real telemetry from the local demo service. It is not connected to real production applications or Kubernetes. The 3D topology remains predefined; automatic topology discovery is not included.

## Troubleshooting
- If `python3` is missing, install Python from https://www.python.org/downloads/macos/.
- If `node` or `npm` is missing, install Node.js from https://nodejs.org/.
- If the dashboard says the backend is unavailable, make sure the backend terminal is still running on port 8000.
- If a port is occupied, change the port in the backend command and update the proxy in `vite.config.js`.
