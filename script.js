const STORAGE_KEY = 'vehicle-maintenance-tracker';
const ADMIN_PASSWORD = '0000';

const form = document.getElementById('maintenance-form');
const historyList = document.getElementById('historyList');
const alerts = document.getElementById('alerts');
const clearAllButton = document.getElementById('clearAll');
const vehicleSelector = document.getElementById('vehicleSelector');
const submitButton = document.getElementById('submitButton');
const cancelEditButton = document.getElementById('cancelEdit');

const editingState = {
  recordId: null
};

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

const statMileage = document.getElementById('statMileage');
const statOil = document.getElementById('statOil');
const statTyre = document.getElementById('statTyre');
const statCount = document.getElementById('statCount');

const today = new Date().toISOString().split('T')[0];
fields.date.value = today;

function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function confirmAdminAction() {
  const password = window.prompt('Enter admin password');
  if (password === ADMIN_PASSWORD) {
    return true;
  }

  if (password !== null) {
    window.alert('Incorrect admin password.');
  }

  return false;
}

function getVehicleOptions(records) {
  const vehicles = [...new Set(records.map((record) => record.vehicle).filter(Boolean))];
  return vehicles.length ? vehicles : ['My Car'];
}

function getSelectedVehicle(records) {
  const options = getVehicleOptions(records);
  const currentValue = vehicleSelector.value.trim();

  if (!currentValue) {
    return null;
  }

  if (options.includes(currentValue)) {
    return currentValue;
  }

  const match = options.find((vehicle) => vehicle.toLowerCase().includes(currentValue.toLowerCase()));
  return match || null;
}

function getLatestRecord(records) {
  if (!records.length) return null;
  return [...records].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

function getOilStatus(value) {
  if (value >= 70) return { text: 'Healthy', type: 'good' };
  if (value >= 40) return { text: 'Monitor', type: 'warn' };
  return { text: 'Low', type: 'danger' };
}

function isTyreChecked(record) {
  if (record.tyreChecked !== undefined) {
    return Boolean(record.tyreChecked);
  }

  return Boolean(record.tyreFront !== undefined || record.tyreRear !== undefined);
}

function getTyreStatus(checked) {
  if (checked) return { text: 'Tyres checked', type: 'good' };
  return { text: 'Tyres not checked', type: 'warn' };
}

function getMotStatus(dateString) {
  if (!dateString) return null;

  const today = new Date();
  const dueDate = new Date(dateString);
  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `MOT overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`,
      type: 'danger'
    };
  }

  if (diffDays <= 30) {
    return {
      text: `MOT due in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
      type: 'warn'
    };
  }

  return null;
}

function renderVehicleSelector(records) {
  const options = getVehicleOptions(records);
  const currentValue = vehicleSelector.value.trim();

  const datalist = document.getElementById('vehicleSuggestions');
  datalist.innerHTML = options
    .map((vehicle) => `<option value="${vehicle}"></option>`)
    .join('');

  vehicleSelector.value = currentValue;
}

function renderAlerts(records) {
  alerts.innerHTML = '';

  const selectedVehicle = getSelectedVehicle(records);
  if (!selectedVehicle) {
    const empty = document.createElement('div');
    empty.className = 'alert good';
    empty.textContent = 'Search for a vehicle to view its overview.';
    alerts.appendChild(empty);
    return;
  }

  const selectedRecords = records.filter((record) => record.vehicle === selectedVehicle);

  if (!selectedRecords.length) {
    const empty = document.createElement('div');
    empty.className = 'alert good';
    empty.textContent = 'No maintenance checks logged yet for this vehicle.';
    alerts.appendChild(empty);
    return;
  }

  const latest = getLatestRecord(selectedRecords);
  const oilStatus = getOilStatus(latest.oilLevel);
  const tyreStatus = getTyreStatus(isTyreChecked(latest));

  const motStatus = getMotStatus(latest.motDate);

  const checks = [
    ...(motStatus ? [{ text: motStatus.text, type: motStatus.type }] : []),
    {
      text: `Oil level is ${oilStatus.text.toLowerCase()} at ${latest.oilLevel}%`,
      type: oilStatus.type
    },
    {
      text: tyreStatus.text,
      type: tyreStatus.type
    }
  ];

  checks.forEach(({ text, type }) => {
    const alertItem = document.createElement('div');
    alertItem.className = `alert ${type}`;
    alertItem.textContent = text;
    alerts.appendChild(alertItem);
  });
}

function renderSummary(records) {
  const selectedVehicle = getSelectedVehicle(records);
  if (!selectedVehicle) {
    statCount.textContent = '0';
    statMileage.textContent = '0 mi';
    statOil.textContent = '0%';
    statTyre.textContent = 'Tyres not checked';
    return;
  }

  const selectedRecords = records.filter((record) => record.vehicle === selectedVehicle);
  const latest = getLatestRecord(selectedRecords);

  statCount.textContent = String(selectedRecords.length);
  statMileage.textContent = latest ? `${Number(latest.mileage).toLocaleString()} mi` : '0 mi';
  statOil.textContent = latest ? `${latest.oilLevel}%` : '0%';
  statTyre.textContent = latest ? getTyreStatus(isTyreChecked(latest)).text : 'Tyres not checked';
}

function populateForm(record) {
  fields.date.value = record.date || today;
  fields.vehicle.value = record.vehicle || 'My Car';
  fields.make.value = record.make || '';
  fields.model.value = record.model || '';
  fields.motDate.value = record.motDate || '';
  fields.mileage.value = record.mileage ?? '';
  fields.oilLevel.value = record.oilLevel ?? '';
  fields.tyreChecked.checked = isTyreChecked(record);
  fields.notes.value = record.notes || '';
}

function setFormMode(isEditing) {
  submitButton.textContent = isEditing ? 'Save changes' : 'Add maintenance record';
  cancelEditButton.hidden = !isEditing;
  cancelEditButton.classList.toggle('hidden', !isEditing);
}

function resetFormState() {
  editingState.recordId = null;
  setFormMode(false);
  form.reset();
  fields.date.value = today;
  fields.vehicle.value = 'My Car';
}

function startEditingRecord(recordId) {
  const records = loadRecords();
  const record = records.find((item) => item.id === recordId);
  if (!record) return;

  editingState.recordId = recordId;
  populateForm(record);
  setFormMode(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHistory(records) {
  historyList.innerHTML = '';

  const selectedVehicle = getSelectedVehicle(records);
  if (!selectedVehicle) {
    historyList.innerHTML = '<div class="empty-state">Search for a vehicle to view its maintenance history.</div>';
    return;
  }

  const selectedRecords = records.filter((record) => record.vehicle === selectedVehicle);

  if (!selectedRecords.length) {
    historyList.innerHTML = '<div class="empty-state">No records yet for this vehicle. Add your first maintenance check.</div>';
    return;
  }

  const ordered = [...selectedRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

  ordered.forEach((record) => {
    const card = document.createElement('article');
    card.className = 'record-card';

    const oilStatus = getOilStatus(record.oilLevel);
    const tyreStatus = getTyreStatus(isTyreChecked(record));
    const vehicleName = [record.make, record.model].filter(Boolean).join(' ') || record.vehicle;

    card.innerHTML = `
      <div class="record-top">
        <h3>${vehicleName}</h3>
        <span class="badge">${record.date}</span>
      </div>
      <div class="record-meta">
        <div><strong>Registration:</strong> ${record.vehicle}</div>
        <div><strong>Make/Model:</strong> ${record.make || 'Not set'} / ${record.model || 'Not set'}</div>
        <div><strong>MOT date:</strong> ${record.motDate || 'Not set'}</div>
        <div><strong>Mileage:</strong> ${Number(record.mileage).toLocaleString()} mi</div>
        <div><strong>Oil:</strong> ${record.oilLevel}% (${oilStatus.text})</div>
        <div><strong>Tyres:</strong> ${tyreStatus.text}</div>
      </div>
      <div class="record-notes">${record.notes ? record.notes : 'No notes added.'}</div>
      <div class="record-actions">
        <button type="button" class="secondary" data-edit-id="${record.id}">Edit</button>
        <button type="button" class="danger-btn" data-delete-id="${record.id}">Delete</button>
      </div>
    `;

    const editButton = card.querySelector('[data-edit-id]');
    editButton.addEventListener('click', () => startEditingRecord(record.id));

    const deleteButton = card.querySelector('[data-delete-id]');
    deleteButton.addEventListener('click', () => {
      if (!confirmAdminAction()) return;

      const recordsAfterDelete = loadRecords().filter((item) => item.id !== record.id);
      saveRecords(recordsAfterDelete);
      resetFormState();
      render();
    });

    historyList.appendChild(card);
  });
}

function selectVehicleForForm(records, vehicleName) {
  const matchingRecords = records.filter((record) => record.vehicle === vehicleName);
  if (!matchingRecords.length) return;

  const latestMatch = getLatestRecord(matchingRecords);
  if (!latestMatch) return;

  populateForm(latestMatch);
  editingState.recordId = null;
  setFormMode(false);
  fields.vehicle.value = vehicleName;
}

function render() {
  const records = loadRecords();
  renderVehicleSelector(records);
  renderSummary(records);
  renderAlerts(records);
  renderHistory(records);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const record = {
    id: editingState.recordId || crypto.randomUUID(),
    vehicle: fields.vehicle.value.trim() || 'My Car',
    make: fields.make.value.trim(),
    model: fields.model.value.trim(),
    motDate: fields.motDate.value,
    date: fields.date.value,
    mileage: Number(fields.mileage.value),
    oilLevel: Number(fields.oilLevel.value),
    tyreChecked: fields.tyreChecked.checked,
    notes: fields.notes.value.trim()
  };

  const records = loadRecords();

  if (editingState.recordId) {
    const index = records.findIndex((item) => item.id === editingState.recordId);
    if (index >= 0) {
      records[index] = record;
    }
  } else {
    records.push(record);
  }

  saveRecords(records);
  vehicleSelector.value = record.vehicle;
  resetFormState();
  render();
});

cancelEditButton.addEventListener('click', () => {
  resetFormState();
});

vehicleSelector.addEventListener('input', () => {
  const records = loadRecords();
  const typedValue = vehicleSelector.value.trim();

  if (!typedValue) {
    render();
    return;
  }

  const selectedVehicle = getSelectedVehicle(records);
  if (selectedVehicle) {
    selectVehicleForForm(records, selectedVehicle);
  }

  render();
});

clearAllButton.addEventListener('click', () => {
  const confirmed = window.confirm('Clear all maintenance records?');
  if (!confirmed) return;
  if (!confirmAdminAction()) return;

  localStorage.removeItem(STORAGE_KEY);
  render();
});

render();
