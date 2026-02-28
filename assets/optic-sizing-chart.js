class OpticSizingChart extends HTMLElement {
  connectedCallback() {
    this.brands = JSON.parse(this.querySelector('[data-osc-brands]').textContent);
    this.models = JSON.parse(this.querySelector('[data-osc-models]').textContent);
    this.accordionEl = this.querySelector('[data-osc-accordion]');

    this._renderAccordion();
    this._bindEvents();
  }

  _renderAccordion() {
    this.accordionEl.innerHTML = '';
    this.brands.forEach((brand) => {
      this.accordionEl.appendChild(this._createBrandRow(brand));
    });
  }

  _createBrandRow(brand) {
    const row = document.createElement('div');
    row.className = 'osc__brand';
    row.dataset.oscBrand = brand.handle;

    row.innerHTML = `
      <button type="button" class="osc__brand-trigger" data-osc-trigger aria-expanded="false">
        <span>${brand.name}</span>
        <span class="osc__chevron" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
      <div class="osc__brand-panel" data-osc-panel hidden></div>
    `;

    return row;
  }

  _renderPanel(brandHandle, panelEl) {
    const models = this.models.filter((m) => m.brandHandle === brandHandle);

    if (models.length === 0) {
      panelEl.innerHTML = '<p class="osc__empty">No models listed for this brand.</p>';
      return;
    }

    panelEl.innerHTML = '';
    models.forEach((model) => {
      const modelEl = document.createElement('div');
      modelEl.className = 'osc__model';

      const hasRingMount = model.ringMount && model.ringMount.length > 0;
      const hasMagRing = model.magRing && model.magRing.length > 0;
      const hasSizes = hasRingMount || hasMagRing;

      modelEl.innerHTML = `
        <p class="osc__model-name">${model.name}</p>
        <div class="osc__model-sizes">
          ${hasRingMount ? `
            <div class="osc__size-row">
              <span class="osc__size-label">Ring Mount</span>
              <span class="osc__size-values">${model.ringMount.join(' / ')}</span>
            </div>
          ` : ''}
          ${hasMagRing ? `
            <div class="osc__size-row">
              <span class="osc__size-label">Mag Ring</span>
              <span class="osc__size-values">${model.magRing.join(' / ')}</span>
            </div>
          ` : ''}
          ${!hasSizes ? '<p class="osc__no-sizes">No size data available.</p>' : ''}
        </div>
      `;

      panelEl.appendChild(modelEl);
    });
  }

  _bindEvents() {
    this.accordionEl.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-osc-trigger]');
      if (!trigger) return;

      const row = trigger.closest('[data-osc-brand]');
      const panel = row.querySelector('[data-osc-panel]');
      const isOpen = !panel.hidden;

      // Close all open rows
      this.accordionEl.querySelectorAll('[data-osc-brand]').forEach((r) => {
        const p = r.querySelector('[data-osc-panel]');
        const t = r.querySelector('[data-osc-trigger]');
        p.hidden = true;
        r.classList.remove('osc__brand--open');
        t.setAttribute('aria-expanded', 'false');
      });

      // Open clicked row if it was closed
      if (!isOpen) {
        // Lazy-render panel content on first open
        if (!panel.dataset.rendered) {
          this._renderPanel(row.dataset.oscBrand, panel);
          panel.dataset.rendered = '1';
        }
        panel.hidden = false;
        row.classList.add('osc__brand--open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  }
}

customElements.define('optic-sizing-chart', OpticSizingChart);
