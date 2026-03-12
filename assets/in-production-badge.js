class InProductionBadge extends HTMLElement {
  connectedCallback() {
    this.variants = JSON.parse(this.querySelector('[data-ipb-variants]').textContent);
    this.badge = this.querySelector('[data-ipb-badge]');
    this.dateEl = this.querySelector('[data-ipb-date]');
    this.formId = this.dataset.formId;

    this._updateFromForm();

    document.addEventListener('variant:change', (e) => {
      const variantId = e.detail?.variant?.id || e.detail?.selectedVariant?.id;
      if (variantId) this._update(variantId);
    });

    const form = document.getElementById(this.formId);
    if (form) {
      const variantInput = form.querySelector('[name="id"]');
      if (variantInput) {
        new MutationObserver(() => this._update(variantInput.value))
          .observe(variantInput, { attributes: true, attributeFilter: ['value'] });
      }
    }
  }

  _updateFromForm() {
    const form = document.getElementById(this.formId);
    const variantInput = form?.querySelector('[name="id"]');
    if (variantInput?.value) this._update(variantInput.value);
  }

  _update(variantId) {
    const variant = this.variants.find(v => String(v.id) === String(variantId));
    if (!variant) return;

    const isBackorder = variant.inventoryPolicy === 'continue' && variant.inventoryQuantity <= 0;

    if (isBackorder && variant.backorderDate) {
      const parts = String(variant.backorderDate).split('-').map(Number);
      const date = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
      const formatted = date && !isNaN(date)
        ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        : null;

      this.dateEl.textContent = formatted || '';
      this.badge.hidden = false;
    } else {
      this.badge.hidden = true;
    }
  }
}

customElements.define('in-production-badge', InProductionBadge);
