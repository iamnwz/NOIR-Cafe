document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Mobile Navigation Toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('toggle');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });

    // 2. Header Box Shadow on Scroll
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 3. Scroll Spy (Highlight active nav link)
    const sections = document.querySelectorAll('section');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active-link');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active-link');
            }
        });
    });

    // 4. Menu Category Filtering
    const filterButtons = document.querySelectorAll('.filter-btn');
    const menuCards = document.querySelectorAll('.menu-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const category = button.getAttribute('data-filter');

            menuCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                if (category === 'all' || cardCategory === category) {
                    card.style.display = 'block';
                    card.style.animation = 'none';
                    card.offsetHeight; 
                    card.style.animation = null;
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 5. Reservation Form Submission & Backend Integration
    const reservationForm = document.getElementById('reservationForm');
    const reservationSuccess = document.getElementById('reservationSuccess');
    const resResetBtn = document.getElementById('resResetBtn');

    if (reservationForm) {
        
        // Prevent selecting past dates in HTML Date Picker
        const dateInput = document.getElementById('resDate');
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);

        reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear prior validation errors
            document.querySelectorAll('.error-msg').forEach(msg => msg.style.display = 'none');
            document.querySelectorAll('.error-input').forEach(input => input.classList.remove('error-input'));
            
            let isValid = true;
            
            // Client-side Name validation
            const nameInput = document.getElementById('resName');
            const nameRegex = /^[A-Za-z\s]{3,}$/;
            if (!nameRegex.test(nameInput.value.trim())) {
                document.getElementById('nameError').style.display = 'block';
                nameInput.classList.add('error-input');
                isValid = false;
            }
            
            // Client-side Phone validation
            const phoneInput = document.getElementById('resPhone');
            const phoneRegex = /^\+?[0-9]{10,14}$/;
            const cleanPhone = phoneInput.value.replace(/[\s-]/g, ''); 
            if (!phoneRegex.test(cleanPhone)) {
                document.getElementById('phoneError').style.display = 'block';
                phoneInput.classList.add('error-input');
                isValid = false;
            }
            
            // Client-side Date validation
            const selectedDate = new Date(dateInput.value);
            const currentDate = new Date();
            currentDate.setHours(0,0,0,0);
            if (!dateInput.value || selectedDate < currentDate) {
                document.getElementById('dateError').style.display = 'block';
                dateInput.classList.add('error-input');
                isValid = false;
            }

            // Client-side Time validation
            const timeInput = document.getElementById('resTime');
            if (!timeInput.value) {
                document.getElementById('timeError').style.display = 'block';
                timeInput.classList.add('error-input');
                isValid = false;
            }

            // Client-side Guests validation
            const guestsInput = document.getElementById('resGuests');
            if (!guestsInput.value) {
                document.getElementById('guestError').style.display = 'block';
                guestsInput.classList.add('error-input');
                isValid = false;
            }

            // If client-side checks pass, submit payload to Express backend API
            if (isValid) {
                const reservationPayload = {
                    name: nameInput.value.trim(),
                    phone: phoneInput.value.trim(),
                    date: dateInput.value,
                    time: timeInput.value,
                    guests: guestsInput.value,
                    specialRequests: document.getElementById('resNotes').value.trim()
                };

                try {
                    const response = await fetch('http://localhost:5000/api/reservations', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(reservationPayload)
                    });

                    const result = await response.json();

                    if (response.ok && result.success) {
                        reservationForm.style.display = 'none';
                        reservationSuccess.style.display = 'block';
                    } else {
                        alert(result.message || 'Server error occurred while submitting reservation.');
                    }
                } catch (error) {
                    console.error('API Error:', error);
                    alert('Unable to reach the backend server. Please make sure the server is running on http://localhost:5000.');
                }
            }
        });

        // Reset button functionality
        resResetBtn.addEventListener('click', () => {
            reservationForm.reset();
            document.querySelectorAll('.error-msg').forEach(msg => msg.style.display = 'none');
            document.querySelectorAll('.error-input').forEach(input => input.classList.remove('error-input'));
            
            reservationSuccess.style.display = 'none';
            reservationForm.style.display = 'block';
        });
    }

    // 6. Scroll Reveal Animations
    const revealElements = document.querySelectorAll('section');
    
    revealElements.forEach(el => {
        if(el.id !== 'home') {
            el.classList.add('reveal');
        }
    });

    const revealOptions = {
        threshold: 0.15, 
        rootMargin: "0px 0px -50px 0px"
    };

    const sectionObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        if(el.id !== 'home') {
            sectionObserver.observe(el);
        }
    });
});