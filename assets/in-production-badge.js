class InProductionBadge extends HTMLElement {
  connectedCallback() {
    this._variants = JSON.parse(this.querySelector('[data-ipb-variants]').textContent);
    this._badge = this.querySelector('[data-ipb-badge]');
    this._dateEl = this.querySelector('[data-ipb-date]');
    this._formId = this.dataset.formId;

    // Cache original button text first, then show initial state
    requestAnimationFrame(() => {
      this._atcButtons = this._getAtcButtons();
      this._originalButtonText = this._atcButtons.length
        ? this._atcButtons[0].textContent.trim()
        : 'Add to cart';

      const initialId = parseInt(this.dataset.selectedVariantId, 10);
      const initial = this._variants.find(v => v.id === initialId);
      if (initial) this._update(initial);
    });

    // Listen for variant changes dispatched by the theme's variant picker
    document.addEventListener('variant:change', (event) => {
      const variant = event.detail.variant;
      if (!variant) return;
      // Only respond to variants belonging to this product
      const data = this._variants.find(v => v.id === variant.id);
      if (!data) return;
      this._update(data);
    });
  }

  _getAtcButtons() {
    const id = this._formId;
    return [
      ...document.querySelectorAll(`#${id} [type="submit"]`),
      ...document.querySelectorAll(`[form="${id}"][type="submit"]`)
    ];
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
      this._setLineItemProperty(dateStr || variantData.backorderDate);
      // Delay so we run after the theme's variant:change handler resets the button
      requestAnimationFrame(() => this._setButtonText('Order' + (dateStr ? ' \u2013 ' + dateStr : '')));
    } else {
      this._badge.hidden = true;
      this._removeLineItemProperty();
      requestAnimationFrame(() => this._restoreButton());
    }
  }

  _setLineItemProperty(dateStr) {
    let input = document.querySelector(`#${this._formId} [name="properties[Backorder Date]"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'properties[Backorder Date]';
      const form = document.getElementById(this._formId);
      if (form) form.appendChild(input);
    }
    input.value = dateStr;
  }

  _removeLineItemProperty() {
    const input = document.querySelector(`#${this._formId} [name="properties[Backorder Date]"]`);
    if (input) input.remove();
  }

  _setButtonText(text) {
    const buttons = this._getAtcButtons();
    buttons.forEach(btn => {
      // Only update the visible text node, not any hidden child elements
      const textNode = [...btn.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = text;
      } else {
        btn.textContent = text;
      }
    });
  }

  _restoreButton() {
    if (!this._originalButtonText) return;
    this._setButtonText(this._originalButtonText);
  }
}

customElements.define('in-production-badge', InProductionBadge);
