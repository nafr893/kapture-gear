/**
 * System Builder Web Component
 * A multi-step product configurator for optic adapters and phone cases.
 * Supports multiple optic configurations.
 */
class SystemBuilder extends HTMLElement {
  constructor() {
    super();

    // Configuration limits
    this.MAX_OPTIC_CONFIGS = 15;

    // Optic configurations array - each config has its own state
    // Format: [{ id, opticBrand, opticModel, ringMount, magRing, collapsed }]
    this.opticConfigs = [];
    this.nextOpticConfigId = 1;

    // Global state (non-optic related)
    this.state = {
      adapter: null,
      phoneBrand: null,
      phoneModel: null,
      phoneCase: null
    };

    // Track which products are selected for cart (keyed by variant ID for multi-selection support)
    // Format: { variantId: { id, title, price, image, productTitle, productType, available, quantity } }
    this.selectedProducts = {};

    // Track which accessories are selected (keyed by blockId)
    this.selectedAccessories = {};

    // Data storage
    this.data = {
      opticBrands: [],
      opticModels: [],
      phoneBrands: [],
      phoneModels: [],
      adapterProduct: null,
      accessories: []
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
    const adapterProductEl = this.querySelector('[data-adapter-product]');
    const accessoriesEl = this.querySelector('[data-accessories]');

    try {
      this.data.opticBrands = opticBrandsEl ? JSON.parse(opticBrandsEl.textContent) : [];
      this.data.opticModels = opticModelsEl ? JSON.parse(opticModelsEl.textContent) : [];
      this.data.phoneBrands = phoneBrandsEl ? JSON.parse(phoneBrandsEl.textContent) : [];
      this.data.phoneModels = phoneModelsEl ? JSON.parse(phoneModelsEl.textContent) : [];
      this.data.adapterProduct = adapterProductEl ? JSON.parse(adapterProductEl.textContent) : null;
      this.data.accessories = accessoriesEl ? JSON.parse(accessoriesEl.textContent) : [];
    } catch (e) {
      console.error('System Builder: Error parsing data', e);
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Delegate click events
    this.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-chip]');
      if (chip) {
        this.handleChipClick(chip);
      }

      const productCard = e.target.closest('[data-product-card]');
      if (productCard) {
        this.handleProductCardClick(productCard);
      }

      const addToCartBtn = e.target.closest('[data-add-to-cart]');
      if (addToCartBtn) {
        this.handleAddToCart(addToCartBtn);
      }

      const removeBtn = e.target.closest('[data-summary-remove]');
      if (removeBtn) {
        this.handleRemoveFromSummary(removeBtn);
      }

      const removeAccessoryBtn = e.target.closest('[data-summary-remove-accessory]');
      if (removeAccessoryBtn) {
        this.handleRemoveAccessoryFromSummary(removeAccessoryBtn);
      }

      const quantityIncreaseBtn = e.target.closest('[data-quantity-increase]');
      if (quantityIncreaseBtn) {
        this.handleQuantityChange(quantityIncreaseBtn.dataset.quantityIncrease, 1);
      }

      const quantityDecreaseBtn = e.target.closest('[data-quantity-decrease]');
      if (quantityDecreaseBtn) {
        this.handleQuantityChange(quantityDecreaseBtn.dataset.quantityDecrease, -1);
      }

      // Add optic configuration button
      const addOpticBtn = e.target.closest('[data-add-optic]');
      if (addOpticBtn) {
        this.addOpticConfiguration();
      }

      // Remove optic configuration button
      const removeOpticBtn = e.target.closest('[data-remove-optic]');
      if (removeOpticBtn) {
        const configId = removeOpticBtn.dataset.removeOptic;
        this.removeOpticConfiguration(configId);
      }

    });

    // Keyboard support for product cards
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const productCard = e.target.closest('[data-product-card]');
        if (productCard) {
          e.preventDefault();
          this.handleProductCardClick(productCard);
        }
      }
    });
  }

  /**
   * Initialize state
   */
  initializeState() {
    // Initialize first optic configuration (config ID 0 from Liquid template)
    this.opticConfigs.push({
      id: '0',
      opticBrand: null,
      opticModel: null,
      ringMount: null,
      magRing: null
    });

    // Show empty state messages if no data
    if (this.data.opticBrands.length === 0) {
      console.warn('System Builder: No optic brands found.');
    }
    if (this.data.phoneBrands.length === 0) {
      console.warn('System Builder: No phone brands found.');
    }

    // Display adapter product if configured
    if (this.data.adapterProduct) {
      this.state.adapter = this.data.adapterProduct;
      this.displayVariantProduct('adapter', this.data.adapterProduct);
    }

    // Display accessories if configured
    if (this.data.accessories.length > 0) {
      this.displayAccessories();
    }

    // Update add optic button visibility
    this.updateAddOpticButtonVisibility();

    // Initialize summary
    this.updateSummary();
  }

  /**
   * Get optic configuration by ID
   */
  getOpticConfig(configId) {
    return this.opticConfigs.find(c => c.id === String(configId));
  }

  /**
   * Add a new optic configuration
   */
  addOpticConfiguration() {
    if (this.opticConfigs.length >= this.MAX_OPTIC_CONFIGS) {
      console.warn('System Builder: Maximum optic configurations reached');
      return;
    }

    const configId = String(this.nextOpticConfigId++);
    const newConfig = {
      id: configId,
      opticBrand: null,
      opticModel: null,
      ringMount: null,
      magRing: null
    };

    this.opticConfigs.push(newConfig);

    // Create new optic config element by cloning the first one
    const firstConfig = this.querySelector('[data-optic-config="0"]');
    const configsContainer = this.querySelector('[data-optic-configs]');

    if (!firstConfig || !configsContainer) return;

    const newConfigEl = firstConfig.cloneNode(true);
    newConfigEl.dataset.opticConfig = configId;

    // Update all data attributes in the cloned element
    newConfigEl.querySelectorAll('[data-remove-optic]').forEach(el => {
      el.dataset.removeOptic = configId;
      el.hidden = false; // Show remove button for new configs
    });
    newConfigEl.querySelectorAll('[data-optic-content]').forEach(el => {
      el.dataset.opticContent = configId;
    });

    // Reset the cloned config's state
    // Clear chip selections
    newConfigEl.querySelectorAll('[data-chip]').forEach(chip => {
      chip.classList.remove('system-builder__chip--selected');
      chip.setAttribute('aria-pressed', 'false');
    });

    // Hide model field and reset chips
    const modelField = newConfigEl.querySelector('[data-field="optic-model"]');
    if (modelField) {
      modelField.hidden = true;
      const modelChips = modelField.querySelector('[data-chips="optic-model"]');
      if (modelChips) modelChips.innerHTML = '';
    }

    // Hide product displays
    newConfigEl.querySelectorAll('[data-optic-product]').forEach(el => {
      el.hidden = true;
      const productDisplay = el.querySelector('[data-product]');
      if (productDisplay) {
        productDisplay.innerHTML = '<p class="system-builder__placeholder">Select your optic to see compatible products.</p>';
      }
    });

    // Hide model preview
    const modelPreview = newConfigEl.querySelector('[data-model-preview]');
    if (modelPreview) {
      modelPreview.hidden = true;
      const previewImage = modelPreview.querySelector('[data-model-preview-image]');
      if (previewImage) previewImage.innerHTML = '';
    }

    // Hide notice
    const notice = newConfigEl.querySelector('[data-model-notice]');
    if (notice) notice.hidden = true;

    configsContainer.appendChild(newConfigEl);

    // Update add button visibility
    this.updateAddOpticButtonVisibility();
  }

  /**
   * Remove an optic configuration
   */
  removeOpticConfiguration(configId) {
    const configIndex = this.opticConfigs.findIndex(c => c.id === String(configId));
    if (configIndex === -1) return;

    // Don't allow removing the first configuration
    if (configId === '0' && this.opticConfigs.length === 1) return;

    // Remove any selected products from this config
    const config = this.opticConfigs[configIndex];
    if (config.ringMount?.id) {
      delete this.selectedProducts[config.ringMount.id];
    }
    if (config.magRing?.id) {
      delete this.selectedProducts[config.magRing.id];
    }

    // Remove from array
    this.opticConfigs.splice(configIndex, 1);

    // Remove DOM element
    const configEl = this.querySelector(`[data-optic-config="${configId}"]`);
    if (configEl) {
      configEl.remove();
    }

    // Update add button visibility
    this.updateAddOpticButtonVisibility();

    // Update summary
    this.updateSummary();
  }

  /**
   * Update add optic button visibility based on limit
   */
  updateAddOpticButtonVisibility() {
    const addBtn = this.querySelector('[data-add-optic]');
    if (addBtn) {
      addBtn.hidden = this.opticConfigs.length >= this.MAX_OPTIC_CONFIGS;
    }
  }

  /**
   * Handle remove button click in summary
   */
  handleRemoveFromSummary(button) {
    const variantId = button.dataset.summaryRemove;
    if (!variantId || !this.selectedProducts[variantId]) return;

    delete this.selectedProducts[variantId];

    // Update all product cards with this variant ID
    this.querySelectorAll(`[data-product-card][data-variant-id="${variantId}"]`).forEach(card => {
      card.classList.remove('system-builder__product-card--selected');
      card.setAttribute('aria-pressed', 'false');
    });

    this.updateSummary();
  }

  /**
   * Handle remove accessory button click in summary
   */
  handleRemoveAccessoryFromSummary(button) {
    const blockId = button.dataset.summaryRemoveAccessory;
    if (!blockId) return;

    this.selectedAccessories[blockId] = false;

    const card = this.querySelector(`[data-product-card][data-accessory-block-id="${blockId}"]`);
    if (card) {
      card.classList.remove('system-builder__product-card--selected');
      card.setAttribute('aria-pressed', 'false');
    }

    this.updateSummary();
  }

  /**
   * Handle quantity change in summary
   */
  handleQuantityChange(variantId, delta) {
    if (!variantId || !this.selectedProducts[variantId]) return;

    const product = this.selectedProducts[variantId];
    const newQuantity = (product.quantity || 1) + delta;

    if (newQuantity <= 0) {
      delete this.selectedProducts[variantId];

      this.querySelectorAll(`[data-product-card][data-variant-id="${variantId}"]`).forEach(card => {
        card.classList.remove('system-builder__product-card--selected');
        card.setAttribute('aria-pressed', 'false');
      });
    } else {
      product.quantity = newQuantity;
    }

    this.updateSummary();
  }

  /**
   * Handle product card click
   */
  handleProductCardClick(card) {
    const productType = card.dataset.productType;
    if (!productType) return;

    const isAvailable = card.dataset.available !== 'false';
    if (!isAvailable) return;

    // Handle accessories separately
    if (productType === 'accessory') {
      const blockId = card.dataset.accessoryBlockId;
      if (!blockId) return;

      this.selectedAccessories[blockId] = !this.selectedAccessories[blockId];
      card.classList.toggle('system-builder__product-card--selected', this.selectedAccessories[blockId]);
      card.setAttribute('aria-pressed', this.selectedAccessories[blockId]);
      this.updateSummary();
      return;
    }

    const variantId = card.dataset.variantId;
    if (!variantId) return;

    // Get the config ID this card belongs to (if it's an optic product)
    const opticConfig = card.closest('[data-optic-config]');
    const configId = opticConfig ? opticConfig.dataset.opticConfig : null;

    // Map product type to state key
    const stateKeyMap = {
      'ring-mount': 'ringMount',
      'mag-ring': 'magRing',
      'adapter': 'adapter',
      'phone-case': 'phoneCase'
    };
    const stateKey = stateKeyMap[productType];
    if (!stateKey) return;

    // Get product data from the appropriate source
    let productData = null;
    if (configId !== null && (productType === 'ring-mount' || productType === 'mag-ring')) {
      const config = this.getOpticConfig(configId);
      if (config) {
        productData = config[stateKey];
      }
    } else {
      productData = this.state[stateKey];
    }

    // Add or increment quantity
    if (this.selectedProducts[variantId]) {
      this.selectedProducts[variantId].quantity = (this.selectedProducts[variantId].quantity || 1) + 1;
    } else if (productData) {
      this.selectedProducts[variantId] = {
        ...productData,
        productType: productType,
        quantity: 1
      };
    }

    const isSelected = !!this.selectedProducts[variantId];
    card.classList.toggle('system-builder__product-card--selected', isSelected);
    card.setAttribute('aria-pressed', isSelected);

    this.updateSummary();
  }

  /**
   * Handle chip selection
   */
  handleChipClick(chip) {
    const field = chip.dataset.field;
    const value = chip.dataset.value;

    // Update chip selection state within the same container
    const container = chip.closest('[data-chips]');
    if (container) {
      container.querySelectorAll('[data-chip]').forEach(c => {
        c.classList.remove('system-builder__chip--selected');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('system-builder__chip--selected');
      chip.setAttribute('aria-pressed', 'true');
    }

    // Determine if this is an optic field and get the config ID
    const opticConfig = chip.closest('[data-optic-config]');
    const configId = opticConfig ? opticConfig.dataset.opticConfig : null;

    switch (field) {
      case 'optic-brand':
        if (configId !== null) {
          const config = this.getOpticConfig(configId);
          if (config) {
            config.opticBrand = value;
            config.opticModel = null;
            this.updateOpticModels(configId);
            this.clearOpticProducts(configId);
          }
        }
        break;

      case 'optic-model':
        if (configId !== null) {
          const config = this.getOpticConfig(configId);
          if (config) {
            config.opticModel = value;
            this.updateOpticProducts(configId);
          }
        }
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
   * Update optic model chips for a specific config
   */
  updateOpticModels(configId) {
    const config = this.getOpticConfig(configId);
    if (!config) return;

    const configEl = this.querySelector(`[data-optic-config="${configId}"]`);
    if (!configEl) return;

    const modelField = configEl.querySelector('[data-field="optic-model"]');
    const modelChipsContainer = configEl.querySelector('[data-chips="optic-model"]');
    const noticeContainer = configEl.querySelector('[data-model-notice]');
    const noticeText = configEl.querySelector('[data-model-notice-text]');

    if (!modelField || !modelChipsContainer) return;

    // Filter models by selected brand
    const filteredModels = this.data.opticModels.filter(
      model => model.brandHandle === config.opticBrand
    );

    modelChipsContainer.innerHTML = '';

    if (filteredModels.length === 0) {
      modelChipsContainer.innerHTML = '<p class="system-builder__empty-message">No models available for this brand.</p>';
      if (noticeContainer) noticeContainer.hidden = true;
    } else {
      // Check for product notices
      const modelsWithNotice = filteredModels.filter(m => m.productNotice);
      if (noticeContainer && noticeText) {
        if (modelsWithNotice.length > 0) {
          noticeText.textContent = modelsWithNotice.map(m => m.productNotice).join(' ');
          noticeContainer.hidden = false;
        } else {
          noticeContainer.hidden = true;
        }
      }

      // Add chips
      filteredModels.forEach(model => {
        const chip = this.createChip(model.handle, model.name, 'optic-model');
        modelChipsContainer.appendChild(chip);
      });
    }

    modelField.hidden = false;
  }

  /**
   * Update ring mount and mag ring for a specific config
   */
  updateOpticProducts(configId) {
    const config = this.getOpticConfig(configId);
    if (!config || !config.opticModel) return;

    const configEl = this.querySelector(`[data-optic-config="${configId}"]`);
    if (!configEl) return;

    const modelData = this.data.opticModels.find(
      model => model.handle === config.opticModel
    );

    if (!modelData) return;

    // Display model preview
    this.displayModelPreview(configId, modelData);

    // Update ring mount
    const ringMountVariant = modelData.ringMount;
    config.ringMount = ringMountVariant;
    this.displayVariantProductInConfig(configId, 'ring-mount', ringMountVariant);

    // Update mag ring
    const magRingVariant = modelData.magRing;
    config.magRing = magRingVariant;
    this.displayVariantProductInConfig(configId, 'mag-ring', magRingVariant);

    // Show product containers
    configEl.querySelectorAll('[data-optic-product]').forEach(el => {
      el.hidden = false;
    });
  }

  /**
   * Display model preview for a specific config
   */
  displayModelPreview(configId, modelData) {
    const configEl = this.querySelector(`[data-optic-config="${configId}"]`);
    if (!configEl) return;

    const previewContainer = configEl.querySelector('[data-model-preview]');
    const imageContainer = configEl.querySelector('[data-model-preview-image]');

    if (!previewContainer || !imageContainer) return;

    if (modelData.modelImage) {
      imageContainer.innerHTML = `<img src="${modelData.modelImage}" alt="${modelData.name}" class="system-builder__model-preview-img" loading="lazy">`;
      previewContainer.hidden = false;
    } else {
      previewContainer.hidden = true;
      imageContainer.innerHTML = '';
    }
  }

  /**
   * Display variant product within a specific optic config
   */
  displayVariantProductInConfig(configId, productType, variantData) {
    const configEl = this.querySelector(`[data-optic-config="${configId}"]`);
    if (!configEl) return;

    const productContainer = configEl.querySelector(`[data-optic-product="${productType}"]`);
    const displayContainer = productContainer?.querySelector(`[data-product="${productType}"]`);

    if (!displayContainer) return;

    productContainer.hidden = false;

    if (!variantData) {
      displayContainer.innerHTML = '<p class="system-builder__empty-message">No compatible product found.</p>';
      return;
    }

    const imageUrl = variantData.image ? this.getImageUrl(variantData.image, 200) : '';
    const price = this.formatMoney(variantData.price);
    const displayTitle = variantData.productTitle
      ? (variantData.title && variantData.title !== 'Default Title'
          ? `${variantData.productTitle} - ${variantData.title}`
          : variantData.productTitle)
      : variantData.title || 'Product';

    const isSelected = !!this.selectedProducts[variantData.id];
    const isAvailable = variantData.available !== false;
    const outOfStockClass = !isAvailable ? ' system-builder__product-card--out-of-stock' : '';

    displayContainer.innerHTML = `
      <div class="system-builder__product-card${isSelected ? ' system-builder__product-card--selected' : ''}${outOfStockClass}"
           data-product-card
           data-product-type="${productType}"
           data-variant-id="${variantData.id}"
           data-available="${isAvailable}"
           role="button"
           tabindex="0"
           aria-pressed="${isSelected}"
           aria-label="Click to ${isSelected ? 'remove from' : 'add to'} your system: ${displayTitle}${!isAvailable ? ' (Out of Stock)' : ''}">
        <div class="system-builder__product-select-indicator">
          <span class="system-builder__checkmark"></span>
        </div>
        ${!isAvailable ? '<div class="system-builder__out-of-stock-badge">Out of Stock</div>' : ''}
        <div class="system-builder__product-image">
          ${imageUrl
            ? `<img src="${imageUrl}" alt="${displayTitle}" class="system-builder__product-img" loading="lazy">`
            : '<div class="system-builder__product-placeholder-image"></div>'
          }
        </div>
        <div class="system-builder__product-info">
          <h4 class="system-builder__product-title">${displayTitle}</h4>
          <p class="system-builder__product-price">${price}</p>
          ${!isAvailable ? '<p class="system-builder__stock-status">This item is currently out of stock</p>' : ''}
        </div>
        <input type="hidden" name="variant_id" value="${variantData.id}">
      </div>
    `;
  }

  /**
   * Clear optic products for a specific config
   */
  clearOpticProducts(configId) {
    const config = this.getOpticConfig(configId);
    if (!config) return;

    const configEl = this.querySelector(`[data-optic-config="${configId}"]`);
    if (!configEl) return;

    // Reset config state
    config.ringMount = null;
    config.magRing = null;

    // Hide and clear product displays
    configEl.querySelectorAll('[data-optic-product]').forEach(el => {
      el.hidden = true;
      const productDisplay = el.querySelector('[data-product]');
      if (productDisplay) {
        productDisplay.innerHTML = '<p class="system-builder__placeholder">Select your optic to see compatible products.</p>';
      }
    });

    // Hide model preview
    const previewContainer = configEl.querySelector('[data-model-preview]');
    if (previewContainer) {
      previewContainer.hidden = true;
      const imageContainer = previewContainer.querySelector('[data-model-preview-image]');
      if (imageContainer) imageContainer.innerHTML = '';
    }
  }

  /**
   * Display a variant product (for non-optic products like adapter)
   */
  displayVariantProduct(productType, variantData) {
    const container = this.querySelector(`[data-product="${productType}"]`);
    const stepContainer = this.querySelector(`[data-step="${productType}"]`);

    if (!container) return;

    if (stepContainer) stepContainer.hidden = false;
    container.hidden = false;

    if (!variantData) {
      container.innerHTML = '<p class="system-builder__empty-message">No compatible product found.</p>';
      return;
    }

    const imageUrl = variantData.image ? this.getImageUrl(variantData.image, 200) : '';
    const price = this.formatMoney(variantData.price);
    const displayTitle = variantData.productTitle
      ? (variantData.title && variantData.title !== 'Default Title'
          ? `${variantData.productTitle} - ${variantData.title}`
          : variantData.productTitle)
      : variantData.title || 'Product';

    const isSelected = !!this.selectedProducts[variantData.id];
    const isAvailable = variantData.available !== false;
    const outOfStockClass = !isAvailable ? ' system-builder__product-card--out-of-stock' : '';

    container.innerHTML = `
      <div class="system-builder__product-card${isSelected ? ' system-builder__product-card--selected' : ''}${outOfStockClass}"
           data-product-card
           data-product-type="${productType}"
           data-variant-id="${variantData.id}"
           data-available="${isAvailable}"
           role="button"
           tabindex="0"
           aria-pressed="${isSelected}"
           aria-label="Click to ${isSelected ? 'remove from' : 'add to'} your system: ${displayTitle}${!isAvailable ? ' (Out of Stock)' : ''}">
        <div class="system-builder__product-select-indicator">
          <span class="system-builder__checkmark"></span>
        </div>
        ${!isAvailable ? '<div class="system-builder__out-of-stock-badge">Out of Stock</div>' : ''}
        <div class="system-builder__product-image">
          ${imageUrl
            ? `<img src="${imageUrl}" alt="${displayTitle}" class="system-builder__product-img" loading="lazy">`
            : '<div class="system-builder__product-placeholder-image"></div>'
          }
        </div>
        <div class="system-builder__product-info">
          <h4 class="system-builder__product-title">${displayTitle}</h4>
          <p class="system-builder__product-price">${price}</p>
          ${!isAvailable ? '<p class="system-builder__stock-status">This item is currently out of stock</p>' : ''}
        </div>
        <input type="hidden" name="variant_id" value="${variantData.id}">
      </div>
    `;
  }

  /**
   * Display accessories
   */
  displayAccessories() {
    const grid = this.querySelector('[data-accessories-grid]');
    if (!grid) return;

    grid.innerHTML = '';

    this.data.accessories.forEach(accessory => {
      const isSelected = this.selectedAccessories[accessory.blockId] || false;
      const imageUrl = accessory.image ? this.getImageUrl(accessory.image, 200) : '';
      const price = this.formatMoney(accessory.price);
      const displayTitle = accessory.productTitle
        ? (accessory.title && accessory.title !== 'Default Title'
            ? `${accessory.productTitle} - ${accessory.title}`
            : accessory.productTitle)
        : accessory.title || 'Product';
      const isAvailable = accessory.available !== false;
      const outOfStockClass = !isAvailable ? ' system-builder__product-card--out-of-stock' : '';

      const cardHtml = `
        <div class="system-builder__product-card${isSelected ? ' system-builder__product-card--selected' : ''}${outOfStockClass}"
             data-product-card
             data-product-type="accessory"
             data-accessory-block-id="${accessory.blockId}"
             data-available="${isAvailable}"
             role="button"
             tabindex="0"
             aria-pressed="${isSelected}"
             aria-label="Click to ${isSelected ? 'remove from' : 'add to'} your system: ${displayTitle}${!isAvailable ? ' (Out of Stock)' : ''}">
          <div class="system-builder__product-select-indicator">
            <span class="system-builder__checkmark"></span>
          </div>
          ${!isAvailable ? '<div class="system-builder__out-of-stock-badge">Out of Stock</div>' : ''}
          <div class="system-builder__product-image">
            ${imageUrl
              ? `<img src="${imageUrl}" alt="${displayTitle}" class="system-builder__product-img" loading="lazy">`
              : '<div class="system-builder__product-placeholder-image"></div>'
            }
          </div>
          <div class="system-builder__product-info">
            <h4 class="system-builder__product-title">${displayTitle}</h4>
            <p class="system-builder__product-price">${price}</p>
            ${!isAvailable ? '<p class="system-builder__stock-status">This item is currently out of stock</p>' : ''}
          </div>
          <input type="hidden" name="variant_id" value="${accessory.id}" data-variant-id>
        </div>
      `;

      grid.insertAdjacentHTML('beforeend', cardHtml);
    });
  }

  /**
   * Update phone model chips
   */
  updatePhoneModels() {
    const modelField = this.querySelector('[data-field="phone-model"]');
    const modelChipsContainer = this.querySelector('[data-chips="phone-model"]');

    if (!modelField || !modelChipsContainer) return;

    const filteredModels = this.data.phoneModels.filter(
      model => model.brandHandle === this.state.phoneBrand
    );

    modelChipsContainer.innerHTML = '';

    if (filteredModels.length === 0) {
      modelChipsContainer.innerHTML = '<p class="system-builder__empty-message">No models available for this brand.</p>';
    } else {
      filteredModels.forEach(model => {
        const chip = this.createChip(model.handle, model.name, 'phone-model');
        modelChipsContainer.appendChild(chip);
      });
    }

    modelField.hidden = false;

    const phoneCaseDisplay = this.querySelector('[data-product="phone-case"]');
    if (phoneCaseDisplay) phoneCaseDisplay.hidden = true;
    this.state.phoneCase = null;
  }

  /**
   * Update phone case based on selection
   */
  updatePhoneCase() {
    if (!this.state.phoneModel) return;

    const modelData = this.data.phoneModels.find(
      model => model.handle === this.state.phoneModel
    );

    if (!modelData) return;

    this.state.phoneCase = modelData.phoneCase;
    this.displayVariantProduct('phone-case', modelData.phoneCase);
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
   * Update summary section
   */
  updateSummary() {
    const summary = this.querySelector('[data-summary]');
    if (!summary) return;

    const summaryItemsContainer = summary.querySelector('[data-summary-items]');
    const emptyState = summary.querySelector('[data-summary-empty]');
    const footer = summary.querySelector('[data-summary-footer]');

    const hasSelectedAccessories = Object.values(this.selectedAccessories).some(selected => selected);
    const selectedProductCount = Object.keys(this.selectedProducts).length;
    const hasSelectedProducts = selectedProductCount > 0 || hasSelectedAccessories;

    if (emptyState) emptyState.hidden = hasSelectedProducts;
    if (footer) footer.hidden = !hasSelectedProducts;

    if (summaryItemsContainer) {
      summaryItemsContainer.innerHTML = '';

      const productsByType = {
        'ring-mount': [],
        'mag-ring': [],
        'adapter': [],
        'phone-case': []
      };

      Object.entries(this.selectedProducts).forEach(([variantId, product]) => {
        if (product && product.productType && productsByType[product.productType]) {
          productsByType[product.productType].push({ variantId, ...product });
        }
      });

      ['ring-mount', 'mag-ring', 'adapter', 'phone-case'].forEach(type => {
        productsByType[type].forEach(product => {
          const itemHtml = this.createSummaryItemHtml(product.variantId, product);
          summaryItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
        });
      });

      // Add accessories
      this.data.accessories.forEach(accessory => {
        if (!this.selectedAccessories[accessory.blockId]) return;

        const displayTitle = accessory.productTitle
          ? (accessory.title && accessory.title !== 'Default Title'
              ? `${accessory.productTitle} - ${accessory.title}`
              : accessory.productTitle)
          : accessory.title || 'Product';

        const imageUrl = accessory.image ? this.getImageUrl(accessory.image, 120) : '';

        const itemHtml = `
          <div class="system-builder__summary-item" data-summary-item="accessory-${accessory.blockId}">
            <div class="system-builder__summary-item-image">
              ${imageUrl ? `<img src="${imageUrl}" alt="${displayTitle}" loading="lazy">` : ''}
            </div>
            <div class="system-builder__summary-item-details">
              <span class="system-builder__summary-name">${displayTitle}</span>
              <span class="system-builder__summary-price">${this.formatMoney(accessory.price)}</span>
            </div>
            <button type="button" class="system-builder__summary-remove" data-summary-remove-accessory="${accessory.blockId}" aria-label="Remove item">&times;</button>
          </div>
        `;

        summaryItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
      });
    }

    // Calculate total
    let total = 0;
    let itemCount = 0;

    Object.values(this.selectedProducts).forEach(product => {
      if (product?.price) {
        const qty = product.quantity || 1;
        total += product.price * qty;
        itemCount += qty;
      }
    });

    this.data.accessories.forEach(accessory => {
      if (this.selectedAccessories[accessory.blockId] && accessory.price) {
        total += accessory.price;
        itemCount++;
      }
    });

    const totalEl = summary.querySelector('[data-total-price]');
    if (totalEl) totalEl.textContent = this.formatMoney(total);

    const addToCartBtn = summary.querySelector('[data-add-to-cart]');
    if (addToCartBtn) {
      const baseText = addToCartBtn.dataset.originalText || addToCartBtn.textContent;
      if (!addToCartBtn.dataset.originalText) addToCartBtn.dataset.originalText = baseText;
      addToCartBtn.textContent = itemCount > 0
        ? `Add to Cart (${itemCount} item${itemCount > 1 ? 's' : ''})`
        : baseText;
    }
  }

  /**
   * Create summary item HTML
   */
  createSummaryItemHtml(variantId, product) {
    const displayTitle = product.productTitle
      ? (product.title && product.title !== 'Default Title'
          ? `${product.productTitle} - ${product.title}`
          : product.productTitle)
      : product.title || 'Product';

    const imageUrl = product.image ? this.getImageUrl(product.image, 120) : '';
    const quantity = product.quantity || 1;

    return `
      <div class="system-builder__summary-item" data-summary-item="${variantId}">
        <div class="system-builder__summary-item-image">
          ${imageUrl ? `<img src="${imageUrl}" alt="${displayTitle}" loading="lazy">` : ''}
        </div>
        <div class="system-builder__summary-item-details">
          <span class="system-builder__summary-name">${displayTitle}</span>
          <span class="system-builder__summary-price">${this.formatMoney(product.price * quantity)}</span>
        </div>
        <div class="system-builder__summary-quantity">
          <button type="button" class="system-builder__quantity-btn" data-quantity-decrease="${variantId}" aria-label="Decrease quantity">−</button>
          <span class="system-builder__quantity-value" data-quantity-display="${variantId}">${quantity}</span>
          <button type="button" class="system-builder__quantity-btn" data-quantity-increase="${variantId}" aria-label="Increase quantity">+</button>
        </div>
        <button type="button" class="system-builder__summary-remove" data-summary-remove="${variantId}" aria-label="Remove item">&times;</button>
      </div>
    `;
  }

  /**
   * Handle add to cart
   */
  async handleAddToCart(button) {
    const items = [];

    Object.entries(this.selectedProducts).forEach(([variantId, product]) => {
      if (product?.id) {
        items.push({ id: product.id, quantity: product.quantity || 1 });
      }
    });

    this.data.accessories.forEach(accessory => {
      if (this.selectedAccessories[accessory.blockId] && accessory.id) {
        items.push({ id: accessory.id, quantity: 1 });
      }
    });

    if (items.length === 0) {
      button.textContent = 'Select products first';
      setTimeout(() => {
        button.textContent = button.dataset.originalText || 'Add All to Cart';
      }, 2000);
      return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.dataset.originalText = originalText;
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

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.description || responseData.message || '';
        if (errorMessage.toLowerCase().includes('out of stock') ||
            errorMessage.toLowerCase().includes('not available') ||
            errorMessage.toLowerCase().includes('inventory')) {
          throw new Error('out_of_stock');
        }
        throw new Error(errorMessage || 'Failed to add to cart');
      }

      const cartResponse = await fetch('/cart.js', {
        headers: { 'Accept': 'application/json' }
      });
      const cart = await cartResponse.json();

      this.updateCartCount(cart.item_count);

      document.documentElement.dispatchEvent(
        new CustomEvent('cart:change', { bubbles: true, detail: { cart } })
      );
      document.dispatchEvent(
        new CustomEvent('cart:refresh', { bubbles: true, detail: { cart } })
      );

      button.textContent = 'Added!';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('System Builder: Error adding to cart', error);

      let errorText = 'Error - Try Again';
      if (error.message === 'out_of_stock') {
        errorText = 'Some items are out of stock';
      } else if (error.message && error.message.length <= 30) {
        errorText = error.message;
      }

      button.textContent = errorText;
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2500);
    }
  }

  /**
   * Update cart count in header
   */
  updateCartCount(count) {
    const selectors = [
      '.cart-count', '.cart-count-bubble', '[data-cart-count]', '.cart__count',
      '.header__cart-count', '#cart-icon-bubble', '.cart-icon__count',
      '.js-cart-count', '[data-cart-item-count]', '.site-header__cart-count'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.tagName !== 'SPAN' || !el.querySelector('span')) {
          el.textContent = count;
        }
        if (count > 0) {
          el.removeAttribute('hidden');
          el.style.display = '';
        }
      });
    });
  }

  /**
   * Format money value
   */
  formatMoney(cents) {
    if (typeof cents !== 'number') return '';
    if (window.Shopify?.formatMoney) return window.Shopify.formatMoney(cents);
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Get image URL with size
   */
  getImageUrl(image, size) {
    if (!image) return '';
    if (typeof image === 'string') {
      return image.replace(/(\.[^.]+)$/, `_${size}x$1`);
    }
    if (image.src) {
      return image.src.replace(/(\.[^.]+)$/, `_${size}x$1`);
    }
    return '';
  }
}

// Register the custom element
customElements.define('system-builder', SystemBuilder);
