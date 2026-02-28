class SizingChartPopup extends HTMLElement {
  connectedCallback() {
    this.brands = JSON.parse(this.querySelector('[data-sizing-brands]').textContent);
    this.models = JSON.parse(this.querySelector('[data-sizing-models]').textContent);

    this.dialog = this.querySelector('[data-sizing-dialog]');
    this.brandHandle = this.dataset.brandHandle || null;
    this.brandChipsEl = this.querySelector('[data-sizing-brand-chips]');
    this.modelChipsEl = this.querySelector('[data-sizing-model-chips]');
    this.modelSection = this.querySelector('[data-sizing-model-section]');
    this.resultEl = this.querySelector('[data-sizing-result]');
    this.imageWrap = this.querySelector('[data-sizing-image-wrap]');
    this.imageEl = this.querySelector('[data-sizing-image]');
    this.ringMountRow = this.querySelector('[data-sizing-ring-mount-row]');
    this.ringMountValues = this.querySelector('[data-sizing-ring-mount-values]');
    this.magRingRow = this.querySelector('[data-sizing-mag-ring-row]');
    this.magRingValues = this.querySelector('[data-sizing-mag-ring-values]');
    this.noSizes = this.querySelector('[data-sizing-no-sizes]');

    if (this.brandHandle) {
      this._selectBrand(this.brandHandle);
    } else {
      this._renderBrandChips();
    }
    this._bindEvents();
  }

  _bindEvents() {
    this.querySelector('[data-sizing-trigger]').addEventListener('click', () => this.open());
    this.querySelector('[data-sizing-close]').addEventListener('click', () => this.close());

    // Close on backdrop click
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    // Chip delegation
    if (this.brandChipsEl) {
      this.brandChipsEl.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-sizing-chip]');
        if (!chip) return;
        this._selectBrand(chip.dataset.value);
      });
    }

    this.modelChipsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-sizing-chip]');
      if (!chip) return;
      this._selectModel(chip.dataset.value);
    });
  }

  open() {
    this.dialog.showModal();
  }

  close() {
    this.dialog.close();
  }

  _renderBrandChips() {
    this.brandChipsEl.innerHTML = '';
    this.brands.forEach((brand) => {
      this.brandChipsEl.appendChild(this._createChip(brand.handle, brand.name));
    });
  }

  _selectBrand(handle) {
    // Update brand chip states (only if brand chips are rendered)
    if (this.brandChipsEl) {
      this.brandChipsEl.querySelectorAll('[data-sizing-chip]').forEach((chip) => {
        const selected = chip.dataset.value === handle;
        chip.classList.toggle('sizing-chart__chip--selected', selected);
        chip.setAttribute('aria-pressed', selected);
      });
    }

    // Render filtered model chips
    const filteredModels = this.models.filter((m) => m.brandHandle === handle);
    this.modelChipsEl.innerHTML = '';
    filteredModels.forEach((model) => {
      this.modelChipsEl.appendChild(this._createChip(model.handle, model.name));
    });

    this.modelSection.hidden = filteredModels.length === 0;
    this.resultEl.hidden = true;
  }

  _selectModel(handle) {
    // Update model chip states
    this.modelChipsEl.querySelectorAll('[data-sizing-chip]').forEach((chip) => {
      const selected = chip.dataset.value === handle;
      chip.classList.toggle('sizing-chart__chip--selected', selected);
      chip.setAttribute('aria-pressed', selected);
    });

    const model = this.models.find((m) => m.handle === handle);
    if (!model) return;

    // Model image
    if (model.modelImage) {
      this.imageEl.src = model.modelImage;
      this.imageEl.alt = model.name;
      this.imageWrap.hidden = false;
    } else {
      this.imageWrap.hidden = true;
    }

    // Ring mount sizes
    if (model.ringMount && model.ringMount.length > 0) {
      this.ringMountValues.textContent = model.ringMount.join(' / ');
      this.ringMountRow.hidden = false;
    } else {
      this.ringMountRow.hidden = true;
    }

    // Mag ring sizes
    if (model.magRing && model.magRing.length > 0) {
      this.magRingValues.textContent = model.magRing.join(' / ');
      this.magRingRow.hidden = false;
    } else {
      this.magRingRow.hidden = true;
    }

    const hasAnySize = (model.ringMount && model.ringMount.length > 0) || (model.magRing && model.magRing.length > 0);
    this.noSizes.hidden = hasAnySize;

    this.resultEl.hidden = false;
  }

  _createChip(value, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sizing-chart__chip';
    button.dataset.sizingChip = '';
    button.dataset.value = value;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = label;
    return button;
  }
}

customElements.define('sizing-chart-popup', SizingChartPopup);
