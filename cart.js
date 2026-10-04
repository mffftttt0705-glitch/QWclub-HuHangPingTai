// 购物车管理
class CartManager {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('qw_cart')) || [];
        this.orders = JSON.parse(localStorage.getItem('qw_orders')) || [];
        this.favorites = JSON.parse(localStorage.getItem('qw_favorites')) || [];
    }

    // 添加到购物车
    addToCart(productId, quantity = 1, hours = 1) {
        const item = this.cart.find(item => item.productId === productId);
        if (item) {
            item.quantity += quantity;
            item.hours += hours;
        } else {
            const product = products.find(p => p.id === productId);
            this.cart.push({
                productId: productId,
                name: product.name,
                game: product.game,
                gameName: product.gameName,
                serviceType: product.serviceType,
                serviceTypeName: product.serviceTypeName,
                level: product.level,
                price: product.price,
                originalPrice: product.originalPrice,
                discount: product.discount,
                avatar: product.avatar,
                quantity: quantity,
                hours: hours
            });
        }
        this.saveCart();
        this.updateCartBadge();
        return this.cart;
    }

    // 从购物车移除
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        this.saveCart();
        this.updateCartBadge();
        return this.cart;
    }

    // 更新数量
    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.productId === productId);
        if (item) {
            if (quantity <= 0) {
                return this.removeFromCart(productId);
            }
            item.quantity = quantity;
            this.saveCart();
            this.updateCartBadge();
        }
        return this.cart;
    }

    // 清空购物车
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartBadge();
    }

    // 获取购物车总数
    getCartCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    // 获取购物车总价
    getCartTotal() {
        return this.cart.reduce((total, item) => total + item.price * item.quantity, 0);
    }

    // 获取购物车总时长
    getCartTotalHours() {
        return this.cart.reduce((total, item) => total + item.hours * item.quantity, 0);
    }

    // 保存购物车
    saveCart() {
        localStorage.setItem('qw_cart', JSON.stringify(this.cart));
    }

    // 更新购物车徽章
    updateCartBadge() {
        const badge = document.getElementById('cartBadge');
        const count = this.getCartCount();
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // 创建订单
    createOrder(bookingInfo) {
        const order = {
            id: this.generateOrderId(),
            items: this.cart.map(item => ({
                ...item,
                price: item.price * item.quantity
            })),
            totalAmount: this.getCartTotal(),
            totalHours: this.getCartTotalHours(),
            status: 'pending',
            createTime: new Date().toISOString(),
            serviceName: bookingInfo.serviceName,
            gameId: bookingInfo.gameId,
            startTime: bookingInfo.startTime,
            remark: bookingInfo.remark || '',
            paymentMethod: bookingInfo.paymentMethod || 'wechat',
            contact: bookingInfo.contact || ''
        };
        this.orders.unshift(order);
        this.saveOrders();
        this.clearCart();
        return order;
    }

    // 生成订单号
    generateOrderId() {
        const now = new Date();
        const timestamp = now.getTime();
        const random = Math.floor(Math.random() * 1000);
        return `QW${timestamp}${random}`;
    }

    // 保存订单
    saveOrders() {
        localStorage.setItem('qw_orders', JSON.stringify(this.orders));
    }

    // 获取订单
    getOrders(filter = 'all') {
        if (filter === 'all') return this.orders;
        return this.orders.filter(order => order.status === filter);
    }

    // 更新订单状态
    updateOrderStatus(orderId, status) {
        const order = this.orders.find(order => order.id === orderId);
        if (order) {
            order.status = status;
            order.updateTime = new Date().toISOString();
            this.saveOrders();
            return order;
        }
        return null;
    }

    // 取消订单
    cancelOrder(orderId) {
        return this.updateOrderStatus(orderId, 'cancelled');
    }

    // 完成订单
    completeOrder(orderId) {
        return this.updateOrderStatus(orderId, 'completed');
    }

    // 收藏管理
    toggleFavorite(productId) {
        const index = this.favorites.indexOf(productId);
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            this.favorites.push(productId);
        }
        localStorage.setItem('qw_favorites', JSON.stringify(this.favorites));
        return this.favorites;
    }

    // 是否收藏
    isFavorite(productId) {
        return this.favorites.includes(productId);
    }

    // 获取收藏数
    getFavoriteCount() {
        return this.favorites.length;
    }

    // 获取订单数
    getOrderCount() {
        return this.orders.length;
    }
}

// 创建购物车实例
const cart = new CartManager();