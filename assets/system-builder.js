/**
 * System Builder Web Component
 * A multi-step product configurator for optic adapters and phone cases.
 */
class SystemBuilder extends HTMLElement {
  constructor() {
    super();

    // State management
    this.state = {
      opticBrand: null,
      opticModel: null,
      mountType: null,
      magRing: null,
      adapter: null,
      phoneBrand: null,
      phoneModel: null,
      phoneCase: null
    };

    // Data storage
    this.data = {
      opticBrands: [],
      opticModels: [],
      phoneBrands: [],
      phoneModels: []
    };

    // Money formatter
    this.moneyFormat = window.Shopify?.currency?.active || 'USD';
  }

  connectedCallback() {
    this.loadData();
    this.bindEvents();
    this.initializeState();
  }

  /**
   * Load metaobject data from embedded JSON
   */
  loadData() {
    const opticBrandsEl = this.querySelector('[data-optic-brands]');
    const opticModelsEl = this.querySelector('[data-optic-models]');
    const phoneBrandsEl = this.querySelector('[data-phone-brands]');
    const phoneModelsEl = this.querySelector('[data-phone-models]');

    try {
      this.data.opticBrands = opticBrandsEl ? JSON.parse(opticBrandsEl.textContent) : [];
      this.data.opticModels = opticModelsEl ? JSON.parse(opticModelsEl.textContent) : [];
      this.data.phoneBrands = phoneBrandsEl ? JSON.parse(phoneBrandsEl.textContent) : [];
      this.data.phoneModels = phoneModelsEl ? JSON.parse(phoneModelsEl.textContent) : [];
    } catch (e) {
      console.error('System Builder: Error parsing data', e);
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Delegate chip click events
    this.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-chip]');
      if (chip) {
        this.handleChipClick(chip);
      }

      const addToCartBtn = e.target.closest('[data-add-to-cart]');
      if (addToCartBtn) {
        this.handleAddToCart(addToCartBtn);
      }
    });
  }

  /**
   * Initialize any default state
   */
  initializeState() {
    // Show empty state messages if no data
    if (this.data.opticBrands.length === 0) {
      console.warn('System Builder: No optic brands found. Please add entries to the optic_brand metaobject.');
    }
    if (this.data.phoneBrands.length === 0) {
      console.warn('System Builder: No phone brands found. Please add entries to the phone_brand metaobject.');
    }
  }

  /**
   * Handle chip selection
   */
  handleChipClick(chip) {
    const field = chip.dataset.field;
    const value = chip.dataset.value;

    // Update chip selection state
    const container = chip.closest('[data-chips]');
    if (container) {
      container.querySelectorAll('[data-chip]').forEach(c => {
        c.classList.remove('system-builder__chip--selected');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('system-builder__chip--selected');
      chip.setAttribute('aria-pressed', 'true');
    }

    // Update state and trigger appropriate actions
    switch (field) {
      case 'optic-brand':
        this.state.opticBrand = value;
        this.state.opticModel = null;
        this.state.mountType = null;
        this.updateOpticModels();
        this.clearProducts();
        break;

      case 'optic-model':
        this.state.opticModel = value;
        this.showMountTypeField();
        break;

      case 'mount-type':
        this.state.mountType = value;
        this.updateSelectedProducts();
        break;

      case 'phone-brand':
        this.state.phoneBrand = value;
        this.state.phoneModel = null;
        this.updatePhoneModels();
        break;

      case 'phone-model':
        this.state.phoneModel = value;
        this.updatePhoneCase();
        break;
    }

    this.updateSummary();
  }

  /**
   * Update optic model chips based on selected brand
   */
  updateOpticModels() {
    const modelField = this.querySelector('[data-field="optic-model"]');
    const modelChipsContainer = this.querySelector('[data-chips="optic-model"]');

    if (!modelField || !modelChipsContainer) return;

    // Filter models by selected brand
    const filteredModels = this.data.opticModels.filter(
      model => model.brandHandle === this.state.opticBrand
    );

    // Clear and populate model chips
    modelChipsContainer.innerHTML = '';

    if (filteredModels.length === 0) {
      modelChipsContainer.innerHTML = '<p class="system-builder__empty-message">No models available for this brand.</p>';
    } else {
      filteredModels.forEach(model => {
        const chip = this.createChip(model.handle, model.name, 'optic-model');
        modelChipsContainer.appendChild(chip);
      });
    }

    // Show the model field
    modelField.hidden = false;

    // Hide mount type until model is selected
    const mountTypeField = this.querySelector('[data-field="mount-type"]');
    if (mountTypeField) {
      mountTypeField.hidden = true;
    }
  }

  /**
   * Show mount type field after model selection
   */
  showMountTypeField() {
    const mountTypeField = this.querySelector('[data-field="mount-type"]');
    if (mountTypeField) {
      mountTypeField.hidden = false;

      // Clear previous selection
      mountTypeField.querySelectorAll('[data-chip]').forEach(c => {
        c.classList.remove('system-builder__chip--selected');
        c.setAttribute('aria-pressed', 'false');
      });
    }
  }

  /**
   * Update phone model chips based on selected brand
   */
  updatePhoneModels() {
    const modelField = this.querySelector('[data-field="phone-model"]');
    const modelChipsContainer = this.querySelector('[data-chips="phone-model"]');

    if (!modelField || !modelChipsContainer) return;

    // Filter models by selected brand
    const filteredModels = this.data.phoneModels.filter(
      model => model.brandHandle === this.state.phoneBrand
    );

    // Clear and populate model chips
    modelChipsContainer.innerHTML = '';

    if (filteredModels.length === 0) {
      modelChipsContainer.innerHTML = '<p class="system-builder__empty-message">No models available for this brand.</p>';
    } else {
      filteredModels.forEach(model => {
        const chip = this.createChip(model.handle, model.name, 'phone-model');
        modelChipsContainer.appendChild(chip);
      });
    }

    // Show the model field
    modelField.hidden = false;

    // Hide phone case until model is selected
    const phoneCaseDisplay = this.querySelector('[data-product="phone-case"]');
    if (phoneCaseDisplay) {
      phoneCaseDisplay.hidden = true;
    }
  }

  /**
   * Create a chip element
   */
  createChip(value, label, field) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'system-builder__chip';
    button.dataset.chip = '';
    button.dataset.field = field;
    button.dataset.value = value;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<span class="system-builder__chip-label">${label}</span>`;
    return button;
  }

  /**
   * Update mag ring and adapter based on optic model and mount type
   */
  updateSelectedProducts() {
    if (!this.state.opticModel || !this.state.mountType) return;

    // Find the selected optic model data
    const modelData = this.data.opticModels.find(
      model => model.handle === this.state.opticModel
    );

    if (!modelData) return;

    // Get the appropriate products based on mount type
    const magRingProduct = this.state.mountType === 'integrated'
      ? modelData.magRingIntegrated
      : modelData.magRingEyecup;

    const adapterProduct = this.state.mountType === 'integrated'
      ? modelData.adapterIntegrated
      : modelData.adapterEyecup;

    // Update state
    this.state.magRing = magRingProduct;
    this.state.adapter = adapterProduct;

    // Display products
    this.displayProduct('mag-ring', magRingProduct);
    this.displayProduct('adapter', adapterProduct);
  }

  /**
   * Update phone case based on phone model selection
   */
  updatePhoneCase() {
    if (!this.state.phoneModel) return;

    // Find the selected phone model data
    const modelData = this.data.phoneModels.find(
      model => model.handle === this.state.phoneModel
    );

    if (!modelData) return;

    // Update state
    this.state.phoneCase = modelData.phoneCase;

    // Display product
    this.displayProduct('phone-case', modelData.phoneCase);
  }

  /**
   * Display a product in the appropriate container
   */
  displayProduct(productType, productData) {
    const container = this.querySelector(`[data-product="${productType}"]`);
    const stepContainer = this.querySelector(`[data-step="${productType}"]`);

    if (!container) return;

    // Show the step container
    if (stepContainer) {
      stepContainer.hidden = false;
    }
    container.hidden = false;

    if (!productData) {
      container.innerHTML = '<p class="system-builder__empty-message">No compatible product found.</p>';
      return;
    }

    // Create product card HTML
    const imageUrl = productData.featured_image
      ? this.getImageUrl(productData.featured_image, 200)
      : '';

    const price = this.formatMoney(productData.price);
    const variantId = productData.variants?.[0]?.id || productData.id;

    container.innerHTML = `
      <div class="system-builder__product-card" data-product-card data-product-type="${productType}">
        <div class="system-builder__product-image">
          ${imageUrl
            ? `<img src="${imageUrl}" alt="${productData.title}" class="system-builder__product-img" loading="lazy">`
            : '<div class="system-builder__product-placeholder-image"></div>'
          }
        </div>
        <div class="system-builder__product-info">
          <h4 class="system-builder__product-title">${productData.title}</h4>
          <p class="system-builder__product-price">${price}</p>
        </div>
        <input type="hidden" name="variant_id" value="${variantId}" data-variant-id>
      </div>
    `;
  }

  /**
   * Clear product displays
   */
  clearProducts() {
    const productContainers = ['mag-ring', 'adapter', 'phone-case'];

    productContainers.forEach(type => {
      const container = this.querySelector(`[data-product="${type}"]`);
      const stepContainer = this.querySelector(`[data-step="${type}"]`);

      if (container) {
        container.innerHTML = '<p class="system-builder__placeholder">Select your optic to see compatible products.</p>';
      }
      if (stepContainer && type !== 'phone-case') {
        stepContainer.hidden = true;
      }
    });

    this.state.magRing = null;
    this.state.adapter = null;
  }

  /**
   * Update the summary section
   */
  updateSummary() {
    const summary = this.querySelector('[data-summary]');
    if (!summary) return;

    const hasProducts = this.state.magRing || this.state.adapter || this.state.phoneCase;

    if (!hasProducts) {
      summary.hidden = true;
      return;
    }

    summary.hidden = false;

    // Update individual items
    this.updateSummaryItem('mag-ring', this.state.magRing);
    this.updateSummaryItem('adapter', this.state.adapter);
    this.updateSummaryItem('phone-case', this.state.phoneCase);

    // Calculate and display total
    let total = 0;
    if (this.state.magRing?.price) total += this.state.magRing.price;
    if (this.state.adapter?.price) total += this.state.adapter.price;
    if (this.state.phoneCase?.price) total += this.state.phoneCase.price;

    const totalEl = summary.querySelector('[data-total-price]');
    if (totalEl) {
      totalEl.textContent = this.formatMoney(total);
    }
  }

  /**
   * Update a summary item
   */
  updateSummaryItem(type, product) {
    const item = this.querySelector(`[data-summary-item="${type}"]`);
    if (!item) return;

    const nameEl = item.querySelector('[data-summary-name]');
    const priceEl = item.querySelector('[data-summary-price]');

    if (product) {
      item.hidden = false;
      if (nameEl) nameEl.textContent = product.title;
      if (priceEl) priceEl.textContent = this.formatMoney(product.price);
    } else {
      item.hidden = true;
    }
  }

  /**
   * Handle add to cart
   */
  async handleAddToCart(button) {
    const items = [];

    // Collect all selected products
    if (this.state.magRing) {
      const variantId = this.state.magRing.variants?.[0]?.id || this.state.magRing.id;
      if (variantId) {
        items.push({ id: variantId, quantity: 1 });
      }
    }

    if (this.state.adapter) {
      const variantId = this.state.adapter.variants?.[0]?.id || this.state.adapter.id;
      if (variantId) {
        items.push({ id: variantId, quantity: 1 });
      }
    }

    if (this.state.phoneCase) {
      const variantId = this.state.phoneCase.variants?.[0]?.id || this.state.phoneCase.id;
      if (variantId) {
        items.push({ id: variantId, quantity: 1 });
      }
    }

    if (items.length === 0) {
      console.warn('System Builder: No products selected');
      return;
    }

    // Disable button and show loading state
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Adding...';

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }

      const result = await response.json();

      // Success - dispatch cart change event for theme integration
      document.documentElement.dispatchEvent(
        new CustomEvent('cart:change', {
          bubbles: true,
          detail: { cart: result }
        })
      );

      // Show success state
      button.textContent = 'Added!';

      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('System Builder: Error adding to cart', error);
      button.textContent = 'Error - Try Again';

      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);
    }
  }

  /**
   * Format money value
   */
  formatMoney(cents) {
    if (typeof cents !== 'number') return '';

    // Use Shopify's money format if available, otherwise basic formatting
    if (window.Shopify?.formatMoney) {
      return window.Shopify.formatMoney(cents);
    }

    // Basic formatting fallback
    const dollars = (cents / 100).toFixed(2);
    return `$${dollars}`;
  }

  /**
   * Get image URL with size
   */
  getImageUrl(image, size) {
    if (!image) return '';

    // If it's already a URL string
    if (typeof image === 'string') {
      return image.replace(/(\.[^.]+)$/, `_${size}x$1`);
    }

    // If it's an image object with src
    if (image.src) {
      return image.src.replace(/(\.[^.]+)$/, `_${size}x$1`);
    }

    return '';
  }
}

// Register the custom element
customElements.define('system-builder', SystemBuilder);
