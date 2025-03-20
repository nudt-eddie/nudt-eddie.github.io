// Scroll handling functionality
class ScrollHandler {
    constructor() {
        this.header = document.querySelector('header');
        this.sections = document.querySelectorAll('.section');
        this.footer = document.querySelector('footer');
        this.footerElements = this.footer ? {
            headings: this.footer.querySelectorAll('.footer-heading'),
            links: this.footer.querySelectorAll('.footer-links li'),
            signature: this.footer.querySelector('.artist-signature'),
            socialIcons: this.footer.querySelectorAll('.social-icon'),
            copyright: this.footer.querySelector('.copyright')
        } : null;
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => {
            this.handleHeaderScroll();
            this.handleSectionVisibility();
            this.handleFooterVisibility();
        });
        
        // Initial check for elements in viewport
        this.handleSectionVisibility();
        this.handleFooterVisibility();
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
    
    handleFooterVisibility() {
        if (!this.footer) return;
        
        const footerTop = this.footer.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        // Check if footer is in viewport
        if (footerTop < windowHeight * 0.9) {
            this.footer.classList.add('visible');
            
            // Apply staggered animations to footer elements
            if (this.footerElements) {
                this.footerElements.headings.forEach((heading, index) => {
                    setTimeout(() => {
                        heading.classList.add('animate');
                    }, index * 200);
                });
                
                this.footerElements.links.forEach((link, index) => {
                    setTimeout(() => {
                        link.classList.add('animate');
                    }, 300 + (index * 100));
                });
                
                if (this.footerElements.signature) {
                    setTimeout(() => {
                        this.footerElements.signature.classList.add('animate');
                    }, 800);
                }
                
                this.footerElements.socialIcons.forEach((icon, index) => {
                    setTimeout(() => {
                        icon.classList.add('animate');
                    }, 1000 + (index * 150));
                });
                
                if (this.footerElements.copyright) {
                    setTimeout(() => {
                        this.footerElements.copyright.classList.add('animate');
                    }, 1500);
                }
            }
        }
    }
}

// Export the class
export default ScrollHandler; 