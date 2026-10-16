const state = { cars: [], bookings: [], selectedCar: null, toastTimer: null };
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const dateLabel = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}
function populateTypes() {
  const select = $("#typeFilter");
  [...new Set(state.cars.map(car => car.type))].sort().forEach(type => {
    const option = document.createElement("option"); option.value = type; option.textContent = type; select.append(option);
  });
}
function renderCars() {
  const type = $("#typeFilter").value;
  const maxPrice = $("#priceFilter").value;
  const query = $("#searchInput").value.trim().toLowerCase();
  const filtered = state.cars.filter(car => (type === "all" || car.type === type) &&
    (maxPrice === "all" || car.pricePerDay <= Number(maxPrice)) &&
    `${car.name} ${car.type} ${car.fuel} ${car.transmission}`.toLowerCase().includes(query));
  const grid = $("#carGrid"); grid.innerHTML = "";
  $("#emptyState").hidden = filtered.length !== 0;
  filtered.forEach(car => {
    const article = document.createElement("article"); article.className = "car-card";
    article.innerHTML = `<div class="car-art" style="background:${car.color}"><span class="car-tag">${escapeHtml(car.type)}</span><span class="car-price-tag">${money(car.pricePerDay)} / day</span><span class="car-emoji" aria-hidden="true">${car.emoji}</span></div>
      <div class="car-info"><div class="car-title-row"><div><h3>${escapeHtml(car.name)}</h3><p>${escapeHtml(car.description)}</p></div><span class="availability">● Available</span></div>
      <div class="car-description"></div><div class="specs"><span>♙ ${car.seats} seats</span><span>⚙ ${escapeHtml(car.transmission)}</span><span>⛽ ${escapeHtml(car.fuel)}</span></div>
      <div class="card-bottom"><div class="price"><strong>${money(car.pricePerDay)}</strong> <small>/ day</small></div><button class="book-btn" data-book="${car.id}">Book this car ↗</button></div></div>`;
    grid.append(article);
  });
  grid.querySelectorAll("[data-book]").forEach(button => button.addEventListener("click", () => openBooking(button.dataset.book)));
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function openBooking(carId) {
  state.selectedCar = state.cars.find(car => car.id === carId);
  if (!state.selectedCar) return;
  $("#carId").value = carId;
  $("#selectedCar").innerHTML = `<span class="mini-emoji">${state.selectedCar.emoji}</span><div><strong>${escapeHtml(state.selectedCar.name)}</strong><small>${money(state.selectedCar.pricePerDay)} per day · ${state.selectedCar.seats} seats · ${escapeHtml(state.selectedCar.transmission)}</small></div>`;
  const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  const min = today.toISOString().slice(0, 10);
  $("#startDate").min = min; $("#endDate").min = min;
  if (!$("#startDate").value || $("#startDate").value < min) $("#startDate").value = min;
  if (!$("#endDate").value || $("#endDate").value < $("#startDate").value) $("#endDate").value = $("#startDate").value;
  $("#formError").textContent = ""; updatePrice(); $("#bookingModal").hidden = false;
}
function updatePrice() {
  if (!state.selectedCar) return;
  const start = $("#startDate").value, end = $("#endDate").value;
  if (!start || !end || end < start) {
    $("#priceSummary").innerHTML = "<span>Choose a valid return date.</span>"; return;
  }
  const days = Math.max(1, Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000));
  $("#priceSummary").innerHTML = `<span>${days} rental day${days === 1 ? "" : "s"} × ${money(state.selectedCar.pricePerDay)}</span><strong>${money(days * state.selectedCar.pricePerDay)}</strong>`;
  $("#endDate").min = start;
}
async function loadBookings() {
  state.bookings = await api("/api/bookings");
  $("#bookingCount").textContent = state.bookings.length;
}
function renderBookings() {
  const list = $("#bookingsList");
  if (!state.bookings.length) { list.innerHTML = '<p class="no-bookings">No bookings yet. Choose a car and book your first trip.</p>'; return; }
  list.innerHTML = state.bookings.map(booking => `<article class="booking-row"><div><h3>${escapeHtml(booking.carName)}</h3><p>${escapeHtml(booking.customerName)} · ${dateLabel(booking.startDate)} – ${dateLabel(booking.endDate)}<br>Booking ID: ${escapeHtml(booking.id)} · ${booking.days} day${booking.days === 1 ? "" : "s"}</p></div><div class="booking-total"><strong>${money(booking.total)}</strong><small>✓ ${escapeHtml(booking.status)}</small></div></article>`).join("");
}
function closeModals() { $("#bookingModal").hidden = true; $("#bookingsModal").hidden = true; }
document.querySelectorAll("[data-close]").forEach(node => node.addEventListener("click", closeModals));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModals(); });
$("#typeFilter").addEventListener("change", renderCars);
$("#priceFilter").addEventListener("change", renderCars);
$("#searchInput").addEventListener("input", renderCars);
$("#startDate").addEventListener("change", () => { if ($("#endDate").value < $("#startDate").value) $("#endDate").value = $("#startDate").value; updatePrice(); });
$("#endDate").addEventListener("change", updatePrice);
$("#myBookingsBtn").addEventListener("click", async () => {
  try { await loadBookings(); renderBookings(); $("#bookingsModal").hidden = false; }
  catch (error) { showToast(error.message); }
});
$("#bookingForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("#confirmBtn"); button.disabled = true; button.textContent = "Confirming…";
  $("#formError").textContent = "";
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  try {
    const result = await api("/api/bookings", { method: "POST", body: JSON.stringify(payload) });
    closeModals(); event.currentTarget.reset(); state.selectedCar = null;
    await loadBookings();
    showToast(`Booking confirmed! Your ID is ${result.booking.id}`);
    $("#myBookingsBtn").focus();
  } catch (error) { $("#formError").textContent = error.message; }
  finally { button.disabled = false; button.innerHTML = 'Confirm booking <span>↗</span>'; }
});
$("#year").textContent = new Date().getFullYear();
(async function init() {
  try {
    state.cars = await api("/api/cars");
    populateTypes(); renderCars(); await loadBookings();
  } catch (error) {
    $("#carGrid").innerHTML = `<p class="empty-state">Could not load cars. Please restart the app and refresh this page. (${escapeHtml(error.message)})</p>`;
  }
})();