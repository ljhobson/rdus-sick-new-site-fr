// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const mainContent = document.getElementById('main-content');
    const logoContainer = document.getElementById('logo-container');
    const playButton = document.getElementById('play-button');
    const radioStream = document.getElementById('radio-stream');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    // Get all navigation links
    const navLinks = document.getElementsByClassName('nav-link');
    const mobileNavLinks = document.getElementsByClassName('mobile-nav-link');
    
    // Audio player state
    let isPlaying = false;
    
    // Load logo on page load
    loadLogo();
    
    // Load home page by default
    loadPage('home');
    
    // Set up play button
    if (playButton && radioStream) {
        playButton.addEventListener('click', togglePlay);
    }
    
    // Set up mobile menu button
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Set up navigation links
    setupNavigationLinks();
    
    // Function to load logo
    function loadLogo() {
        fetch('/logo.png')
            .then(response => response.text())
            .then(html => {
                logoContainer.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading logo:', error);
            });
    }
    
    // Function to toggle audio playback
    function togglePlay() {
        if (isPlaying) {
            radioStream.pause();
            playButton.classList.remove('playing');
            isPlaying = false;
        } else {
            // Load and play the stream
            radioStream.load();
            const playPromise = radioStream.play();
            
            if (playPromise !== undefined) {
                playButton.classList.add('loading-spinner');
                playPromise
                    .then(() => {
                        playButton.classList.add('playing');
                		playButton.classList.remove('loading-spinner');
                        isPlaying = true;
                    })
                    .catch(error => {
                        console.error('Error playing audio:', error);
                    });
            }
        }
    }
    
    // Function to toggle mobile menu
    function toggleMobileMenu() {
        mobileMenuBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    }
    
    // Function to close mobile menu
    function closeMobileMenu() {
        mobileMenuBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
    }
    
    // Function to set up navigation links
    function setupNavigationLinks() {
        // Desktop navigation links
        for (let i = 0; i < navLinks.length; i++) {
            navLinks[i].addEventListener('click', function(e) {
                e.preventDefault();
                const route = this.getAttribute('data-route');
                loadPage(route);
                updateActiveLink(this);
            });
        }
        
        // Mobile navigation links
        for (let i = 0; i < mobileNavLinks.length; i++) {
            mobileNavLinks[i].addEventListener('click', function(e) {
                e.preventDefault();
                const route = this.getAttribute('data-route');
                loadPage(route);
                closeMobileMenu();
                
                // Update desktop nav active state too
                updateActiveLink(findNavLinkByRoute(route));
            });
        }
    }
    
    // Function to find desktop nav link by route
    function findNavLinkByRoute(route) {
        for (let i = 0; i < navLinks.length; i++) {
            if (navLinks[i].getAttribute('data-route') === route) {
                return navLinks[i];
            }
        }
        return null;
    }
    
    // Function to update active link
    function updateActiveLink(activeLink) {
        // Remove active class from all links
        for (let i = 0; i < navLinks.length; i++) {
            navLinks[i].classList.remove('active');
        }
        
        // Add active class to clicked link
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
    
    // Function to load page content
    function loadPage(route) {
        // Show loading state
        mainContent.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        `;
        
        // Fetch content from server
        fetch('/api/' + route)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Page not found');
                }
                return response.text();
            })
            .then(html => {
                // Fade out current content
                mainContent.style.opacity = '0';
                
                // Wait for fade out, then update content
                setTimeout(() => {
                    mainContent.innerHTML = html;
                    mainContent.style.opacity = '1';
                    
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    
                    // Initialize any page-specific functionality
                    initializePageScripts();
                }, 200);
            })
            .catch(error => {
                console.error('Error loading page:', error);
                mainContent.innerHTML = `
                    <div class="content-container">
                        <div class="card">
                            <h2>Error Loading Page</h2>
                            <p>Sorry, we couldn't load that page. Please try again.</p>
                        </div>
                    </div>
                `;
            });
    }
    
    // Function to initialize page-specific scripts
    function initializePageScripts() {
        // Handle contact form submission if on contact page
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form data
                const formData = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    message: document.getElementById('message').value
                };
                
                // Show success message
                alert('Thank you for your message! We\'ll get back to you soon.');
                
                // Reset form
                contactForm.reset();
                
                console.log('Form submitted:', formData);
            });
        }
        
        // Add any other page-specific initialization here
    }
    
    // Poll for Now Playing change
    let lastState = null;

	async function checkState() {
		try {
			const response = await fetch('https://rdu985fm-gecko.radioca.st/currentsong');
			const data = await response.text();

			if (JSON.stringify(data) !== JSON.stringify(lastState)) {
				lastState = data;
				document.getElementsByClassName('now-playing-song')[0].innerText = data; // update HTML
			}
		} catch (err) {
			console.error('Error fetching state:', err);
		}
	}

	// Poll every 2 seconds
	setInterval(checkState, 2000);
    
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(e) {
        // You could implement history state management here
        // For now, just reload the home page
        loadPage('home');
    });
    
    // Add fade transition to main content
    mainContent.style.transition = 'opacity 0.3s ease';
});
