# VideoWalker

A location-based web application that plays YouTube videos when users physically reach specific GPS coordinates. Perfect for guided tours, scavenger hunts, interactive art installations, or location-based storytelling.

## Features

- 📍 **GPS-triggered video playback** - Videos play automatically when users enter defined geographic zones
- 🗺️ **Interactive map** - Beautiful Positron map style showing video locations and user position
- 🌍 **Multi-language support** - Currently supports English and German (easily extensible)
- 📱 **Mobile-first design** - Optimized for smartphones with fullscreen support
- 🎯 **Configurable zones** - Define custom radius circles around video locations
- 🎬 **Seamless YouTube integration** - Embedded video player with overlay controls
- 💡 **Info popups** - Display location titles and descriptions with play buttons

## Demo

[See it in action](#) *(add your GitHub Pages URL here after deployment)*

## Quick Start

### For Users

1. Visit the app URL on your mobile device
2. Select your preferred language
3. Grant fullscreen permission
4. Allow location access when prompted
5. Walk to the marked locations on the map
6. Click info popups to play videos at each location

### For Developers

Get your own VideoWalker running in 3 steps:

1. **Fork this repository**
2. **Configure your locations** (copy `videos.example.json` to `videos.json` and edit it)
3. **Publish to GitHub Pages**

Read on for detailed instructions!

---

## Installation & Setup

### Step 1: Fork the Repository

1. Click the **Fork** button at the top right of this repository
2. This creates a copy of the project in your GitHub account
3. Clone your forked repository to your local machine (optional):
   ```bash
   git clone https://github.com/YOUR-USERNAME/VideoWalker.git
   cd VideoWalker
   ```

### Step 2: Configure Your Video Locations

The repository ships `videos.example.json`. Copy it to `videos.json` and edit your copy, or open the [Editor](#editor) and save: it creates `videos.json` for you. The app loads `videos.json` and only falls back to `videos.example.json` while there is none.

```bash
cp videos.example.json videos.json
```

Don't edit `videos.example.json` for your site. That file belongs to this repository, and keeping your content in `videos.json` lets you [pull updates](#getting-updates) without conflicts.

`videos.json` contains these main sections:

#### Default Position

Sets the initial map center before GPS location is acquired:

```json
{
  "defaultPosition": {
    "latitude": 47.3911,
    "longitude": 8.5118,
    "zoom": 15
  },
  "locations": [...]
}
```

**Configuration:**
- `latitude`: Center latitude (decimal degrees)
- `longitude`: Center longitude (decimal degrees)
- `zoom`: Initial zoom level (1-20, where 15-18 is good for walking tours)

💡 **Tip:** Set this to the center of your tour area so users see relevant context immediately.

#### Video Locations

Each location in the `locations` array defines a video trigger zone:

```json
{
  "videoUrl": "https://www.youtube.com/embed/VIDEO_ID",
  "latitude": 47.3902729,
  "longitude": 8.5107042,
  "radius": 20,
  "title": {
    "en": "Location 1",
    "de": "Standort 1"
  },
  "description": {
    "en": "First video location - 20m radius",
    "de": "Erster Video-Standort - 20m Radius"
  }
}
```

**Configuration:**
- `videoUrl`: YouTube embed URL (format: `https://www.youtube.com/embed/VIDEO_ID`)
  - Find the VIDEO_ID from any YouTube URL: `youtube.com/watch?v=VIDEO_ID`
  - Or click "Share" → "Embed" on YouTube
- `latitude`: Location latitude in decimal degrees
- `longitude`: Location longitude in decimal degrees
- `radius`: Trigger radius in meters (how close users must be)
- `title`: Location name in each supported language
- `description`: Location description in each supported language

**Finding GPS Coordinates:**
- Google Maps: Right-click a location → Click the coordinates to copy
- Mobile: Share a location → Coordinates appear in the URL
- Use [latlong.net](https://www.latlong.net/) for address lookup

**Example Complete Configuration:**

```json
{
  "defaultPosition": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "zoom": 16
  },
  "locations": [
    {
      "videoUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "radius": 25,
      "title": {
        "en": "Times Square",
        "de": "Times Square"
      },
      "description": {
        "en": "Welcome to Times Square! - 25m radius",
        "de": "Willkommen am Times Square! - 25m Radius"
      }
    },
    {
      "videoUrl": "https://www.youtube.com/embed/ANOTHER_VIDEO_ID",
      "latitude": 40.7580,
      "longitude": -73.9855,
      "radius": 30,
      "title": {
        "en": "Central Park",
        "de": "Central Park"
      },
      "description": {
        "en": "Discover Central Park - 30m radius",
        "de": "Entdecke den Central Park - 30m Radius"
      }
    }
  ]
}
```

### Step 3: Publish to GitHub Pages

There are two ways to publish your VideoWalker:

#### Option A: Using GitHub Website (No Code Required)

1. Go to your forked repository on GitHub
2. Click **Settings** (top menu)
3. Scroll down and click **Pages** (left sidebar)
4. Under "Source", select **Deploy from a branch**
5. Under "Branch", select **master** (or **main**) and folder **/ (root)**
6. Click **Save**
7. Wait 1-2 minutes for deployment
8. Your site will be live at: `https://YOUR-USERNAME.github.io/VideoWalker/`

#### Option B: Using Git Command Line

If you cloned the repository locally:

```bash
# Make sure you're on the master branch
git checkout master

# Add and commit your changes to videos.json
git add videos.json
git commit -m "Configure video locations"

# Push to GitHub
git push origin master

# Then follow steps 2-7 from Option A above
```

### Getting Updates

Your site's content lives in your own files (`videos.json`, `audio/`, images), and this repository only changes `videos.example.json` and the code. So you can pull new versions without merge conflicts:

```bash
# Once: add this repository as "upstream"
git remote add upstream https://github.com/maybites/VideoWalker.git

# Every time you want the latest version
git pull upstream master
git push origin master
```

New settings always have defaults, so your `videos.json` keeps working after an update. Compare it with `videos.example.json` to see what's new.

**Forks created before `videos.example.json` existed:** the first pull reports a conflict on `videos.json` ("deleted in upstream, modified in HEAD"). Keep your file:

```bash
git checkout --ours videos.json
git add videos.json
git commit
```

After that, `videos.json` never conflicts again.

### Step 4: Test Your Deployment

1. Open your GitHub Pages URL on a mobile device
2. Walk through the language selection and permissions
3. Verify the map centers on your default position
4. Check that video markers appear correctly
5. Test video playback by clicking markers

---

## Customization

### Adding More Languages

1. Edit `index.html` and find the `translations` object (around line 200)
2. Add your language code and translations:

```javascript
const translations = {
  en: { /* existing English translations */ },
  de: { /* existing German translations */ },
  fr: {  // Add French
    fullscreenTitle: "Expérience Vidéo Géolocalisée",
    fullscreenText: "Cette expérience...",
    // ... add all translation keys
  }
};
```

3. Add a language selection button in the HTML (around line 130):

```html
<button class="languageButton" data-lang="fr">Français</button>
```

4. Update all location titles and descriptions in `videos.json` with the new language key

### Changing Map Style

The app uses the Positron style from OpenFreeMap. To use a different style:

1. Find the map initialization in `index.html` (around line 370)
2. Replace the style URL:

```javascript
L.maplibreGL({
  style: 'YOUR_MAPLIBRE_STYLE_URL'
}).addTo(map);
```

Popular alternatives:
- Dark mode: `https://tiles.openfreemap.org/styles/dark`
- Bright: `https://tiles.openfreemap.org/styles/bright`
- Or use any MapLibre GL style JSON

### Editor

`editor.html` edits everything in `videos.json` on a map, so you don't have to write JSON by hand. Open `https://YOUR-USERNAME.github.io/VideoWalker/editor.html` (or the file served by a local web server). It starts with the published `videos.json`, or with `videos.example.json` if your site has no `videos.json` yet.

- **Chrome/Edge:** click **Open project folder…** and choose your local VideoWalker folder. The editor then edits the local `videos.json` and **Save to project folder** writes it back, together with new images and audio files. In a fresh clone it starts from `videos.example.json`, and saving creates `videos.json`.
- **Other browsers:** click **Open videos.json…** to edit your local file, then **Download videos.json** (and any new files) and move them into the project folder.

The tabs:

- **General:** version, debug menu entry, start position, impressum per language
- **Videos:** video locations with URL, position, radius, and title and description per language
- **Audio:** audio areas and the fade time (see below)
- **Overlay:** a drawn map on top of the base map (see below)

Click a circle or an entry to edit it, and drag the markers to move things. Commit and push the changed files afterwards.

### Audio Areas

Audio areas play a sound while a visitor is inside them. The audio fades in when they enter, fades out when they leave, and fades out while a video is open. It continues where it stopped when they come back. Visitors don't see the areas or the player. **Toggle Debug Mode** shows the areas as blue dashed circles and the file that is playing. Tap a circle and **▶ Play audio** to hear an area from anywhere, e.g. to check that its file loads.

```json
"audio": {
  "fadeSeconds": 3,
  "areas": [
    {
      "name": "Birds",
      "url": "audio/birds.mp3",
      "latitude": 47.3905,
      "longitude": 8.5115,
      "radius": 30,
      "centerVolume": 1,
      "edgeVolume": 0,
      "loop": true
    }
  ]
}
```

- `fadeSeconds`: duration of every fade
- `name`: shown in debug mode only
- `url`: a file in the project (the editor copies chosen files into the `audio` folder) or a web URL. Web URLs must allow cross-origin access (CORS), otherwise the app can't fade them.
- `radius`: in meters
- `centerVolume`: volume at the center, from 0 to 1 (default `1`)
- `edgeVolume`: volume at the edge, from 0 to 1 (default `0`)
- `loop`: start again at the end (default `true`)

Up to three areas can play at the same time, so overlapping areas crossfade. Test on an iPhone: iOS only allows the audio because it is unlocked when the visitor taps **Accept and Continue**.

### Custom Drawn Map Overlay

You can lay your own drawn map over part of the base map. The **Overlay** tab of the editor creates a template to draw on: a map image of exactly the area you choose.

1. Drag the two orange corners, or paste the upper-left and lower-right corner as `lat, lng`
2. Pick the image width and label size, and click **Create template**
3. Save or download, then draw on top of the template in any drawing program, keeping the proportions of the image
4. Choose your drawing with **Choose drawing…**, and save again

```json
"overlay": {
  "image": "pirate_map.png",
  "topLeft": { "latitude": 47.3925, "longitude": 8.51 },
  "bottomRight": { "latitude": 47.3898, "longitude": 8.514 },
  "opacity": 1
}
```

- `image`: image file next to `videos.json`. Transparent parts of a PNG show the base map.
- `topLeft` / `bottomRight`: corners of the image on the map. Moving the corners in the editor moves and stretches the drawing, which the editor shows live.
- `opacity`: 0 (invisible) to 1 (opaque)

### Changing Circle Colors

Find the circle creation code in `index.html` (around line 490):

```javascript
const circle = L.circle([latitude, longitude], {
  color: 'red',      // Border color
  fillColor: '#f03', // Fill color
  fillOpacity: 0.3,  // Transparency (0-1)
  radius: radius
}).addTo(map);
```

Change `color`, `fillColor`, and `fillOpacity` to your preferred values.

### Adjusting GPS Update Frequency

The app updates location every 5 seconds by default. To change this, find `getUserLocation()` in `index.html` (around line 380):

```javascript
watchId = navigator.geolocation.watchPosition(
  success, 
  error, 
  {
    enableHighAccuracy: true,
    maximumAge: 5000,      // Cache time in milliseconds
    timeout: 10000         // Timeout in milliseconds
  }
);
```

---

## Troubleshooting

### Videos Don't Play
- ✅ Ensure you're using the **embed** URL format: `https://www.youtube.com/embed/VIDEO_ID`
- ✅ Check that the video allows embedding (not all YouTube videos do)
- ✅ Test on HTTPS (required for geolocation on most browsers)

### Location Not Detected
- ✅ Grant location permissions when prompted
- ✅ Ensure HTTPS is enabled (required for geolocation API)
- ✅ Wait 10-20 seconds for initial GPS lock
- ✅ Test outdoors for better GPS signal

### Map Doesn't Load
- ✅ Check browser console for errors (F12 → Console tab)
- ✅ Verify `videos.json` is valid JSON (use [jsonlint.com](https://jsonlint.com/))
- ✅ Ensure internet connection is active

### GitHub Pages Shows 404
- ✅ Wait 2-3 minutes after enabling GitHub Pages
- ✅ Verify the branch and folder settings in Settings → Pages
- ✅ Check that `index.html` is in the root folder
- ✅ Try accessing with and without trailing slash

---

## Technical Details

### Technologies Used
- **Leaflet** - Interactive map library
- **MapLibre GL** - Vector tile rendering for beautiful maps
- **OpenFreeMap** - Free and open map tiles (Positron style)
- **YouTube IFrame API** - Embedded video playback
- **Geolocation API** - HTML5 GPS positioning

### Browser Compatibility
- ✅ Chrome/Edge (mobile & desktop)
- ✅ Safari (iOS & macOS)
- ✅ Firefox (mobile & desktop)
- ⚠️ Requires HTTPS for geolocation (GitHub Pages provides this automatically)

### File Structure
```
VideoWalker/
├── index.html          # Main application file (HTML, CSS, JavaScript)
├── videos.example.json # Example configuration, maintained by this repository
├── videos.json         # Your site's configuration (you create it, see Step 2)
├── editor.html         # Editor for videos.json (see "Editor")
├── audio/              # Optional audio files for the audio areas
├── pirate_map.png      # Optional drawn map overlay (see "Custom Drawn Map Overlay")
└── README.md           # This file
```

---

## Privacy & Permissions

This app requires:
- **Location permission** - To determine if users are near video locations
- **Fullscreen permission** - For immersive video playback (optional)

**Privacy Notes:**
- Location data never leaves the user's device
- No data is collected or stored on servers
- No analytics or tracking included by default
- Fully client-side application

---

## Contributing

Contributions are welcome! Feel free to:
- 🐛 Report bugs via GitHub Issues
- 💡 Suggest features or improvements
- 🔧 Submit pull requests
- 📝 Improve documentation

---

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

## Credits

Concept and design by [Lukas Sander](https://www.lukassander.com/) and [maybites](https://maybites.com)

Created for location-based storytelling and interactive experiences.

Map data © [OpenStreetMap](https://www.openstreetmap.org/) contributors  
Map tiles by [OpenFreeMap](https://openfreemap.org/)

---

## Support

Having issues? Check the [Troubleshooting](#troubleshooting) section or [open an issue](https://github.com/maybites/VideoWalker/issues).

---

**Happy mapping! 🗺️🎬**
