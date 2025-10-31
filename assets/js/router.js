
const routes = {
    '#': 'home',
    '#home': 'home',
    '#settings': 'settings',
    '#test-api': 'test-api'
};

const pageModules = {
    'home': { path: './generator.js', loaded: false },
    'settings': { path: './settings.js', loaded: false },
    'test-api': { path: './test-api.js', loaded: false }
};

const pageTitles = {
    'home': 'AI虚拟试衣间',
    'settings': '设置',
    'test-api': 'API 测试'
};

const pageElements = {};
let currentPage = null;

function getPageIdFromHash(hash) {
    return routes[hash] || 'home';
}

async function handleRouteChange() {
    const hash = window.location.hash || '#';
    const pageId = getPageIdFromHash(hash);

    if (pageId === currentPage) {
        return;
    }

    // Hide current page
    if (currentPage && pageElements[currentPage]) {
        pageElements[currentPage].style.display = 'none';
    }

    // Show new page
    if (pageElements[pageId]) {
        pageElements[pageId].style.display = 'block';
    } else {
        console.error(`Page element not found for id: ${pageId}`);
        // Fallback to home if element not found
        if (pageElements.home) pageElements.home.style.display = 'block';
        pageId = 'home';
    }
    
    currentPage = pageId;

    // Update title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = pageTitles[pageId] || 'AI虚拟试衣间';
    }

    // Handle visibility of back/settings buttons
    const backBtn = document.getElementById('backBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    if (backBtn && settingsBtn) {
        if (pageId === 'home') {
            backBtn.style.visibility = 'hidden';
            settingsBtn.style.visibility = 'visible';
        } else {
            backBtn.style.visibility = 'visible';
            settingsBtn.style.visibility = 'hidden';
        }
    }


    // Lazy load module
    const module = pageModules[pageId];
    if (module && !module.loaded) {
        try {
            const pageModule = await import(module.path);
            if (pageModule.init) {
                pageModule.init();
            }
            module.loaded = true;
            console.log(`Module ${module.path} loaded.`);
        } catch (error) {
            console.error(`Failed to load module for page ${pageId}:`, error);
        }
    }
}

function initRouter() {
    // Cache page elements
    Object.values(routes).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            pageElements[id] = el;
        }
    });

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('DOMContentLoaded', () => {
        // Initial setup
        Object.values(pageElements).forEach(el => el.style.display = 'none');
        handleRouteChange();
    });
}

initRouter();
