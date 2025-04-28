// 书签操作类型常量
const ACTION_CREATED = 'created';
const ACTION_REMOVED = 'removed';
const ACTION_CHANGED = 'changed';
const ACTION_MOVED = 'moved';

// 存储限制常量
const SYNC_STORAGE_LIMIT = 102400; // 100KB总限制
const ESTIMATED_ENTRY_SIZE = 400; // 估计每条记录约400字节
const MAX_SYNC_ENTRIES = Math.floor(SYNC_STORAGE_LIMIT / ESTIMATED_ENTRY_SIZE);

// 初始化扩展
chrome.runtime.onInstalled.addListener(() => {
  // 确保存储区域已初始化
  chrome.storage.sync.get('bookmarkHistory', syncResult => {
    if (!syncResult.bookmarkHistory) {
      chrome.storage.sync.set({ bookmarkHistory: [] });
    }
    
    chrome.storage.local.get('bookmarkHistoryArchive', localResult => {
      if (!localResult.bookmarkHistoryArchive) {
        chrome.storage.local.set({ bookmarkHistoryArchive: [] });
      }
    });
  });
  
  // 显示同步存储容量信息
  console.log(`书签历史混合存储已启用，最新${MAX_SYNC_ENTRIES}条记录保存在Google账号，旧记录保存在本地`);
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
    bookmark: bookmarkData
  };

  // 获取同步和本地存储的历史记录
  chrome.storage.sync.get('bookmarkHistory', syncResult => {
    const syncHistory = syncResult.bookmarkHistory || [];
    
    chrome.storage.local.get('bookmarkHistoryArchive', localResult => {
      const localHistory = localResult.bookmarkHistoryArchive || [];
      
      // 将新记录添加到同步历史的开头
      syncHistory.unshift(historyEntry);
      
      // 如果同步历史超出限制
      if (syncHistory.length > MAX_SYNC_ENTRIES) {
        // 将超出部分移动到本地存储
        const overflowEntries = syncHistory.splice(MAX_SYNC_ENTRIES);
        localHistory.unshift(...overflowEntries);
        
        // 保存本地存储
        chrome.storage.local.set({ bookmarkHistoryArchive: localHistory });
        console.log(`已将${overflowEntries.length}条旧记录转移到本地存储，共有${localHistory.length}条本地记录`);
      }
      
      // 保存同步历史
      chrome.storage.sync.set({ bookmarkHistory: syncHistory }, () => {
        if (chrome.runtime.lastError) {
          console.error('同步错误:', chrome.runtime.lastError);
          // 如果同步失败，将新记录添加到本地存储
          localHistory.unshift(historyEntry);
          chrome.storage.local.set({ bookmarkHistoryArchive: localHistory });
        }
      });
    });
  });
}

// 获取完整历史记录（同步+本地）
function getAllBookmarkHistory(callback) {
  chrome.storage.sync.get('bookmarkHistory', syncResult => {
    const syncHistory = syncResult.bookmarkHistory || [];
    
    chrome.storage.local.get('bookmarkHistoryArchive', localResult => {
      const localHistory = localResult.bookmarkHistoryArchive || [];
      
      // 合并记录并按时间排序
      const allHistory = [...syncHistory, ...localHistory].sort((a, b) => b.timestamp - a.timestamp);
      
      callback(allHistory);
    });
  });
} 