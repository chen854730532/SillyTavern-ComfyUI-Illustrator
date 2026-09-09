import { extension_settings } from "../../../extensions.js";
import { eventSource, event_types, saveSettingsDebounced } from "../../../../script.js";

const MODULE_NAME = 'comfyui_illustrator';
const STORAGE_KEY = 'comfyui_illustrator_settings_backup';
const PANEL_ID = 'comfyui-panel';
const FLOATING_BTN_ID = 'comfyui-floating-quick-btn';
const LEFT_DOCK_ID = 'comfyui-left-companion-dock';
const POLLING_TIMEOUT_MS = 90000;
const POLLING_INTERVAL_MS = 2000;

// 内嵌核心样式（增加相册翻页控件样式）
const inlineStyle = `
#${PANEL_ID} {
    display: none;
    position: fixed;
    width: 90vw;
    max-width: 500px;
    max-height: 85vh;
    z-index: 100000;
    color: var(--SmartThemeBodyColor, #dcdcd2);
    background-color: var(--SmartThemeBlurTintColor, rgba(23, 23, 23, 0.95));
    border: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.2));
    border-radius: 8px;
    box-shadow: 0 4px 25px rgba(0, 0, 0, 0.75);
    padding: 15px;
    box-sizing: border-box;
    flex-direction: column;
}
#${PANEL_ID} .panel-control-bar {
    cursor: move;
    user-select: none;
    padding-bottom: 10px;
    margin-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
}
#${PANEL_ID} .floating_panel_close { cursor: pointer; font-size: 1.4em; }
#${PANEL_ID} .comfyui-panel-content { overflow-y: auto; flex-grow: 1; }
#${PANEL_ID} input[type="text"], #${PANEL_ID} select, #${PANEL_ID} textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #555;
    background-color: rgba(0,0,0,0.3);
    color: #fff;
    margin-bottom: 10px;
}
#${PANEL_ID} select { cursor: pointer; }
#${PANEL_ID} select option { background: #2a2a2a; color: #fff; }
#${PANEL_ID} textarea { min-height: 110px; resize: vertical; }

.comfy-btn {
    padding: 6px 12px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 4px;
    cursor: pointer;
    background: #2a2a2a;
    color: white;
    font-weight: 600;
}
.comfy-btn:hover { background: #444; }
.comfy-btn.testing { background: #6c757d; }
.comfy-btn.success { background: #28a745; }
.comfy-btn.error   { background: #dc3545; }
.comfy-btn.view    { background: #17a2b8; }
.comfy-btn.view:hover { background: #138496; }
.comfy-button-group { display: inline-flex; align-items: center; gap: 5px; margin: 5px 0; }

.comfy-image-container { margin: 10px 0; max-width: 100%; }
.comfy-image-container img { max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #555; display: block; }

/* 自由拖动、自由拉伸伴读画廊视窗 */
#${LEFT_DOCK_ID} {
    position: fixed;
    left: 25px;
    top: 75px;
    width: 440px;
    height: 600px;
    min-width: 200px;
    min-height: 200px;
    max-width: 95vw;
    max-height: 95vh;
    z-index: 10000;
    display: none;
    flex-direction: column;
    background: rgba(18, 18, 18, 0.85);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;
    box-shadow: 0 8px 35px rgba(0, 0, 0, 0.9);
    padding: 8px 10px;
    box-sizing: border-box;
    resize: both;
    overflow: hidden;
}
#${LEFT_DOCK_ID} .dock-header {
    cursor: move;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ddd;
    font-size: 13px;
    padding-bottom: 6px;
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
}
#${LEFT_DOCK_ID} .dock-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}
/* 相册翻页控制条 */
#${LEFT_DOCK_ID} .dock-gallery-nav {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    color: #bbb;
}
#${LEFT_DOCK_ID} .dock-gallery-nav i {
    cursor: pointer;
    padding: 2px 4px;
}
#${LEFT_DOCK_ID} .dock-gallery-nav i:hover {
    color: #fff;
}
#${LEFT_DOCK_ID} .dock-header-actions i {
    cursor: pointer;
    margin-left: 10px;
    opacity: 0.8;
    transition: opacity 0.2s;
}
#${LEFT_DOCK_ID} .dock-header-actions i:hover {
    opacity: 1;
    color: #fff;
}
#${LEFT_DOCK_ID} .dock-body {
    flex-grow: 1;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
}
#${LEFT_DOCK_ID} img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 6px;
    cursor: pointer;
}

/* 调色盘悬浮球 */
#${FLOATING_BTN_ID} {
    position: fixed;
    right: 20px;
    bottom: 85px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #2b2d42;
    color: #edf2f4;
    border: 2px solid rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    user-select: none;
    z-index: 99999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    transition: background 0.2s;
}
#${FLOATING_BTN_ID}:hover {
    background: #d90429;
}
#${FLOATING_BTN_ID}:active {
    cursor: grabbing;
}
`;

const defaultSettings = {
    url: 'http://127.0.0.1:8188',
    startTag: 'image###',
    endTag: '###',
    imagePosition: 'left',
    dockGeometry: null,
    panelPosition: null,
    floatingBtnPos: null,
    workflow: '',
    images: {}
};

function getSettings() {
    extension_settings[MODULE_NAME] = extension_settings[MODULE_NAME] || {};

    let localBackup = {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) localBackup = JSON.parse(raw);
    } catch (e) {}

    Object.assign(extension_settings[MODULE_NAME], defaultSettings, localBackup, extension_settings[MODULE_NAME]);
    return extension_settings[MODULE_NAME];
}

function saveSettings() {
    const current = extension_settings[MODULE_NAME];
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
        console.error('localStorage 写入失败:', e);
    }

    if (typeof saveSettingsDebounced === 'function') {
        saveSettingsDebounced();
    }
}

function saveDockGeometry() {
    const dock = document.getElementById(LEFT_DOCK_ID);
    if (!dock) return;
    const settings = getSettings();
    if (dock.offsetWidth > 100 && dock.offsetHeight > 100) {
        settings.dockGeometry = {
            top: dock.style.top,
            left: dock.style.left,
            width: dock.style.width,
            height: dock.style.height
        };
        saveSettings();
    }
}

// 获取当前聊天里按楼层顺序排列的所有图片列表
function getChatImageList() {
    const list = [];
    const settings = getSettings();
    const groups = document.querySelectorAll('#chat .comfy-button-group');
    groups.forEach(group => {
        const genId = group.dataset.generationId;
        if (genId && settings.images && settings.images[genId]) {
            list.push({
                generationId: genId,
                url: settings.images[genId],
                element: group
            });
        }
    });
    return list;
}

// 更新画廊顶部的相册翻页指示器 (例如: 2 / 5)
function updateGalleryNav() {
    const dock = document.getElementById(LEFT_DOCK_ID);
    const counter = document.getElementById('comfyui-dock-counter');
    if (!dock || !counter) return;

    const list = getChatImageList();
    const currentId = dock.dataset.activeGenerationId;
    const index = list.findIndex(item => item.generationId === currentId);

    if (list.length > 0 && index !== -1) {
        counter.textContent = `${index + 1} / ${list.length}`;
    } else if (list.length > 0) {
        counter.textContent = `1 / ${list.length}`;
    } else {
        counter.textContent = `0 / 0`;
    }
}

function createLeftDock() {
    if (document.getElementById(LEFT_DOCK_ID)) return;

    const dockHTML = `
        <div id="${LEFT_DOCK_ID}">
            <div class="dock-header">
                <div class="dock-header-left">
                    <i class="fa-solid fa-grip-vertical"></i>
                    <span><b>插画画廊</b></span>
                    <div class="dock-gallery-nav" title="相册翻页">
                        <i class="fa-solid fa-chevron-left" id="comfyui-dock-prev" title="上一张插画"></i>
                        <span id="comfyui-dock-counter">1 / 1</span>
                        <i class="fa-solid fa-chevron-right" id="comfyui-dock-next" title="下一张插画"></i>
                    </div>
                </div>
                <div class="dock-header-actions">
                    <i class="fa-solid fa-arrows-rotate" id="comfyui-dock-reset" title="复位位置与大小"></i>
                    <i class="fa-solid fa-xmark" id="comfyui-dock-close" title="关闭画廊"></i>
                </div>
            </div>
            <div class="dock-body">
                <img id="comfyui-dock-img" title="点击可在新标签页查看高清原图" />
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', dockHTML);

    const dock = document.getElementById(LEFT_DOCK_ID);
    const dockImg = document.getElementById('comfyui-dock-img');
    const resetBtn = document.getElementById('comfyui-dock-reset');
    const closeBtn = document.getElementById('comfyui-dock-close');
    const prevBtn = document.getElementById('comfyui-dock-prev');
    const nextBtn = document.getElementById('comfyui-dock-next');

    const settings = getSettings();
    if (settings.dockGeometry) {
        if (settings.dockGeometry.top) dock.style.top = settings.dockGeometry.top;
        if (settings.dockGeometry.left) dock.style.left = settings.dockGeometry.left;
        if (settings.dockGeometry.width) dock.style.width = settings.dockGeometry.width;
        if (settings.dockGeometry.height) dock.style.height = settings.dockGeometry.height;
    }

    if (typeof $ !== 'undefined' && typeof $.fn.draggable !== 'undefined') {
        $(`#${LEFT_DOCK_ID}`).draggable({
            handle: ".dock-header",
            containment: "window",
            stop: saveDockGeometry
        });
    }

    let resizeTimer = null;
    const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(saveDockGeometry, 300);
    });
    observer.observe(dock);

    dockImg.addEventListener('click', () => {
        if (dockImg.src) window.open(dockImg.src, '_blank');
    });

    // 相册翻页：上一张
    prevBtn.addEventListener('click', () => {
        const list = getChatImageList();
        if (list.length <= 1) return;
        const currentId = dock.dataset.activeGenerationId;
        let index = list.findIndex(item => item.generationId === currentId);
        index = (index - 1 + list.length) % list.length;
        showInLeftDock(list[index].url, list[index].generationId);
    });

    // 相册翻页：下一张
    nextBtn.addEventListener('click', () => {
        const list = getChatImageList();
        if (list.length <= 1) return;
        const currentId = dock.dataset.activeGenerationId;
        let index = list.findIndex(item => item.generationId === currentId);
        index = (index + 1) % list.length;
        showInLeftDock(list[index].url, list[index].generationId);
    });

    resetBtn.addEventListener('click', () => {
        dock.style.top = '75px';
        dock.style.left = '25px';
        dock.style.width = '440px';
        dock.style.height = '600px';
        saveDockGeometry();
        toastr.info('已复位到默认左侧位置与大小');
    });

    closeBtn.addEventListener('click', () => {
        dock.style.display = 'none';
    });
}

function showInLeftDock(imageUrl, generationId) {
    let dock = document.getElementById(LEFT_DOCK_ID);
    if (!dock) {
        createLeftDock();
        dock = document.getElementById(LEFT_DOCK_ID);
    }
    const dockImg = document.getElementById('comfyui-dock-img');
    if (dock && dockImg) {
        dockImg.src = imageUrl;
        dock.dataset.activeGenerationId = generationId;
        dock.style.display = 'flex';

        const rect = dock.getBoundingClientRect();
        if (rect.width < 150 || rect.height < 150) {
            dock.style.width = '440px';
            dock.style.height = '600px';
        }
        if (rect.top < 0 || rect.top > window.innerHeight - 50 || rect.left < 0 || rect.left > window.innerWidth - 50) {
            dock.style.top = '75px';
            dock.style.left = '25px';
        }

        updateGalleryNav();
    }
}

function createComfyUIPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const styleEl = document.createElement('style');
    styleEl.innerHTML = inlineStyle;
    document.head.appendChild(styleEl);

    const panelHTML = `
        <div id="${PANEL_ID}">
            <div class="panel-control-bar">
                <b>🎨 ComfyUI 生图设置</b>
                <i class="fa-solid fa-xmark floating_panel_close"></i>
            </div>
            <div class="comfyui-panel-content">
                <label style="font-weight:bold; display:block; margin-bottom:4px;">ComfyUI 地址:</label>
                <div style="display:flex; gap:8px; margin-bottom:10px;">
                    <input id="comfyui-url" type="text" placeholder="http://127.0.0.1:8188" style="margin-bottom:0;">
                    <button id="comfyui-test-conn" class="comfy-btn" style="white-space:nowrap;">测试连接</button>
                </div>
                <div style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold;">开始标记:</label>
                        <input id="comfyui-start-tag" type="text">
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold;">结束标记:</label>
                        <input id="comfyui-end-tag" type="text">
                    </div>
                </div>
                <label style="font-weight:bold; display:block; margin-top:4px;">图片生成位置（单选）：</label>
                <select id="comfyui-img-pos">
                    <option value="left">左侧独立画廊（相册翻页，正文仅保留查看按钮）</option>
                    <option value="bottom">消息最底部（正文最末尾，左侧不弹窗）</option>
                    <option value="top">消息最顶部（置顶封面，左侧不弹窗）</option>
                    <option value="inline">标签原位（紧随按钮之后，左侧不弹窗）</option>
                </select>

                <label style="font-weight:bold; display:block; margin-top:4px;">工作流 (API 格式 JSON):</label>
                <p style="font-size:12px; color:#aaa; margin:2px 0 6px 0;">必须包含 <b>%prompt%</b> 占位符，可选 <b>%seed%</b></p>
                <textarea id="comfyui-workflow" placeholder="粘贴从 ComfyUI 导出的 Save (API format) JSON"></textarea>
                <button id="comfyui-clear-cache" class="comfy-btn error" style="width:100%; margin-top:8px;">清空所有已生成图片缓存</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', panelHTML);
    initPanelLogic();
}

function initPanelLogic() {
    const settings = getSettings();
    const panel = document.getElementById(PANEL_ID);
    const closeBtn = panel.querySelector('.floating_panel_close');
    const testBtn = document.getElementById('comfyui-test-conn');
    const clearBtn = document.getElementById('comfyui-clear-cache');
    const urlInput = document.getElementById('comfyui-url');
    const wfInput = document.getElementById('comfyui-workflow');
    const startInput = document.getElementById('comfyui-start-tag');
    const endInput = document.getElementById('comfyui-end-tag');
    const posSelect = document.getElementById('comfyui-img-pos');

    urlInput.value = settings.url || 'http://127.0.0.1:8188';
    wfInput.value = settings.workflow || '';
    startInput.value = settings.startTag || 'image###';
    endInput.value = settings.endTag || '###';
    posSelect.value = settings.imagePosition || 'left';

    if (settings.panelPosition && settings.panelPosition.top) {
        panel.style.top = settings.panelPosition.top;
        panel.style.left = settings.panelPosition.left;
    } else {
        const defaultTop = Math.max(30, (window.innerHeight - 520) / 2);
        const defaultLeft = Math.max(30, (window.innerWidth - 480) / 2);
        panel.style.top = `${defaultTop}px`;
        panel.style.left = `${defaultLeft}px`;
    }

    closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });

    if (typeof $ !== 'undefined' && typeof $.fn.draggable !== 'undefined') {
        $(`#${PANEL_ID}`).draggable({
            handle: ".panel-control-bar",
            containment: "window",
            stop: function() {
                settings.panelPosition = {
                    top: panel.style.top,
                    left: panel.style.left
                };
                saveSettings();
            }
        });
    }

    testBtn.addEventListener('click', async () => {
        let url = urlInput.value.trim().replace(/\/$/, '');
        if (!url) return toastr.warning('请输入ComfyUI的URL');
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'http://' + url;
        urlInput.value = url;
        settings.url = url;
        saveSettings();

        testBtn.className = 'comfy-btn testing';
        testBtn.disabled = true;

        try {
            const res = await fetch(`${url}/system_stats`);
            if (res.ok) {
                testBtn.className = 'comfy-btn success';
                toastr.success('连接成功！ComfyUI 服务就绪。');
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (e) {
            testBtn.className = 'comfy-btn error';
            toastr.error('连接失败，请确认 ComfyUI 是否加了 --enable-cors-header * 启动参数！');
        } finally {
            testBtn.disabled = false;
        }
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('确认清空所有生图绑定？')) {
            settings.images = {};
            saveSettings();
            const dock = document.getElementById(LEFT_DOCK_ID);
            if (dock) dock.style.display = 'none';
            toastr.success('已清空，刷新生效');
        }
    });

    const saveHandler = () => {
        settings.url = urlInput.value.trim();
        settings.workflow = wfInput.value;
        settings.startTag = startInput.value;
        settings.endTag = endInput.value;
        settings.imagePosition = posSelect.value;
        saveSettings();
    };

    [urlInput, wfInput, startInput, endInput, posSelect].forEach(el => {
        el.addEventListener('input', saveHandler);
        el.addEventListener('change', saveHandler);
    });
}

function createFloatingButton() {
    if (document.getElementById(FLOATING_BTN_ID)) return;

    const btn = document.createElement('div');
    btn.id = FLOATING_BTN_ID;
    btn.title = 'ComfyUI 生图插件（可自由拖动）';
    btn.innerHTML = `<i class="fa-solid fa-palette" style="font-size:18px;"></i>`;

    const settings = getSettings();
    if (settings.floatingBtnPos) {
        btn.style.top = settings.floatingBtnPos.top;
        btn.style.left = settings.floatingBtnPos.left;
        btn.style.bottom = 'auto';
        btn.style.right = 'auto';
    }

    document.body.appendChild(btn);

    let isDragging = false;
    if (typeof $ !== 'undefined' && typeof $.fn.draggable !== 'undefined') {
        $(`#${FLOATING_BTN_ID}`).draggable({
            containment: "window",
            start: function() {
                isDragging = true;
            },
            stop: function() {
                setTimeout(() => { isDragging = false; }, 100);
                const currentSettings = getSettings();
                currentSettings.floatingBtnPos = {
                    top: btn.style.top,
                    left: btn.style.left
                };
                saveSettings();
            }
        });
    }

    btn.addEventListener('click', () => {
        if (isDragging) return;
        const panel = document.getElementById(PANEL_ID);
        if (panel) {
            panel.style.display = (panel.style.display === 'flex') ? 'none' : 'flex';
        }
    });
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return 'comfy-' + Math.abs(hash).toString(36);
}

function displayImage(anchorElement, imageUrl, generationId) {
    const mesText = anchorElement.closest('.mes_text');
    const messageNode = anchorElement.closest('.mes');
    if (!mesText) return;

    const settings = getSettings();
    const pos = settings.imagePosition || 'left';

    if (messageNode) {
        const oldInnerImage = messageNode.querySelector(`.comfy-image-container[data-generation-id="${generationId}"]`);
        if (oldInnerImage) oldInnerImage.remove();
    }

    // 1. 如果选的是左侧独立画廊模式：展示到画廊并更新相册
    if (pos === 'left') {
        showInLeftDock(imageUrl, generationId);
        return;
    }

    // 2. 如果选的是正文嵌入模式
    const dock = document.getElementById(LEFT_DOCK_ID);
    if (dock && dock.dataset.activeGenerationId === generationId) {
        dock.style.display = 'none';
    }

    let container = document.createElement('div');
    container.className = 'comfy-image-container';
    container.dataset.generationId = generationId;
    const img = document.createElement('img');
    img.alt = 'ComfyUI Image';
    img.src = imageUrl;
    container.appendChild(img);

    if (pos === 'top') {
        mesText.prepend(container);
    } else if (pos === 'inline') {
        anchorElement.insertAdjacentElement('afterend', container);
    } else {
        mesText.appendChild(container);
    }
}

async function processMessageNode(messageNode) {
    if (!messageNode) return;
    const mesText = messageNode.querySelector('.mes_text');
    if (!mesText) return;

    if (mesText.querySelector('textarea') || messageNode.querySelector('.edit_textarea') || messageNode.classList.contains('editing')) {
        return;
    }

    const settings = getSettings();
    if (!settings.startTag || !settings.endTag) return;

    const regex = new RegExp(escapeRegex(settings.startTag) + '([\\s\\S]*?)' + escapeRegex(settings.endTag), 'g');
    const currentHtml = mesText.innerHTML;

    if (regex.test(currentHtml) && !mesText.querySelector('.comfy-button-group')) {
        mesText.innerHTML = currentHtml.replace(regex, (match, prompt) => {
            const cleanPrompt = prompt.trim();
            const generationId = simpleHash(cleanPrompt);
            return `<span class="comfy-button-group" data-generation-id="${generationId}">
                        <button class="comfy-btn comfy-chat-generate-button" data-prompt="${encodeURIComponent(cleanPrompt)}">开始生成</button>
                    </span>`;
        });
    }

    const buttonGroups = mesText.querySelectorAll('.comfy-button-group');
    buttonGroups.forEach(group => {
        if (group.dataset.listenerAttached) return;
        const generationId = group.dataset.generationId;
        const generateButton = group.querySelector('.comfy-chat-generate-button');
        if (!generateButton) return;

        if (settings.images && settings.images[generationId]) {
            displayImage(group, settings.images[generationId], generationId);
            setupGeneratedState(generateButton, generationId);
        } else {
            generateButton.addEventListener('click', onGenerateButtonClick);
        }
        group.dataset.listenerAttached = 'true';
    });
}

// 设置已生成状态：增加【查看插画】按钮
function setupGeneratedState(generateButton, generationId) {
    generateButton.textContent = '重新生成';
    generateButton.disabled = false;
    generateButton.className = 'comfy-btn comfy-chat-generate-button';

    if (!generateButton.dataset.regenerateListener) {
        generateButton.addEventListener('click', onGenerateButtonClick);
        generateButton.dataset.regenerateListener = 'true';
    }

    const group = generateButton.closest('.comfy-button-group');
    const messageNode = generateButton.closest('.mes');
    const settings = getSettings();

    // 🌟 在左侧画廊模式下，增加【查看插画】按钮，方便往上翻聊天随时点开旧图
    let viewButton = group.querySelector('.comfy-view-button');
    if (!viewButton && settings.imagePosition === 'left') {
        viewButton = document.createElement('button');
        viewButton.className = 'comfy-btn view comfy-view-button';
        viewButton.innerHTML = `<i class="fa-solid fa-eye"></i> 查看插画`;
        viewButton.title = '点击将左侧画廊切换为此图';
        viewButton.addEventListener('click', () => {
            const currentSettings = getSettings();
            if (currentSettings.images && currentSettings.images[generationId]) {
                showInLeftDock(currentSettings.images[generationId], generationId);
            }
        });
        generateButton.insertAdjacentElement('beforebegin', viewButton);
    } else if (viewButton && settings.imagePosition !== 'left') {
        viewButton.remove();
    }

    let deleteButton = group.querySelector('.comfy-delete-button');
    if (!deleteButton) {
        deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.className = 'comfy-btn error comfy-delete-button';
        deleteButton.addEventListener('click', async () => {
            const currentSettings = getSettings();
            delete currentSettings.images[generationId];
            saveSettings();

            if (messageNode) {
                const imgContainer = messageNode.querySelector(`.comfy-image-container[data-generation-id="${generationId}"]`);
                if (imgContainer) imgContainer.remove();
            }

            const dock = document.getElementById(LEFT_DOCK_ID);
            if (dock && dock.dataset.activeGenerationId === generationId) {
                dock.style.display = 'none';
            }

            const vBtn = group.querySelector('.comfy-view-button');
            if (vBtn) vBtn.remove();

            deleteButton.remove();
            generateButton.textContent = '开始生成';
            updateGalleryNav();
        });
        generateButton.insertAdjacentElement('afterend', deleteButton);
    }
}

async function onGenerateButtonClick(event) {
    const button = event.target.closest('.comfy-chat-generate-button');
    const group = button.closest('.comfy-button-group');
    const messageNode = button.closest('.mes');
    const prompt = decodeURIComponent(button.dataset.prompt);
    const generationId = group.dataset.generationId;
    const settings = getSettings();

    button.textContent = '生成中...';
    button.disabled = true;
    button.className = 'comfy-btn testing comfy-chat-generate-button';

    if (messageNode) {
        const oldImage = messageNode.querySelector(`.comfy-image-container[data-generation-id="${generationId}"]`);
        if (oldImage) oldImage.remove();
    }

    try {
        const url = settings.url.replace(/\/$/, '');
        let workflowString = settings.workflow;

        if (!url || !workflowString) throw new Error('请点击右下角画板图标配置 ComfyUI URL 和工作流！');
        if (!workflowString.includes('%prompt%')) throw new Error('工作流中缺少 %prompt% 占位符！');

        const seed = Math.floor(Math.random() * 1000000000000000);
        workflowString = workflowString.replace(/%prompt%/g, JSON.stringify(prompt).slice(1, -1));
        workflowString = workflowString.replace(/%seed%/g, seed);

        const workflow = JSON.parse(workflowString);

        toastr.info('已提交生图任务...');
        const promptRes = await fetch(`${url}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: workflow })
        });
        if (!promptRes.ok) throw new Error(`提交失败: HTTP ${promptRes.status}`);
        const promptData = await promptRes.json();

        const finalHistory = await pollForResult(url, promptData.prompt_id);
        const imageUrl = findImageUrlInHistory(finalHistory, promptData.prompt_id, url);
        if (!imageUrl) throw new Error('未找到生成的图片。');

        displayImage(group, imageUrl, generationId);
        settings.images[generationId] = imageUrl;
        saveSettings();

        button.textContent = '生成成功';
        button.className = 'comfy-btn success comfy-chat-generate-button';
        setTimeout(() => setupGeneratedState(button, generationId), 1200);

    } catch (e) {
        toastr.error(e.message);
        button.textContent = '生成失败';
        button.className = 'comfy-btn error comfy-chat-generate-button';
        setTimeout(() => {
            button.disabled = false;
            button.textContent = '重试';
            button.className = 'comfy-btn comfy-chat-generate-button';
        }, 3000);
    }
}

async function pollForResult(url, promptId) {
    const startTime = Date.now();
    while (Date.now() - startTime < POLLING_TIMEOUT_MS) {
        await new Promise(r => setTimeout(r, POLLING_INTERVAL_MS));
        try {
            const res = await fetch(`${url}/history/${promptId}`);
            if (res.ok) {
                const history = await res.json();
                if (history[promptId]) return history;
            }
        } catch (e) {}
    }
    throw new Error('ComfyUI 生图超时！');
}

function findImageUrlInHistory(history, promptId, baseUrl) {
    const outputs = history[promptId]?.outputs;
    if (!outputs) return null;

    for (const nodeId in outputs) {
        if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
            const img = outputs[nodeId].images[0];
            const params = new URLSearchParams({
                filename: img.filename,
                subfolder: img.subfolder || '',
                type: img.type || 'output'
            });
            return `${baseUrl}/view?${params.toString()}`;
        }
    }
    return null;
}

function checkDynamicInstallReload() {
    if (sessionStorage.getItem('comfyui_just_installed_reload')) {
        sessionStorage.removeItem('comfyui_just_installed_reload');
        return false;
    }

    try {
        localStorage.removeItem('comfyui_illustrator_installed_flag_v1');
    } catch (e) {}

    const isInstallerActive = document.getElementById('extension_url') || document.querySelector('#extensions_settings');
    const isMidSession = performance.now() > 2500 && document.readyState === 'complete';

    if (isInstallerActive && isMidSession) {
        sessionStorage.setItem('comfyui_just_installed_reload', 'true');
        if (typeof toastr !== 'undefined') {
            toastr.success('🎉 ComfyUI 插图插件安装成功！正在自动刷新页面...', '安装完成', { timeOut: 2000 });
        }
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        return true;
    }

    return false;
}

export async function init() {
    if (checkDynamicInstallReload()) {
        return;
    }

    createLeftDock();
    createComfyUIPanel();
    createFloatingButton();

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (mesId) => {
        const node = document.querySelector(`.mes[mesid="${mesId}"]`);
        if (node) processMessageNode(node);
    });

    eventSource.on(event_types.USER_MESSAGE_RENDERED, (mesId) => {
        const node = document.querySelector(`.mes[mesid="${mesId}"]`);
        if (node) processMessageNode(node);
    });

    if (event_types.MESSAGE_UPDATED) {
        eventSource.on(event_types.MESSAGE_UPDATED, (mesId) => {
            const node = document.querySelector(`.mes[mesid="${mesId}"]`);
            if (node) setTimeout(() => processMessageNode(node), 100);
        });
    }

    if (event_types.MESSAGE_SWIPED) {
        eventSource.on(event_types.MESSAGE_SWIPED, (mesId) => {
            const node = document.querySelector(`.mes[mesid="${mesId}"]`);
            if (node) setTimeout(() => processMessageNode(node), 100);
        });
    }

    eventSource.on(event_types.CHAT_CHANGED, () => {
        setTimeout(() => {
            document.querySelectorAll('#chat .mes').forEach(processMessageNode);
            updateGalleryNav();
        }, 500);
    });

    const chatObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const target = mutation.target;
            if (target && target.closest) {
                const mesNode = target.closest('.mes');
                if (mesNode) {
                    processMessageNode(mesNode);
                }
            }
        }
    });

    const chatElem = document.getElementById('chat');
    if (chatElem) {
        chatObserver.observe(chatElem, { childList: true, subtree: true });
        chatElem.querySelectorAll('.mes').forEach(processMessageNode);
        setTimeout(() => chatElem.querySelectorAll('.mes').forEach(processMessageNode), 300);
        setTimeout(() => chatElem.querySelectorAll('.mes').forEach(processMessageNode), 1000);
    }

    console.log('%c[ComfyUI 插图插件] 原生加载成功！', 'color: #28a745; font-weight: bold;');
}

jQuery(init);
