const express = require('express');
const fs = require('fs');
const path = require('path');

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
  }
}

// Call at the top of your file
loadEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static('public'));

// Serve ad-rotation directory as static files
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

// Root route serves index.html NOTE this is done automatically in static
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Radio app running on http://localhost:${PORT}`);
});
