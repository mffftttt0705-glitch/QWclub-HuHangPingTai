// 应用主逻辑
let currentCategory = 'all';
let currentServiceType = 'all';
let currentSort = 'default';
let currentView = 'home';

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 渲染产品列表
    renderProducts();
    
    // 更新购物车徽章
    cart.updateCartBadge();
    
    // 更新个人信息统计
    updateProfileStats();
    
    // 渲染购物车
    renderCart();
    
    // 渲染订单
    renderOrders();
    
    // 检查用户登录状态
    checkLoginStatus();
});

// 渲染产品列表 - 2列网格布局
function renderProducts() {
    const productList = document.getElementById('productList');
    let filteredProducts = [...products];
    
    // 按分类筛选
    if (currentCategory !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.game === currentCategory);
    }
    
    // 按搜索关键词筛选
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.gameName.toLowerCase().includes(searchTerm) ||
            p.serviceTypeName.toLowerCase().includes(searchTerm) ||
            p.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }
    
    // 渲染卡片 - 2列网格
    productList.innerHTML = filteredProducts.map(product => `
        <div class="product-card" onclick="showProductDetail(${product.id})">
            <div class="product-image" style="background: ${product.image}">
                <span class="product-badge">🔥 热销</span>
            </div>
            <div class="product-info">
                <div class="product-title">${product.name}</div>
                <div class="product-desc">${product.description}</div>
                <div class="product-bottom">
                    <div class="product-price">
                        <span class="price-symbol">¥</span>
                        <span class="price-value">${product.price}</span>
                        <span class="price-original">${product.originalPrice}</span>
                    </div>
                    <span class="product-sales">已售:${formatNumber(product.sales)}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    if (filteredProducts.length === 0) {
        productList.innerHTML = `
            <div class="empty-state" style="grid-column: span 2;">
                <div class="empty-icon">🔍</div>
                <p>未找到相关护航师</p>
                <button class="btn-primary" onclick="resetFilters()">重置筛选</button>
            </div>
        `;
    }
}

// 格式化数字
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
    }
    return num.toString();
}

// 分类筛选
function filterCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.filter-item').forEach(item => item.classList.remove('active'));
    event.target.classList.add('active');
    renderProducts();
}

// 切换分类标签
function switchCategory(type) {
    document.querySelectorAll('.category-tabs .tab-item').forEach(tab => tab.classList.remove('active'));
    event.target.closest('.tab-item').classList.add('active');
    // 这里可以添加不同分类的逻辑
}

// 重置筛选
function resetFilters() {
    currentCategory = 'all';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.filter-item').forEach(item => item.classList.remove('active'));
    document.querySelector('.filter-item').classList.add('active');
    renderProducts();
}

// 搜索
function searchProducts(term) {
    renderProducts();
}

// 显示商品详情
function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const isFavorite = cart.isFavorite(productId);
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="detail-image" style="background: ${product.image}"></div>
        <div class="detail-header">
            <div class="detail-name">${product.name}</div>
            <div class="detail-rating">★ ${product.rating}</div>
        </div>
        <div class="detail-tags">
            <span class="product-tag">${product.gameIcon} ${product.gameName}</span>
            <span class="product-tag">${product.serviceTypeName}</span>
            ${product.tags.map(tag => `<span class="product-tag">${tag}</span>`).join('')}
        </div>
        <div class="detail-stats">
            <div class="detail-stat">
                <div class="detail-stat-value">${product.winRate}%</div>
                <div class="detail-stat-label">胜率</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-value">${formatNumber(product.sales)}</div>
                <div class="detail-stat-label">销量</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-value">${product.level}</div>
                <div class="detail-stat-label">段位</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-value">${product.guarantee}</div>
                <div class="detail-stat-label">保底</div>
            </div>
        </div>
        <div class="detail-price-section">
            <div class="detail-price-row">
                <div class="detail-price">
                    <span class="price-symbol">¥</span>
                    <span class="price-value">${product.price}</span>
                </div>
                <div class="detail-price-info">
                    <div class="detail-original-price">原价 ¥${product.originalPrice}</div>
                    <div class="detail-discount">立省 ¥${(product.originalPrice - product.price).toFixed(2)}</div>
                </div>
            </div>
        </div>
        <div class="detail-description">
            <h3>📋 服务介绍</h3>
            <p>${product.description}</p>
            <h3 style="margin-top: 12px;">🎯 技能标签</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                ${product.skills.map(skill => `<span class="product-tag">${skill}</span>`).join('')}
            </div>
        </div>
        <div class="detail-actions">
            <button class="detail-action-btn btn-secondary" onclick="toggleFavorite(${product.id})">
                ${isFavorite ? '💔 取消收藏' : '❤️ 收藏'}
            </button>
            <button class="detail-action-btn btn-primary" onclick="openBookingModal(${product.id})">
                📅 立即预约
            </button>
        </div>
    `;
    
    document.getElementById('productModal').classList.add('active');
}

// 关闭弹窗
function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

// 关闭预约弹窗
function closeBookingModal() {
    document.getElementById('bookingModal').classList.remove('active');
}

// 切换收藏
function toggleFavorite(productId) {
    const isFavorite = cart.toggleFavorite(productId);
    showNotification(isFavorite ? '已加入收藏' : '已取消收藏', 'success');
    showProductDetail(productId);
}

// 添加到购物车
function addToCart(productId) {
    cart.addToCart(productId, 1, 1);
    showNotification('已添加到预约单', 'success');
}

// 打开预约弹窗
function openBookingModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const bookingBody = document.getElementById('bookingBody');
    bookingBody.innerHTML = `
        <h2 style="margin-bottom: 16px;">📅 预约 ${product.name}</h2>
        <div class="booking-form">
            <div class="form-group">
                <label class="form-label">选择时长（小时）</label>
                <div class="time-slots" id="timeSlots">
                    ${[1, 2, 3, 4, 5, 6].map(h => `
                        <div class="time-slot ${h === 1 ? 'selected' : ''}" data-hours="${h}" onclick="selectHours(this, ${product.id})">
                            ${h}小时
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">开始时间</label>
                <input type="datetime-local" class="form-input" id="startTime" min="${new Date().toISOString().slice(0, 16)}">
            </div>
            <div class="form-group">
                <label class="form-label">游戏账号</label>
                <input type="text" class="form-input" id="gameAccount" placeholder="请输入游戏账号">
            </div>
            <div class="form-group">
                <label class="form-label">联系QQ/微信</label>
                <input type="text" class="form-input" id="contact" placeholder="请输入联系方式">
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="remark" placeholder="其他要求（选填）"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">支付方式</label>
                <select class="form-select" id="paymentMethod">
                    <option value="wechat">微信支付</option>
                    <option value="alipay">支付宝</option>
                    <option value="balance">平台余额</option>
                </select>
            </div>
            <div style="background: var(--bg-primary); padding: 16px; border-radius: var(--radius-md); margin-top: 16px;">
                <div class="summary-row">
                    <span>服务单价：</span>
                    <span>¥${product.price}/小时</span>
                </div>
                <div class="summary-row total">
                    <span>预估总价：</span>
                    <span id="bookingTotal">¥${product.price}</span>
                </div>
            </div>
            <button class="checkout-btn" onclick="submitBooking(${product.id})">
                确认预约
            </button>
        </div>
    `;
    
    document.getElementById('bookingModal').classList.add('active');
    
    // 设置默认时间为1小时后
    const now = new Date();
    now.setHours(now.getHours() + 1);
    document.getElementById('startTime').value = now.toISOString().slice(0, 16);
}

// 选择时长
function selectHours(element, productId) {
    document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
    element.classList.add('selected');
    
    const product = products.find(p => p.id === productId);
    const hours = parseInt(element.dataset.hours);
    document.getElementById('bookingTotal').textContent = `¥${product.price * hours}`;
}

// 提交预约
function submitBooking(productId) {
    const startTime = document.getElementById('startTime').value;
    const gameAccount = document.getElementById('gameAccount').value;
    const contact = document.getElementById('contact').value;
    const remark = document.getElementById('remark').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (!gameAccount) {
        showNotification('请输入游戏账号', 'error');
        return;
    }
    if (!contact) {
        showNotification('请输入联系方式', 'error');
        return;
    }
    
    const selectedHours = document.querySelector('.time-slot.selected').dataset.hours;
    const product = products.find(p => p.id === productId);
    
    // 添加到购物车
    cart.addToCart(productId, 1, parseInt(selectedHours));
    
    // 创建订单
    const order = cart.createOrder({
        serviceName: `${product.name} - ${product.serviceTypeName}`,
        gameId: productId,
        startTime: startTime,
        remark: remark,
        paymentMethod: paymentMethod,
        contact: contact
    });
    
    closeBookingModal();
    showNotification('预约成功！订单号：' + order.id, 'success');
    
    setTimeout(() => {
        switchPage('orderPage');
        renderOrders();
    }, 1500);
}

// 渲染购物车
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartSummary = document.getElementById('cartSummary');
    
    if (cart.cart.length === 0) {
        cartItems.style.display = 'none';
        cartEmpty.style.display = 'block';
        cartSummary.style.display = 'none';
        return;
    }
    
    cartItems.style.display = 'flex';
    cartEmpty.style.display = 'none';
    cartSummary.style.display = 'block';
    
    cartItems.innerHTML = cart.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image" style="background: linear-gradient(135deg, #1a1a2e, #16213e)"></div>
            <div class="cart-item-info">
                <div>
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-game">${item.gameName} • ${item.serviceTypeName}</div>
                </div>
                <div class="cart-item-bottom">
                    <div class="cart-item-price">¥${item.price}×${item.quantity}</div>
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.productId}, ${item.quantity - 1})">-</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.productId}, ${item.quantity + 1})">+</button>
                        <button class="remove-btn" onclick="removeFromCart(${item.productId})">🗑️</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // 更新汇总
    document.getElementById('cartTotalHours').textContent = cart.getCartTotalHours() + '小时';
    document.getElementById('cartTotalPrice').textContent = '¥' + cart.getCartTotal().toFixed(2);
}

// 更新购物车数量
function updateCartQuantity(productId, quantity) {
    cart.updateQuantity(productId, quantity);
    renderCart();
}

// 从购物车移除
function removeFromCart(productId) {
    cart.removeFromCart(productId);
    renderCart();
    showNotification('已移除', 'success');
}

// 结算
function checkout() {
    if (cart.cart.length === 0) {
        showNotification('购物车为空', 'warning');
        return;
    }
    
    showNotification('请前往订单页面确认支付', 'success');
    switchPage('orderPage');
}

// 渲染订单
function renderOrders(filter = 'all') {
    const orderList = document.getElementById('orderList');
    const orderEmpty = document.getElementById('orderEmpty');
    const orders = cart.getOrders(filter);
    
    if (orders.length === 0) {
        orderList.style.display = 'none';
        orderEmpty.style.display = 'block';
        return;
    }
    
    orderList.style.display = 'block';
    orderEmpty.style.display = 'none';
    
    orderList.innerHTML = orders.map(order => {
        const statusMap = {
            pending: { text: '待服务', class: 'status-pending' },
            ongoing: { text: '进行中', class: 'status-ongoing' },
            completed: { text: '已完成', class: 'status-completed' },
            cancelled: { text: '已取消', class: 'status-cancelled' }
        };
        const status = statusMap[order.status];
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">订单号：${order.id}</span>
                    <span class="order-status ${status.class}">${status.text}</span>
                </div>
                <div class="order-item">
                    <div class="order-item-image" style="background: linear-gradient(135deg, #1a1a2e, #16213e)"></div>
                    <div class="order-item-info">
                        <div class="order-item-name">${order.serviceName}</div>
                        <div class="order-item-detail">
                            开始时间：${formatTime(order.startTime)}<br>
                            联系方式：${order.contact}
                            ${order.remark ? '<br>备注：' + order.remark : ''}
                        </div>
                    </div>
                </div>
                <div class="order-footer">
                    <span class="order-total">¥${order.totalAmount.toFixed(2)}</span>
                    <div class="order-actions">
                        ${order.status === 'pending' ? `
                            <button class="order-action-btn btn-outline" onclick="cancelOrder('${order.id}')">取消订单</button>
                            <button class="order-action-btn btn-primary" onclick="startService('${order.id}')">开始服务</button>
                        ` : ''}
                        ${order.status === 'ongoing' ? `
                            <button class="order-action-btn btn-primary" onclick="completeOrder('${order.id}')">完成服务</button>
                        ` : ''}
                        ${order.status === 'completed' ? `
                            <button class="order-action-btn btn-outline" onclick="showNotification('评价功能开发中')">评价</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 格式化时间
function formatTime(time) {
    if (!time) return '待定';
    const date = new Date(time);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 取消订单
function cancelOrder(orderId) {
    if (confirm('确定要取消此订单吗？')) {
        cart.cancelOrder(orderId);
        renderOrders();
        showNotification('订单已取消', 'success');
    }
}

// 开始服务
function startService(orderId) {
    cart.updateOrderStatus(orderId, 'ongoing');
    renderOrders();
    showNotification('服务已开始', 'success');
}

// 完成服务
function completeOrder(orderId) {
    cart.completeOrder(orderId);
    renderOrders();
    showNotification('服务已完成', 'success');
}

// 订单筛选
function filterOrder(status) {
    document.querySelectorAll('.order-tabs .tab-item').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    renderOrders(status);
}

// 页面切换
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navMap = {
        'homePage': 0,
        'cartPage': 1,
        'orderPage': 3,
        'profilePage': 4
    };
    document.querySelectorAll('.nav-item')[navMap[pageId]].classList.add('active');
    
    // 更新页面内容
    if (pageId === 'cartPage') {
        renderCart();
    } else if (pageId === 'orderPage') {
        renderOrders();
    } else if (pageId === 'profilePage') {
        updateProfileStats();
    }
    
    // 滚动到顶部
    window.scrollTo(0, 0);
}

// 更新个人信息统计
function updateProfileStats() {
    document.getElementById('orderCount').textContent = cart.getOrderCount();
    document.getElementById('favoriteCount').textContent = cart.getFavoriteCount();
    document.getElementById('couponCount').textContent = Math.floor(Math.random() * 5) + 1;
    document.getElementById('pointsCount').textContent = Math.floor(Math.random() * 500) + 100;
}

// 显示通知
function showNotification(message, type = '') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification show ' + type;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 显示个人资料菜单
function showProfileMenu() {
    showNotification('菜单功能开发中...', 'warning');
}

// 检查登录状态
function checkLoginStatus() {
    const username = localStorage.getItem('qw_username');
    if (username) {
        document.getElementById('username').textContent = username;
        document.getElementById('userLevel').textContent = '普通会员';
    } else {
        document.getElementById('username').textContent = '未登录';
        document.getElementById('userLevel').textContent = '点击登录';
    }
}