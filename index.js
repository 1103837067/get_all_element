// 获取页面可点击元素
function getClickableElements(highlight = false) {
    // 存储可点击元素的信息
    const clickableElements = [];
    let highlightIndex = 0;

    // 添加高亮样式
    function addHighlightStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .element-highlight {
                position: absolute !important;
                border: 2px solid red !important;
                background-color: rgba(255, 0, 0, 0.2) !important;
                z-index: 10000 !important;
                pointer-events: none !important;
                transition: all 0.2s !important;
            }
            .element-highlight-label {
                position: absolute !important;
                background-color: red !important;
                color: white !important;
                padding: 2px 4px !important;
                border-radius: 2px !important;
                font-size: 12px !important;
                z-index: 10001 !important;
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // 高亮显示元素
    function highlightElement(element, index) {
        const rect = element.getBoundingClientRect();
        
        // 创建高亮框
        const highlight = document.createElement('div');
        highlight.className = 'element-highlight';
        highlight.style.left = rect.left + window.scrollX + 'px';
        highlight.style.top = rect.top + window.scrollY + 'px';
        highlight.style.width = rect.width + 'px';
        highlight.style.height = rect.height + 'px';
        
        // 创建标签
        const label = document.createElement('div');
        label.className = 'element-highlight-label';
        label.textContent = index;
        label.style.left = rect.left + window.scrollX + 'px';
        label.style.top = (rect.top + window.scrollY - 20) + 'px';
        
        // 添加到页面
        document.body.appendChild(highlight);
        document.body.appendChild(label);
        
        return [highlight, label];
    }

    // 清除所有高亮
    function clearHighlights() {
        const highlights = document.querySelectorAll('.element-highlight, .element-highlight-label');
        highlights.forEach(el => el.remove());
    }

    // 检查元素是否可见
    function isElementVisible(element) {
        const style = window.getComputedStyle(element);
        return element.offsetWidth > 0 &&
               element.offsetHeight > 0 &&
               style.visibility !== 'hidden' &&
               style.display !== 'none' &&
               style.opacity !== '0';
    }

    // 检查元素是否在视口内
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // 获取元素的XPath
    function getXPath(element) {
        if (!element) return '';
        if (element.tagName === 'BODY') return '/body';

        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                const path = getXPath(element.parentNode);
                const tagName = element.tagName.toLowerCase();
                return `${path}/${tagName}[${ix + 1}]`;
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
    }

    // 生成CSS选择器
    function getCssSelector(element) {
        if (!element) return '';
        
        // 1. 如果元素有id,直接返回
        if (element.id) {
            return `#${CSS.escape(element.id)}`;
        }

        // 2. 尝试使用独特的class组合
        if (element.className) {
            const classes = element.className.split(' ')
                .filter(c => c)
                .map(c => `.${CSS.escape(c)}`)
                .join('');
            if (classes) {
                const sameClassElements = document.querySelectorAll(classes);
                if (sameClassElements.length === 1) {
                    return classes;
                }
            }
        }

        // 3. 使用标签名和属性组合
        let selector = element.tagName.toLowerCase();
        const attributes = ['type', 'name', 'role', 'aria-label'];
        for (const attr of attributes) {
            const value = element.getAttribute(attr);
            if (value) {
                selector += `[${attr}="${CSS.escape(value)}"]`;
            }
        }

        // 4. 如果选择器不唯一,添加nth-child
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(element) + 1;
            selector = `${selector}:nth-child(${index})`;
        }

        // 5. 验证选择器是否唯一
        const matchingElements = document.querySelectorAll(selector);
        if (matchingElements.length === 1) {
            return selector;
        }

        // 6. 如果还不唯一,添加父元素选择器
        if (parent && parent !== document.body) {
            const parentSelector = getCssSelector(parent);
            return `${parentSelector} > ${selector}`;
        }

        return selector;
    }

    // 检查元素是否可交互
    function isInteractive(element) {
        // 可交互的标签
        const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
        if (interactiveTags.includes(element.tagName)) return true;

        // 检查role属性
        const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'];
        if (interactiveRoles.includes(element.getAttribute('role'))) return true;

        // 检查事件监听器
        const events = ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'];
        for (const event of events) {
            if (element.hasAttribute(`on${event}`)) return true;
        }

        // 检查样式是否表明可交互
        const style = window.getComputedStyle(element);
        if (style.cursor === 'pointer') return true;

        return false;
    }

    // 递归遍历DOM树
    function traverseDOM(element) {
        if (!element) return;

        // 检查元素是否可交互
        if (isElementVisible(element) && isInViewport(element) && isInteractive(element)) {
            // 获取元素文本
            const text = element.innerText || element.textContent || '';
            
            // 如果需要高亮显示
            if (highlight) {
                highlightElement(element, highlightIndex);
            }
            
            // 收集元素信息
            clickableElements.push({
                tag_name: element.tagName.toLowerCase(),
                xpath: getXPath(element),
                css_selector: getCssSelector(element),
                attributes: {
                    id: element.id || '',
                    class: element.className || '',
                    type: element.type || '',
                    role: element.getAttribute('role') || '',
                    'aria-label': element.getAttribute('aria-label') || ''
                },
                highlight_index: highlightIndex++,
                coordinates: {
                    x: element.getBoundingClientRect().x,
                    y: element.getBoundingClientRect().y
                },
                text: text.trim(),
                is_visible: true,
                is_in_viewport: true
            });
        }

        // 遍历子元素
        for (const child of element.children) {
            traverseDOM(child);
        }
    }

    // 清除现有的高亮
    clearHighlights();
    
    // 如果需要高亮，添加样式
    if (highlight) {
        addHighlightStyles();
    }

    // 开始遍历
    traverseDOM(document.body);

    // 返回结果
    return {
        current_url: window.location.href,
        available_tabs: [{
            url: window.location.href,
            title: document.title
        }],
        interactive_elements: clickableElements
    };
}
getClickableElements(true);
