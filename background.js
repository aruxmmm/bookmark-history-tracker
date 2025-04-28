// 书签操作类型常量
const ACTION_CREATED = 'created';
const ACTION_REMOVED = 'removed';
const ACTION_CHANGED = 'changed';
const ACTION_MOVED = 'moved';

// 初始化扩展
chrome.runtime.onInstalled.addListener(() => {
  // 确保存储区域已初始化
  chrome.storage.local.get('bookmarkHistory', result => {
    if (!result.bookmarkHistory) {
      chrome.storage.local.set({ bookmarkHistory: [] });
    }
  });
  
  console.log('书签历史追踪器已初始化，所有数据保存在本地');
});

// 监听书签创建事件
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  addHistoryEntry(ACTION_CREATED, bookmark);
});

// 监听书签删除事件
chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  addHistoryEntry(ACTION_REMOVED, { 
    id, 
    parentId: removeInfo.parentId,
    title: removeInfo.node.title,
    url: removeInfo.node.url,
    dateAdded: removeInfo.node.dateAdded,
    removedNodes: removeInfo.node.children
  });
});

// 监听书签更改事件
chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  chrome.bookmarks.get(id, (bookmarks) => {
    if (bookmarks && bookmarks.length > 0) {
      const bookmark = bookmarks[0];
      addHistoryEntry(ACTION_CHANGED, {
        id,
        parentId: bookmark.parentId,
        title: changeInfo.title,
        url: changeInfo.url,
        oldTitle: bookmark.title,
        oldUrl: bookmark.url
      });
    }
  });
});

// 监听书签移动事件
chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  chrome.bookmarks.get(id, (bookmarks) => {
    if (bookmarks && bookmarks.length > 0) {
      const bookmark = bookmarks[0];
      addHistoryEntry(ACTION_MOVED, {
        id,
        title: bookmark.title,
        url: bookmark.url,
        oldParentId: moveInfo.oldParentId,
        newParentId: moveInfo.parentId,
        oldIndex: moveInfo.oldIndex,
        newIndex: moveInfo.index
      });
    }
  });
});

// 添加历史记录条目
function addHistoryEntry(action, bookmarkData) {
  const historyEntry = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    action: action,
    bookmark: bookmarkData,
    // 添加日期相关字段，方便按日期检索
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD格式
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1, // 月份从1开始
    day: new Date().getDate()
  };

  // 保存到本地存储
  chrome.storage.local.get('bookmarkHistory', result => {
    const history = result.bookmarkHistory || [];
    
    // 将新记录添加到开头
    history.unshift(historyEntry);
    
    // 保存到本地存储
    chrome.storage.local.set({ bookmarkHistory: history }, () => {
      console.log('新记录已保存到本地存储');
    });
  });
} 