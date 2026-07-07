/**
 * AlertoQR - Premium Startup Website Script
 * Version 1.0.0
 * Pure Vanilla JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // 1. Sticky Navbar & Scroll-to-Top Visibility
    const navbar = document.querySelector('.navbar');
    const scrollTopBtn = document.querySelector('.scroll-top');
    
    const handleScroll = () => {
        const scrollY = window.scrollY;

        // Navbar toggle
        if (navbar) {
            navbar.classList.toggle('scrolled', scrollY > 50);
        }

        // Scroll-to-top visibility
        if (scrollTopBtn) {
            scrollTopBtn.style.display = scrollY > 300 ? 'block' : 'none';
        }
    };

    window.addEventListener('scroll', () => {
        window.requestAnimationFrame(handleScroll);
    });

    // 2. Scroll Reveal (Intersection Observer)
    const revealElements = document.querySelectorAll('.fade-in');
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    // 3. Smooth Anchor Navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Scroll To Top Action
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // 5. Button Ripple Effect
    const buttons = document.querySelectorAll('.btn-yellow');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const x = e.clientX - e.target.getBoundingClientRect().left;
            const y = e.clientY - e.target.getBoundingClientRect().top;

            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // 6. Loading Animation Trigger
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
    });
});
