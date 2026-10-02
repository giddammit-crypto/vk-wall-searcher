/**
 * AURORA DESIGN — VK Bridge Integration
 * Handles VK Mini Apps lifecycle, native download in WebView, and sharing.
 */
(function() {
  const isVK = (() => {
    try {
      const q = window.location.search;
      return q.includes('vk_user_id') || q.includes('vk_app_id') || q.includes('sign=') || (window.name && window.name.includes('fXD'));
    } catch (e) {
      return false;
    }
  })();

  let isBridgeReady = false;

  async function initVK() {
    if (typeof vkBridge === 'undefined') {
      return false;
    }
    try {
      vkBridge.subscribe((e) => {
        if (!e || !e.detail) return;
        const type = e.detail.type;
        const data = e.detail.data;
        if (type === 'VKWebAppUpdateConfig') {
          const scheme = data.scheme || (data.appearance === 'dark' ? 'space_gray' : 'bright_light');
          if (scheme && (scheme.includes('dark') || scheme === 'space_gray')) {
            document.documentElement.setAttribute('data-theme', 'dark');
          }
        }
      });
      await vkBridge.send('VKWebAppInit');
      isBridgeReady = true;
      console.log('[AuroraVK] VK Mini App initialized successfully');
      return true;
    } catch (err) {
      console.warn('[AuroraVK] VKWebAppInit error:', err);
      return false;
    }
  }

  async function downloadFile(url, filename = 'poster.png') {
    if (isBridgeReady && typeof vkBridge !== 'undefined') {
      try {
        const res = await vkBridge.send('VKWebAppDownloadFile', {
          url: url,
          filename: filename
        });
        return res;
      } catch (err) {
        console.warn('[AuroraVK] VKWebAppDownloadFile failed, fallback to standard download:', err);
      }
    }
    // Fallback standard browser download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function postToWall(message = 'Моя афиша в AURORA DESIGN', attachments = '') {
    if (!isBridgeReady || typeof vkBridge === 'undefined') return false;
    try {
      return await vkBridge.send('VKWebAppShowWallPostBox', {
        message: message,
        attachments: attachments
      });
    } catch (err) {
      console.warn('[AuroraVK] ShowWallPostBox failed:', err);
      return false;
    }
  }

  async function postToStory(backgroundUrl) {
    if (!isBridgeReady || typeof vkBridge === 'undefined') return false;
    try {
      return await vkBridge.send('VKWebAppShowStoryBox', {
        background_type: 'image',
        url: backgroundUrl,
        locked: true
      });
    } catch (err) {
      console.warn('[AuroraVK] ShowStoryBox failed:', err);
      return false;
    }
  }

  async function shareApp() {
    if (isBridgeReady && typeof vkBridge !== 'undefined') {
      try {
        return await vkBridge.send('VKWebAppShare', { link: window.location.href });
      } catch (e) {}
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: window.location.href });
      } catch (e) {}
    }
  }

  window.AuroraVK = {
    isVK,
    isBridgeReady: () => isBridgeReady,
    init: initVK,
    downloadFile,
    postToWall,
    postToStory,
    share: shareApp
  };

  // Auto-init on load if inside VK or vkBridge available
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVK);
  } else {
    initVK();
  }
})();
