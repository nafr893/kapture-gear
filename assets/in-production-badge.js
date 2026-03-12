class InProductionBadge extends HTMLElement {
  connectedCallback() {
    this._variants = JSON.parse(this.querySelector('[data-ipb-variants]').textContent);
    this._badge = this.querySelector('[data-ipb-badge]');
    this._dateEl = this.querySelector('[data-ipb-date]');

    // Show badge for the initially selected variant
    const initialId = parseInt(this.dataset.selectedVariantId, 10);
    const initial = this._variants.find(v => v.id === initialId);
    if (initial) this._update(initial);

    // Listen for variant changes dispatched by the theme's variant picker
    const formId = this.dataset.formId;
    document.addEventListener('variant:change', (event) => {
      if (event.detail.formId !== formId) return;
      const variant = event.detail.variant;
      if (!variant) {
        this._badge.hidden = true;
        return;
      }
      const data = this._variants.find(v => v.id === variant.id);
      if (data) this._update(data);
    });
  }

  _update(variantData) {
    const isInProduction = variantData.inventoryPolicy === 'continue' && variantData.inventoryQuantity <= 0;

    if (isInProduction && variantData.backorderDate) {
      const parts = String(variantData.backorderDate).split('-').map(Number);
      const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
      const dateStr = d && !isNaN(d)
        ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        : '';

      this._dateEl.textContent = dateStr;
      this._badge.hidden = false;
    } else {
      this._badge.hidden = true;
    }
  }
}

customElements.define('in-production-badge', InProductionBadge);
