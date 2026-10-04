// 主应用脚本

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    console.log('怪兽电竞应用已加载');
    
    initHomeFeatures();
    initMessageFeatures();
    initHitmanFeatures();
    initCategoryFeatures();
});

// 首页功能
function initHomeFeatures() {
    const monsterOptions = document.querySelectorAll('.monster-option');
    monsterOptions.forEach(option => {
        option.addEventListener('click', function() {
            monsterOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                showToast('搜索: ' + this.value);
            }
        });
    }
}

// 消息功能
function initMessageFeatures() {
    const messageTabs = document.querySelectorAll('.message-tab');
    messageTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            messageTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// 打手功能
function initHitmanFeatures() {
    const hitmanCards = document.querySelectorAll('.hitman-card');
    hitmanCards.forEach(card => {
        card.addEventListener('click', function() {
            showToast('查看打手详情');
        });
    });
}

// 分类功能
function initCategoryFeatures() {
    const categoryTabs = document.querySelectorAll('.tab-flat');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            categoryTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const orderBtns = document.querySelectorAll('.btn-order');
    orderBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            showToast('下单功能开发中...');
        });
    });

    const reviewBtns = document.querySelectorAll('.btn-review');
    reviewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            showToast('评价功能开发中...');
        });
    });
}

// 工具函数
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}