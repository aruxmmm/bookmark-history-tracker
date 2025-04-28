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

  chrome.storage.local.get('bookmarkHistory', result => {
    const history = result.bookmarkHistory || [];
    // 将新历史记录添加到开头
    history.unshift(historyEntry);
    // 如果历史记录太长，限制其长度
    if (history.length > 500) {
      history.splice(500);
    }
    chrome.storage.local.set({ bookmarkHistory: history });
  });
} 