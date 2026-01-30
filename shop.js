// Product class to create shop items
class Product {
    constructor(id, name, price, description, category, images, originalPrice = null, discount = 0) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.category = category;
        // Accept both single string or array of images
        this.images = Array.isArray(images) ? images : [images];
        this.originalPrice = originalPrice || price;
        this.discount = discount;
        this.currentImageIndex = 0;
    }

    formatPrice(price) {
        return 'Rp ' + price.toLocaleString('id-ID');
    }

    hasDiscount() {
        return this.discount > 0;
    }

    calculateDiscountedPrice() {
        if (this.hasDiscount()) {
            return Math.round(this.originalPrice * (1 - this.discount / 100));
        }
        return this.price;
    }

    hasMultipleImages() {
        return this.images.length > 1;
    }

    nextImage() {
        if (this.hasMultipleImages()) {
            this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
        }
        return this.images[this.currentImageIndex];
    }

    previousImage() {
        if (this.hasMultipleImages()) {
            this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        }
        return this.images[this.currentImageIndex];
    }

    createHTML() {
        const hasDiscount = this.hasDiscount();
        const discountedPrice = this.calculateDiscountedPrice();
        const hasMultipleImages = this.hasMultipleImages();
        const mainImage = this.images[0];

        return `
            <div class="product-card clickable-product" data-id="${this.id}">
                ${hasDiscount ? '<div class="discount-badge">-' + this.discount + '%</div>' : ''}
                <div class="product-image-container">
                    <img src="${mainImage}" alt="${this.name}" class="product-image main-image">
                    ${hasMultipleImages ? `<img src="${this.images[1]}" alt="${this.name}" class="product-image hover-image">` : ''}
                </div>
                <div class="category">${this.category}</div>
                <h3 class="product-name">${this.name}</h3>                
                <div class="product-price">
                    ${hasDiscount ?
                `<span class="original-price">${this.formatPrice(this.originalPrice)}</span>
                         <span class="discounted-price">${this.formatPrice(discountedPrice)}</span>`
                : this.formatPrice(this.price)
            }
                </div>
            </div>
        `;
    }

    createPopupHTML() {
        const hasDiscount = this.hasDiscount();
        const discountedPrice = this.calculateDiscountedPrice();
        const hasMultipleImages = this.hasMultipleImages();

        return `
            <div class="product-popup" data-id="${this.id}">
                <div class="popup-content">
                    <button class="close-popup">&times;</button>
                    
                    <div class="popup-images">
                        <div class="main-image-container">
                            <img src="${this.images[0]}" alt="${this.name}" class="main-image" id="main-image-${this.id}">
                            
                            ${hasMultipleImages ? `
                                <button class="image-nav-btn prev-btn">‹</button>
                                <button class="image-nav-btn next-btn">›</button>
                            ` : ''}
                        </div>
                        
                        ${hasMultipleImages ? `
                            <div class="thumbnail-container">
                                ${this.images.map((image, index) => `
                                    <img src="${image}" 
                                         alt="${this.name} - view ${index + 1}" 
                                         class="thumbnail ${index === 0 ? 'active' : ''}" 
                                         data-index="${index}"
                                         data-id="${this.id}">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="popup-details">
                        <div class="category-badge">${this.category}</div>
                        <h2 class="popup-title">${this.name}</h2>
                        
                        <div class="popup-price">
                            ${hasDiscount ?
                `<span class="original-price">${this.formatPrice(this.originalPrice)}</span>
                                 <span class="discounted-price">${this.formatPrice(discountedPrice)}</span>
                                 <span class="discount-percent">-${this.discount}%</span>`
                : `<span class="current-price">${this.formatPrice(this.price)}</span>`
            }
                        </div>
                        
                        <div class="popup-description">
                            <h3>Description</h3>
                            <p>${this.description}</p>
                        </div>
                        
                        <div class="popup-actions">
                            <a href="https://wa.me/123123123?text=Hi, I want to order: ${encodeURIComponent(this.name)} (ID: ${this.id}) - Price: ${this.formatPrice(this.calculateDiscountedPrice())}" 
                               target="_blank" 
                               class="whatsapp-order-btn">
                                <i class="whatsapp-icon">📱</i> Order via WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Main application
class ShopApp {
    constructor() {
        this.products = [];
        this.container = document.getElementById('shop-container');
        this.filterContainer = document.getElementById('category-filter-container');
        this.pageTitle = document.getElementById('page-title');
        this.popupContainer = document.getElementById('popup-container');

        // Create popup container if it doesn't exist
        if (!this.popupContainer) {
            this.popupContainer = document.createElement('div');
            this.popupContainer.id = 'popup-container';
            document.body.appendChild(this.popupContainer);
        }

        // Define fixed categories in exact order
        this.fixedCategories = [
            'Man Casual',
            'Man Swimming Wear',
            'Man Sportwear',
            'Man Bags',
            'Man Accessories',
            'Woman Casual',
            'Woman Swimming Wear',
            'Woman Sportwear',
            'Woman Bags',
            'Woman Accessories'
        ];

        // Check URL parameters for category
        const urlParams = new URLSearchParams(window.location.search);
        // Set default to first category
        this.currentCategory = urlParams.get('category') || this.fixedCategories[0];

        this.init();
    }

    async loadProducts() {
        try {
            const response = await fetch('products.json');
            if (!response.ok) throw new Error('Failed to load products');

            const data = await response.json();
            this.products = data.map(item => {
                // Filter out products with categories not in fixed list
                if (!this.fixedCategories.includes(item.category)) {
                    console.warn(`Product ${item.name} has invalid category: ${item.category}. Skipping.`);
                    return null;
                }

                // Handle both old format (single image) and new format (multiple images)
                const images = item.images || [item.image];

                return new Product(
                    item.id,
                    item.name,
                    item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price,
                    item.description,
                    item.category,
                    images, // Pass array of images
                    item.price, // Original price
                    item.discount || 0 // Discount percentage
                );
            }).filter(product => product !== null); // Remove null products

            // Verify all products have valid categories
            const invalidCategories = this.products
                .filter(p => !this.fixedCategories.includes(p.category))
                .map(p => p.category);
            
            if (invalidCategories.length > 0) {
                console.warn('Some products have invalid categories:', invalidCategories);
            }

            // Use fixed categories as the source of truth
            this.categories = [...this.fixedCategories];
            
            // Check if current category is valid
            if (!this.categories.includes(this.currentCategory)) {
                this.currentCategory = this.categories[0];
            }

            this.createCategoryFilter();
            return true;
        } catch (error) {
            console.error('Error loading products:', error);
            this.container.innerHTML = `<p style="color: red; text-align: center;">Error loading products: ${error.message}</p>`;
            return false;
        }
    }



    updateURL() {
        const url = new URL(window.location);
        if (this.currentCategory) {
            url.searchParams.set('category', this.currentCategory);
        }
        window.history.pushState({}, '', url);
    }

    updatePageTitle() {
        if (this.pageTitle && this.currentCategory) {
            this.pageTitle.textContent = this.currentCategory;
        }
    }

    // NEW METHOD: Update navigation links based on current category
    updateNavigationLinks() {
        const prevBtn = document.getElementById('prev-category');
        const nextBtn = document.getElementById('next-category');

        if (prevBtn) {
            // Check if current category is "Man Casual"
            if (this.currentCategory === 'Man Casual') {
                prevBtn.textContent = 'Home';
                prevBtn.href = 'index.html';
            } else {
                prevBtn.textContent = 'Back';
                prevBtn.href = '#'; // Reset to default
            }
        }

        if (nextBtn) {
            // Check if current category is "Woman Accessories"
            if (this.currentCategory === 'Woman Accessories') {
                nextBtn.textContent = 'Home';
                nextBtn.href = 'index.html';
            } else {
                nextBtn.textContent = 'Next Collection';
                nextBtn.href = '#'; // Reset to default
            }
        }
    }

    goToPreviousCategory() {
        if (this.categories.length <= 1) return;

        const currentIndex = this.categories.indexOf(this.currentCategory);
        let prevIndex = currentIndex - 1;

        // If we're at the first category (Man Casual), go to index.html
        if (currentIndex === 0) {
            window.location.href = 'index.html';
            return;
        }

        // If we're not at the first category, go to previous category
        this.currentCategory = this.categories[prevIndex];
        this.updateCategoryNavigation();
    }

    goToNextCategory() {
        if (this.categories.length <= 1) return;

        const currentIndex = this.categories.indexOf(this.currentCategory);
        let nextIndex = currentIndex + 1;

        // If we're at the last category (Woman Accessories), go to index.html
        if (currentIndex === this.categories.length - 1) {
            window.location.href = 'index.html';
            return;
        }

        // If we're not at the last category, go to next category
        this.currentCategory = this.categories[nextIndex];
        this.updateCategoryNavigation();
    }

    updateCategoryNavigation() {
        // Update the select dropdown
        if (document.getElementById('category-select')) {
            document.getElementById('category-select').value = this.currentCategory;
        }

        // Update URL
        this.updateURL();

        // Update navigation links
        this.updateNavigationLinks();

        this.displayProducts();
        this.updatePageTitle();
    }

    // Add this method to set up the navigation event listeners
    setupNavigationListeners() {
        // Previous category button
        const prevBtn = document.getElementById('prev-category');
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToPreviousCategory();
            });
        }

        // Next category button
        const nextBtn = document.getElementById('next-category');
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToNextCategory();
            });
        }

        // Also support keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Left arrow for previous category
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.goToPreviousCategory();
            }
            // Right arrow for next category
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.goToNextCategory();
            }
        });
    }

    displayProducts() {
        // Filter by current category
        const filteredProducts = this.products.filter(product => product.category === this.currentCategory);

        if (filteredProducts.length === 0) {
            this.container.innerHTML = `
                <div class="no-products">
                    <p>No products available in the "${this.currentCategory}" category</p>
                    <p class="category-hint">Select another category from the dropdown above</p>
                </div>
            `;
            return;
        }

        // Clear container and add products
        this.container.innerHTML = filteredProducts
            .map(product => product.createHTML())
            .join('');

        this.addEventListeners();
        this.addImageHoverEffects();
    }

    addImageHoverEffects() {
        // Add hover effect only to product cards that have hover images
        const productCards = this.container.querySelectorAll('.product-card');

        productCards.forEach(card => {
            const hoverImage = card.querySelector('.hover-image');
            if (hoverImage) {
                const mainImage = card.querySelector('.main-image');

                card.addEventListener('mouseenter', () => {
                    mainImage.style.opacity = '0';
                    hoverImage.style.opacity = '1';
                });

                card.addEventListener('mouseleave', () => {
                    mainImage.style.opacity = '1';
                    hoverImage.style.opacity = '0';
                });
            }
        });
    }

    showProductPopup(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Close any existing popup
        this.closePopup();

        // Create and show new popup
        this.popupContainer.innerHTML = product.createPopupHTML();
        const popup = this.popupContainer.querySelector('.product-popup');

        // Prevent body scroll
        document.body.classList.add('popup-open');

        // Show popup with animation
        requestAnimationFrame(() => {
            popup.classList.add('active');
        });

        // Add popup event listeners
        this.addPopupEventListeners(product);
    }

    closePopup() {
        const popup = this.popupContainer.querySelector('.product-popup');
        if (popup) {
            popup.classList.remove('active');
            document.body.classList.remove('popup-open');

            // Remove from DOM after animation
            setTimeout(() => {
                if (popup.classList.contains('active') === false) {
                    this.popupContainer.innerHTML = '';
                }
            }, 300);
        }
    }

    addEventListeners() {
        // Clickable product cards - use event delegation
        this.container.addEventListener('click', (e) => {
            const productCard = e.target.closest('.clickable-product');
            if (productCard && !e.target.closest('a, button')) {
                const productId = parseInt(productCard.dataset.id);
                this.showProductPopup(productId);
            }
        });
    }

    addPopupEventListeners(product) {
        const popup = this.popupContainer.querySelector('.product-popup');
        if (!popup) return;

        // Close popup button
        const closeBtn = popup.querySelector('.close-popup');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closePopup();
            });
        }

        // Close popup when clicking outside
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                this.closePopup();
            }
        });

        // Close popup with Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePopup();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Image navigation in popup
        if (product.hasMultipleImages()) {
            const mainImage = popup.querySelector(`#main-image-${product.id}`);
            const thumbnails = popup.querySelectorAll(`.thumbnail[data-id="${product.id}"]`);
            const prevBtn = popup.querySelector('.prev-btn');
            const nextBtn = popup.querySelector('.next-btn');

            // Thumbnail click
            if (thumbnails.length > 0) {
                thumbnails.forEach(thumb => {
                    thumb.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const index = parseInt(e.target.dataset.index);
                        product.currentImageIndex = index;
                        if (mainImage) mainImage.src = product.images[index];

                        // Update active thumbnail
                        thumbnails.forEach(t => t.classList.remove('active'));
                        e.target.classList.add('active');
                    });
                });
            }

            // Previous button
            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    product.previousImage();
                    if (mainImage) mainImage.src = product.images[product.currentImageIndex];

                    // Update active thumbnail
                    if (thumbnails.length > 0) {
                        thumbnails.forEach(t => t.classList.remove('active'));
                        thumbnails[product.currentImageIndex].classList.add('active');
                    }
                });
            }

            // Next button
            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    product.nextImage();
                    if (mainImage) mainImage.src = product.images[product.currentImageIndex];

                    // Update active thumbnail
                    if (thumbnails.length > 0) {
                        thumbnails.forEach(t => t.classList.remove('active'));
                        thumbnails[product.currentImageIndex].classList.add('active');
                    }
                });
            }
        }
    }

    async init() {
        await this.loadProducts();
        this.displayProducts();
        this.updatePageTitle();
        this.setupNavigationListeners();
        this.updateNavigationLinks(); // Call this after initialization
    }
}

// Initialize the shop when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ShopApp();
});
