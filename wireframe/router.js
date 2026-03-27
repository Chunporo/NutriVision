(function() {
    const pages = [
        { name: 'Splash', url: 'splash.html' },
        { name: 'Onboarding 1', url: 'onboarding-1.html' },
        { name: 'Onboarding 2', url: 'onboarding-2.html' },
        { name: 'Onboarding 3', url: 'onboarding-3.html' },
        { name: 'Name Entry', url: 'onboarding-name.html' },
        { name: 'Goal Setting', url: 'goal-setting.html' },
        { name: 'Review Setup', url: 'onboarding-review.html' },
        { name: 'Home', url: 'home.html' },
        { name: 'Meals/Log', url: 'meals.html' },
        { name: 'Insights', url: 'insights.html' },
        { name: 'Profile', url: 'profile.html' },
        { name: 'Edit Profile', url: 'profile-edit.html' }
    ];

    const sidebar = document.createElement('div');
    sidebar.style.cssText = `
        position: fixed;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 8px;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(8px);
        border-radius: 16px 0 0 16px;
        border: 1px solid rgba(0, 0, 0, 0.05);
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
    `;

    pages.forEach(page => {
        const link = document.createElement('a');
        link.href = page.url;
        link.title = page.name;
        link.style.cssText = `
            width: 8px;
            height: 8px;
            background: #94A3B8;
            border-radius: 50%;
            transition: all 0.2s;
        `;
        
        const currentPage = window.location.pathname.split('/').pop() || 'home.html';
        if (currentPage === page.url) {
            link.style.background = '#0F766E';
            link.style.transform = 'scale(1.5)';
        }

        link.onmouseover = () => {
            link.style.background = '#0F766E';
            link.style.transform = 'scale(1.5)';
        };
        link.onmouseout = () => {
            if (currentPage !== page.url) {
                link.style.background = '#94A3B8';
                link.style.transform = 'scale(1)';
            }
        };

        sidebar.appendChild(link);
    });

    document.body.appendChild(sidebar);
})();
