const STORAGE_KEY = 'vehicle-maintenance-tracker';
const ADMIN_PASSWORD = '0000';

// Form + UI elements
const form = document.getElementById('maintenance-form');
const historyList = document.getElementById('historyList');
const alerts = document.getElementById('alerts');
const clearAllButton = document.getElementById('clearAll');
const vehicleSelector = document.getElementById('vehicleSelector');
const submitButton = document.getElementById('submitButton');
const cancelEditButton = document.getElementById('cancelEdit');

// Track editing state
let editingId = null;

// Form fields
const fields = {
  date: document.getElementById('date'),
  vehicle: document.getElementById('vehicle'),
  make: document.getElementById('make'),
  model: document.getElementById('model'),
  motDate: document.getElementById('motDate'),
  mileage: document.getElementById('mileage'),
  oilLevel: document.getElementById('oilLevel'),
  tyreChecked: document.getElementById('tyreChecked'),
  notes: document.getElementById('notes')
};

// Stats
const statMileage = document.getElementById('statMileage');
const statOil = document.getElementById('statOil');
const statTyre = document.getElementById('statTyre');
const statCount = document.getElementById('statCount');

// Set default date
fields.date.value = new Date().toISOString().split('T')[0];

// --- Storage helpers ---
function loadRecords() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// --- Admin check ---
function confirmAdminAction() {
  const input = prompt('Enter admin password');
  if (input === ADMIN_PASSWORD) return true;
  if (input !== null) alert('Incorrect admin password.');
  return false;
}

// --- Vehicle helpers ---
function getVehicleList(records) {
  const list = [...new Set(records.map(r => r.vehicle).filter(Boolean))];
  return list.length ? list : ['My Car'];
}

function getSelectedVehicle(records) {
  const typed = vehicleSelector.value.trim();
  if (!typed) return null;

  const options = getVehicleList(records);
  if (options.includes(typed)) return typed;

  return options.find(v => v.toLowerCase().includes(typed.toLowerCase())) || null;
}

// --- Status helpers ---
function getLatestRecord(records) {
  return records.length
    ? [...records].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;
}

function oilStatus(level) {
  if (level >= 70) return { text: 'Healthy', type: 'good' };
  if (level >= 40) return { text: 'Monitor', type: 'warn' };
  return { text: 'Low', type: 'danger' };
}

function tyreStatus(checked) {
  return checked
    ? { text: 'Tyres checked', type: 'good' }
    : { text: 'Tyres not checked', type: 'warn' };
}

function motStatus(date) {
  if (!date) return null;

  const today = new Date();
  const due = new Date(date);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    const days = Math.abs(diff);
    return { text: `MOT overdue by ${days} day${days !== 1 ? 's' : ''}`, type: 'danger' };
  }

  if (diff <= 30) {
    return { text: `MOT due in ${diff} day${diff !== 1 ? 's' : ''}`, type: 'warn' };
  }

  return null;
}

// --- UI rendering ---
function renderVehicleSelector(records) {
  const datalist = document.getElement
