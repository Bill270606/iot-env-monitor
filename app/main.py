from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import math, time, random
from collections import deque

app = FastAPI(title="EnvMonitor IoT")
history = deque(maxlen=50)

def fake_data():
    t = time.time()
    d = {
        "temperature": round(29 + 7  * math.sin(t/30)      + random.uniform(-0.3,0.3), 1),
        "humidity":    round(max(0,min(100, 68+18*math.sin(t/45+1)+random.uniform(-0.5,0.5))), 1),
        "wind_speed":  round(max(0, 12+12*math.sin(t/20+2) + random.uniform(-0.5,0.5)), 1),
        "pressure":    round(1013+6*math.sin(t/60+3)        + random.uniform(-0.3,0.3), 1),
        "co2":         round(max(400, 750+300*math.sin(t/50+4)+random.uniform(-10,10))),
        "pm25":        round(max(0, 40+40*math.sin(t/40+5)  + random.uniform(-2,2)), 1),
        "timestamp":   time.strftime("%H:%M:%S"),
        "date":        time.strftime("%d/%m/%Y"),
    }
    history.append(d)
    return d

class LoginData(BaseModel):
    email: str
    password: str

class SensorData(BaseModel):
    temperature: Optional[float] = None
    humidity:    Optional[float] = None
    wind_speed:  Optional[float] = None
    pressure:    Optional[float] = None
    co2:         Optional[float] = None
    pm25:        Optional[float] = None

app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def landing():   return FileResponse("app/static/landing.html")

@app.get("/login")
def login_page(): return FileResponse("app/static/login.html")

@app.get("/dashboard")
def dashboard():  return FileResponse("app/static/dashboard.html")

@app.get("/sensors")
def sensors_page(): return FileResponse("app/static/sensors.html")

@app.get("/alerts")
def alerts_page(): return FileResponse("app/static/alerts.html")

@app.get("/charts")
def charts_page(): return FileResponse("app/static/charts.html")

@app.get("/settings")
def settings_page(): return FileResponse("app/static/settings.html")

@app.post("/auth/login")
def do_login(data: LoginData):
    name = data.email.split("@")[0].replace(".", " ").title() if "@" in data.email else "Demo User"
    return {"success": True, "user": {"name": name, "email": data.email, "role": "Admin"}}

@app.get("/data/latest")
def get_latest(): return fake_data()

@app.get("/data/history")
def get_history(): return list(history)

@app.post("/data/sensor")
def receive(data: SensorData):
    entry = {**data.model_dump(exclude_none=True), "timestamp": time.strftime("%H:%M:%S")}
    history.append(entry)
    return {"status": "ok"}
