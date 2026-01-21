const express = require('express');
const fs = require('fs');
const path = require('path');

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

// Define routes
app.get('/api/home', serveRoute('home.html'));
app.get('/api/show-schedule', serveRoute('show-schedule.html'));
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
