(async () => {
    const text = extractCleanText();
  
    try {
      const response = await fetch("http://localhost:5001/highlight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });
  
      const result = await response.json();
      const phrases = Array.isArray(result.highlights) ? result.highlights : [];
  
      highlightPhrases(phrases);
    } catch (error) {
      console.error("请求失败：", error);
    }
  })();
  
  // 提取可高亮的纯净文本
  function extractCleanText() {
    // 获取所有可见的文本节点
    const allTextNodes = getAllTextNodes(document.body);
    return allTextNodes.map(node => node.textContent).join("\n");
  }
  
  // 获取所有文本节点的工具函数
  function getAllTextNodes(root) {
    const excludeTags = ["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "IMG", "VIDEO", "SVG", "CODE", "PRE"];
    const textNodes = [];
    
    function traverse(node) {
      // 跳过隐藏元素
      if (node.nodeType === Node.ELEMENT_NODE) {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return;
        }
        
        // 跳过排除的标签
        if (excludeTags.includes(node.tagName)) {
          return;
        }
      }
      
      // 收集文本节点
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text.length > 0) {
          textNodes.push(node);
        }
      }
      
      // 递归处理子节点
      for (const child of node.childNodes) {
        traverse(child);
      }
    }
    
    traverse(root);
    return textNodes;
  }
  
  function highlightPhrases(phrases) {
    if (!phrases || phrases.length === 0) return;
    
    // 创建样式
    addHighlightStyles();
    
    // 获取所有可见的文本节点
    const textNodes = getAllTextNodes(document.body);
    
    // 为了提高效率，我们将所有短语组合成一个大的正则表达式
    const escapedPhrases = phrases.map(phrase => escapeRegExp(phrase));
    
    // 按长度排序，优先匹配较长的短语
    escapedPhrases.sort((a, b) => b.length - a.length);
    
    // 将每个短语包装在捕获组中
    const combinedRegex = new RegExp(`(${escapedPhrases.join('|')})`, 'gi');
    
    // 处理每个文本节点
    textNodes.forEach(node => {
      const parent = node.parentNode;
      if (!parent) return;
      
      const content = node.textContent;
      if (!combinedRegex.test(content)) return;
      
      // 重置正则索引
      combinedRegex.lastIndex = 0;
      
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;
      
      // 找出所有匹配项并创建突出显示
      while ((match = combinedRegex.exec(content)) !== null) {
        // 添加匹配前的文本
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(content.substring(lastIndex, match.index)));
        }
        
        // 获取匹配的文本
        const matchedText = match[0];
        
        // 创建高亮元素
        const highlightEl = document.createElement('mark');
        highlightEl.className = 'ai-highlight';
        highlightEl.textContent = matchedText;
        highlightEl.setAttribute('data-highlight-text', matchedText); // 存储文本作为数据属性
        
        // 添加交互功能
        highlightEl.addEventListener('click', function() {
          // 从元素的数据属性中获取文本
          const textToCopy = this.getAttribute('data-highlight-text');
          
          // 复制到剪贴板
          navigator.clipboard.writeText(textToCopy)
            .then(() => {
              showTooltip(this, '已复制到剪贴板');
            })
            .catch(err => {
              console.error('复制失败:', err);
              showTooltip(this, '复制失败');
            });
        });
        
        fragment.appendChild(highlightEl);
        lastIndex = combinedRegex.lastIndex;
      }
      
      // 添加剩余的文本
      if (lastIndex < content.length) {
        fragment.appendChild(document.createTextNode(content.substring(lastIndex)));
      }
      
      // 替换原始节点
      parent.replaceChild(fragment, node);
    });
    
    // 添加交互信息
    addTooltip('页面已高亮重要内容，点击高亮文本可复制');
  }
  
  // 添加样式
  function addHighlightStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ai-highlight {
        background-color: rgba(255, 255, 0, 0.4);
        border-radius: 3px;
        padding: 0 2px;
        cursor: pointer;
        position: relative;
        transition: background-color 0.2s;
      }
      
      .ai-highlight:hover {
        background-color: rgba(255, 255, 0, 0.7);
      }
      
      .ai-tooltip {
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .ai-tooltip.visible {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 显示工具提示
  function showTooltip(element, message) {
    let tooltip = document.querySelector('.ai-tooltip');
    
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'ai-tooltip';
      document.body.appendChild(tooltip);
    }
    
    tooltip.textContent = message;
    
    // 定位工具提示
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 10}px`;
    tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
    
    // 显示工具提示
    tooltip.classList.add('visible');
    
    // 2秒后隐藏
    setTimeout(() => {
      tooltip.classList.remove('visible');
    }, 2000);
  }
  
  // 添加页面工具提示
  function addTooltip(message) {
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    `;
    tooltip.textContent = message;
    document.body.appendChild(tooltip);
    
    setTimeout(() => {
      tooltip.style.opacity = '0';
      tooltip.style.transition = 'opacity 0.5s';
      setTimeout(() => tooltip.remove(), 500);
    }, 3000);
  }
  
  // 正则转义函数
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }