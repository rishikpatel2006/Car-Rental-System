const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const CARS_FILE = path.join(DATA_DIR, "cars.json");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const PORT = Number(process.env.PORT || 3000);

const seedCars = [
  { id: "car-1", name: "Hyundai Creta", type: "SUV", pricePerDay: 2500, seats: 5, transmission: "Automatic", fuel: "Petrol", emoji: "🚙", color: "#dce8ff", description: "A comfortable SUV for city drives and weekend escapes.", available: true },
  { id: "car-2", name: "Maruti Swift", type: "Hatchback", pricePerDay: 1500, seats: 5, transmission: "Manual", fuel: "Petrol", emoji: "🚗", color: "#ffe5dc", description: "Compact, economical, and easy to park anywhere.", available: true },
  { id: "car-3", name: "Honda City", type: "Sedan", pricePerDay: 2200, seats: 5, transmission: "Automatic", fuel: "Petrol", emoji: "🚘", color: "#e4f4e9", description: "A refined sedan for smooth and comfortable journeys.", available: true },
  { id: "car-4", name: "Toyota Innova", type: "MUV", pricePerDay: 3500, seats: 7, transmission: "Manual", fuel: "Diesel", emoji: "🚐", color: "#f0e5ff", description: "Spacious seating for families and group trips.", available: true },
  { id: "car-5", name: "Tata Nexon", type: "SUV", pricePerDay: 2000, seats: 5, transmission: "Manual", fuel: "Diesel", emoji: "🚙", color: "#fff0c9", description: "A versatile compact SUV for everyday adventures.", available: true },
  { id: "car-6", name: "Mahindra Thar", type: "Off-road", pricePerDay: 4000, seats: 4, transmission: "Manual", fuel: "Diesel", emoji: "🚙", color: "#e3e9ed", description: "Adventure-ready styling for memorable road trips.", available: true }
];

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CARS_FILE)) fs.writeFileSync(CARS_FILE, JSON.stringify(seedCars, null, 2));
  if (!fs.existsSync(BOOKINGS_FILE)) fs.writeFileSync(BOOKINGS_FILE, "[]");
}
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return []; }
}
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}
function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
  res.end(contentType.startsWith("application/json") ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) { reject(new Error("Request body too large")); req.destroy(); }
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

ensureData();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }

  if (url.pathname === "/api/health" && req.method === "GET") {
    return send(res, 200, { status: "ok", database: "local-json", message: "DriveEase is ready" });
  }
  if (url.pathname === "/api/cars" && req.method === "GET") {
    return send(res, 200, readJson(CARS_FILE));
  }
  if (url.pathname === "/api/bookings" && req.method === "GET") {
    return send(res, 200, readJson(BOOKINGS_FILE));
  }
  if (url.pathname === "/api/bookings" && req.method === "POST") {
    try {
      const input = await readBody(req);
      const required = ["carId", "customerName", "email", "phone", "startDate", "endDate"];
      const missing = required.filter(key => !String(input[key] || "").trim());
      if (missing.length) return send(res, 400, { error: `Please complete: ${missing.join(", ")}` });
      const start = new Date(`${input.startDate}T00:00:00`);
      const end = new Date(`${input.endDate}T00:00:00`);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
        return send(res, 400, { error: "Return date must be the same as or later than the pickup date." });
      }
      const cars = readJson(CARS_FILE);
      const car = cars.find(item => item.id === input.carId);
      if (!car) return send(res, 404, { error: "That car could not be found. Please refresh and try again." });
      const days = Math.max(1, Math.round((end - start) / 86400000));
      const bookings = readJson(BOOKINGS_FILE);
      const booking = {
        id: `DE-${Date.now().toString().slice(-8)}`,
        carId: car.id, carName: car.name, customerName: String(input.customerName).trim(),
        email: String(input.email).trim(), phone: String(input.phone).trim(),
        startDate: input.startDate, endDate: input.endDate, days,
        total: days * car.pricePerDay, status: "Confirmed",
        createdAt: new Date().toISOString()
      };
      bookings.unshift(booking);
      writeJson(BOOKINGS_FILE, bookings);
      return send(res, 201, { message: "Booking confirmed", booking });
    } catch (error) {
      return send(res, 400, { error: error.message || "Could not create booking." });
    }
  }

  let requested = decodeURIComponent(url.pathname);
  if (requested === "/") requested = "/index.html";
  const filePath = path.resolve(PUBLIC, "." + requested);
  if (!filePath.startsWith(PUBLIC + path.sep) && filePath !== path.join(PUBLIC, "index.html")) {
    return send(res, 403, { error: "Forbidden" });
  }
  fs.readFile(filePath, (err, content) => {
    if (err) return send(res, 404, { error: "File not found" });
    send(res, 200, content, mime[path.extname(filePath)] || "application/octet-stream");
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\nDriveEase is running: http://localhost:${PORT}`);
  console.log(`Cars API:     http://localhost:${PORT}/api/cars`);
  console.log(`Bookings API: http://localhost:${PORT}/api/bookings`);
  console.log("Storage: local JSON files (no MongoDB setup required)\n");
});
server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other server or run with PORT=3001.`);
  } else console.error(error);
  process.exitCode = 1;
});