// 主应用脚本

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    console.log('怪兽电竞应用已加载');
    
    // 初始化各个页面的功能
    initHomeFeatures();
    initMessageFeatures();
    initHitmanFeatures();
    initCategoryFeatures();
});

// 首页功能
function initHomeFeatures() {
    // 怪兽选择功能
    const monsterOptions = document.querySelectorAll('.monster-option');
    monsterOptions.forEach(option => {
        option.addEventListener('click', function() {
            monsterOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            console.log('切换怪兽:', this.querySelector('span').textContent);
        });
    });

    // 分类标签切换
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            console.log('切换分类:', this.textContent);
        });
    });

    // 搜索功能
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('搜索:', this.value);
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
            console.log('切换消息类型:', this.textContent);
        });
    });
}

// 打手功能
function initHitmanFeatures() {
    const hitmanCards = document.querySelectorAll('.hitman-card');
    hitmanCards.forEach(card => {
        card.addEventListener('click', function() {
            console.log('查看打手详情');
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
            console.log('切换排序:', this.textContent);
        });
    });

    // 立即点单按钮
    const orderBtns = document.querySelectorAll('.btn-order');
    orderBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('立即点单');
            alert('下单功能开发中...');
        });
    });

    // 查看评价按钮
    const reviewBtns = document.querySelectorAll('.btn-review');
    reviewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('查看评价');
            alert('评价功能开发中...');
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

// 添加toast样式到style标签
function addToastStyle() {
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 12px 24px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
            from {
                top: -50px;
                opacity: 0;
            }
            to {
                top: 20px;
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// 初始化时添加toast样式
addToastStyle();