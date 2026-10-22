from collections import defaultdict, deque
from datetime import datetime, timezone
import asyncio
import random
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter

resource = Resource.create({"service.name": "systemverse-local-demo", "deployment.environment": "local"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("systemverse")
app = FastAPI(title="SystemVerse Local Telemetry API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

requests_total = 0
errors_total = 0
durations = deque(maxlen=500)
route_counts = defaultdict(int)
last_updated = datetime.now(timezone.utc)

class TrafficRequest(BaseModel):
    kind: str = "normal"
    requests: int = 10

@app.get("/api/health")
async def health():
    return {"ok": True, "service": "systemverse-local-telemetry-api"}

@app.get("/api/telemetry")
async def telemetry():
    sorted_durations = sorted(durations)
    p95 = sorted_durations[min(len(sorted_durations)-1, int(len(sorted_durations)*0.95))] * 1000 if sorted_durations else 0.0
    err_rate = (errors_total / requests_total * 100) if requests_total else 0.0
    return {
        "connected": True, "services": 6, "dependencies": 8,
        "total_requests": requests_total, "requests_per_second": 0,
        "errors": errors_total, "error_rate": round(err_rate, 2),
        "p95_latency_ms": round(p95, 1),
        "updated_at": last_updated.isoformat()
    }

async def run_request(route: str, fail: bool):
    global requests_total, errors_total, last_updated
    start = time.perf_counter()
    with tracer.start_as_current_span(f"{route}.business-operation") as span:
        span.set_attribute("http.route", f"/{route}")
        span.set_attribute("deployment.environment", "local-demo")
        delay = random.uniform(.25, .6) if fail else random.uniform(.015, .12)
        await asyncio.sleep(delay)
        elapsed = time.perf_counter() - start
        requests_total += 1
        route_counts[route] += 1
        durations.append(elapsed)
        if fail:
            errors_total += 1
            span.set_attribute("error", True)
            span.add_event("simulated.exception", {"reason": "Demo fault injection"})
        last_updated = datetime.now(timezone.utc)
        return {"ok": not fail, "service": route, "duration_ms": round(elapsed*1000, 1),
                "message": "Simulated demo failure" if fail else "request handled"}, (500 if fail else 200)

@app.get("/api/demo/{route}")
async def demo_endpoint(route: str, fail: bool = False):
    if route not in {"catalog", "checkout", "payment"}:
        return {"error": "unknown route"}, 404
    body, status = await run_request(route, fail)
    from fastapi.responses import JSONResponse
    return JSONResponse(body, status_code=status)

@app.post("/api/demo/traffic")
async def demo_traffic(body: TrafficRequest):
    count = max(1, min(body.requests, 100))
    success = failed = 0
    for i in range(count):
        route = random.choice(["catalog", "checkout", "payment"])
        fail = body.kind == "error" and i % 3 == 0
        _, status = await run_request(route, fail)
        if status >= 500:
            failed += 1
        else:
            success += 1
    return {"sent": count, "successful": success, "failed": failed, "kind": body.kind}

@app.get("/metrics")
async def metrics():
    # Lightweight Prometheus text exposition for local inspection.
    lines = [
        "# HELP systemverse_http_requests_total Total requests handled by local demo",
        "# TYPE systemverse_http_requests_total counter",
        f"systemverse_http_requests_total {requests_total}",
        "# HELP systemverse_http_errors_total Total simulated errors",
        "# TYPE systemverse_http_errors_total counter",
        f"systemverse_http_errors_total {errors_total}",
        "# HELP systemverse_http_error_rate_percent Percentage of requests that failed",
        "# TYPE systemverse_http_error_rate_percent gauge",
        f"systemverse_http_error_rate_percent {(errors_total / requests_total * 100) if requests_total else 0}",
    ]
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse("\n".join(lines) + "\n")
