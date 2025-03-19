// Scroll handling functionality
class ScrollHandler {
    constructor() {
        this.header = document.querySelector('header');
        this.sections = document.querySelectorAll('.section');
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => {
            this.handleHeaderScroll();
            this.handleSectionVisibility();
        });
    }

    handleHeaderScroll() {
        if (window.scrollY > 50) {
            this.header.classList.add('header-scrolled');
        } else {
            this.header.classList.remove('header-scrolled');
        }
    }

    handleSectionVisibility() {
        this.sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;
            const sectionBottom = section.getBoundingClientRect().bottom;
            const windowHeight = window.innerHeight;
            
            // Parallax effect for background
            const background = section.querySelector('.background');
            const scrollPosition = window.pageYOffset;
            const sectionOffset = section.offsetTop;
            const parallaxOffset = (scrollPosition - sectionOffset) * 0.4;
            
            background.style.transform = `translateY(${parallaxOffset}px)`;
            
            // Add active class when section is in viewport
            if (sectionTop < windowHeight * 0.75 && sectionBottom > windowHeight * 0.25) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }
}

// Export the class
export default ScrollHandler; 