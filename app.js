const express = require('express');
const fs = require('fs');
const path = require('path');

const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Read and parse .env file
function loadEnv() {
  try {
    const data = fs.readFileSync('.env', 'utf8');
    const lines = data.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  } catch (err) {
    // .env file doesn't exist, that's okay
    console.log(".env is not linked");
  }
}

// Call at the top of your file
loadEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static('public'));

// Serve ad-rotation directory as static files
AD_DIR = 'ad-rotation';
app.use('/ad-rotation', express.static(path.join(__dirname, 'ad-rotation')));

// Route handler function
function serveRoute(routePath) {
  return (req, res) => {
    const filePath = path.join(__dirname, 'routes', routePath);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.status(500).send('Error loading page');
        return;
      }
      res.send(data);
    });
  };
}

// Schedule data structure
var scheduleData = {};
var days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
// Custom CMS stuff below here

function parseCSV(csvText) {
	const rows = [];
	let row = [];
	let cell = '';
	let inQuotes = false;

	for (let i = 0; i < csvText.length; i++) {
	  const char = csvText[i];
	  const nextChar = csvText[i + 1];

	  if (inQuotes) {
		if (char === '"' && nextChar === '"') {
		  cell += '"'; // escaped quote
		  i++; // skip next quote
		} else if (char === '"') {
		  inQuotes = false; // end of quoted cell
		} else {
		  cell += char;
		}
	  } else {
		if (char === '"') {
		  inQuotes = true;
		} else if (char === ',') {
		  row.push(cell);
		  cell = '';
		} else if (char === '\r' && nextChar === '\n') {
		  row.push(cell);
		  rows.push(row);
		  row = [];
		  cell = '';
		  i++; // skip \n
		} else if (char === '\n' || char === '\r') {
		  row.push(cell);
		  rows.push(row);
		  row = [];
		  cell = '';
		} else {
		  cell += char;
		}
	  }
	}

	// Final cell (if file doesn't end in newline)
	if (cell !== '' || row.length > 0) {
	  row.push(cell);
	  rows.push(row);
	}

	return rows;
}


function getScheduleData() {
	console.log("Fetching the schedue sheet");
	fetch(process.env.SHEET).then( res => res.text() ).then( function (res) {
		var csv = parseCSV(res);
		// go through and create the scheduleData object with all the days
		for (let i = 0; i < days.length; i++) {
			var showsList = [];
			lineIndex = 2; // skip the note and days rows (0 and 1)
			while (lineIndex < csv.length) {
				var show = csv[lineIndex].slice(0 + 3 * i, 3 + 3 * i);
				if (show[0] || show[1] || show[2]) {
					showsList.push({time: show[0], title: show[1], description: show[2]});
				}
				lineIndex++;
			}
			scheduleData[days[i]] = {
				emoji: "",
				shows: JSON.parse(JSON.stringify(showsList))
			}
		}
		console.log("Fetch complete");
	});
}
getScheduleData();

setInterval(getScheduleData, 100000); // get schedule data every so often

// Generate schedule HTML string
function generateScheduleHTML() {
  let html = '';
  
  Object.keys(scheduleData).forEach(day => {
    const dayData = scheduleData[day];
    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    
    const showsHTML = dayData.shows.map(show => `
      <div class="show-item">
        <div class="show-time">${show.time}</div>
        <div class="show-title">${show.title}</div>
        <div class="show-description">${show.description}</div>
      </div>
    `).join('');
    
    html += `
      <div class="day-card" data-day="${day}">
        <div class="day-header">
          <div class="day-title">
            <span class="day-emoji">${dayData.emoji}</span>
            <span>${dayName}</span>
          </div>
          <span class="dropdown-icon">▼</span>
        </div>
        <div class="day-content">
          ${showsHTML}
        </div>
      </div>
    `;
  });
  
  return html;
}

// Special handler for show-schedule
app.get('/api/show-schedule', (req, res) => {
  const filePath = path.join(__dirname, 'routes', 'show-schedule.html');
  fs.readFile(filePath, 'utf8', (err, template) => {
    if (err) {
      res.status(500).send('Error loading page');
      return;
    }
    
    // Generate the schedule HTML
    const scheduleHTML = generateScheduleHTML();
    
    // Replace placeholder with generated content
    const finalHTML = template.replace('{{SCHEDULE_CONTENT}}', scheduleHTML);
    
    res.send(finalHTML);
  });
});

// Define routes
app.get('/api/home', serveRoute('home.html'));
// app.get('/api/show-schedule', serveRoute('show-schedule.html'));
app.get('/api/contact', serveRoute('contact.html'));
app.get('/api/gig-guide', serveRoute('gig-guide.html'));
app.get('/api/podcasts', serveRoute('podcasts.html'));
app.get('/api/terms', serveRoute('terms.html'));

// Get all the adds from ad rotation
app.get('/api/ad-images', (req, res) => {
    const dirPath = path.join(__dirname, 'ad-rotation'); // Adjust to your folder structure
    
    fs.readdir(dirPath, (err, files) => {
        if (err) {
            console.error("Could not list the directory.", err);
            return res.status(500).json({ error: "Unable to scan directory" });
        }

        // Filter for image files only
        const images = files.filter(file => 
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
        );

        res.json(images);
    });
});

// Youtube podcasts
// Configuration
const YOUTUBE_API_KEY = process.env.YT_API_KEY; 
const PLAYLIST_ID = 'PL97frgHoEUCIYMrKhXxAg-BvCnzii_b3x';
const PLAYLIST2_ID ='PL97frgHoEUCIBIKAu9fobHbeY4dr7-3KO';

app.get('/api/latest-videos', async (req, res) => {
    try {
        const params = new URLSearchParams({
            part: 'snippet',
            maxResults: '10',
            playlistId: PLAYLIST_ID,
            key: YOUTUBE_API_KEY
        });
        
        const params2 = new URLSearchParams({
            part: 'snippet',
            maxResults: '10',
            playlistId: PLAYLIST2_ID,
            key: YOUTUBE_API_KEY
        });

        const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);
        const response2 = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params2}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ error: 'YouTube API error', details: errorData });
        }
        if (!response2.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ error: 'YouTube API error', details: errorData });
        }

        const data = await response.json();
        const data2 = await response2.json();

        if (!data.items || !data2.items) return res.json([]);

        // Filter out anything that isn't 'public'
        console.log(data.items);
        const publicVideos = data.items
			.filter(item => item.snippet.title !== 'Private video') 
			.slice(0, 10) 
			.map(item => ({
				title: item.snippet.title,
				videoId: item.snippet.resourceId.videoId,
				thumbnail: item.snippet.thumbnails.high?.url
			}));
		const publicVideos2 = data2.items
			.filter(item => item.snippet.title !== 'Private video') 
			.slice(0, 10) 
			.map(item => ({
				title: item.snippet.title,
				videoId: item.snippet.resourceId.videoId,
				thumbnail: item.snippet.thumbnails.high?.url
			}));

        res.json({ videos: publicVideos, podcasts: publicVideos2 });

    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ADMIN STUFF

const sessions = new Map();

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}


// FILE ADMIN STUFF

function safePath(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const ext = path.extname(filename).toLowerCase();
  // if (!['jpg','jpeg','png'].has(ext)) return null;
  const resolved = path.join(AD_DIR, path.basename(filename));
  console.log(resolved);
  return resolved.startsWith(AD_DIR + path.sep) ? resolved : null;
}

app.post('/admin/images', requireAuth, (req, res) => {
  var filename = req.headers['x-filename'];
  filenameSafe = safePath(filename);
  if (filename === null) {
    res.status(500).json({ error: 'Could not save file.' });
  }
  const dest     = filenameSafe
  const stream   = fs.createWriteStream(dest);
  
  console.log("New image uploading:", dest);
 
  req.pipe(stream);
 
  stream.on('finish', () => res.json({ image: { filename } }));
  stream.on('error',  () => res.status(500).json({ error: 'Could not save file.' }));
});
 
app.delete('/admin/images/:filename', requireAuth, (req, res) => {
  const dest = path.join(AD_DIR, path.basename(req.params.filename));
  
  console.log("Delete image called:", dest);
  
  fs.unlink(dest, err => {
    if (err) return res.status(404).json({ error: 'File not found.' });
    res.json({ ok: true });
  });
});



// LOGIN LOGOUT ADMIN STUFF, SAFE VVV

app.get('/admin-dashboard', (req, res) => {
  if (process.env.SERVER_NAME === "master") {
  	res.sendFile(path.join(__dirname, 'routes', 'admin.html'));
  } else {
  	res.sendFile(path.join(__dirname, 'routes', 'admin-error.html'));
  }
});

app.post('/admin/login', express.json(), async (req, res) => {
  console.log("Admin login attempt", req.body.username);
  const { username, password } = req.body || {};
  if (!username || !password) {
  	console.log("Login attempt failed.");
    return res.status(400).json({ error: 'Username and password are required.' });
  }
 
  let usernameMatch = username === process.env.ADMIN_USERNAME;
  

  const passwordMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
 
  if (!usernameMatch || !passwordMatch) {
  	console.log("Login attempt failed.", usernameMatch, passwordMatch);
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  
  console.log("Login attempt sucessful.");
 
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, true);
  res.json({ token });
});

app.post('/admin/logout', requireAuth, (req, res) => {
  const token = req.headers['authorization'].slice(7);
  sessions.delete(token);
  res.json({ ok: true });
});

// END ADMIN


// FILE SYNC STUFF

// The slave server calls this function
// which copies the images from the master server
async function copyImages() {
	// ONLY IF this is the slave, then make a copy of the images, OTHERWISE return
	if (process.env.SERVER_NAME === "master") {
		return;
	}
	
    const MASTER_URL = process.env.SERVER_URL;
    const LOCAL_DIR = path.join(__dirname, 'ad-rotation');

    if (!fs.existsSync(LOCAL_DIR)) {
        fs.mkdirSync(LOCAL_DIR, { recursive: true });
    }

    try {
        console.log("made it here2");
        const healthResponse = await fetch(`${MASTER_URL}/api/status`); 
        const health = await healthResponse.json();
        console.log("made it here1.5");

        if (health.status !== "Live" || health.server_name !== "master") return;

        console.log("made it here1");
        const listResponse = await fetch(`${MASTER_URL}/api/ad-images`);
        console.log("made it here");
        const remoteImages = await listResponse.json(); // Array of strings

        // 1. Delete local files that are no longer on the master
        const localFiles = fs.readdirSync(LOCAL_DIR);
        for (const localFile of localFiles) {
            if (!remoteImages.includes(localFile)) {
                fs.unlinkSync(path.join(LOCAL_DIR, localFile));
                console.log(`Deleted deprecated file: ${localFile}`);
            }
        }

        // 2. Sync / Overwrite current files
        for (const fileName of remoteImages) {
            const imageUrl = `${MASTER_URL}/ad-rotation/${fileName}`;
            const localPath = path.join(LOCAL_DIR, fileName);

            try {
                const imgRes = await fetch(imageUrl);
                if (!imgRes.ok) continue;

                const buffer = Buffer.from(await imgRes.arrayBuffer());
                fs.writeFileSync(localPath, buffer);
            } catch (err) {
                console.error(`Error downloading ${fileName}`);
            }
        }

    } catch (error) {
        console.error("Sync failed:", error.message);
    }
}
if (process.env.SERVER_NAME !== "master") { // the slave server
	copyImages();
	setInterval(copyImages, 60 * 60 * 1000); // Every 60 minutes
}
// END FILE SYNC




// Root route serves index.html NOTE this is done automatically in static

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return `${d} days, ${h} hours, ${m} minutes, ${s} seconds`;
}
app.get('/api/status', (req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify({ status: "Live", server_name: process.env.SERVER_NAME, uptime:formatUptime(process.uptime()) }));
});


app.get('/api/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'routes', 'error.html'));
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Radio app running on http://localhost:${PORT}`);
});
