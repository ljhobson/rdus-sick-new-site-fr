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

    // Load home page by default
    var pathname = window.location.pathname.slice(1);
    if (pathname) {
	    loadPage(pathname);
    } else {
	    loadPage('home');
    }

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

    // lock screen controls and metadata
    function updateNowPlaying(songTitle, artist) {
	  if ('mediaSession' in navigator) {
		navigator.mediaSession.metadata = new MediaMetadata({
		  title: songTitle,
		  artist: artist,
		  album: 'RDU 98.5FM - Live',
		  artwork: [
		    { src: '/assets/RDU50_Full Logo_White.png', sizes: '512x512', type: 'image/png' }
		  ]
		});
	  }
	}

    if ('mediaSession' in navigator) {
	  // Set up action handlers
	  navigator.mediaSession.setActionHandler('play', () => {
		isPlaying = false;
		togglePlay(); // sets it to true
	  });

	  navigator.mediaSession.setActionHandler('pause', () => {
		isPlaying = true;
		togglePlay(); // sets it to false
	  });
	}


    // Function to toggle audio playback
    function togglePlay() {
        if (isPlaying) {
            radioStream.pause();
            playButton.classList.remove('playing');
            isPlaying = false;
            document.title = 'RDU 98.5 FM - Student Radio'
			document.getElementsByClassName("now-playing-song")[0].innerText = 'RDU 98.5 FM';
			document.getElementsByClassName("now-playing-song")[1].innerText = 'RDU 98.5 FM';
        } else {
            // Load and play the stream
            radioStream.load();
            const playPromise = radioStream.play();
            playButton.classList.add('loading-spinner');


            // test it doesn't work some reason
            updateNowPlaying("LARILILRILALALRALA", 'RDU 98.5 FM');

            if (playPromise !== undefined) {
                playButton.classList.add('loading-spinner');
                playPromise
                    .then(() => {
                        playButton.classList.add('playing');
                		playButton.classList.remove('loading-spinner');
                        isPlaying = true;
                        lastState = null;
                        checkState();
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
            });
        }

        // Logo navigation
        document.getElementsByClassName("logo-section")[0].addEventListener('click', function(e) {
            loadPage("home");
        });

        // Mobile navigation links
        for (let i = 0; i < mobileNavLinks.length; i++) {
            mobileNavLinks[i].addEventListener('click', function(e) {
                e.preventDefault();
                const route = this.getAttribute('data-route');
                loadPage(route);
                closeMobileMenu();
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
    function loadPage(route, dontPush) {
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

                    // Add history
                    if (!dontPush) {
	                    history.pushState({ page: route }, '', route);
                    }

                    // Reset now playing
                    lastState = null;

		            // Update desktop nav active state too
		            updateActiveLink(findNavLinkByRoute(route));

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
        const gigGuide = document.getElementsByClassName('gig-guide-gigs');
        if (gigGuide.length > 0) {
        	popuateGigs();
        }

        let schedule = document.getElementById('schedule-days');
        if (schedule) {
        	for (let i = 0; i < schedule.children.length; i++) {
        		schedule.children[i].children[0].addEventListener("click", function (event) { toggleDay(this) } );
        	}
        }

        let expandTOdayButton = document.getElementsByClassName("action-btn")[0].addEventListener("click", expandToday);
    }


    // Schedule stuff
    // Toggle individual day
    function toggleDay(header) {
    	dayCard = header.parentElement;
        dayCard.classList.toggle('active');
    }

    // Collapse all days
    function collapseAll() {
        document.querySelectorAll('.day-card').forEach(card => {
            card.classList.remove('active');
        });
    }

    // Expand today's schedule
    function expandToday() {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];

        // Collapse all first
        collapseAll();

        // Expand today
        const allCards = document.getElementsByClassName('day-card');
		let todayCard = null;
		for (let i = 0; i < allCards.length; i++) {
			if (allCards[i].getAttribute('data-day') === today) {
				todayCard = allCards[i];
				break;
			}
		}
		if (todayCard) {
            todayCard.classList.add('active');
            todayCard.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    // Auto-expand today on load
    expandToday();



    // Poll for Now Playing change
    var lastState = null;

	async function checkState() {
		if (!isPlaying) {
		    document.title = 'RDU 98.5 FM - Student Radio'
			document.getElementsByClassName("now-playing-song")[0].innerText = 'RDU 98.5 FM';
			document.getElementsByClassName("now-playing-song")[1].innerText = 'RDU 98.5 FM';
		}
		try {
			const response = await fetch('https://rdu985fm-gecko.radioca.st/currentsong');
			const data = await response.text();

			if (JSON.stringify(data) !== JSON.stringify(lastState)) {
				lastState = data;
				var nowPlaying = document.getElementsByClassName('now-playing-song')[0];
				if (nowPlaying) {
					nowPlaying.innerText = data; // update HTML
					if (isPlaying) {
                        document.title = data // update Title
						document.getElementsByClassName("now-playing-song")[0].innerText = data;
						document.getElementsByClassName("now-playing-song")[1].innerText = data;
						// Update the lockscreen when the metadata changes
						updateNowPlaying(data, 'RDU 98.5 FM');
                    }
				}
			}
		} catch (err) {
			console.error('Error fetching state:', err);
		}
	}

	// Poll every 2 seconds
	setInterval(checkState, 2000);



	// Gig Guide stuff COPY AND PASTED STRAIGHT FROM WEBFLOW
  // Helper function to get the ordinal suffix
  function popuateGigs() {
  function getOrdinal(n) {
    const suffix = ['th', 'st', 'nd', 'rd', 'th'][n % 10 <= 3 && ![11, 12, 13].includes(n % 100) ? n % 10 : 0];
    return `${n}${suffix}`;
  }

  // Function to convert date to the desired format
  function convertDate(startDate) {
    const dateObj = new Date(startDate);  // Parse the start_date string into a Date object

    // Get the weekday, day with ordinal, month, and time in 12-hour format with am/pm
    const weekday = dateObj.toLocaleString('en', { weekday: 'short' });  // e.g., Tue, Wed
    const dayWithOrdinal = getOrdinal(dateObj.getDate());
    const month = dateObj.toLocaleString('en', { month: 'long' });  // e.g., July, August
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;  // Convert 24-hour time to 12-hour format

    const timeStr = `${hours}:${minutes}${ampm}`;

    // Combine into the desired format
    return `${weekday} ${dayWithOrdinal} ${month} ${timeStr}`.toUpperCase();
  }

  fetch("https://soundsgood.guide/wp-json/tribe/events/v1/events?tags=rdu")
    .then(function(response) {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  })
    .then(function(data) {

    const container = document.getElementsByClassName("gig-guide-gigs")[0];

    if (container) {
      var content = "";
      for (var i = 0; i < data.events.length; i++) {
        var event = data.events[i];
        var dateFormat = convertDate(event.start_date);
        var venue = "";
        if (event.venue.city && event.venue.venue) {
          venue = event.venue.city + ", " + event.venue.venue;
        } else if (event.venue.city) {
          venue = event.venue.city;
        } else if (event.venue.venue) {
          venue = event.venue.venue;
        }
        var ticketsLink = "";
        if (event.website) {
          ticketsLink = `<a id="ticket-link" href="${event.website}">Tickets</a>`;
        } else if (event.url) {
          ticketsLink = `<a id="ticket-link" href="${event.url}">Tickets</a>`;
        }
        var image = "";
        if (event.image.sizes.thumbnail.url) {
          image = `<img id="gig-image" src="${event.image.sizes.thumbnail.url}">`;
        }
        content += `
		<div id="gig-div">
			<div id="image-container">
				${ticketsLink}
				${image}
			</div>
			<div id="gig-info">
			  <p id="event-date">${dateFormat}</p>
			  <p id="event-title">${event.title}</p>
			  <p id="event-venue">${venue}</p>
			</div>
		</div>
		`;
      }
      container.innerHTML = content;
    }
  });
  }
  // End Gig Guide


    var forwards

    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(e) {
        // You could implement history state management here
        // For now, just reload the home page
        console.log(e);
        loadPage(e.state.page, true);
    });

    // Add fade transition to main content
    mainContent.style.transition = 'opacity 0.3s ease';
});
