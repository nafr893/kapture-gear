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
      ringMount: null,
      ringMountVariantId: null,
      magRing: null,
      adapter: null,
      phoneBrand: null,
      phoneModel: null,
      phoneCase: null
    };

    // Track which products are selected for cart (stores product data, not just boolean)
    this.selectedProducts = {
      ringMount: null,
      magRing: null,
      adapter: null,
      phoneCase: null
    };

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

      // Debug: Log loaded data to help identify field mapping issues
      console.log('System Builder: Loaded optic brands:', this.data.opticBrands);
      console.log('System Builder: Loaded optic models:', this.data.opticModels);
      console.log('System Builder: Loaded phone brands:', this.data.phoneBrands);
      console.log('System Builder: Loaded phone models:', this.data.phoneModels);
      console.log('System Builder: Loaded adapter product:', this.data.adapterProduct);
      console.log('System Builder: Loaded accessories:', this.data.accessories);
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
   * Handle remove button click in summary
   */
  handleRemoveFromSummary(button) {
    const stateKey = button.dataset.summaryRemove;
    if (!stateKey || !this.selectedProducts.hasOwnProperty(stateKey)) return;

    // Deselect the product
    this.selectedProducts[stateKey] = null;

    // Update the product card visual state
    const productTypeMap = {
      'ringMount': 'ring-mount',
      'magRing': 'mag-ring',
      'adapter': 'adapter',
      'phoneCase': 'phone-case'
    };
    const productType = productTypeMap[stateKey];
    const card = this.querySelector(`[data-product-card][data-product-type="${productType}"]`);
    if (card) {
      card.classList.remove('system-builder__product-card--selected');
      card.setAttribute('aria-pressed', 'false');
    }

    // Update summary
    this.updateSummary();
  }

  /**
   * Handle remove accessory button click in summary
   */
  handleRemoveAccessoryFromSummary(button) {
    const blockId = button.dataset.summaryRemoveAccessory;
    if (!blockId) return;

    // Deselect the accessory
    this.selectedAccessories[blockId] = false;

    // Update the product card visual state
    const card = this.querySelector(`[data-product-card][data-accessory-block-id="${blockId}"]`);
    if (card) {
      card.classList.remove('system-builder__product-card--selected');
      card.setAttribute('aria-pressed', 'false');
    }

    // Update summary
    this.updateSummary();
  }

  /**
   * Handle product card click for selection toggle
   */
  handleProductCardClick(card) {
    const productType = card.dataset.productType;
    if (!productType) return;

    // Check if item is available
    const isAvailable = card.dataset.available !== 'false';

    // Handle accessories separately
    if (productType === 'accessory') {
      const blockId = card.dataset.accessoryBlockId;
      if (!blockId) return;

      // If out of stock, don't allow selection
      if (!isAvailable) return;

      // Toggle selection
      this.selectedAccessories[blockId] = !this.selectedAccessories[blockId];

      // Update visual state
      card.classList.toggle('system-builder__product-card--selected', this.selectedAccessories[blockId]);
      card.setAttribute('aria-pressed', this.selectedAccessories[blockId]);

      // Update summary
      this.updateSummary();
      return;
    }

    // Map data attribute to state key
    const stateKeyMap = {
      'ring-mount': 'ringMount',
      'mag-ring': 'magRing',
      'adapter': 'adapter',
      'phone-case': 'phoneCase'
    };

    const stateKey = stateKeyMap[productType];
    if (!stateKey) return;

    // If out of stock, don't allow selection
    if (!isAvailable) return;

    // Toggle selection - store product data when selected, null when deselected
    if (this.selectedProducts[stateKey]) {
      // Currently selected, deselect it
      this.selectedProducts[stateKey] = null;
    } else {
      // Not selected, select it and store the product data
      this.selectedProducts[stateKey] = this.state[stateKey];
    }

    const isSelected = this.selectedProducts[stateKey] !== null;

    // Update visual state
    card.classList.toggle('system-builder__product-card--selected', isSelected);
    card.setAttribute('aria-pressed', isSelected);

    // Update summary
    this.updateSummary();
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

    // Display adapter product if configured (it's always visible)
    if (this.data.adapterProduct) {
      this.state.adapter = this.data.adapterProduct;
      this.displayVariantProduct('adapter', this.data.adapterProduct);
    }

    // Display accessories if configured
    if (this.data.accessories.length > 0) {
      this.displayAccessories();
    }

    // Initialize summary (shows empty state)
    this.updateSummary();
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
        this.updateOpticModels();
        this.clearOpticProducts();
        break;

      case 'optic-model':
        this.state.opticModel = value;
        this.updateOpticProducts();
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

    // Debug: Log filtering info
    console.log('System Builder: Filtering models for brand:', this.state.opticBrand);
    console.log('System Builder: Available models:', this.data.opticModels.map(m => ({
      name: m.name,
      handle: m.handle,
      brandHandle: m.brandHandle
    })));

    // Filter models by selected brand
    const filteredModels = this.data.opticModels.filter(
      model => model.brandHandle === this.state.opticBrand
    );

    console.log('System Builder: Filtered models:', filteredModels);

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
  }

  /**
   * Update Ring Mount and Mag Ring based on optic model selection
   */
  updateOpticProducts() {
    if (!this.state.opticModel) return;

    // Find the selected optic model data
    const modelData = this.data.opticModels.find(
      model => model.handle === this.state.opticModel
    );

    console.log('System Builder: Selected model data:', modelData);

    if (!modelData) return;

    // Display the model image preview if available
    this.displayModelPreview(modelData);

    // Get Ring Mount variant (now stored directly as a variant object)
    const ringMountVariant = modelData.ringMount;

    if (ringMountVariant) {
      this.state.ringMount = ringMountVariant;
      this.state.ringMountVariantId = ringMountVariant.id;
      this.displayVariantProduct('ring-mount', ringMountVariant);
    } else {
      this.state.ringMount = null;
      this.state.ringMountVariantId = null;
      this.displayProduct('ring-mount', null);
    }

    // Get Mag Ring variant (now stored directly as a variant object)
    const magRingVariant = modelData.magRing;
    this.state.magRing = magRingVariant;
    this.displayVariantProduct('mag-ring', magRingVariant);

    // Show the step containers
    const ringMountStep = this.querySelector('[data-step="ring-mount"]');
    const magRingStep = this.querySelector('[data-step="mag-ring"]');
    if (ringMountStep) ringMountStep.hidden = false;
    if (magRingStep) magRingStep.hidden = false;
  }

  /**
   * Display the selected model image preview
   */
  displayModelPreview(modelData) {
    const previewContainer = this.querySelector('[data-model-preview]');
    const imageContainer = this.querySelector('[data-model-preview-image]');

    if (!previewContainer || !imageContainer) return;

    // Check if model has an image
    if (modelData.modelImage) {
      imageContainer.innerHTML = `<img src="${modelData.modelImage}" alt="${modelData.name}" class="system-builder__model-preview-img" loading="lazy">`;
      previewContainer.hidden = false;
    } else {
      // No image available, hide the preview
      previewContainer.hidden = true;
      imageContainer.innerHTML = '';
    }
  }

  /**
   * Hide the model preview
   */
  hideModelPreview() {
    const previewContainer = this.querySelector('[data-model-preview]');
    const imageContainer = this.querySelector('[data-model-preview-image]');
    if (previewContainer) {
      previewContainer.hidden = true;
    }
    if (imageContainer) {
      imageContainer.innerHTML = '';
    }
  }

  /**
   * Display a variant product (from variant reference)
   */
  displayVariantProduct(productType, variantData) {
    const container = this.querySelector(`[data-product="${productType}"]`);
    const stepContainer = this.querySelector(`[data-step="${productType}"]`);

    if (!container) return;

    // Show the step container
    if (stepContainer) {
      stepContainer.hidden = false;
    }
    container.hidden = false;

    if (!variantData) {
      container.innerHTML = '<p class="system-builder__empty-message">No compatible product found.</p>';
      return;
    }

    // Create product card HTML using variant data structure
    const imageUrl = variantData.image
      ? this.getImageUrl(variantData.image, 200)
      : '';

    const price = this.formatMoney(variantData.price);
    const displayTitle = variantData.productTitle
      ? (variantData.title && variantData.title !== 'Default Title'
          ? `${variantData.productTitle} - ${variantData.title}`
          : variantData.productTitle)
      : variantData.title || 'Product';

    // Map product type to state key for checking selection
    const stateKeyMap = {
      'ring-mount': 'ringMount',
      'mag-ring': 'magRing',
      'adapter': 'adapter',
      'phone-case': 'phoneCase'
    };
    const stateKey = stateKeyMap[productType];
    const isSelected = stateKey ? this.selectedProducts[stateKey] : false;
    const isAvailable = variantData.available !== false;
    const outOfStockClass = !isAvailable ? ' system-builder__product-card--out-of-stock' : '';

    container.innerHTML = `
      <div class="system-builder__product-card${isSelected ? ' system-builder__product-card--selected' : ''}${outOfStockClass}"
           data-product-card
           data-product-type="${productType}"
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

        <input type="hidden" name="variant_id" value="${variantData.id}" data-variant-id>
      </div>
    `;
  }

  /**
   * Display all accessories in the accessories grid
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
   * Update phone model chips based on selected brand
   */
  updatePhoneModels() {
    const modelField = this.querySelector('[data-field="phone-model"]');
    const modelChipsContainer = this.querySelector('[data-chips="phone-model"]');

    if (!modelField || !modelChipsContainer) return;

    // Debug: Log filtering info
    console.log('System Builder: Filtering phone models for brand:', this.state.phoneBrand);
    console.log('System Builder: Available phone models:', this.data.phoneModels.map(m => ({
      name: m.name,
      handle: m.handle,
      brandHandle: m.brandHandle
    })));

    // Filter models by selected brand
    const filteredModels = this.data.phoneModels.filter(
      model => model.brandHandle === this.state.phoneBrand
    );

    console.log('System Builder: Filtered phone models:', filteredModels);

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

    // Hide phone case until model is selected and reset selection
    const phoneCaseDisplay = this.querySelector('[data-product="phone-case"]');
    if (phoneCaseDisplay) {
      phoneCaseDisplay.hidden = true;
    }
    this.state.phoneCase = null;
    this.selectedProducts.phoneCase = false;
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
   * Clear optic-related product displays
   */
  clearOpticProducts() {
    const productTypes = ['ring-mount', 'mag-ring'];

    productTypes.forEach(type => {
      const container = this.querySelector(`[data-product="${type}"]`);
      const stepContainer = this.querySelector(`[data-step="${type}"]`);

      if (container) {
        container.innerHTML = '<p class="system-builder__placeholder">Select your optic to see compatible products.</p>';
      }
      if (stepContainer) {
        stepContainer.hidden = true;
      }
    });

    this.state.ringMount = null;
    this.state.ringMountVariantId = null;
    this.state.magRing = null;

    // Note: We do NOT clear selectedProducts here - items stay in "Your Selection"
    // until explicitly removed by the user clicking the X button

    // Hide model preview when brand changes
    this.hideModelPreview();
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

    // Update state (now a variant object)
    this.state.phoneCase = modelData.phoneCase;

    // Display variant product
    this.displayVariantProduct('phone-case', modelData.phoneCase);
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

    // Map product type to state key for checking selection
    const stateKeyMap = {
      'ring-mount': 'ringMount',
      'mag-ring': 'magRing',
      'adapter': 'adapter',
      'phone-case': 'phoneCase'
    };
    const stateKey = stateKeyMap[productType];
    const isSelected = stateKey ? this.selectedProducts[stateKey] : false;

    container.innerHTML = `
      <div class="system-builder__product-card${isSelected ? ' system-builder__product-card--selected' : ''}"
           data-product-card
           data-product-type="${productType}"
           role="button"
           tabindex="0"
           aria-pressed="${isSelected}"
           aria-label="Click to ${isSelected ? 'remove from' : 'add to'} your system: ${productData.title}">
        <div class="system-builder__product-select-indicator">
          <span class="system-builder__checkmark"></span>
        </div>
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
        <p class="system-builder__product-hint">Click to select</p>
        <input type="hidden" name="variant_id" value="${variantId}" data-variant-id>
      </div>
    `;
  }

  /**
   * Clear all product displays (used for full reset)
   */
  clearProducts() {
    const productContainers = ['ring-mount', 'mag-ring', 'phone-case'];

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

    this.state.ringMount = null;
    this.state.ringMountVariantId = null;
    this.state.magRing = null;
  }

  /**
   * Update the summary section
   */
  updateSummary() {
    const summary = this.querySelector('[data-summary]');
    if (!summary) return;

    const emptyState = summary.querySelector('[data-summary-empty]');
    const footer = summary.querySelector('[data-summary-footer]');

    // Check if any accessories are selected
    const hasSelectedAccessories = Object.values(this.selectedAccessories).some(selected => selected);

    // Check if any products are SELECTED (selectedProducts now stores product data, not boolean)
    const hasSelectedProducts =
      this.selectedProducts.ringMount ||
      this.selectedProducts.magRing ||
      this.selectedProducts.adapter ||
      this.selectedProducts.phoneCase ||
      hasSelectedAccessories;

    // Show/hide empty state and footer
    if (emptyState) emptyState.hidden = hasSelectedProducts;
    if (footer) footer.hidden = !hasSelectedProducts;

    // Update individual items - use stored product data directly from selectedProducts
    this.updateSummaryItemVariant('ring-mount', this.selectedProducts.ringMount);
    this.updateSummaryItemVariant('mag-ring', this.selectedProducts.magRing);
    this.updateSummaryItemVariant('adapter', this.selectedProducts.adapter);
    this.updateSummaryItemVariant('phone-case', this.selectedProducts.phoneCase);

    // Update accessories summary
    this.updateAccessoriesSummary();

    // Calculate and display total - use stored product data
    let total = 0;
    let itemCount = 0;

    if (this.selectedProducts.ringMount?.price) {
      total += this.selectedProducts.ringMount.price;
      itemCount++;
    }
    if (this.selectedProducts.magRing?.price) {
      total += this.selectedProducts.magRing.price;
      itemCount++;
    }
    if (this.selectedProducts.adapter?.price) {
      total += this.selectedProducts.adapter.price;
      itemCount++;
    }
    if (this.selectedProducts.phoneCase?.price) {
      total += this.selectedProducts.phoneCase.price;
      itemCount++;
    }

    // Add selected accessories to total
    this.data.accessories.forEach(accessory => {
      if (this.selectedAccessories[accessory.blockId] && accessory.price) {
        total += accessory.price;
        itemCount++;
      }
    });

    const totalEl = summary.querySelector('[data-total-price]');
    if (totalEl) {
      totalEl.textContent = this.formatMoney(total);
    }

    // Update add to cart button text with item count
    const addToCartBtn = summary.querySelector('[data-add-to-cart]');
    if (addToCartBtn && itemCount > 0) {
      const baseText = addToCartBtn.dataset.originalText || addToCartBtn.textContent;
      if (!addToCartBtn.dataset.originalText) {
        addToCartBtn.dataset.originalText = baseText;
      }
      addToCartBtn.textContent = `Add to Cart (${itemCount} item${itemCount > 1 ? 's' : ''})`;
    }
  }

  /**
   * Update accessories summary items
   */
  updateAccessoriesSummary() {
    const container = this.querySelector('[data-summary-accessories]');
    if (!container) return;

    container.innerHTML = '';

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
          <div class="system-builder__summary-item-image" data-summary-image>
            ${imageUrl ? `<img src="${imageUrl}" alt="${displayTitle}" loading="lazy">` : ''}
          </div>
          <div class="system-builder__summary-item-details">
            <span class="system-builder__summary-name" data-summary-name>${displayTitle}</span>
            <span class="system-builder__summary-price" data-summary-price>${this.formatMoney(accessory.price)}</span>
          </div>
          <button type="button" class="system-builder__summary-remove" data-summary-remove-accessory="${accessory.blockId}" aria-label="Remove item">&times;</button>
        </div>
      `;

      container.insertAdjacentHTML('beforeend', itemHtml);
    });
  }

  /**
   * Update a summary item for variant data
   */
  updateSummaryItemVariant(type, variantData) {
    const item = this.querySelector(`[data-summary-item="${type}"]`);
    if (!item) return;

    const imageEl = item.querySelector('[data-summary-image]');
    const nameEl = item.querySelector('[data-summary-name]');
    const priceEl = item.querySelector('[data-summary-price]');

    if (variantData) {
      item.hidden = false;
      const displayTitle = variantData.productTitle
        ? (variantData.title && variantData.title !== 'Default Title'
            ? `${variantData.productTitle} - ${variantData.title}`
            : variantData.productTitle)
        : variantData.title || 'Product';
      if (nameEl) nameEl.textContent = displayTitle;
      if (priceEl) priceEl.textContent = this.formatMoney(variantData.price);

      // Update image
      if (imageEl) {
        const imageUrl = variantData.image ? this.getImageUrl(variantData.image, 120) : '';
        if (imageUrl) {
          imageEl.innerHTML = `<img src="${imageUrl}" alt="${displayTitle}" loading="lazy">`;
        } else {
          imageEl.innerHTML = '';
        }
      }
    } else {
      item.hidden = true;
    }
  }

  /**
   * Update a summary item
   */
  updateSummaryItem(type, product) {
    const item = this.querySelector(`[data-summary-item="${type}"]`);
    if (!item) return;

    const imageEl = item.querySelector('[data-summary-image]');
    const nameEl = item.querySelector('[data-summary-name]');
    const priceEl = item.querySelector('[data-summary-price]');

    if (product) {
      item.hidden = false;
      if (nameEl) nameEl.textContent = product.title;
      if (priceEl) priceEl.textContent = this.formatMoney(product.price);

      // Update image
      if (imageEl) {
        const imageUrl = product.featured_image ? this.getImageUrl(product.featured_image, 120) : '';
        if (imageUrl) {
          imageEl.innerHTML = `<img src="${imageUrl}" alt="${product.title}" loading="lazy">`;
        } else {
          imageEl.innerHTML = '';
        }
      }
    } else {
      item.hidden = true;
    }
  }

  /**
   * Handle add to cart
   */
  async handleAddToCart(button) {
    const items = [];

    // Only add products that are SELECTED by the user (selectedProducts stores actual product data)
    if (this.selectedProducts.ringMount?.id) {
      items.push({ id: this.selectedProducts.ringMount.id, quantity: 1 });
    }

    if (this.selectedProducts.magRing?.id) {
      items.push({ id: this.selectedProducts.magRing.id, quantity: 1 });
    }

    // Adapter now uses the same variant structure
    if (this.selectedProducts.adapter?.id) {
      items.push({ id: this.selectedProducts.adapter.id, quantity: 1 });
    }

    if (this.selectedProducts.phoneCase?.id) {
      items.push({ id: this.selectedProducts.phoneCase.id, quantity: 1 });
    }

    // Add selected accessories
    this.data.accessories.forEach(accessory => {
      if (this.selectedAccessories[accessory.blockId] && accessory.id) {
        items.push({ id: accessory.id, quantity: 1 });
      }
    });

    if (items.length === 0) {
      console.warn('System Builder: No products selected');
      // Show a brief message to user
      button.textContent = 'Select products first';
      setTimeout(() => {
        button.textContent = button.dataset.originalText || 'Add All to Cart';
      }, 2000);
      return;
    }

    // Disable button and show loading state
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
        // Check for specific error types
        const errorMessage = responseData.description || responseData.message || '';
        if (errorMessage.toLowerCase().includes('out of stock') ||
            errorMessage.toLowerCase().includes('not available') ||
            errorMessage.toLowerCase().includes('inventory')) {
          throw new Error('out_of_stock');
        }
        throw new Error(errorMessage || 'Failed to add to cart');
      }

      // Fetch the updated cart to get correct count
      const cartResponse = await fetch('/cart.js', {
        headers: { 'Accept': 'application/json' }
      });
      const cart = await cartResponse.json();

      // Update cart count in header (try multiple common selectors)
      this.updateCartCount(cart.item_count);

      // Dispatch cart change events for theme integration
      document.documentElement.dispatchEvent(
        new CustomEvent('cart:change', {
          bubbles: true,
          detail: { cart: cart }
        })
      );

      // Also try dispatching on document for themes that listen there
      document.dispatchEvent(
        new CustomEvent('cart:refresh', {
          bubbles: true,
          detail: { cart: cart }
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

      // Provide specific error message based on error type
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
    // Try multiple common selectors used by different Shopify themes
    const selectors = [
      '.cart-count',
      '.cart-count-bubble',
      '[data-cart-count]',
      '.cart__count',
      '.header__cart-count',
      '#cart-icon-bubble',
      '.cart-icon__count',
      '.js-cart-count',
      '[data-cart-item-count]',
      '.site-header__cart-count'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Handle elements that show count as text content
        if (el.tagName !== 'SPAN' || !el.querySelector('span')) {
          el.textContent = count;
        }
        // Handle bubble/badge visibility
        if (count > 0) {
          el.removeAttribute('hidden');
          el.style.display = '';
        }
      });
    });

    // Also try to find cart count in common attribute patterns
    const cartBubbles = document.querySelectorAll('[class*="cart"] [class*="count"], [class*="cart"] [class*="bubble"]');
    cartBubbles.forEach(el => {
      if (el.children.length === 0 || (el.children.length === 1 && el.firstElementChild.tagName === 'SPAN')) {
        const textNode = el.childNodes[0];
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          textNode.textContent = count;
        } else if (el.children.length === 0) {
          el.textContent = count;
        }
      }
    });
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