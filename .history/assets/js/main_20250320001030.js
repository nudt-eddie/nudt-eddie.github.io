import ScrollHandler from './scroll.js';

class App {
    constructor() {
        this.scrollHandler = new ScrollHandler();
        this.initNavigation();
        this.initFirstSection();
        this.initFluidCursor();
    }

    initNavigation() {
        document.querySelectorAll('nav a').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = anchor.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                window.scrollTo({
                    top: targetSection.offsetTop,
                    behavior: 'smooth'
                });
            });
        });
    }

    initFirstSection() {
        document.querySelector('.section').classList.add('active');
    }
    
    initFluidCursor() {
        // 初始化流体光标特效
        const fluidCursor = new FluidCursor();
        fluidCursor.init('fluid-canvas');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});