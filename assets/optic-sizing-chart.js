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
      <div class="osc__brand-panel" data-osc-panel hidden>
        <div class="osc__chips" data-osc-chips></div>
        <div class="osc__result" data-osc-result hidden>
          <div class="osc__sizes" data-osc-sizes></div>
        </div>
      </div>
    `;

    return row;
  }

  _renderPanel(brandHandle, panelEl) {
    const models = this.models.filter((m) => m.brandHandle === brandHandle);
    const chipsEl = panelEl.querySelector('[data-osc-chips]');

    if (models.length === 0) {
      chipsEl.innerHTML = '<p class="osc__empty">No models listed for this brand.</p>';
      return;
    }

    chipsEl.innerHTML = '';
    models.forEach((model) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'osc__chip';
      btn.dataset.oscChip = model.handle;
      btn.textContent = model.name;
      chipsEl.appendChild(btn);
    });
  }

  _showModelSizes(panelEl, modelHandle) {
    const model = this.models.find((m) => m.handle === modelHandle);
    if (!model) return;

    // Update chip selected state
    panelEl.querySelectorAll('[data-osc-chip]').forEach((chip) => {
      chip.classList.toggle('osc__chip--selected', chip.dataset.oscChip === modelHandle);
    });

    const resultEl = panelEl.querySelector('[data-osc-result]');
    const sizesEl = panelEl.querySelector('[data-osc-sizes]');

    const hasRingMount = model.ringMount && model.ringMount.length > 0;
    const hasMagRing = model.magRing && model.magRing.length > 0;
    const hasSizes = hasRingMount || hasMagRing;

    sizesEl.innerHTML = `
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
    `;

    resultEl.hidden = false;
  }

  _bindEvents() {
    this.accordionEl.addEventListener('click', (e) => {
      // Brand trigger — open/close accordion
      const trigger = e.target.closest('[data-osc-trigger]');
      if (trigger) {
        const row = trigger.closest('[data-osc-brand]');
        const panel = row.querySelector('[data-osc-panel]');
        const isOpen = !panel.hidden;

        // Close all open rows
        this.accordionEl.querySelectorAll('[data-osc-brand]').forEach((r) => {
          r.querySelector('[data-osc-panel]').hidden = true;
          r.classList.remove('osc__brand--open');
          r.querySelector('[data-osc-trigger]').setAttribute('aria-expanded', 'false');
        });

        // Open clicked row if it was closed
        if (!isOpen) {
          if (!panel.dataset.rendered) {
            this._renderPanel(row.dataset.oscBrand, panel);
            panel.dataset.rendered = '1';
          }
          panel.hidden = false;
          row.classList.add('osc__brand--open');
          trigger.setAttribute('aria-expanded', 'true');
        }
        return;
      }

      // Model chip — show sizes
      const chip = e.target.closest('[data-osc-chip]');
      if (chip) {
        const panel = chip.closest('[data-osc-panel]');
        this._showModelSizes(panel, chip.dataset.oscChip);
      }
    });
  }
}

customElements.define('optic-sizing-chart', OpticSizingChart);
