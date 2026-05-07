const API_BASE_URL = "https://hello-world-worker.jannis-knatz.workers.dev";

const elements = {
    getLocationBtn: document.getElementById('getLocationBtn'),
    latInput: document.getElementById('latInput'),
    lngInput: document.getElementById('lngInput'),
    radInput: document.getElementById('radInput'),
    radValue: document.getElementById('radValue'),
    searchBtn: document.getElementById('searchBtn'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorPanel: document.getElementById('errorPanel'),
    errorMessage: document.getElementById('errorMessage'),
    results: document.getElementById('results')
};

// Radius Slider
elements.radInput.addEventListener('input', (e) => {
    elements.radValue.textContent = e.target.value;
});

// Standort Button
elements.getLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showError('Geolokalisierung wird von deinem Browser nicht unterstützt.');
        return;
    }

    elements.getLocationBtn.textContent = '📍 Lade...';
    elements.getLocationBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            elements.latInput.value = position.coords.latitude.toFixed(5);
            elements.lngInput.value = position.coords.longitude.toFixed(5);
            elements.getLocationBtn.textContent = '📍 Mein Standort';
            elements.getLocationBtn.disabled = false;
        },
        (error) => {
            const errorMsg = error.code === 1
                ? 'Standortzugriff verweigert.'
                : 'Standort konnte nicht ermittelt werden.';

            showError(errorMsg);
            elements.getLocationBtn.textContent = '📍 Mein Standort';
            elements.getLocationBtn.disabled = false;
        }
    );
});

elements.searchBtn.addEventListener('click', fetchStations);

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorPanel.classList.remove('hidden');

    setTimeout(() => {
        elements.errorPanel.classList.add('hidden');
    }, 5000);
}

function showLoading(show) {
    if (show) {
        elements.loadingIndicator.classList.remove('hidden');
        elements.results.innerHTML = '';
        elements.searchBtn.disabled = true;
    } else {
        elements.loadingIndicator.classList.add('hidden');
        elements.searchBtn.disabled = false;
    }
}

// 🔥 API CALL (JETZT ÜBER CLOUDFLARE WORKER)
async function fetchStations() {
    const lat = elements.latInput.value;
    const lng = elements.lngInput.value;
    const rad = elements.radInput.value;

    if (!lat || !lng) {
        showError('Bitte Breitengrad und Längengrad eingeben.');
        return;
    }

    showLoading(true);
    elements.errorPanel.classList.add('hidden');

    try {
        const url = `${API_BASE_URL}?lat=${lat}&lng=${lng}&rad=${rad}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Netzwerkfehler: ${response.status}`);
        }

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message || 'API Fehler aufgetreten.');
        }

        displayResults(data.stations);

    } catch (error) {
        showError(`Fehler beim Laden der Daten: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Ergebnisanzeige
function displayResults(stations) {
    elements.results.innerHTML = '';

    if (!stations || stations.length === 0) {
        elements.results.innerHTML = `
            <div class="glass-panel" style="grid-column: 1 / -1; text-align: center;">
                <h3>Keine Tankstellen gefunden 😔</h3>
                <p>Versuche den Suchradius zu erhöhen oder einen anderen Ort.</p>
            </div>
        `;
        return;
    }

    stations.forEach(station => {
        const card = document.createElement('article');
        card.className = 'station-card';

        const isOpen = station.isOpen;
        const statusClass = isOpen ? 'status-open' : 'status-closed';
        const statusText = isOpen ? 'Geöffnet' : 'Geschlossen';

        const formatPrice = (price) => {
            if (price == null) return 'N/A';
            return Number(price).toFixed(3);
        };

        card.innerHTML = `
            <header class="station-header">
                <div>
                    <h2 class="station-brand">${station.brand || station.name}</h2>
                    <p class="station-name-address">
                        ${station.street} ${station.houseNumber || ''}<br>
                        ${station.postCode} ${station.place}
                    </p>
                </div>
                <div class="status-badge ${statusClass}">
                    <span class="status-dot"></span>
                    ${statusText}
                </div>
            </header>

            <div class="distance">
                📍 ${station.dist.toFixed(1)} km entfernt
            </div>

            <div class="prices">
                ${station.diesel != null ? `
                <div class="price-item diesel">
                    <span class="price-label">Diesel</span>
                    <span class="price-value">${formatPrice(station.diesel)} €</span>
                </div>` : ''}

                ${station.e5 != null ? `
                <div class="price-item e5">
                    <span class="price-label">Super E5</span>
                    <span class="price-value">${formatPrice(station.e5)} €</span>
                </div>` : ''}

                ${station.e10 != null ? `
                <div class="price-item e10">
                    <span class="price-label">Super E10</span>
                    <span class="price-value">${formatPrice(station.e10)} €</span>
                </div>` : ''}
            </div>
        `;

        elements.results.appendChild(card);
    });
}
