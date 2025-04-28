document.addEventListener('DOMContentLoaded', () => {
  // DOM元素
  const tabHistory = document.getElementById('tab-history');
  const tabDeleted = document.getElementById('tab-deleted');
  const historyView = document.getElementById('history-view');
  const deletedView = document.getElementById('deleted-view');
  const historyList = document.getElementById('history-list');
  const deletedList = document.getElementById('deleted-list');
  const actionFilter = document.getElementById('action-filter');
  const searchInput = document.getElementById('search-input');
  const deletedSearchInput = document.getElementById('deleted-search-input');
  const clearHistoryBtn = document.getElementById('clear-history');
  const detailsModal = document.getElementById('details-modal');
  const closeModal = document.querySelector('.close-modal');
  const bookmarkDetails = document.getElementById('bookmark-details');
  
  // 检测系统颜色模式
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // 操作类型映射
  const actionTypes = {
    'created': '创建',
    'removed': '删除',
    'changed': '修改',
    'moved': '移动'
  };
  
  // 操作类型图标映射
  const actionIcons = {
    'created': '✚',
    'removed': '✖',
    'changed': '✎',
    'moved': '↪'
  };
  
  // 存储同步状态
  let syncCount = 0;
  let localCount = 0;
  
  // 防抖函数
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }
  
  // 初始化
  loadHistoryData();
  
  // 标签切换事件
  tabHistory.addEventListener('click', () => {
    switchTab('history');
  });
  
  tabDeleted.addEventListener('click', () => {
    switchTab('deleted');
  });
  
  // 筛选和搜索事件 - 使用防抖优化性能
  actionFilter.addEventListener('change', () => {
    renderHistoryList();
  });
  
  searchInput.addEventListener('input', debounce(() => {
    renderHistoryList();
  }, 300));
  
  deletedSearchInput.addEventListener('input', debounce(() => {
    renderDeletedList();
  }, 300));
  
  // 清空历史记录
  clearHistoryBtn.addEventListener('click', () => {
    showConfirmDialog('确定要清空所有历史记录吗？', '此操作不可撤销', () => {
      // 清空同步和本地存储
      chrome.storage.sync.set({ bookmarkHistory: [] }, () => {
        chrome.storage.local.set({ bookmarkHistoryArchive: [] }, () => {
          loadHistoryData();
          showToast('历史记录已清空');
        });
      });
    });
  });
  
  // 关闭模态框
  closeModal.addEventListener('click', () => {
    closeModalWithAnimation();
  });
  
  window.addEventListener('click', (event) => {
    if (event.target === detailsModal) {
      closeModalWithAnimation();
    }
  });
  
  // 平滑关闭模态框
  function closeModalWithAnimation() {
    detailsModal.style.opacity = '0';
    setTimeout(() => {
      detailsModal.style.display = 'none';
      detailsModal.style.opacity = '1';
    }, 200);
  }
  
  // 显示确认对话框
  function showConfirmDialog(title, message, confirmCallback) {
    if (confirm(`${title}\n${message}`)) {
      confirmCallback();
    }
  }
  
  // 显示操作成功提示
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }
  
  // 加载历史数据
  function loadHistoryData() {
    // 显示加载中状态
    historyList.innerHTML = '<div class="loading-spinner"></div>';
    deletedList.innerHTML = '<div class="loading-spinner"></div>';
    
    // 获取同步存储中的记录
    chrome.storage.sync.get('bookmarkHistory', syncResult => {
      const syncHistory = syncResult.bookmarkHistory || [];
      syncCount = syncHistory.length;
      
      // 获取本地存储的记录
      chrome.storage.local.get('bookmarkHistoryArchive', localResult => {
        const localHistory = localResult.bookmarkHistoryArchive || [];
        localCount = localHistory.length;
        
        // 合并历史记录并按时间排序
        const allHistory = [...syncHistory, ...localHistory].sort((a, b) => b.timestamp - a.timestamp);
        
        // 更新状态信息
        updateStorageInfo();
        
        // 渲染列表
        renderHistoryList(allHistory);
        renderDeletedList(allHistory);
      });
    });
  }
  
  // 更新存储状态信息
  function updateStorageInfo() {
    const storageInfo = document.createElement('div');
    storageInfo.className = 'storage-info';
    storageInfo.innerHTML = `
      <span>已同步: <strong>${syncCount}</strong> 条记录</span>
      <span>本地存储: <strong>${localCount}</strong> 条记录</span>
    `;
    
    // 移除旧信息
    const oldInfo = document.querySelector('.storage-info');
    if (oldInfo) {
      oldInfo.remove();
    }
    
    // 添加到历史视图
    historyView.insertBefore(storageInfo, historyView.firstChild);
  }
  
  // 切换标签 - 添加平滑过渡
  function switchTab(tabName) {
    if (tabName === 'history') {
      tabHistory.classList.add('active');
      tabDeleted.classList.remove('active');
      
      // 平滑过渡
      deletedView.style.opacity = '0';
      setTimeout(() => {
        historyView.classList.add('active');
        deletedView.classList.remove('active');
        setTimeout(() => {
          historyView.style.opacity = '1';
        }, 10);
      }, 200);
    } else {
      tabHistory.classList.remove('active');
      tabDeleted.classList.add('active');
      
      // 平滑过渡
      historyView.style.opacity = '0';
      setTimeout(() => {
        historyView.classList.remove('active');
        deletedView.classList.add('active');
        setTimeout(() => {
          deletedView.style.opacity = '1';
        }, 10);
      }, 200);
    }
  }
  
  // 渲染历史列表
  function renderHistoryList(historyData) {
    // 如果没有传入数据，重新加载
    if (!historyData) {
      loadHistoryData();
      return;
    }
    
    const selectedAction = actionFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    // 添加加载动画
    historyList.innerHTML = '<div class="loading-spinner"></div>';
    
    // 延迟一点点以显示动画
    setTimeout(() => {
      historyList.innerHTML = '';
      
      const filteredData = historyData.filter(entry => {
        const matchesAction = selectedAction === 'all' || entry.action === selectedAction;
        const matchesSearch = !searchTerm || 
          (entry.bookmark.title && entry.bookmark.title.toLowerCase().includes(searchTerm)) || 
          (entry.bookmark.url && entry.bookmark.url.toLowerCase().includes(searchTerm));
        
        return matchesAction && matchesSearch;
      });
      
      if (filteredData.length === 0) {
        historyList.innerHTML = '<div class="empty-message">没有找到匹配的历史记录</div>';
        return;
      }
      
      // 使用文档片段优化性能
      const fragment = document.createDocumentFragment();
      filteredData.forEach(entry => {
        const item = createHistoryItem(entry);
        fragment.appendChild(item);
      });
      
      historyList.appendChild(fragment);
    }, 300);
  }
  
  // 渲染已删除书签列表
  function renderDeletedList(historyData) {
    // 如果没有传入数据，重新加载
    if (!historyData) {
      loadHistoryData();
      return;
    }
    
    const searchTerm = deletedSearchInput.value.toLowerCase();
    
    // 添加加载动画
    deletedList.innerHTML = '<div class="loading-spinner"></div>';
    
    setTimeout(() => {
      deletedList.innerHTML = '';
      
      const deletedBookmarks = historyData.filter(entry => {
        const isRemoved = entry.action === 'removed';
        const matchesSearch = !searchTerm || 
          (entry.bookmark.title && entry.bookmark.title.toLowerCase().includes(searchTerm)) || 
          (entry.bookmark.url && entry.bookmark.url.toLowerCase().includes(searchTerm));
        
        return isRemoved && matchesSearch;
      });
      
      if (deletedBookmarks.length === 0) {
        deletedList.innerHTML = '<div class="empty-message">没有找到已删除的书签</div>';
        return;
      }
      
      // 使用文档片段优化性能
      const fragment = document.createDocumentFragment();
      deletedBookmarks.forEach(entry => {
        const item = createHistoryItem(entry, true);
        fragment.appendChild(item);
      });
      
      deletedList.appendChild(fragment);
    }, 300);
  }
  
  // 创建历史项目元素
  function createHistoryItem(entry, isDeletedView = false) {
    const template = document.getElementById('history-item-template');
    const item = document.importNode(template.content, true).querySelector('.history-item');
    
    const timestamp = item.querySelector('.timestamp');
    const actionType = item.querySelector('.action-type');
    const bookmarkTitle = item.querySelector('.bookmark-title');
    const bookmarkUrl = item.querySelector('.bookmark-url');
    const restoreBtn = item.querySelector('.restore-btn');
    const detailsBtn = item.querySelector('.details-btn');
    
    // 设置时间戳
    const date = new Date(entry.timestamp);
    timestamp.textContent = formatDate(date);
    
    // 设置操作类型，添加图标
    actionType.textContent = `${actionIcons[entry.action]} ${actionTypes[entry.action]}`;
    actionType.classList.add(entry.action);
    
    // 设置书签标题和URL
    bookmarkTitle.textContent = entry.bookmark.title || '无标题';
    
    if (entry.bookmark.url) {
      bookmarkUrl.textContent = entry.bookmark.url;
      bookmarkUrl.href = entry.bookmark.url;
    } else {
      bookmarkUrl.textContent = '(文件夹)';
      bookmarkUrl.removeAttribute('href');
    }
    
    // 设置恢复按钮，仅针对已删除的书签
    if (entry.action === 'removed' && entry.bookmark.url) {
      restoreBtn.style.display = 'block';
      restoreBtn.addEventListener('click', () => restoreBookmark(entry));
    }
    
    // 设置详情按钮
    detailsBtn.addEventListener('click', () => showBookmarkDetails(entry));
    
    return item;
  }
  
  // 友好的日期格式化
  function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const day = 24 * 60 * 60 * 1000;
    
    if (diff < 60 * 1000) { // 小于1分钟
      return '刚刚';
    } else if (diff < 60 * 60 * 1000) { // 小于1小时
      return `${Math.floor(diff / (60 * 1000))}分钟前`;
    } else if (diff < day) { // 小于1天
      return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
    } else if (diff < 2 * day) { // 昨天
      return `昨天 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (diff < 7 * day) { // 一周内
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return `${days[date.getDay()]} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else { // 更早
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  }
  
  // 显示书签详情
  function showBookmarkDetails(entry) {
    // 清空前内容
    bookmarkDetails.innerHTML = '';
    
    const dl = document.createElement('dl');
    
    // 添加基本信息
    addDetailItem(dl, '操作类型', actionTypes[entry.action]);
    addDetailItem(dl, '时间', new Date(entry.timestamp).toLocaleString());
    addDetailItem(dl, '标题', entry.bookmark.title || '无标题');
    
    if (entry.bookmark.url) {
      addDetailItem(dl, 'URL', entry.bookmark.url);
    }
    
    // 根据操作类型添加特定信息
    switch (entry.action) {
      case 'changed':
        if (entry.bookmark.oldTitle) {
          addDetailItem(dl, '旧标题', entry.bookmark.oldTitle);
        }
        if (entry.bookmark.oldUrl) {
          addDetailItem(dl, '旧URL', entry.bookmark.oldUrl);
        }
        break;
        
      case 'moved':
        addDetailItem(dl, '旧位置', `父ID: ${entry.bookmark.oldParentId}, 索引: ${entry.bookmark.oldIndex}`);
        addDetailItem(dl, '新位置', `父ID: ${entry.bookmark.newParentId}, 索引: ${entry.bookmark.newIndex}`);
        break;
    }
    
    bookmarkDetails.appendChild(dl);
    
    // 显示模态框并添加动画
    detailsModal.style.display = 'block';
    const modalContent = detailsModal.querySelector('.modal-content');
    modalContent.style.transform = 'scale(0.9)';
    modalContent.style.opacity = '0';
    
    setTimeout(() => {
      modalContent.style.transform = 'scale(1)';
      modalContent.style.opacity = '1';
    }, 10);
  }
  
  // 添加详情项
  function addDetailItem(dl, term, detail) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    
    const dd = document.createElement('dd');
    dd.textContent = detail;
    
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  
  // 恢复已删除书签
  function restoreBookmark(entry) {
    const bookmark = entry.bookmark;
    
    chrome.bookmarks.create({
      title: bookmark.title,
      url: bookmark.url,
      parentId: bookmark.parentId
    }, (newBookmark) => {
      if (chrome.runtime.lastError) {
        showToast(`恢复失败: ${chrome.runtime.lastError.message}`);
      } else {
        showToast('书签已成功恢复!');
        loadHistoryData();
      }
    });
  }
}); 