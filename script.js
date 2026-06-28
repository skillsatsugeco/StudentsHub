// ==========================================
// OFFLINE <-> GOOGLE APPS SCRIPT API CONNECTION
// ==========================================
// ⚠️ CRITICAL: Replace the URL below with your Web App URL after deploying in Apps Script!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzdBGkrN1BrbVgsgHD-IgCZ_JNERflyuAgajObQJBpdCAe7BXEqRkrrfLf-_ZEd45bk/exec';

// This intercepts old `google.script.run` calls, converts them, and routes them via fetch to the deployed Web App API
window.google = window.google || {};
window.google.script = window.google.script || {};
window.google.script.run = new Proxy({}, {
    get: function (target, prop) {
        if (prop === 'withSuccessHandler') {
            return function (callback) {
                target.successCallback = callback;
                return window.google.script.run;
            }
        }
        if (prop === 'withFailureHandler') {
            return function (callback) {
                target.failureCallback = callback;
                return window.google.script.run;
            }
        }

        return function (...args) {
            if (SCRIPT_URL.includes('YOUR_GOOGLE')) {
                alert("⚠️ Database not connected. Please put your Google Web App URL into the SCRIPT_URL variable at the top of script.js!");
                if (target.failureCallback) target.failureCallback(new Error("URL not configured"));
                return window.google.script.run;
            }

            const payloadStr = JSON.stringify({ action: prop, args: args });

            fetch(SCRIPT_URL, {
                method: 'POST',
                body: payloadStr,
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            })
                .then(res => res.json())
                .then(data => {
                    if (target.successCallback) {
                        target.successCallback(data);
                    }
                })
                .catch(err => {
                    console.error("Fetch Error:", err);
                    if (target.failureCallback) target.failureCallback(err);
                });
        }
    }
});

let currentUser = null;
let allProducts = [];
let allCategories = [];


document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('year').innerText = new Date().getFullYear();
    loadInitialData();
});

function showLoader(show) {
    const loader = document.getElementById('loader');
    if (show) loader.classList.remove('d-none');
    else loader.classList.add('d-none');
}

function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('d-none'));
    document.getElementById(viewId).classList.remove('d-none');
    window.scrollTo(0, 0);
}

function loadInitialData() {
    showLoader(true);
    google.script.run.withSuccessHandler((res) => {
        allCategories = res.categories;
        allProducts = res.products;

        populateCategories();
        renderHomeProducts();
        renderShopProducts(allProducts);

        // Check if user is stored in session
        const storedUser = sessionStorage.getItem('studentHubUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            updateNav();
        }

        showLoader(false);
    }).withFailureHandler((err) => {
        console.error(err);
        showLoader(false);
    }).getInitialDataBlock();
}

function populateCategories() {
    const shopCat = document.getElementById('shop-category');
    const dashCat = document.getElementById('prod-cat');

    let options = '<option value="">All Categories</option>';
    allCategories.forEach(c => {
        options += `<option value="${c.categoryName}">${c.categoryName}</option>`;
    });

    if (shopCat) shopCat.innerHTML = options;
    if (dashCat) dashCat.innerHTML = options.replace('<option value="">All Categories</option>', '<option value="" disabled selected>Select Category</option>');
}

// ==========================================
// NAVIGATION & AUTHENTICATION
// ==========================================

function updateNav() {
    if (currentUser) {
        document.getElementById('nav-login-btn').classList.add('d-none');
        document.getElementById('nav-logout-btn').classList.remove('d-none');
        document.getElementById('nav-dashboard').classList.remove('d-none');
        document.getElementById('dashboard-user-name').innerText = `Hi, ${currentUser.fullName}`;
    } else {
        document.getElementById('nav-login-btn').classList.remove('d-none');
        document.getElementById('nav-logout-btn').classList.add('d-none');
        document.getElementById('nav-dashboard').classList.add('d-none');
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('studentHubUser');
    updateNav();
    showView('home-view');
}

function showAuthMsg(msg, isError) {
    const msgEl = document.getElementById('auth-message');
    msgEl.innerText = msg;
    msgEl.className = isError ? 'mt-3 text-center small fw-semibold text-danger' : 'mt-3 text-center small fw-semibold text-success';
}

function handleLogin(e) {
    e.preventDefault();
    showLoader(true);
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    google.script.run.withSuccessHandler((res) => {
        showLoader(false);
        if (res.success) {
            currentUser = res.user;
            sessionStorage.setItem('studentHubUser', JSON.stringify(currentUser));
            updateNav();
            document.getElementById('loginForm').reset();
            showAuthMsg('', false);
            showDashboard();
        } else {
            showAuthMsg(res.message, true);
        }
    }).loginUser(email, pass);
}

function handleRegister(e) {
    e.preventDefault();
    showLoader(true);

    const userData = {
        fullName: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        university: document.getElementById('reg-university').value,
        phoneNumber: document.getElementById('reg-phone').value,
        businessName: document.getElementById('reg-businessName').value
    };

    google.script.run.withSuccessHandler((res) => {
        showLoader(false);
        if (res.success) {
            document.getElementById('registerForm').reset();
            showAuthMsg('Registration successful! Please login.', false);
            // Switch tab to login automatically
            document.getElementById('tab-login').click();
        } else {
            showAuthMsg(res.message, true);
        }
    }).registerUser(userData);
}


// ==========================================
// RENDER PRODUCTS
// ==========================================

function getProductCardHTML(p) {
    const defaultImg = 'https://images.unsplash.com/photo-1555529771-8caeb1f29aa7?auto=format&fit=crop&w=600&q=80';
    const imgUrl = p.imageUrl || defaultImg;
    return `
    <div class="col-md-4 col-sm-6">
      <div class="card product-card h-100 rounded-4 overflow-hidden border-0 shadow-sm" onclick="showProductDetails('${p.productId}')" style="cursor: pointer;">
        <span class="badge bg-secondary badge-category">${p.category}</span>
        <div class="product-img-wrapper">
          <img src="${imgUrl}" alt="${p.productName}">
        </div>
        <div class="card-body">
          <h5 class="card-title fw-bold text-truncate">${p.productName}</h5>
          <h6 class="text-primary fw-bold mb-3">TZS ${parseFloat(p.price).toFixed(2)} <span class="text-muted small fw-normal">/ ${p.unit || 'piece'}</span></h6>
          <div class="d-flex align-items-center text-muted small">
            <i class="bi bi-shop me-2"></i> <span class="text-truncate">${p.businessName || 'Seller'}</span>
          </div>
          <div class="d-flex align-items-center text-muted small mt-1">
            <i class="bi bi-geo-alt me-2"></i> <span class="text-truncate">${p.university || 'University'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHomeProducts() {
    const container = document.getElementById('home-products-container');
    // First 6 products
    const toShow = allProducts.slice(0, 6);
    if (toShow.length === 0) {
        container.innerHTML = '<p class="text-muted text-center w-100 py-4">No products available yet.</p>';
        return;
    }
    container.innerHTML = toShow.map(p => getProductCardHTML(p)).join('');
}

function renderShopProducts(productsArr) {
    const container = document.getElementById('shop-products-container');
    if (productsArr.length === 0) {
        container.innerHTML = '<p class="text-muted text-center w-100 py-5">No products found matching your search.</p>';
        return;
    }
    container.innerHTML = productsArr.map(p => getProductCardHTML(p)).join('');
}

function searchFromHome() {
    const query = document.getElementById('home-search').value;
    document.getElementById('shop-search').value = query;
    showView('products-view');
    filterProducts();
}

function filterProducts() {
    const q = document.getElementById('shop-search').value.toLowerCase();
    const cat = document.getElementById('shop-category').value;

    const filtered = allProducts.filter(p => {
        const matchName = p.productName.toLowerCase().includes(q) || (p.businessName && p.businessName.toLowerCase().includes(q)) || (p.university && p.university.toLowerCase().includes(q));
        const matchCat = cat === "" || p.category === cat;
        return matchName && matchCat;
    });

    renderShopProducts(filtered);
}


// ==========================================
// DETAILS & PROFILES
// ==========================================

function showProductDetails(pid) {
    const p = allProducts.find(x => x.productId === pid);
    if (!p) return;

    const defaultImg = 'https://images.unsplash.com/photo-1555529771-8caeb1f29aa7?auto=format&fit=crop&w=600&q=80';
    const imgUrl = p.imageUrl || defaultImg;

    showLoader(true);
    google.script.run.withSuccessHandler((res) => {
        allCategories = res.categories;
        allProducts = res.products;

        populateCategories();
        renderHomeProducts();
        renderShopProducts(allProducts);

        // Check if user is stored in session
        const storedUser = sessionStorage.getItem('studentHubUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            updateNav();
        }

        showLoader(false);
    }).withFailureHandler((err) => {
        console.error(err);
        showLoader(false);
    }).getInitialDataBlock();
}

function populateCategories() {
    const shopCat = document.getElementById('shop-category');
    const dashCat = document.getElementById('prod-cat');

    let options = '<option value="">All Categories</option>';
    allCategories.forEach(c => {
        options += `<option value="${c.categoryName}">${c.categoryName}</option>`;
    });

    if (shopCat) shopCat.innerHTML = options;
    if (dashCat) dashCat.innerHTML = options.replace('<option value="">All Categories</option>', '<option value="" disabled selected>Select Category</option>');
}

// ==========================================
// NAVIGATION & AUTHENTICATION
// ==========================================

function updateNav() {
    if (currentUser) {
        document.getElementById('nav-login-btn').classList.add('d-none');
        document.getElementById('nav-logout-btn').classList.remove('d-none');
        document.getElementById('nav-dashboard').classList.remove('d-none');
        document.getElementById('dashboard-user-name').innerText = `Hi, ${currentUser.fullName}`;
    } else {
        document.getElementById('nav-login-btn').classList.remove('d-none');
        document.getElementById('nav-logout-btn').classList.add('d-none');
        document.getElementById('nav-dashboard').classList.add('d-none');
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('studentHubUser');
    updateNav();
    showView('home-view');
}

function showAuthMsg(msg, isError) {
    const msgEl = document.getElementById('auth-message');
    msgEl.innerText = msg;
    msgEl.className = isError ? 'mt-3 text-center small fw-semibold text-danger' : 'mt-3 text-center small fw-semibold text-success';
}

function handleLogin(e) {
    e.preventDefault();
    showLoader(true);
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    google.script.run.withSuccessHandler((res) => {
        showLoader(false);
        if (res.success) {
            currentUser = res.user;
            sessionStorage.setItem('studentHubUser', JSON.stringify(currentUser));
            updateNav();
            document.getElementById('loginForm').reset();
            showAuthMsg('', false);
            showDashboard();
        } else {
            showAuthMsg(res.message, true);
        }
    }).loginUser(email, pass);
}

function handleRegister(e) {
    e.preventDefault();
    showLoader(true);

    const userData = {
        fullName: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        university: document.getElementById('reg-university').value,
        phoneNumber: document.getElementById('reg-phone').value,
        businessName: document.getElementById('reg-businessName').value
    };

    google.script.run.withSuccessHandler((res) => {
        showLoader(false);
        if (res.success) {
            document.getElementById('registerForm').reset();
            showAuthMsg('Registration successful! Please login.', false);
            // Switch tab to login automatically
            document.getElementById('tab-login').click();
        } else {
            showAuthMsg(res.message, true);
        }
    }).registerUser(userData);
}


// ==========================================
// RENDER PRODUCTS
// ==========================================

function getProductCardHTML(p) {
    const defaultImg = 'https://images.unsplash.com/photo-1555529771-8caeb1f29aa7?auto=format&fit=crop&w=600&q=80';
    const imgUrl = p.imageUrl || defaultImg;
    return `
    <div class="col-md-4 col-sm-6">
      <div class="card product-card h-100 rounded-4 overflow-hidden border-0 shadow-sm" onclick="showProductDetails('${p.productId}')" style="cursor: pointer;">
        <span class="badge bg-secondary badge-category">${p.category}</span>
        <div class="product-img-wrapper">
          <img src="${imgUrl}" alt="${p.productName}">
        </div>
        <div class="card-body">
          <h5 class="card-title fw-bold text-truncate">${p.productName}</h5>
          <h6 class="text-primary fw-bold mb-3">TZS ${parseFloat(p.price).toFixed(2)} <span class="text-muted small fw-normal">/ ${p.unit || 'piece'}</span></h6>
          <div class="d-flex align-items-center text-muted small">
            <i class="bi bi-shop me-2"></i> <span class="text-truncate">${p.businessName || 'Seller'}</span>
          </div>
          <div class="d-flex align-items-center text-muted small mt-1">
            <i class="bi bi-geo-alt me-2"></i> <span class="text-truncate">${p.university || 'University'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHomeProducts() {
    const container = document.getElementById('home-products-container');
    // First 6 products
    const toShow = allProducts.slice(0, 6);
    if (toShow.length === 0) {
        container.innerHTML = '<p class="text-muted text-center w-100 py-4">No products available yet.</p>';
        return;
    }
    container.innerHTML = toShow.map(p => getProductCardHTML(p)).join('');
}

function renderShopProducts(productsArr) {
    const container = document.getElementById('shop-products-container');
    if (productsArr.length === 0) {
        container.innerHTML = '<p class="text-muted text-center w-100 py-5">No products found matching your search.</p>';
        return;
    }
    container.innerHTML = productsArr.map(p => getProductCardHTML(p)).join('');
}

function searchFromHome() {
    const query = document.getElementById('home-search').value;
    document.getElementById('shop-search').value = query;
    showView('products-view');
    filterProducts();
}

function filterProducts() {
    const q = document.getElementById('shop-search').value.toLowerCase();
    const cat = document.getElementById('shop-category').value;

    const filtered = allProducts.filter(p => {
        const matchName = p.productName.toLowerCase().includes(q) || (p.businessName && p.businessName.toLowerCase().includes(q)) || (p.university && p.university.toLowerCase().includes(q));
        const matchCat = cat === "" || p.category === cat;
        return matchName && matchCat;
    });

    renderShopProducts(filtered);
}


// ==========================================
// DETAILS & PROFILES
// ==========================================

function showProductDetails(pid) {
    const p = allProducts.find(x => x.productId === pid);
    if (!p) return;

    const defaultImg = 'https://images.unsplash.com/photo-1555529771-8caeb1f29aa7?auto=format&fit=crop&w=600&q=80';
    const imgUrl = p.imageUrl || defaultImg;

    const html = `
    <div class="row g-0">
      <div class="col-md-6 border-end">
        <img src="${imgUrl}" alt="${p.productName}" class="img-fluid w-100 h-100 object-fit-cover" style="min-height: 400px; max-height:500px;">
      </div>
      <div class="col-md-6 p-4 p-md-5 d-flex flex-column justify-content-center">
        <span class="badge bg-secondary mb-2 align-self-start">${p.category}</span>
        <h2 class="fw-bold mb-3">${p.productName}</h2>
        <h3 class="text-primary fw-bold mb-4">TZS ${parseFloat(p.price).toFixed(2)} <span class="text-muted fs-5 fw-normal">/ ${p.unit || 'piece'}</span></h3>
        
        <p class="text-muted mb-4">${p.description || 'No description provided.'}</p>
        
        <div class="bg-light p-3 rounded-3 mb-4 d-flex align-items-center justify-content-between" style="cursor:pointer;" onclick="showSellerProfile('${p.userId}')">
           <div>
              <p class="mb-1 text-muted small text-uppercase tracking-wide">Sold By</p>
              <h5 class="mb-0 fw-bold"><i class="bi bi-shop text-primary"></i> ${p.businessName || 'Business'}</h5>
              <small class="text-muted"><i class="bi bi-geo-alt"></i> ${p.university || 'University'}</small>
           </div>
           <i class="bi bi-chevron-right text-muted fs-4"></i>
        </div>

        <div class="d-grid gap-2 d-md-block">
          <a href="tel:${p.phoneNumber}" class="btn btn-primary rounded-pill px-4 py-2 fw-semibold fs-5 me-2 mb-2"><i class="bi bi-telephone"></i> Call Seller</a>
          <a href="mailto:${p.sellerEmail || ''}" class="btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold fs-5 mb-2"><i class="bi bi-envelope"></i> Email Seller</a>
        </div>
        
        <div class="alert alert-warning mt-4 d-flex align-items-center mt-3 border-0 py-3" style="background-color: #fff3cd;" role="alert">
          <i class="bi bi-shield-lock-fill fs-1 text-warning me-3"></i>
          <div>
            <h6 class="alert-heading fw-bold mb-1">Safety & Networking</h6>
            <span class="small text-dark">To boost student networking and ensure maximum security, sellers and buyers are encouraged to <b>meet physically</b> on campus to complete their transactions.</span>
          </div>
        </div>
      </div>
    </div>
  `;
    document.getElementById('details-card').innerHTML = html;
    showView('product-details-view');
}

function showSellerProfile(userId) {
    showLoader(true);
    google.script.run.withSuccessHandler((profile) => {
        if (!profile) {
            showLoader(false);
            alert('Profile not found.');
            return;
        }

        // Filter active products of this user
        const userProducts = allProducts.filter(p => p.userId === userId);
        const logoUrl = profile.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80';

        const html = `
      <div class="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
        <div class="bg-primary text-white p-5 text-center" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);">
          <img src="${logoUrl}" class="rounded-circle border border-4 border-white mb-3 bg-white object-fit-cover" width="120" height="120" alt="Logo">
          <h2 class="fw-bold">${profile.businessName}</h2>
          <p class="fs-5 opacity-75"><i class="bi bi-person"></i> ${profile.fullName} &nbsp; | &nbsp; <i class="bi bi-geo-alt"></i> ${profile.university}</p>
        </div>
        <div class="card-body p-4 p-md-5 text-center">
           <p class="lead text-muted">${profile.businessDescription || 'No business description provided.'}</p>
           <div class="d-flex justify-content-center gap-3 mt-4">
             <a href="tel:${profile.phoneNumber}" class="btn btn-primary rounded-pill px-4"><i class="bi bi-telephone"></i> ${profile.phoneNumber}</a>
             <a href="mailto:${profile.email}" class="btn btn-outline-primary rounded-pill px-4"><i class="bi bi-envelope"></i> ${profile.email}</a>
           </div>

           <div class="alert alert-warning mt-4 d-flex align-items-center text-start mx-auto border-0 py-3" style="max-width: 600px; background-color: #fff3cd;" role="alert">
             <i class="bi bi-shield-lock-fill fs-1 text-warning me-3"></i>
             <div>
               <h6 class="alert-heading fw-bold mb-1">Safety & Networking</h6>
               <span class="small text-dark">To boost student networking and ensure maximum security, sellers and buyers are encouraged to <b>meet physically</b> on campus to complete their transactions.</span>
             </div>
           </div>
        </div>
      </div>
      
      <h4 class="fw-bold mb-4 mt-5">Products from ${profile.businessName}</h4>
      <div class="row g-4">
        ${userProducts.length > 0 ? userProducts.map(p => getProductCardHTML(p)).join('') : '<p class="text-muted col-12">No products available.</p>'}
      </div>
    `;

        document.getElementById('seller-profile-container').innerHTML = html;
        showLoader(false);
        showView('profile-view');
    }).getUserProfile(userId);
}


// ==========================================
// DASHBOARDS
// ==========================================

function showDashboard() {
    if (!currentUser) {
        showView('login-view');
        return;
    }
    if (currentUser.role === 'admin') {
        showAdminDashboard();
    } else {
        document.getElementById('edit-name').value = currentUser.fullName;
        document.getElementById('edit-phone').value = currentUser.phoneNumber;
        document.getElementById('edit-uni').value = currentUser.university;
        document.getElementById('edit-biz-name').value = currentUser.businessName;
        document.getElementById('edit-biz-desc').value = currentUser.businessDescription || '';
        document.getElementById('edit-biz-logo').value = currentUser.logoUrl || '';

        switchDashTab('products');
        showView('student-dashboard-view');
    }
}

function switchDashTab(tab) {
    // Update buttons
    ['products', 'add', 'profile'].forEach(t => {
        document.getElementById('dtab-' + t).classList.remove('active');
        document.getElementById('dash-' + t).classList.add('d-none');
    });
    document.getElementById('dtab-' + tab).classList.add('active');
    document.getElementById('dash-' + tab).classList.remove('d-none');

    if (tab === 'products') renderMyProducts();
}

function renderMyProducts() {
    const tbody = document.getElementById('my-products-table');
    const myP = allProducts.filter(p => p.userId === currentUser.userId);

    if (myP.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">You have not uploaded any products.</td></tr>';
        return;
    }

    tbody.innerHTML = myP.map(p => {
        const imgUrl = p.imageUrl || 'https://images.unsplash.com/photo-1555529771-8caeb1f29aa7?auto=format&fit=crop&w=100&q=80';
        return `
      <tr>
        <td><img src="${imgUrl}" width="60" height="60" class="rounded object-fit-cover shadow-sm"></td>
        <td>
          <p class="mb-0 fw-bold">${p.productName}</p>
          <small class="text-muted">${p.category}</small>
        </td>
        <td class="fw-semibold">TZS ${parseFloat(p.price).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger rounded-pill" title="Delete" onclick="deleteObjProduct('${p.productId}', this)"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
    }).join('');
}

function handleAddProduct(e) {
    e.preventDefault();

    const productData = {
        userId: currentUser.userId,
        productName: document.getElementById('prod-name').value,
        description: document.getElementById('prod-desc').value,
        category: document.getElementById('prod-cat').value,
        price: document.getElementById('prod-price').value,
        unit: document.getElementById('prod-unit').value,
        quantity: document.getElementById('prod-qty').value,
        imageUrl: document.getElementById('prod-img').value
    };

    const btnNode = document.getElementById('btn-add-product');
    if (btnNode) { btnNode.disabled = true; btnNode.innerText = 'Saving...'; }

    google.script.run.withSuccessHandler((res) => {
        if (btnNode) { btnNode.disabled = false; btnNode.innerText = 'Upload Product'; }

        if (res.success) {
            alert('Product successfully uploaded to marketplace!');
            e.target.reset();

            const tempProduct = { ...productData };
            tempProduct.productId = res.productId || Date.now().toString();
            tempProduct.businessName = currentUser.businessName;
            tempProduct.university = currentUser.university;

            allProducts.unshift(tempProduct);

            renderMyProducts();
            renderHomeProducts();
            filterProducts();
            switchDashTab('products');
        } else {
            alert(res.message);
        }
    }).addProduct(productData);
}

function deleteObjProduct(productId, btnEl) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    btnEl.disabled = true;
    btnEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    google.script.run.withSuccessHandler((res) => {
        if (res.success) {
            allProducts = allProducts.filter(x => x.productId !== productId);
            renderHomeProducts();
            filterProducts();
            if (currentUser.role === 'admin') renderAdminProducts();
            else renderMyProducts();
        } else {
            alert(res.message);
            btnEl.disabled = false;
            btnEl.innerHTML = '<i class="bi bi-trash"></i>';
        }
    }).deleteProduct(productId, currentUser.userId, currentUser.role);
}

function handleUpdateProfile(e) {
    e.preventDefault();
    showLoader(true);

    const userData = {
        userId: currentUser.userId,
        fullName: document.getElementById('edit-name').value,
        university: document.getElementById('edit-uni').value,
        phoneNumber: document.getElementById('edit-phone').value,
        businessName: document.getElementById('edit-biz-name').value,
        businessDescription: document.getElementById('edit-biz-desc').value,
        logoUrl: document.getElementById('edit-biz-logo').value
    };

    google.script.run.withSuccessHandler((res) => {
        showLoader(false);
        if (res.success) {
            alert('Profile Updated Successfully!');
            // Update local storage and current user
            currentUser.fullName = userData.fullName;
            currentUser.university = userData.university;
            currentUser.phoneNumber = userData.phoneNumber;
            currentUser.businessName = userData.businessName;
            currentUser.businessDescription = userData.businessDescription;
            currentUser.logoUrl = userData.logoUrl;
            sessionStorage.setItem('studentHubUser', JSON.stringify(currentUser));
            updateNav();
        } else {
            alert(res.message);
        }
    }).updateProfile(userData);
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

function showAdminDashboard() {
    showView('admin-dashboard-view');
    showLoader(true);

    // Get Stats
    google.script.run.withSuccessHandler(stats => {
        document.getElementById('stat-students').innerText = stats.totalUsers;
        document.getElementById('stat-products').innerText = stats.totalProducts;
        document.getElementById('stat-categories').innerText = stats.totalCategories;

        renderAdminProducts();
        showLoader(false);
    }).getPlatformStats();
}

function renderAdminProducts() {
    const tbody = document.getElementById('admin-products-table');
    if (allProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No active products on the platform.</td></tr>';
        return;
    }

    tbody.innerHTML = allProducts.map(p => {
        return `
      <tr>
        <td>
          <p class="mb-0 fw-bold">${p.businessName || 'Unknown'}</p>
          <small class="text-muted">${p.sellerEmail || ''}</small>
        </td>
        <td>
          <p class="mb-0 fw-bold">${p.productName}</p>
          <small class="text-muted px-2 py-1 bg-light rounded">${p.category}</small>
        </td>
        <td class="fw-semibold">TZS ${parseFloat(p.price).toFixed(2)}</td>
        <td><span class="badge bg-success">Active</span></td>
        <td>
          <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="deleteObjProduct('${p.productId}', this)">Remove</button>
        </td>
      </tr>
    `;
    }).join('');
}