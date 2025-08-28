// Loading Screen Management
var loadingProgress = 0;
var assetsLoaded = 0;
var totalAssets = 5; // Adjust based on your assets

function updateLoadingProgress(increment) {
    loadingProgress += increment;
    var progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = Math.min(loadingProgress, 100) + '%';
    }
    
    if (loadingProgress >= 100) {
        setTimeout(hideLoadingScreen, 500);
    }
}

function hideLoadingScreen() {
    var loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(function() {
            loadingScreen.style.display = 'none';
        }, 800);
    }
}

// Simulate loading progress
setTimeout(function() { updateLoadingProgress(20); }, 300);
setTimeout(function() { updateLoadingProgress(30); }, 600);

var Mathutils = {
    normalize: function($value, $min, $max) {
        return ($value - $min) / ($max - $min);
    },
    interpolate: function($normValue, $min, $max) {
        return $min + ($max - $min) * $normValue;
    },
    map: function($value, $min1, $max1, $min2, $max2) {
        if ($value < $min1) {
            $value = $min1;
        }
        if ($value > $max1) {
            $value = $max1;
        }
        var res = this.interpolate(this.normalize($value, $min1, $max1), $min2, $max2);
        return res;
    }
};
var markers = [];

// Get window size
var ww = window.innerWidth,
    wh = window.innerHeight;

var composer, params = {
    exposure: 1.3,
    bloomStrength: .9,
    bloomThreshold: 0,
    bloomRadius: 0
};

// Create a WebGL renderer
var renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("canvas"),
    antialias: true,
    shadowMapEnabled: true,
    shadowMapType: THREE.PCFSoftShadowMap
});
renderer.setSize(ww, wh);

// Create an empty scene
var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x194794, 0, 100);

var clock = new THREE.Clock();

// Create a perspective camera
var cameraRotationProxyX = 3.14159;
var cameraRotationProxyY = 0;

var camera = new THREE.PerspectiveCamera(45, ww / wh, 0.001, 200);
camera.rotation.y = cameraRotationProxyX;
camera.rotation.z = cameraRotationProxyY;

var c = new THREE.Group();
c.position.z = 400;

c.add(camera);
scene.add(c);

// Set up render pass
var renderScene = new THREE.RenderPass(scene, camera);
var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.85);
bloomPass.renderToScreen = true;
bloomPass.threshold = params.bloomThreshold;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = params.bloomRadius;
composer = new THREE.EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Array of points - shortened by 28% for earlier space transition
var points = [
    [10, 89, 0],
    [50, 88, 10],
    [76, 139, 20],
    [126, 141, 12],
    [150, 112, 8],
    [157, 73, 0],
    [171, 46, 4]  // Shortened from 232 to ~171 (28% reduction total)
];

var p1, p2;

// Convert the array of points into vertices
for (var i = 0; i < points.length; i++) {
    var x = points[i][0];
    var y = points[i][2];
    var z = points[i][1];
    points[i] = new THREE.Vector3(x, y, z);
}

// Create a path from the points
var path = new THREE.CatmullRomCurve3(points);
path.tension = .5;

// Create a new geometry with more segments to eliminate visible rings
var geometry = new THREE.TubeGeometry(path, 300, 4, 64, false); // Increased radial segments from 32 to 64

var texture = new THREE.TextureLoader().load('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Earth%27s_City_Lights_by_DMSP%2C_1994-1995_%28large%29.jpg/1600px-Earth%27s_City_Lights_by_DMSP%2C_1994-1995_%28large%29.jpg', function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0, 0);
    texture.repeat.set(15, 2);
    updateLoadingProgress(20); // Update progress when texture loads
});

var mapHeight = new THREE.TextureLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/68819/waveform-bump3.jpg', function(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0, 0);
    texture.repeat.set(15, 2);
    updateLoadingProgress(20); // Update progress when texture loads
});

var material = new THREE.MeshPhongMaterial({
    side: THREE.BackSide,
    map: texture,
    shininess: 10, // Moderate shininess for some highlight without harsh edges
    bumpMap: mapHeight,
    bumpScale: -.02, // Moderate bump for texture without edge artifacts
    specular: 0x0b2349, // Back to original brighter specular
    transparent: true,
    opacity: 1,
    flatShading: false, // Ensure smooth shading
    vertexColors: false, // Prevent vertex color artifacts
    emissive: 0x080808, // Slightly dimmer emissive
    emissiveIntensity: 0.15
});

// Ensure geometry has smooth normals
geometry.computeVertexNormals();

// Create a mesh (global for space journey access)
var tubeMesh = new THREE.Mesh(geometry, material);
scene.add(tubeMesh);

// Inner tube wireframe - fixed for glitching
var geometry2 = new THREE.TubeGeometry(path, 100, 3.4, 24, false); // Reduced segments for stability
var geo = new THREE.EdgesGeometry(geometry2, 10); // Added threshold angle to reduce edges

var mat = new THREE.LineBasicMaterial({
    color: 0x666666, // Explicit grey color
    linewidth: 1, // Thinner lines
    opacity: 0.15, // Slightly less visible
    transparent: true, // Proper boolean
    depthWrite: false, // Prevent z-fighting
    depthTest: true
});

var wireframe = new THREE.LineSegments(geo, mat);
wireframe.renderOrder = 1; // Render after main geometry
scene.add(wireframe);

// Matrix rain effect - create multiple layers for depth
var matrixLayers = [];
var matrixChars = "0101010101";

// Create 3 layers of matrix rain at different depths
for (var layer = 0; layer < 3; layer++) {
    var radius = 3.6 + (layer * 0.3);
    var matrixGeometry = new THREE.TubeGeometry(path, 150, radius, 64, false); // Increased segments to match main tube
    var matrixCanvas = document.createElement('canvas');
    matrixCanvas.width = 1024;
    matrixCanvas.height = 512;
    var matrixContext = matrixCanvas.getContext('2d');
    
    // Different number of columns per layer for variety
    var matrixColumns = 30 + (layer * 10);
    var matrixDrops = [];
    var dropSpeeds = [];
    var dropSizes = [];
    var dropOpacities = [];
    
    // Initialize drops with varied properties
    for (var i = 0; i < matrixColumns; i++) {
        matrixDrops[i] = Math.random() * -100;
        dropSpeeds[i] = 0.3 + Math.random() * 1.2;  // Varied speeds
        dropSizes[i] = 8 + Math.floor(Math.random() * 12);  // Varied sizes (8-20px)
        dropOpacities[i] = 0.3 + Math.random() * 0.7;  // Varied opacity
    }
    
    // Create matrix texture - rotated 90 degrees
    var matrixTexture = new THREE.CanvasTexture(matrixCanvas);
    matrixTexture.wrapS = THREE.RepeatWrapping;
    matrixTexture.wrapT = THREE.RepeatWrapping;
    matrixTexture.repeat.set(1, 8);
    matrixTexture.rotation = Math.PI / 2;
    
    var matrixMaterial = new THREE.MeshBasicMaterial({
        map: matrixTexture,
        transparent: true,
        opacity: 0.20 - (layer * 0.04),  // Brighter matrix effect
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
    });
    
    var matrixMesh = new THREE.Mesh(matrixGeometry, matrixMaterial);
    scene.add(matrixMesh);
    
    matrixLayers.push({
        canvas: matrixCanvas,
        context: matrixContext,
        texture: matrixTexture,
        columns: matrixColumns,
        drops: matrixDrops,
        speeds: dropSpeeds,
        sizes: dropSizes,
        opacities: dropOpacities
    });
}

// =============== SPACE JOURNEY DISABLED - CAUSING FREEZE ===============
// All space journey objects removed to prevent freezing issues
var starMaterial = { opacity: 0 }; // Dummy object to prevent errors
var lightBurstMaterial = { opacity: 0 }; // Dummy object to prevent errors
var warpLines = []; // Empty array to prevent errors

// Space journey function removed - was causing freezes


// Function to update matrix rain with convergence effect - SIMPLIFIED
function updateMatrixRain() {
    // Safety check for currentCameraPercentage
    if (typeof currentCameraPercentage === 'undefined' || isNaN(currentCameraPercentage)) {
        return;
    }
    
    // Simplified convergence calculation
    var convergenceFactor = 0;
    var speedMultiplier = 1;
    
    // Adjust matrix behavior for space journey
    if (currentCameraPercentage > 0.95) {
        // In space - make matrix rain more ethereal and spread out
        speedMultiplier = 0.3; // Slower in space
        convergenceFactor = -0.5; // Spread out more
        
        // Fade matrix opacity in space
        matrixLayers.forEach(function(layer, index) {
            if (layer.mesh && layer.mesh.material) {
                var baseFade = 0.20 - (index * 0.04);
                var spaceFade = Math.max(0.05, baseFade * 0.3); // Very faint in space
                layer.mesh.material.opacity = spaceFade;
            }
        });
    } else if (currentCameraPercentage > 0.85) {
        // Transition zone - gradual fade
        var transitionProgress = (currentCameraPercentage - 0.85) / 0.11;
        matrixLayers.forEach(function(layer, index) {
            if (layer.mesh && layer.mesh.material) {
                var baseOpacity = 0.20 - (index * 0.04);
                var targetOpacity = baseOpacity * (1 - transitionProgress * 0.7);
                layer.mesh.material.opacity = targetOpacity;
            }
        });
    } else {
        // Normal tunnel opacity
        matrixLayers.forEach(function(layer, index) {
            if (layer.mesh && layer.mesh.material) {
                layer.mesh.material.opacity = 0.20 - (index * 0.04);
            }
        });
    }
    
    // Only calculate convergence if in tunnel range
    if (currentCameraPercentage > 0.65 && currentCameraPercentage <= 0.85) {
        convergenceFactor = (currentCameraPercentage - 0.65) / 0.20;
        if (convergenceFactor > 1) convergenceFactor = 1;
        if (convergenceFactor < 0) convergenceFactor = 0;
        speedMultiplier = 1 + convergenceFactor; // Reduced multiplier
    }
    
    matrixLayers.forEach(function(layer, layerIndex) {
        // Skip if layer is invalid
        if (!layer || !layer.context) return;
        
        // Fade the canvas - less aggressive fade for brighter effect
        var fadeOpacity = convergenceFactor > 0 ? 0.10 : 0.06;
        layer.context.fillStyle = 'rgba(0, 0, 0, ' + fadeOpacity + ')';
        layer.context.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
        
        // Reduce number of characters drawn when converging to prevent performance issues
        var skipFactor = convergenceFactor > 0.8 ? 2 : 1;
        
        // Draw characters
        for (var i = 0; i < layer.columns; i += skipFactor) {
            // Safety check for array bounds
            if (!layer.drops[i]) continue;
            
            // Increase density when converging
            var drawChance = convergenceFactor > 0 ? 0.6 : 0.7;
            
            if (Math.random() > drawChance) {
                var text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                
                // Calculate position with convergence effect
                var baseX = (i / layer.columns) * layer.canvas.width;
                var centerX = layer.canvas.width / 2;
                
                // Pull characters towards center when converging (reduced effect)
                var x = baseX + (centerX - baseX) * convergenceFactor * 0.3;
                var y = layer.drops[i] * 10;
                
                // Skip if position is out of bounds
                if (y < 0 || y > layer.canvas.height) continue;
                
                // Adjust font size
                var fontSize = layer.sizes[i] * (1 - convergenceFactor * 0.2);
                layer.context.font = fontSize + 'px monospace';
                
                // Draw with gradient effect
                var gradient = 1 - (layer.drops[i] / 50);
                var opacity = Math.min(1, layer.opacities[i] * (1 + convergenceFactor * 0.5));
                layer.context.globalAlpha = Math.max(0, Math.min(opacity, gradient * opacity));
                
                // Change color based on convergence - brighter green
                layer.context.fillStyle = convergenceFactor > 0.5 ? '#6F6' : '#2F2';
                layer.context.fillText(text, x, y);
            }
            
            // Move drop with increased speed
            layer.drops[i] += layer.speeds[i] * Math.min(speedMultiplier, 3);
            
            // Reset drop when it goes off screen
            if (layer.drops[i] * 10 > layer.canvas.height) {
                if (Math.random() > 0.96) {
                    layer.drops[i] = Math.random() * -30;
                    // Update properties occasionally
                    if (Math.random() > 0.8) {
                        layer.speeds[i] = 0.3 + Math.random() * 0.8;
                        layer.sizes[i] = 8 + Math.floor(Math.random() * 8);
                        layer.opacities[i] = 0.3 + Math.random() * 0.5;
                    }
                }
            }
        }
        
        // Update texture
        layer.texture.needsUpdate = true;
    });
}

// Create a point light with smoother falloff to prevent rings
var light = new THREE.PointLight(0xffffff, .45, 8, 1); // Slightly reduced from 0.5 to 0.45
light.castShadow = false; // Disable shadows which can cause artifacts
scene.add(light);

// Increase ambient light to reduce harsh lighting contrasts while keeping brightness
var ambientLight = new THREE.AmbientLight(0xffffff, 0.25); // Reduced back to 0.25
scene.add(ambientLight);

// Load font and create text
var loader = new THREE.FontLoader();
var textMeshes = [];
var textGroup = new THREE.Group();
scene.add(textGroup);

// Add TRIOLL logo - load from GitHub
var logoTexture = new THREE.TextureLoader().load(
    'https://raw.githubusercontent.com/trioll/Trioll/78458b29ad3b63aae3eff39aae462c0ad4cc4d8b/Logo/Trioll_Logo_White.png',
    function(texture) {
        console.log('Logo texture loaded successfully from GitHub');
        texture.needsUpdate = true;
        // Force material update
        if (logoMesh && logoMesh.material) {
            logoMesh.material.needsUpdate = true;
        }
    },
    undefined,
    function(error) {
        console.error('Error loading logo texture:', error);
    }
);

// Create plane for logo immediately - larger for tunnel entry
var logoGeometry = new THREE.PlaneGeometry(5, 5);  // Larger size for tunnel entry visibility
var logoMaterial = new THREE.MeshBasicMaterial({
    map: logoTexture,
    transparent: true,
    alphaTest: 0.05,  // Even lower threshold
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    color: 0xffffff,
    opacity: 0.8,  // Reduced opacity
    emissive: 0xffffff,
    emissiveIntensity: 0.1  // Reduced glow
});

var logoMesh = new THREE.Mesh(logoGeometry, logoMaterial);

// Position where logo should be at tunnel entry
var logoPosition = 0.03;  // Very early in tunnel entrance
var logoPoint = path.getPointAt(logoPosition);
var logoPoint2 = path.getPointAt(Math.max(logoPosition - 0.01, 0));

logoMesh.position.copy(logoPoint);
logoMesh.lookAt(logoPoint2);

// Initially hidden like other text
logoMesh.visible = false;
textGroup.add(logoMesh);
textMeshes.push({ mesh: logoMesh, position: logoPosition });

console.log('Logo added at position:', logoPosition);
console.log('Initial textMeshes array has', textMeshes.length, 'items');

// End sphere and logo removed - cleaner tunnel exit

// Create spinning SVG text ring at position 0.10
setTimeout(function() {
    console.log('Creating SVG text ring...');
    
    // Load the SVG texture (white thin version)
    var textureLoader = new THREE.TextureLoader();
    var ringTexture = textureLoader.load('wheregamesginewhitethin.svg', 
        function(texture) {
            console.log('SVG text ring texture loaded successfully');
            
            // Set texture properties for crisp rendering
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            
            // Constants for text ring - positioned after main text
            var RING_SIZE = 7; // Size of the ring plane (reduced by 30%)
            var RING_POSITION = 0.28; // Position after "THE FUTURE OF GAME DISCOVERY"
            
            // Create a group for the text ring
            var textRingGroup = new THREE.Group();
            
            // Get position on the path for the ring
            var ringPathPoint = path.getPointAt(RING_POSITION);
            var ringPathPoint2 = path.getPointAt(Math.max(RING_POSITION - 0.01, 0));
            
            // Position the group at the path point
            textRingGroup.position.copy(ringPathPoint);
            textRingGroup.lookAt(ringPathPoint2);
            
            // Create a circular plane for the SVG
            var ringGeometry = new THREE.PlaneGeometry(RING_SIZE, RING_SIZE);
            // Use MeshBasicMaterial like the logo for consistent brightness
            var ringMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                alphaTest: 0.05,
                depthWrite: false,
                color: 0xFFFFFF
            });
            
            var ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            
            // Don't rotate here - let the group orientation handle it
            
            textRingGroup.add(ringMesh);
            
            // Add the ring group to the scene
            scene.add(textRingGroup);
            
            // Store reference for animation
            window.textRingGroup = textRingGroup;
            window.textRingMesh = ringMesh;
            window.textRingSpeed = 0.005; // Rotation speed (slower for better readability)
            textRingGroup.visible = false;
            
            // Add to textMeshes for visibility control
            textMeshes.push({ 
                mesh: textRingGroup, 
                position: RING_POSITION,
                isRing: true 
            });
            
            console.log('SVG text ring created at position:', RING_POSITION);
        },
        function(xhr) {
            console.log('Loading SVG:', (xhr.loaded / xhr.total * 100) + '%');
        },
        function(error) {
            console.error('Error loading SVG text ring:', error);
            console.log('Attempting to load as PNG fallback...');
            
            // If SVG fails, try loading as a regular image
            textureLoader.load('wheregamesginewhitethin.svg', function(texture) {
                // Set texture properties
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                
                // Use the same setup code as above - more spaced out
                var RING_SIZE = 7;
                var RING_POSITION = 0.22;
                
                var textRingGroup = new THREE.Group();
                var ringPathPoint = path.getPointAt(RING_POSITION);
                var ringPathPoint2 = path.getPointAt(Math.max(RING_POSITION - 0.01, 0));
                
                textRingGroup.position.copy(ringPathPoint);
                textRingGroup.lookAt(ringPathPoint2);
                
                var ringGeometry = new THREE.PlaneGeometry(RING_SIZE, RING_SIZE);
                var ringMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    alphaTest: 0.05,
                    depthWrite: false,
                    color: 0xFFFFFF
                });
                
                var ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                textRingGroup.add(ringMesh);
                scene.add(textRingGroup);
                
                window.textRingGroup = textRingGroup;
                window.textRingMesh = ringMesh;
                window.textRingSpeed = 0.005;
                textRingGroup.visible = false;
                
                textMeshes.push({ 
                    mesh: textRingGroup, 
                    position: RING_POSITION,
                    isRing: true 
                });
            });
        }
    );
}, 1000); // Delay to ensure everything is loaded


// Text content and positions along the path (percentage) - proper sequence
var textContent = [
    { text: "TRIOLL", position: 0.08, size: 0.8 }, // After logo at 0.03
    // Split into two centered lines
    { text: "THE FUTURE OF", position: 0.15, size: 0.5, yOffset: 0.4 }, // After TRIOLL
    { text: "GAME DISCOVERY", position: 0.15, size: 0.5, yOffset: -0.4 }, // Same position as above line
    { text: "GAMERS", position: 0.46, size: 1.0, yOffset: 0.8 }, // Line 1 - moved up
    { text: "SWIPE . PLAY . BUY", position: 0.46, size: 0.7, yOffset: -0.8 }, // Line 2 - moved down
    { text: "DEVELOPERS", position: 0.62, size: 1.0, yOffset: 0.8 }, // Line 1 - moved up
    { text: "TEST . LEARN . GROW", position: 0.62, size: 0.7, yOffset: -0.8 }, // Line 2 - moved down
    // JOIN THE GAME on top line, DISCOVERY REVOLUTION on bottom line - space for snitch
    { text: "JOIN THE GAME", position: 0.78, size: 0.9, yOffset: 0.8 }, // Top line
    { text: "DISCOVERY REVOLUTION", position: 0.78, size: 0.8, yOffset: -0.8 } // Bottom line
];


// Load Poppins Black Italic font with error handling
console.log('Starting font load from:', 'Poppins Black_Italic.json');
loader.load('Poppins Black_Italic.json',  // Load font file
    function(font) {
        console.log('Poppins font loaded successfully');
        console.log('Font object:', font);
        console.log('TextMeshes array now has', textMeshes.length, 'items after font load');
        
        // Update loading progress
        updateLoadingProgress(10);
        
    // TRIOLL text on sphere removed
    
    textContent.forEach(function(item, index) {
        if (item.image) {
            // Handle image/SVG items
            console.log('Loading image:', item.image);
            var textureLoader = new THREE.TextureLoader();
            textureLoader.load(item.image, 
                function(texture) {
                    console.log('Image loaded successfully:', item.image);
                    // Use nearest filter for crisp text
                    texture.minFilter = THREE.NearestFilter;
                    texture.magFilter = THREE.NearestFilter;
                    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    
                    // Maintain SVG aspect ratio (542.59 x 180.86 from viewBox)
                    var aspectRatio = 180.86 / 542.59; // height/width = 0.333
                    var planeGeometry = new THREE.PlaneGeometry(item.size, item.size * aspectRatio);
                    var planeMaterial = new THREE.MeshBasicMaterial({
                        map: texture,
                        transparent: true,
                        side: THREE.DoubleSide,
                        depthWrite: false,
                        opacity: 1.0,
                        color: 0xffffff
                    });
                    
                    var imageMesh = new THREE.Mesh(planeGeometry, planeMaterial);
                    
                    // Position along the path
                    var imgPoint = path.getPointAt(item.position);
                    var imgPoint2 = path.getPointAt(Math.max(item.position - 0.01, 0));
                    
                    imageMesh.position.copy(imgPoint);
                    imageMesh.lookAt(imgPoint2);
                    
                    imageMesh.visible = false;
                    textGroup.add(imageMesh);
                    textMeshes.push({ mesh: imageMesh, position: item.position });
                    
                    console.log('Image mesh added at position:', item.position);
                },
                function(xhr) {
                    console.log('Loading image progress:', (xhr.loaded / xhr.total * 100) + '%');
                },
                function(error) {
                    console.error('Error loading image:', item.image, error);
                    // Fallback to text if image fails
                    console.log('Creating fallback text for:', item.image);
                    var geometry = new THREE.TextGeometry("THE FUTURE OF\nGAME DISCOVERY", {
                        font: font,
                        size: item.size * 0.3,
                        height: 0.1,
                        curveSegments: 12,
                        bevelEnabled: true,
                        bevelThickness: 0.02,
                        bevelSize: 0.01,
                        bevelSegments: 3
                    });
                    geometry.center();
                    var material = new THREE.MeshPhongMaterial({
                        color: 0xffffff,
                        emissive: 0xffffff,
                        emissiveIntensity: 0.1,  // Minimal glow
                        shininess: 100,
                        transparent: true,
                        side: THREE.DoubleSide
                    });
                    var textMesh = new THREE.Mesh(geometry, material);
                    var textPoint = path.getPointAt(item.position);
                    var textPoint2 = path.getPointAt(Math.max(item.position - 0.01, 0));
                    textMesh.position.copy(textPoint);
                    textMesh.lookAt(textPoint2);
                    textMesh.visible = false;
                    textGroup.add(textMesh);
                    textMeshes.push({ mesh: textMesh, position: item.position });
                }
            );
        } else {
            // Handle text items
            var isMainTitle = item.position === 0.08;  // The first position gets full size
            
            var geometry = new THREE.TextGeometry(item.text, {
                font: font,
                size: isMainTitle ? item.size : item.size * 0.7,  // Full size for main title
                height: 0.1,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.02,
                bevelSize: 0.01,
                bevelSegments: 3,
                letterSpacing: item.letterSpacing || 0  // Add letter spacing if specified
            });
            
            // Center the geometry on all axes
            geometry.center();
            
            var material = new THREE.MeshPhongMaterial({
                color: 0xffffff,  // White color
                emissive: 0xffffff,  // White emissive
                emissiveIntensity: 0.1,  // Minimal glow
                shininess: 100,
                transparent: true,  // Need this for opacity to work
                side: THREE.DoubleSide  // Render both sides
            });
            
            var textMesh = new THREE.Mesh(geometry, material);
            
            // Position text along the path
            var textPoint = path.getPointAt(item.position);
            var textPoint2 = path.getPointAt(Math.max(item.position - 0.01, 0));
            
            textMesh.position.copy(textPoint);
            
            // Apply Y offset if specified for vertical positioning
            if (item.yOffset) {
                textMesh.position.y += item.yOffset;
            }
            
            // Make text face backward along the path (toward the camera coming through)
            textMesh.lookAt(textPoint2);
            
            // No offset needed since text is now fully centered
            
            textMesh.visible = false;
            textGroup.add(textMesh);
            textMeshes.push({ mesh: textMesh, position: item.position });
        }
    });
    
    console.log('After adding text items, textMeshes has', textMeshes.length, 'items');
    
    // REQUEST ACCESS 3D text and border removed - using HTML button instead
}, 
undefined,
function(error) {
    console.error('Error loading Poppins font:', error);
    // Fallback to Helvetiker if Poppins fails
    console.log('Attempting to load fallback font...');
    loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', function(fallbackFont) {
        console.log('Using fallback font - Helvetiker Bold');
        // Process text content with fallback font
        textContent.forEach(function(item) {
            if (!item.image && item.text) {
                var geometry = new THREE.TextGeometry(item.text, {
                    font: fallbackFont,
                    size: item.size * 0.7,
                    height: 0.1,
                    curveSegments: 12
                });
                geometry.center();
                var material = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.1
                });
                var textMesh = new THREE.Mesh(geometry, material);
                var textPoint = path.getPointAt(item.position);
                var textPoint2 = path.getPointAt(Math.max(item.position - 0.01, 0));
                textMesh.position.copy(textPoint);
                if (item.yOffset) textMesh.position.y += item.yOffset;
                textMesh.lookAt(textPoint2);
                textMesh.visible = false;
                textGroup.add(textMesh);
                textMeshes.push({ mesh: textMesh, position: item.position });
            }
        });
        console.log('Fallback font loaded. TextMeshes:', textMeshes.length);
    }, undefined, function(fallbackError) {
        console.error('Failed to load fallback font:', fallbackError);
    });
});

// Add end portal image
var imageLoader = new THREE.TextureLoader();
var endImageTexture = imageLoader.load('end-image.jpg', function(texture) {
    var imageGeometry = new THREE.PlaneGeometry(20, 20);
    var imageMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
    });
    
    var imagePlane = new THREE.Mesh(imageGeometry, imageMaterial);
    
    // Position at end of path
    var endPoint = path.getPointAt(0.98);
    var endPoint2 = path.getPointAt(0.99);
    
    imagePlane.position.copy(endPoint);
    imagePlane.lookAt(endPoint2);
    
    scene.add(imagePlane);
    
    // Store reference for animation
    window.endPortalImage = imagePlane;
});

function updateCameraPercentage(percentage) {
    if (percentage <= 1.0) {
        // Smooth path following throughout entire tunnel - no clamping at 96%
        var lookAheadPercentage = Math.min(percentage + 0.01, 1.0);
        
        p1 = path.getPointAt(percentage);
        p2 = path.getPointAt(lookAheadPercentage);
        
        c.position.set(p1.x, p1.y, p1.z);
        c.lookAt(p2);
        light.position.set(p2.x, p2.y, p2.z);
    } else {
        // Beyond tunnel end - continue straight from end point
        var tunnelEnd = path.getPointAt(1.0);
        var tunnelDirection = path.getPointAt(0.99);
        
        // Calculate direction vector from tunnel end
        var direction = new THREE.Vector3()
            .subVectors(tunnelEnd, tunnelDirection)
            .normalize();
        
        // Extend camera position beyond tunnel end smoothly
        var extraDistance = (percentage - 1.0) * 15; // Increased scale for smoother movement
        var newPosition = tunnelEnd.clone().add(direction.multiplyScalar(extraDistance));
        
        c.position.copy(newPosition);
        c.lookAt(newPosition.clone().add(direction));
        light.position.copy(newPosition);
    }
}

var cameraTargetPercentage = 0;
var currentCameraPercentage = 0;

gsap.defaultEase = Linear.easeNone;

var tubePerc = {
    percent: 0
}

gsap.registerPlugin(ScrollTrigger);

var tl = gsap.timeline({
    scrollTrigger: {
        trigger: ".scrollTarget",
        start: "top top",
        end: "bottom bottom", // Full scroll range
        scrub: 2, // Faster response
        markers: false, // Hide markers
        onUpdate: function(self) {
            console.log("ScrollTrigger progress:", self.progress.toFixed(2));
        }
    }
})
tl.to(tubePerc, {
    percent: 1.0, // Full range
    ease: "none",
    duration: 10,
    onUpdate: function() {
        cameraTargetPercentage = tubePerc.percent;
    }
});

// Create golden snitch REQUEST ACCESS button - ULTRA SIMPLE
var snitchGroup = new THREE.Group();

// White Trioll logo for snitch
console.log('Loading snitch logo from GitHub');
var snitchLogoTexture = new THREE.TextureLoader().load(
    'https://raw.githubusercontent.com/trioll/Trioll/78458b29ad3b63aae3eff39aae462c0ad4cc4d8b/Logo/Trioll_Logo_White.png',
    function(texture) {
        console.log('Snitch logo loaded successfully from GitHub');
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
    },
    undefined,
    function(error) {
        console.error('Error loading snitch logo:', error);
    }
);
var logoMaterial = new THREE.SpriteMaterial({
    map: snitchLogoTexture,
    color: 0xffffff, // White (no tint)
    transparent: true,
    opacity: 0.85,  // Slightly reduced opacity
    depthWrite: false,
    alphaTest: 0.01 // Hide any square edges
});
var snitchOrb = new THREE.Sprite(logoMaterial);
snitchOrb.scale.set(0.5, 0.5, 1); // Larger logo for better visibility
snitchOrb.position.set(0, 0, 0); // Perfectly centered
snitchGroup.add(snitchOrb);

// Add dragonfly-style transparent wings
var wingGroup = new THREE.Group();

// Create white wing material
var wingMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,  // White color
    transparent: true,
    opacity: 0.6,     // Semi-transparent white wings
    side: THREE.DoubleSide,
    depthWrite: false,
    emissive: 0xffffff,
    emissiveIntensity: 0.2
});

// Create elongated wings like the golden snitch
var wingShape = new THREE.Shape();
wingShape.moveTo(0, 0);
// Longer, more elegant wing shape
wingShape.bezierCurveTo(0.15, 0.02, 0.25, 0.015, 0.35, 0); // Elongated wing
wingShape.bezierCurveTo(0.25, -0.015, 0.15, -0.02, 0, 0);

var wingGeometry = new THREE.ShapeGeometry(wingShape);

// Left wing - more spread out like golden snitch
var leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
leftWing.position.set(-0.15, 0, 0); // Positioned at sides
leftWing.rotation.z = -0.3; // More horizontal spread
leftWing.rotation.x = -0.2; // Slight forward tilt
leftWing.scale.x = -1; // Flip to extend left
wingGroup.add(leftWing);

// Right wing - more spread out like golden snitch  
var rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
rightWing.position.set(0.15, 0, 0); // Positioned at sides
rightWing.rotation.z = 0.3; // More horizontal spread
rightWing.rotation.x = -0.2; // Slight forward tilt
wingGroup.add(rightWing);

// Golden snitch typically has just two wings, removed bottom wings

// Create motion blur wings (ghost wings that trail behind)
var blurWingMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false
});

// Add blur wings for each main wing
var leftBlur1 = new THREE.Mesh(wingGeometry, blurWingMaterial);
leftBlur1.position.copy(leftWing.position);
leftBlur1.rotation.copy(leftWing.rotation);
leftBlur1.scale.x = -1; // Match the flip
wingGroup.add(leftBlur1);

var leftBlur2 = new THREE.Mesh(wingGeometry, blurWingMaterial);
leftBlur2.position.copy(leftWing.position);
leftBlur2.rotation.copy(leftWing.rotation);
leftBlur2.scale.x = -1; // Match the flip
wingGroup.add(leftBlur2);

var rightBlur1 = new THREE.Mesh(wingGeometry, blurWingMaterial);
rightBlur1.position.copy(rightWing.position);
rightBlur1.rotation.copy(rightWing.rotation);
wingGroup.add(rightBlur1);

var rightBlur2 = new THREE.Mesh(wingGeometry, blurWingMaterial);
rightBlur2.position.copy(rightWing.position);
rightBlur2.rotation.copy(rightWing.rotation);
wingGroup.add(rightBlur2);

// Store blur wing references
window.snitchLeftBlur1 = leftBlur1;
window.snitchLeftBlur2 = leftBlur2;
window.snitchRightBlur1 = rightBlur1;
window.snitchRightBlur2 = rightBlur2;

snitchGroup.add(wingGroup);

// Store wing references for animation
window.snitchWings = wingGroup;
window.snitchLeftWing = leftWing;
window.snitchRightWing = rightWing;

// Add the snitch as a CHILD of the camera so it naturally follows
// Position it in front in camera's local space - centered
snitchGroup.position.set(0, 0, -2); // Centered in tunnel, 2 units in front
camera.add(snitchGroup); // ADD TO CAMERA, NOT SCENE

// Hide initially
snitchGroup.visible = false;

// REMOVED GLOW - NO SQUARES

// No REQUEST ACCESS text - just the logo with wings

// Log that snitch was created
console.log('Snitch created and added to scene');

// Scroll to top on page load/refresh
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
    // Also reset after a small delay to override any browser scroll restoration
    setTimeout(() => {
        window.scrollTo(0, 0);
        // Reset camera position as well
        if (typeof currentCameraPercentage !== 'undefined') {
            currentCameraPercentage = 0;
            cameraTargetPercentage = 0;
            tubePerc.percent = 0;
        }
    }, 100);
    
    // Complete loading progress
    updateLoadingProgress(10);
});

// Also try to scroll to top before page unload to prevent position saving
window.addEventListener('beforeunload', function() {
    window.scrollTo(0, 0);
});

// Add click handler for REQUEST ACCESS button and modal
document.addEventListener('DOMContentLoaded', function() {
    // Ensure we're at the top
    window.scrollTo(0, 0);
    
    var requestBtn = document.querySelector('.request-access-btn');
    var modal = document.getElementById('requestModal');
    var closeBtn = document.querySelector('.modal-close');
    var form = document.querySelector('.modal-form');
    
    // Open modal
    if (requestBtn) {
        requestBtn.addEventListener('click', function() {
            modal.classList.add('active');
        });
    }
    
    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }
    
    // Close modal on overlay click
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
    
    // Handle form submission
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            var userType = form.querySelector('.form-select').value;
            var email = form.querySelector('.form-input').value;
            var submitButton = form.querySelector('.form-submit');
            
            // Basic validation
            if (!userType || !email) {
                showFormError('Please fill in all fields');
                return;
            }
            
            // Email validation
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showFormError('Please enter a valid email address');
                return;
            }
            
            console.log('Form submitted:', {
                userType: userType,
                email: email
            });
            
            // Show loading state
            submitButton.innerHTML = '<span class="loading-dots">Submitting<span>.</span><span>.</span><span>.</span></span>';
            submitButton.disabled = true;
            
            // Submit to Google Sheets
            var googleScriptUrl = 'https://script.google.com/macros/s/AKfycbxfEZsvrtxV5wDnjqoRbw0sbJMkXesTMCHxZCrDyWCHyV881NDYaazUruF-uuRO-sOZ/exec';
            
            fetch(googleScriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userType: userType,
                    email: email,
                    timestamp: new Date().toISOString(),
                    source: 'request-access-button'
                })
            }).then(function() {
                console.log('Request Access form submitted to Google Sheets');
                // Show success state
                var modalContainer = document.querySelector('.modal-container');
                modalContainer.innerHTML = `
                    <div class="success-animation">
                        <div class="success-checkmark">
                            <div class="check-icon">
                                <span class="icon-line line-tip"></span>
                                <span class="icon-line line-long"></span>
                                <div class="icon-circle"></div>
                                <div class="icon-fix"></div>
                            </div>
                        </div>
                        <h2 class="success-title">Welcome to the Revolution!</h2>
                        <p class="success-message">We'll be in touch soon with your exclusive early access.</p>
                        <button class="success-close">Got it!</button>
                    </div>
                `;
                
                // Add close handler to success button
                document.querySelector('.success-close').addEventListener('click', function() {
                    modal.classList.remove('active');
                    // Reset form after modal closes
                    setTimeout(function() {
                        location.reload();
                    }, 500);
                });
            }).catch(function(error) {
                console.error('Error:', error);
                // Still show success since no-cors doesn't return response
                var modalContainer = document.querySelector('.modal-container');
                modalContainer.innerHTML = `
                    <div class="success-animation">
                        <div class="success-checkmark">
                            <div class="check-icon">
                                <span class="icon-line line-tip"></span>
                                <span class="icon-line line-long"></span>
                                <div class="icon-circle"></div>
                                <div class="icon-fix"></div>
                            </div>
                        </div>
                        <h2 class="success-title">Welcome to the Revolution!</h2>
                        <p class="success-message">We'll be in touch soon with your exclusive early access.</p>
                        <button class="success-close">Got it!</button>
                    </div>
                `;
                
                // Add close handler to success button
                document.querySelector('.success-close').addEventListener('click', function() {
                    modal.classList.remove('active');
                    // Reset form after modal closes
                    setTimeout(function() {
                        location.reload();
                    }, 500);
                });
            });
        });
        
        // Form error handler
        function showFormError(message) {
            var existingError = form.querySelector('.form-error');
            if (existingError) {
                existingError.remove();
            }
            
            var errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            errorDiv.textContent = message;
            form.insertBefore(errorDiv, form.querySelector('.form-submit'));
            
            // Remove error after 3 seconds
            setTimeout(function() {
                errorDiv.classList.add('fade-out');
                setTimeout(function() {
                    errorDiv.remove();
                }, 300);
            }, 3000);
        }
    }
    
    // Add ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
    
    // Add particle effects to feature cards
    var featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(function(card) {
        // Create particles container
        var particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles';
        card.appendChild(particlesContainer);
        
        // Create particles on hover
        card.addEventListener('mouseenter', function() {
            // Create 15 particles
            for (var i = 0; i < 15; i++) {
                setTimeout(function() {
                    var particle = document.createElement('div');
                    particle.className = 'particle';
                    
                    // Random position along bottom of card
                    var randomX = Math.random() * 100;
                    particle.style.left = randomX + '%';
                    particle.style.bottom = '0';
                    
                    // Random horizontal movement
                    particle.style.setProperty('--random-x', (Math.random() - 0.5) * 2);
                    
                    // Random animation delay
                    particle.style.animationDelay = Math.random() * 0.5 + 's';
                    
                    particlesContainer.appendChild(particle);
                    
                    // Remove particle after animation
                    setTimeout(function() {
                        particle.remove();
                    }, 3000);
                }, i * 100);
            }
        });
    });
    
    // Scroll reveal animations
    var scrollRevealElements = document.querySelectorAll('.scroll-reveal');
    var landingContent = document.querySelector('.landing-content');
    
    function checkScrollReveal() {
        scrollRevealElements.forEach(function(element) {
            var elementTop = element.getBoundingClientRect().top;
            var elementBottom = element.getBoundingClientRect().bottom;
            
            if (elementTop < window.innerHeight && elementBottom > 0) {
                landingContent.classList.add('visible');
            }
        });
    }
    
    // Check on load
    checkScrollReveal();
    
    // Check on scroll
    window.addEventListener('scroll', checkScrollReveal);
    
    // JOIN BETA Modal Handler
    var joinBetaBtn = document.getElementById('joinBetaBtn');
    var joinBetaModal = document.getElementById('joinBetaModal');
    var joinBetaClose = document.getElementById('joinBetaClose');
    var joinBetaForm = document.getElementById('joinBetaForm');
    
    // Platform Password Modal Handler
    var platformLink = document.getElementById('platformLink');
    var platformPasswordModal = document.getElementById('platformPasswordModal');
    var platformPasswordClose = document.getElementById('platformPasswordClose');
    var platformPasswordForm = document.getElementById('platformPasswordForm');
    var passwordError = document.getElementById('passwordError');
    
    // Open JOIN BETA modal
    if (joinBetaBtn) {
        joinBetaBtn.addEventListener('click', function() {
            joinBetaModal.classList.add('active');
            // Reset selection when opened from JOIN US button
            var selectElement = joinBetaForm.querySelector('.styled-select');
            if (selectElement) {
                selectElement.value = '';
            }
        });
    }
    
    // Close JOIN BETA modal
    if (joinBetaClose) {
        joinBetaClose.addEventListener('click', function() {
            joinBetaModal.classList.remove('active');
        });
    }
    
    // Close modal on overlay click
    if (joinBetaModal) {
        joinBetaModal.addEventListener('click', function(e) {
            if (e.target === joinBetaModal) {
                joinBetaModal.classList.remove('active');
            }
        });
    }
    
    // Handle JOIN BETA form submission
    if (joinBetaForm) {
        joinBetaForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            var userType = joinBetaForm.querySelector('.styled-select').value;
            var email = joinBetaForm.querySelector('.form-input').value;
            var submitButton = joinBetaForm.querySelector('.join-submit');
            
            // Basic validation
            if (!userType || !email) {
                showFormError('Please fill in all fields');
                return;
            }
            
            // Email validation
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showFormError('Please enter a valid email address');
                return;
            }
            
            console.log('JOIN BETA Form submitted:', {
                userType: userType,
                email: email
            });
            
            // Show loading state
            submitButton.innerHTML = '<span class="loading-dots">Submitting<span>.</span><span>.</span><span>.</span></span>';
            submitButton.disabled = true;
            
            // Submit to Google Sheets
            var googleScriptUrl = 'https://script.google.com/macros/s/AKfycbxfEZsvrtxV5wDnjqoRbw0sbJMkXesTMCHxZCrDyWCHyV881NDYaazUruF-uuRO-sOZ/exec';
            
            fetch(googleScriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userType: userType,
                    email: email,
                    timestamp: new Date().toISOString()
                })
            }).then(function() {
                console.log('Form submitted to Google Sheets');
                // Show success state
                var modalContainer = joinBetaModal.querySelector('.modal-container');
                modalContainer.innerHTML = `
                    <div class="success-animation">
                        <div class="success-checkmark">
                            <div class="check-icon">
                                <span class="icon-line line-tip"></span>
                                <span class="icon-line line-long"></span>
                                <div class="icon-circle"></div>
                                <div class="icon-fix"></div>
                            </div>
                        </div>
                        <h2 class="success-title">Welcome to the Revolution!</h2>
                        <p class="success-message">We'll be in touch soon with your exclusive early access.</p>
                        <button class="success-close">Got it!</button>
                    </div>
                `;
                
                // Add close handler to success button
                document.querySelector('.success-close').addEventListener('click', function() {
                    joinBetaModal.classList.remove('active');
                    // Reload to reset form
                    setTimeout(function() {
                        location.reload();
                    }, 500);
                });
            }).catch(function(error) {
                console.error('Error submitting form:', error);
                // Still show success since no-cors doesn't return response
                var modalContainer = joinBetaModal.querySelector('.modal-container');
                modalContainer.innerHTML = `
                    <div class="success-animation">
                        <div class="success-checkmark">
                            <div class="check-icon">
                                <span class="icon-line line-tip"></span>
                                <span class="icon-line line-long"></span>
                                <div class="icon-circle"></div>
                                <div class="icon-fix"></div>
                            </div>
                        </div>
                        <h2 class="success-title">Welcome to the Revolution!</h2>
                        <p class="success-message">We'll be in touch soon with your exclusive early access.</p>
                        <button class="success-close">Got it!</button>
                    </div>
                `;
                
                // Add close handler to success button
                document.querySelector('.success-close').addEventListener('click', function() {
                    joinBetaModal.classList.remove('active');
                    // Reload to reset form
                    setTimeout(function() {
                        location.reload();
                    }, 500);
                });
            });
        });
    }
    
    // Navigation Link Handlers
    var developersLink = document.getElementById('developersLink');
    var gamersLink = document.getElementById('gamersLink');
    
    // Open JOIN US modal with pre-selected option for Developers
    if (developersLink) {
        developersLink.addEventListener('click', function(e) {
            e.preventDefault();
            joinBetaModal.classList.add('active');
            // Pre-select developer option
            var selectElement = joinBetaForm.querySelector('.styled-select');
            if (selectElement) {
                selectElement.value = 'developer';
            }
        });
    }
    
    // Open JOIN US modal with pre-selected option for Gamers
    if (gamersLink) {
        gamersLink.addEventListener('click', function(e) {
            e.preventDefault();
            joinBetaModal.classList.add('active');
            // Pre-select gamer option
            var selectElement = joinBetaForm.querySelector('.styled-select');
            if (selectElement) {
                selectElement.value = 'gamer';
            }
        });
    }
    
    // Platform Modal Handlers
    
    // Open Platform Password modal
    if (platformLink) {
        platformLink.addEventListener('click', function(e) {
            e.preventDefault();
            platformPasswordModal.classList.add('active');
        });
    }
    
    // Close Platform Password modal
    if (platformPasswordClose) {
        platformPasswordClose.addEventListener('click', function() {
            platformPasswordModal.classList.remove('active');
            passwordError.style.display = 'none';
            platformPasswordForm.reset();
        });
    }
    
    // Close modal on overlay click
    if (platformPasswordModal) {
        platformPasswordModal.addEventListener('click', function(e) {
            if (e.target === platformPasswordModal) {
                platformPasswordModal.classList.remove('active');
                passwordError.style.display = 'none';
                platformPasswordForm.reset();
            }
        });
    }
    
    // Handle Platform Password form submission
    if (platformPasswordForm) {
        platformPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            var password = document.getElementById('platformPassword').value;
            var submitButton = platformPasswordForm.querySelector('.platform-submit');
            
            // Hide any previous error
            passwordError.style.display = 'none';
            
            // Check password (you can change this password)
            var correctPassword = 'trioll2025'; // Change this to your desired password
            
            if (password === correctPassword) {
                // Success - redirect to platform
                submitButton.innerHTML = 'ACCESS GRANTED...';
                submitButton.disabled = true;
                
                // Simulate redirect after 1.5 seconds
                setTimeout(function() {
                    // Replace with your actual platform URL
                    window.location.href = 'https://platform.trioll.com';
                    // For now, just close the modal and show alert
                    alert('Platform access granted! (In production, this would redirect to the platform)');
                    platformPasswordModal.classList.remove('active');
                    platformPasswordForm.reset();
                    submitButton.innerHTML = 'ACCESS PLATFORM';
                    submitButton.disabled = false;
                }, 1500);
            } else {
                // Error - wrong password
                passwordError.style.display = 'block';
                
                // Reset button after error
                setTimeout(function() {
                    passwordError.style.display = 'none';
                }, 3000);
            }
        });
    }
});

// Removed aggressive scene traversal - was hiding portal elements

// Add point light to snitch
var snitchLight = new THREE.PointLight(0xffb347, 0.7, 2.5);
snitchGroup.add(snitchLight);

// Hitbox removed - no longer needed

// Snitch is now a child of camera, no complex positioning needed

// Particle system
var spikeyTexture = new THREE.TextureLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/68819/spikey.png');

var particleCount = 6800;
var positions1 = new Float32Array(particleCount * 3);
var positions2 = new Float32Array(particleCount * 3);
var positions3 = new Float32Array(particleCount * 3);

// Create particles for system 1
for (var p = 0; p < particleCount; p++) {
    positions1[p * 3] = Math.random() * 500 - 250;
    positions1[p * 3 + 1] = Math.random() * 50 - 25;
    positions1[p * 3 + 2] = Math.random() * 500 - 250;
}

// Create particles for system 2
for (var p = 0; p < particleCount; p++) {
    positions2[p * 3] = Math.random() * 500;
    positions2[p * 3 + 1] = Math.random() * 10 - 5;
    positions2[p * 3 + 2] = Math.random() * 500;
}

// Create particles for system 3
for (var p = 0; p < particleCount; p++) {
    positions3[p * 3] = Math.random() * 500;
    positions3[p * 3 + 1] = Math.random() * 10 - 5;
    positions3[p * 3 + 2] = Math.random() * 500;
}


var particles1 = new THREE.BufferGeometry();
particles1.setAttribute('position', new THREE.BufferAttribute(positions1, 3));

var particles2 = new THREE.BufferGeometry();
particles2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));

var particles3 = new THREE.BufferGeometry();
particles3.setAttribute('position', new THREE.BufferAttribute(positions3, 3));

var pMaterial = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: .5,
    map: spikeyTexture,
    transparent: true,
    blending: THREE.AdditiveBlending
});


// Create the particle systems
var particleSystem1 = new THREE.Points(particles1, pMaterial);
var particleSystem2 = new THREE.Points(particles2, pMaterial);
var particleSystem3 = new THREE.Points(particles3, pMaterial);

// Add to scene
scene.add(particleSystem1);
scene.add(particleSystem2);
scene.add(particleSystem3);

// Create warp speed effect
function createWarpSpeedEffect() {
    if (window.warpLines) return; // Already created
    
    var warpLineCount = 500;
    var warpPositions = new Float32Array(warpLineCount * 6); // Start and end points
    
    for (var i = 0; i < warpLineCount; i++) {
        var angle = Math.random() * Math.PI * 2;
        var radius = Math.random() * 50 + 10;
        
        // Start point (near camera)
        warpPositions[i * 6] = camera.position.x - 10;
        warpPositions[i * 6 + 1] = Math.sin(angle) * radius;
        warpPositions[i * 6 + 2] = Math.cos(angle) * radius + camera.position.z;
        
        // End point (far ahead)
        warpPositions[i * 6 + 3] = camera.position.x + 100;
        warpPositions[i * 6 + 4] = Math.sin(angle) * radius * 0.1;
        warpPositions[i * 6 + 5] = Math.cos(angle) * radius * 0.1 + camera.position.z;
    }
    
    var warpGeometry = new THREE.BufferGeometry();
    warpGeometry.setAttribute('position', new THREE.BufferAttribute(warpPositions, 3));
    
    var warpMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uSpeed: { value: 2.0 },
            uTime: { value: 0.0 }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uSpeed;
            varying float vAlpha;
            
            void main() {
                vec3 pos = position;
                float lineProgress = mod(uTime * uSpeed + float(gl_VertexID), 2.0);
                pos.x -= lineProgress * 50.0;
                
                vAlpha = 1.0 - lineProgress * 0.5;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying float vAlpha;
            
            void main() {
                gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * 0.8);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        linewidth: 2,
        depthWrite: false
    });
    
    warpMaterial.opacity = 0.3;
    
    window.warpLines = new THREE.LineSegments(warpGeometry, warpMaterial);
    scene.add(window.warpLines);
}

// Removed space stars that were causing blotchy light effects

// Track scroll velocity
let lastScrollTime = Date.now();
let lastScrollPos = 0;
let scrollVelocity = 0;
let targetScrollVelocity = 0;
let scrollDirection = 0; // -1 for backward, 0 for stopped, 1 for forward

function render() {
    // Calculate scroll velocity and direction
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastScrollTime) / 1000;
    const scrollDelta = cameraTargetPercentage - lastScrollPos;
    
    if (deltaTime > 0) {
        // Track direction
        if (Math.abs(scrollDelta) > 0.001) {
            scrollDirection = scrollDelta > 0 ? 1 : -1;
        } else {
            scrollDirection = 0;
        }
        
        targetScrollVelocity = Math.abs(scrollDelta / deltaTime) * 10;
        targetScrollVelocity = Math.min(targetScrollVelocity, 50); // Cap max velocity
    }
    
    // Smooth velocity changes
    scrollVelocity += (targetScrollVelocity - scrollVelocity) * 0.1;
    
    // Decay velocity when not scrolling
    if (Math.abs(scrollDelta) < 0.001) {
        targetScrollVelocity *= 0.95;
    }
    
    lastScrollTime = currentTime;
    lastScrollPos = cameraTargetPercentage;
    
    // Handle warp space state - SIMPLE
    if (window.inWarpSpace && cameraTargetPercentage <= 1.2) {
        exitWarpSpace();
    }
    
    // Direct mapping without acceleration to ensure we reach proper percentages
    currentCameraPercentage = cameraTargetPercentage;
    
    // Smooth fog transition based on position - later transition
    if (cameraTargetPercentage <= 1.15) {
        // Stay in tunnel/void longer - normal blue fog
        scene.fog.color.setRGB(0.098, 0.278, 0.58);
        scene.fog.near = 0;
        scene.fog.far = 100;
    } else {
        // Transition to black fog after traveling in void
        const fadeProgress = Math.min((cameraTargetPercentage - 1.15) / 0.05, 1.0); // 1.15 to 1.2
        scene.fog.color.setRGB(
            0.098 * (1 - fadeProgress),
            0.278 * (1 - fadeProgress), 
            0.58 * (1 - fadeProgress)
        );
        scene.fog.near = fadeProgress * 100;
        scene.fog.far = 100 + fadeProgress * 400;
    }
    
    // Debug logging
    if (cameraTargetPercentage > 0.90) {
        console.log('Camera percentage:', cameraTargetPercentage.toFixed(2));
    }
    
    // Trigger white transition at end of tunnel (adjusted for shorter scroll)
    if (cameraTargetPercentage >= 0.85 && !window.whiteTransitionTriggered) {
        window.whiteTransitionTriggered = true;
        console.log('WHITE TRANSITION TRIGGERED at:', cameraTargetPercentage);
        
        // Show white transition
        const whiteTransition = document.getElementById('whiteTransition');
        if (whiteTransition) {
            console.log('Starting white ripple transition');
            whiteTransition.classList.add('active');
            
            // Start showing landing page while white is still visible for smooth transition
            setTimeout(function() {
                console.log('Preparing landing page during white transition');
                const landingPage = document.getElementById('landingPage');
                if (landingPage) {
                    // Pre-activate landing page but keep it invisible
                    landingPage.style.opacity = '0';
                    landingPage.classList.add('active');
                    
                    // Initialize starfield early
                    if (typeof initStarfield === 'function') {
                        initStarfield(false);
                    }
                    
                    // Fade in landing page as white fades out
                    setTimeout(function() {
                        landingPage.style.transition = 'opacity 1s ease';
                        landingPage.style.opacity = '1';
                        
                        // Start fading out white transition
                        setTimeout(function() {
                            whiteTransition.style.transition = 'opacity 0.8s ease';
                            whiteTransition.style.opacity = '0';
                        }, 200);
                        
                        // Clean up after transitions complete
                        setTimeout(function() {
                            whiteTransition.classList.remove('active');
                            whiteTransition.style = ''; // Reset all inline styles
                            
                            // Hide 3D scene elements
                            const experience = document.querySelector('.experience');
                            const scrollTarget = document.querySelector('.scrollTarget');
                            if (experience) experience.style.display = 'none';
                            if (scrollTarget) scrollTarget.style.display = 'none';
                            
                            console.log('Transition to landing page complete');
                        }, 1000);
                    }, 500);
                } else {
                    console.error('Landing page element not found!');
                }
            }, 1500); // Start landing page prep midway through ripple
        } else {
            console.error('White transition element not found!');
        }
    }
    
    // Warp space effect (optional, after white transition)
    if (cameraTargetPercentage > 1.2 && !window.inWarpSpace) {
        window.inWarpSpace = true;
        // initUnifiedWarp(); // Commented out as we're using white transition instead
    }
    
    // Normal camera movement - just follow the path
    camera.rotation.y += (cameraRotationProxyX - camera.rotation.y) / 15;
    camera.rotation.x += (cameraRotationProxyY - camera.rotation.x) / 15;
    updateCameraPercentage(currentCameraPercentage);
    
    // Update matrix rain effect - continue through entire experience including space
    updateMatrixRain();
    
    // Animate the text ring if it exists
    if (window.textRingMesh && window.textRingGroup && window.textRingGroup.visible) {
        // Rotate the SVG ring mesh continuously
        window.textRingMesh.rotation.z -= (window.textRingSpeed || 0.005); // Reversed to clockwise
    }
    
    // End sphere animation removed
    
    // Snitch behavior based on position in tunnel
    var time = Date.now() * 0.001;
    var tempVec3 = new THREE.Vector3(); // For world position calculations
    
    // Always keep snitch visible and animated
    if (currentCameraPercentage > 0.05 && currentCameraPercentage < 1.15) {
        // Normal behavior throughout entire experience
        snitchGroup.visible = true;
        
        // Check if snitch is grabbed
        if (snitchGrabbed) {
            // Follow mouse with struggle (in camera space since snitch is child of camera)
            var grabTargetX = mouseX * 1.2;
            var grabTargetY = mouseY * 0.8;
            // Z in camera space - negative means in front of camera
            var grabTargetZ = -2.5 - mouseY * 0.8;  // Mouse up = further forward
            
            // Add subtle vibration/wiggle near cursor - very contained
            var struggleX = Math.sin(time * 18) * 0.012 + Math.cos(time * 32) * 0.008;
            var struggleY = Math.cos(time * 20) * 0.01 + Math.sin(time * 35) * 0.006;
            var struggleZ = Math.sin(time * 15) * 0.008;
            
            grabTargetX += struggleX;
            grabTargetY += struggleY;
            grabTargetZ += struggleZ;
            
            // Apply tunnel boundaries (inner wireframe is 3.4 radius)
            var tunnelInnerRadius = 3.2; // Stay inside wireframe
            var distFromCenter = Math.sqrt(grabTargetX * grabTargetX + grabTargetY * grabTargetY);
            if (distFromCenter > tunnelInnerRadius) {
                var scale = tunnelInnerRadius / distFromCenter;
                grabTargetX *= scale;
                grabTargetY *= scale;
            }
            
            // Constrain Z in camera space (negative = in front)
            // Allow deeper reach when grabbing
            grabTargetZ = Math.max(-6.0, Math.min(-0.5, grabTargetZ));
            
            // Track mouse velocity for throwing
            var currentMousePos = new THREE.Vector3(grabTargetX, grabTargetY, grabTargetZ);
            mouseVelocity.subVectors(currentMousePos, lastMousePos);
            lastMousePos.copy(currentMousePos);
            
            // Fast lerp when grabbed
            snitchGroup.position.x += (grabTargetX - snitchGroup.position.x) * 0.3;
            snitchGroup.position.y += (grabTargetY - snitchGroup.position.y) * 0.3;
            snitchGroup.position.z += (grabTargetZ - snitchGroup.position.z) * 0.25;
        } else if (snitchVelocity.length() > 0.01 || window.snitchThrownPhysics) {
            // Low gravity portal physics when thrown
            window.snitchThrownPhysics = true;
            
            // Apply velocity
            snitchGroup.position.add(snitchVelocity);
            
            // Portal physics - very low gravity, minimal drag
            snitchVelocity.x *= 0.995;  // Almost no side drag in portal
            snitchVelocity.y *= 0.998;  // Very low vertical drag
            snitchVelocity.z *= 0.997;  // Minimal forward drag - portal pull
            
            // Ultra-low gravity in portal
            snitchVelocity.y -= 0.001;  // Almost weightless
            
            // Portal energy field creates gentle swirl
            snitchVelocity.x += Math.sin(time * 1.5) * 0.001;
            snitchVelocity.y += Math.cos(time * 1.8) * 0.0008;
            
            // Bounce off tunnel walls (inner wireframe radius is 3.4)
            var tunnelInnerRadius = 3.0; // Bounce before hitting wireframe
            var distFromCenter = Math.sqrt(snitchGroup.position.x * snitchGroup.position.x + 
                                          snitchGroup.position.y * snitchGroup.position.y);
            if (distFromCenter > tunnelInnerRadius) {
                // Calculate bounce with proper physics
                var normal = new THREE.Vector3(snitchGroup.position.x, snitchGroup.position.y, 0).normalize();
                var dot = snitchVelocity.dot(normal);
                
                if (dot > 0) {  // Only bounce if moving toward wall
                    // Gentle bounce off walls
                    snitchVelocity.sub(normal.multiplyScalar(2 * dot));
                    
                    // Gentle energy retention for floating effect
                    snitchVelocity.multiplyScalar(0.8);
                    
                    // Add slight inward spiral after bounce
                    snitchVelocity.z -= 0.02;  // Continue forward
                }
                
                // Push back inside
                var pushBack = (tunnelInnerRadius - 0.1) / distFromCenter;
                snitchGroup.position.x *= pushBack;
                snitchGroup.position.y *= pushBack;
            }
            
            // No ground collision in low gravity - snitch can float anywhere in tunnel
            
            // Z boundaries - trigger return when reaching portal depth
            if (snitchGroup.position.z < -8.0) {
                // Reached portal depth - begin powered return
                window.snitchReturning = true;
                window.snitchThrownPhysics = false;
                // Don't stop velocity - let it transition smoothly
            } else if (snitchGroup.position.z > 0.5) {
                // Don't let it go behind camera
                snitchGroup.position.z = 0.5;
                snitchVelocity.z = Math.min(0, snitchVelocity.z);
            }
            
            // Check if we should start returning (low velocity or triggered)
            if ((snitchVelocity.length() < 0.05 && window.snitchThrownPhysics) || window.snitchReturning) {
                window.snitchReturning = true;
                window.snitchThrownPhysics = false;
                
                var targetZ = -2.2; // Normal dance Z position
                var targetX = 0;
                var targetY = -0.1;
                
                // Powered flight back - snitch flies itself
                if (Math.abs(snitchGroup.position.z - targetZ) > 0.3 || 
                    Math.abs(snitchGroup.position.x - targetX) > 0.3 ||
                    Math.abs(snitchGroup.position.y - targetY) > 0.3) {
                    
                    // Calculate return vector
                    var returnDir = new THREE.Vector3(
                        targetX - snitchGroup.position.x,
                        targetY - snitchGroup.position.y,
                        targetZ - snitchGroup.position.z
                    );
                    
                    // Accelerating return flight
                    var distance = returnDir.length();
                    returnDir.normalize();
                    
                    // Speed based on distance - faster when far
                    var returnSpeed = Math.min(0.15, distance * 0.02 + 0.03);
                    
                    // Apply return velocity
                    snitchVelocity.x = returnDir.x * returnSpeed;
                    snitchVelocity.y = returnDir.y * returnSpeed;
                    snitchVelocity.z = returnDir.z * returnSpeed;
                    
                    // Add swooping motion during return
                    snitchGroup.position.x += Math.sin(time * 4) * 0.02;
                    snitchGroup.position.y += Math.cos(time * 5) * 0.015;
                } else {
                    // Arrived back at dance position
                    window.snitchReturning = false;
                    snitchVelocity.set(0, 0, 0);
                    window.snitchSpinX = 0;
                    window.snitchSpinY = 0;
                    window.snitchSpinZ = 0;
                }
            }
        } else {
            // Normal dancing movement when not grabbed - constrained to center
            var danceRadius = 0.3;  // Reduced from 0.7 to keep closer to center
            var verticalFloat = 0.2; // Reduced from 0.4
            var depthSwoop = 0.3;    // Reduced from 0.5
            
            var primarySwoop = Math.sin(time * 1.2) * danceRadius;
            var secondaryWeave = Math.sin(time * 2.8) * 0.2;
            var tertiaryDrift = Math.sin(time * 0.4) * 0.15;
            var baseX = primarySwoop + secondaryWeave + tertiaryDrift;
            
            var verticalSwoop = Math.sin(time * 1.5) * verticalFloat;
            var quickBob = Math.sin(time * 4.5) * 0.08;
            var baseY = -0.1 + verticalSwoop + quickBob;
            
            var depthPhase = time * 1.8;
            var primaryDepth = Math.sin(depthPhase) * depthSwoop;
            var quickDarts = Math.sin(time * 3.2) * 0.15;
            var baseZ = -2.2 + primaryDepth + quickDarts;
            
            var cursorInfluence = 0.15;
            var cursorX = mouseX * cursorInfluence;
            var cursorY = mouseY * cursorInfluence;
            
            if (!window.snitchTargetX) {
                window.snitchTargetX = baseX;
                window.snitchTargetY = baseY;
            }
            
            window.snitchTargetX = baseX + cursorX * 0.3;  // Reduced from 0.8 to keep centered
            window.snitchTargetY = baseY + cursorY * 0.3;  // Reduced from 0.6 to keep centered
            window.snitchTargetZ = baseZ + mouseY * 0.05; // Reduced from 0.1
            
            snitchGroup.position.x += (window.snitchTargetX - snitchGroup.position.x) * 0.12;
            snitchGroup.position.y += (window.snitchTargetY - snitchGroup.position.y) * 0.12;
            snitchGroup.position.z += (window.snitchTargetZ - snitchGroup.position.z) * 0.15;
        }
        
        // Check if cursor is near snitch for hover effect
        var snitchScreenPos = snitchGroup.position.clone();
        snitchScreenPos.project(camera);
        var cursorDist = Math.sqrt(Math.pow(mouseX - snitchScreenPos.x, 2) + Math.pow(mouseY - snitchScreenPos.y, 2));
        var isNearSnitch = cursorDist < 0.3;
        
        // Enhanced glow when grabbable or grabbed
        if (snitchGrabbed) {
            var scale = 0.3 + Math.sin(time * 10) * 0.05; // Bigger and faster pulse when grabbed
            snitchOrb.scale.set(scale, scale, 1);
            snitchOrb.material.opacity = 0.9;
            // Cursor is already set to 'grabbing' in onMouseDown
        } else if (isNearSnitch) {
            var scale = 0.27 + Math.sin(time * 5) * 0.03; // Slight grow when hoverable
            snitchOrb.scale.set(scale, scale, 1);
            if (document.body.style.cursor !== 'grabbing') {
                document.body.style.cursor = 'grab';
            }
        } else {
            var scale = 0.25 + Math.sin(time * 3) * 0.02 + Math.sin(time * 7) * 0.01;
            snitchOrb.scale.set(scale, scale, 1);
            if (document.body.style.cursor === 'grab' || document.body.style.cursor === 'grabbing') {
                document.body.style.cursor = 'default';
            }
        }
        
        // Smoother fairy wing animation with movement response
        if (window.snitchWings) {
            // Calculate movement speed for responsive wing beats
            if (!window.lastSnitchPos) window.lastSnitchPos = snitchGroup.position.clone();
            var moveSpeed = window.lastSnitchPos.distanceTo(snitchGroup.position) * 50;
            window.lastSnitchPos.copy(snitchGroup.position);
            
            // Different wing patterns based on state
            if (window.snitchReturning) {
                // Strong flapping when returning
                var returnFlap = Math.sin(time * 25) * 0.4;
                var powerStroke = Math.sin(time * 12) * 0.2;
                var topWingMotion = returnFlap + powerStroke;
                var bottomWingMotion = returnFlap * 0.8 + powerStroke * 0.6;
            } else if (snitchGrabbed) {
                // Frantic escape flutter when grabbed
                var panicFlutter = Math.sin(time * 55) * 0.4; // Even faster panic
                var struggleWave = Math.sin(time * 70) * 0.2;
                var escapeAttempt = Math.sin(time * 8) * 0.15;
                
                var topWingMotion = panicFlutter + struggleWave + escapeAttempt;
                var bottomWingMotion = panicFlutter * 0.8 + struggleWave * 0.6 - escapeAttempt * 0.5;
            } else if (snitchVelocity.length() > 0.01) {
                // Stabilization flutter when thrown
                var recoveryFlap = Math.sin(time * 30) * 0.3 * snitchVelocity.length();
                var stabilize = Math.sin(time * 50) * 0.15;
                var tumble = Math.cos(time * 20) * 0.1 * snitchVelocity.length();
                
                var topWingMotion = recoveryFlap + stabilize + tumble;
                var bottomWingMotion = recoveryFlap * 0.7 - stabilize * 0.5 + tumble;
            } else {
                // Normal dynamic patterns when free
                var primaryFlutter = Math.sin(time * 22) * 0.25;
                var powerBeat = Math.sin(time * 40) * 0.12 * (1 + moveSpeed);
                var swoopSync = Math.sin(time * 1.8) * 0.08;
                var responsiveFlutter = moveSpeed * 0.8;
                
                var topWingMotion = primaryFlutter + powerBeat + swoopSync + responsiveFlutter;
                var bottomWingMotion = primaryFlutter * 0.7 + powerBeat * 0.5 + swoopSync * 1.2;
            }
            
            // Smooth application with cursor influence
            var cursorWingInfluence = mouseX * 0.05; // Wings tilt slightly toward cursor
            
            window.snitchLeftWing.rotation.z = -0.3 + topWingMotion + cursorWingInfluence;
            window.snitchRightWing.rotation.z = 0.3 - topWingMotion + cursorWingInfluence;
            
            // Motion blur wings - smooth fairy dust trail
            if (window.snitchLeftBlur1) {
                // Smooth lagged motion for ethereal blur
                var laggedPrimary1 = Math.sin((time - 0.05) * 18) * 0.2;
                var laggedPrimary2 = Math.sin((time - 0.1) * 18) * 0.2;
                
                window.snitchLeftBlur1.rotation.z = -0.3 + laggedPrimary1;
                window.snitchLeftBlur2.rotation.z = -0.3 + laggedPrimary2;
                window.snitchRightBlur1.rotation.z = 0.3 - laggedPrimary1;
                window.snitchRightBlur2.rotation.z = 0.3 - laggedPrimary2;
                
                // Smooth fairy dust based on movement
                var baseOpacity = 0.04 + moveSpeed * 0.2;
                var shimmer = Math.sin(time * 5) * 0.02;
                window.snitchLeftBlur1.material.opacity = Math.min(0.15, baseOpacity + shimmer);
                window.snitchLeftBlur2.material.opacity = Math.min(0.1, baseOpacity * 0.5);
                window.snitchRightBlur1.material.opacity = Math.min(0.15, baseOpacity + shimmer);
                window.snitchRightBlur2.material.opacity = Math.min(0.1, baseOpacity * 0.5);
            }
            
            // Dynamic tilting based on state
            if (snitchVelocity.length() > 0.01) {
                // Spinning tumble when thrown
                if (window.snitchSpinX) {
                    window.snitchWings.rotation.x += window.snitchSpinX;
                    window.snitchWings.rotation.y += window.snitchSpinY;
                    window.snitchWings.rotation.z += window.snitchSpinZ;
                    
                    // Gradually slow spinning
                    window.snitchSpinX *= 0.98;
                    window.snitchSpinY *= 0.98;
                    window.snitchSpinZ *= 0.98;
                }
            } else if (snitchGrabbed) {
                // Struggle rotation when grabbed
                window.snitchWings.rotation.x = Math.sin(time * 12) * 0.2;
                window.snitchWings.rotation.y = Math.cos(time * 15) * 0.15;
                window.snitchWings.rotation.z = Math.sin(time * 18) * 0.25;
            } else {
                // Normal swooping tilts
                var depthTilt = Math.sin(time * 1.8) * 0.15;
                var sideTilt = Math.sin(time * 1.2) * 0.1;
                window.snitchWings.rotation.x = depthTilt + mouseY * 0.05;
                window.snitchWings.rotation.y = sideTilt + mouseX * 0.08;
                window.snitchWings.rotation.z = Math.sin(time * 2.5) * 0.05;
            }
            
        }
        
    } 
    // Remove the else clause entirely - snitch stays active
    if (false) { // Sphere orbiting behavior disabled
        // At the end - fly out to and orbit around the TRIOLL/Logo sphere
        snitchGroup.visible = true;
        
        // Smoothly detach from camera and add to scene if not already done
        if (snitchGroup.parent === camera) {
            // Initialize detachment transition
            if (!window.snitchDetachmentTime) {
                window.snitchDetachmentTime = time;
                window.snitchDetaching = true;
                // Calculate world position where snitch currently is
                snitchGroup.getWorldPosition(tempVec3);
                window.snitchDetachStartPos = tempVec3.clone();
            }
        }
        
        // Handle smooth detachment transition
        if (window.snitchDetaching && snitchGroup.parent === camera) {
            var detachProgress = Math.min(1, (time - window.snitchDetachmentTime) / 0.3);
            
            // Gradually move away from camera before detaching
            var currentLocalPos = snitchGroup.position.clone();
            currentLocalPos.z = -2 - detachProgress * 2; // Move forward gradually
            snitchGroup.position.copy(currentLocalPos);
            
            // Complete detachment
            if (detachProgress >= 1) {
                // Get world position before detaching
                snitchGroup.getWorldPosition(tempVec3);
                camera.remove(snitchGroup);
                scene.add(snitchGroup);
                snitchGroup.position.copy(tempVec3); // Maintain exact world position
                
                // Store transition start time and position for flight to sphere
                window.snitchTransitionTime = time;
                window.snitchStartPos = snitchGroup.position.clone();
                window.snitchPathPoints = []; // Initialize path recording
                window.snitchDetaching = false;
                window.snitchDetachmentTime = null;
            }
        }
        
        // Only proceed with flight/orbit if not detaching
        if (!window.snitchDetaching && snitchGroup.parent === scene) {
            // Get sphere position (the end logo/planet position)
            var spherePos = window.endLogoGroup.position.clone();
            
            // Smooth transition from camera to sphere (over 1.5 seconds)
            var transitionProgress = window.snitchTransitionTime ? Math.min(1, (time - window.snitchTransitionTime) / 1.5) : 0;
            
            if (transitionProgress < 1) {
                // Flying out to sphere with smooth curve
                var targetOrbitPos = new THREE.Vector3(
                    spherePos.x + Math.cos(time * 2) * 3,
                    spherePos.y + Math.sin(time * 4) * 0.5,
                    spherePos.z + Math.sin(time * 2) * 3
                );
                
                // Use stored start position for smooth transition
                if (window.snitchStartPos) {
                    snitchGroup.position.lerpVectors(window.snitchStartPos, targetOrbitPos, transitionProgress);
                    
                    // Record path points during outbound journey
                    if (window.snitchPathPoints.length < 100) { // Limit to 100 points
                        window.snitchPathPoints.push(snitchGroup.position.clone());
                    }
                }
                
                // Continue fairy wing animation during flight - excited flutter
                if (window.snitchWings) {
                    var flightPrimary = Math.sin(time * 35) * 0.3; // Faster, bigger flaps
                    var flightRapid = Math.sin(time * 65) * 0.12;
                    var flightPanic = Math.sin(time * 90) * 0.05; // Very rapid tiny beats
                    
                    var flightWingMotion = flightPrimary + flightRapid + flightPanic;
                    
                    window.snitchLeftWing.rotation.z = -0.3 + flightWingMotion;
                    window.snitchRightWing.rotation.z = 0.3 - flightWingMotion;
                    
                    // Motion blur during flight
                    if (window.snitchLeftBlur1) {
                        var laggedFlap1 = Math.sin((time - 0.03) * 25) * 0.2;
                        var laggedFlap2 = Math.sin((time - 0.06) * 25) * 0.2;
                        
                        window.snitchLeftBlur1.rotation.z = -0.3 + laggedFlap1;
                        window.snitchLeftBlur2.rotation.z = -0.3 + laggedFlap2;
                        window.snitchRightBlur1.rotation.z = 0.3 - laggedFlap1;
                        window.snitchRightBlur2.rotation.z = 0.3 - laggedFlap2;
                        
                        // Moderate blur during flight
                        window.snitchLeftBlur1.material.opacity = 0.12;
                        window.snitchLeftBlur2.material.opacity = 0.06;
                        window.snitchRightBlur1.material.opacity = 0.12;
                        window.snitchRightBlur2.material.opacity = 0.06;
                    }
                }
            } else {
                // Orbiting around the sphere with TRIOLL and logo
                var orbitRadius = 3 + Math.sin(time * 0.5) * 0.5; // Varying orbit distance
                var orbitSpeed = time * 2.5;
                
                // Calculate new orbit position
                var newOrbitX = spherePos.x + Math.cos(orbitSpeed) * orbitRadius;
                var newOrbitY = spherePos.y + Math.sin(orbitSpeed * 2) * 1.5; // Vertical orbit
                var newOrbitZ = spherePos.z + Math.sin(orbitSpeed) * orbitRadius;
                
                // Add spiraling motion
                var spiral = time * 0.3;
                newOrbitY += Math.cos(spiral) * 0.5;
                
                // Smoothly lerp to new position to prevent any jumps
                var targetOrbitPos = new THREE.Vector3(newOrbitX, newOrbitY, newOrbitZ);
                snitchGroup.position.lerp(targetOrbitPos, 0.1); // Smooth lerp to orbit position
            }
            
            // Always look at sphere center
            snitchGroup.lookAt(spherePos);
        }
        
        // Excited pulsing at the end for logo
        var endScale = 0.3 + Math.sin(time * 8) * 0.06; // Bigger logo with excited pulse
        snitchOrb.scale.set(endScale, endScale, 1);
        
        // No rotation needed for sprite - it always faces camera
        
    } else if (currentCameraPercentage < 0.1) {
        // Very beginning - hidden
        snitchGroup.visible = false;
    }
    
    // If snitch was removed from camera but we're back in tunnel, follow path back
    if (currentCameraPercentage < 0.88 && snitchGroup.parent !== camera) {
        // Initialize return journey
        if (!window.snitchReturnTime) {
            window.snitchReturnTime = time;
            window.snitchReturnProgress = 0;
            // Reverse the path points for return journey
            if (window.snitchPathPoints && window.snitchPathPoints.length > 0) {
                window.snitchReturnPath = window.snitchPathPoints.slice().reverse();
            }
        }
        
        // Animate return journey along recorded path
        var returnDuration = 1.5; // Same duration as outbound
        window.snitchReturnProgress = Math.min(1, (time - window.snitchReturnTime) / returnDuration);
        
        if (window.snitchReturnPath && window.snitchReturnPath.length > 0 && window.snitchReturnProgress < 1) {
            // Calculate which point we should be at
            var pathIndex = Math.floor(window.snitchReturnProgress * (window.snitchReturnPath.length - 1));
            pathIndex = Math.min(pathIndex, window.snitchReturnPath.length - 1);
            
            // Interpolate between points for smooth movement
            if (pathIndex < window.snitchReturnPath.length - 1) {
                var localProgress = (window.snitchReturnProgress * (window.snitchReturnPath.length - 1)) - pathIndex;
                snitchGroup.position.lerpVectors(
                    window.snitchReturnPath[pathIndex],
                    window.snitchReturnPath[pathIndex + 1],
                    localProgress
                );
            } else {
                snitchGroup.position.copy(window.snitchReturnPath[pathIndex]);
            }
            
            // Wing animation during return flight - faster
            if (window.snitchWings) {
                var wingFlap = Math.sin(time * 40) * 0.25; // Matching faster flight
                var secondaryFlap = Math.sin(time * 60) * 0.1;
                window.snitchLeftWing.rotation.z = -0.3 + wingFlap + secondaryFlap;
                window.snitchRightWing.rotation.z = 0.3 - wingFlap - secondaryFlap;
                
                // Motion blur during return
                if (window.snitchLeftBlur1) {
                    var laggedFlap1 = Math.sin((time - 0.03) * 25) * 0.2;
                    var laggedFlap2 = Math.sin((time - 0.06) * 25) * 0.2;
                    
                    window.snitchLeftBlur1.rotation.z = -0.3 + laggedFlap1;
                    window.snitchLeftBlur2.rotation.z = -0.3 + laggedFlap2;
                    window.snitchRightBlur1.rotation.z = 0.3 - laggedFlap1;
                    window.snitchRightBlur2.rotation.z = 0.3 - laggedFlap2;
                    
                    // Moderate blur during return
                    window.snitchLeftBlur1.material.opacity = 0.12;
                    window.snitchLeftBlur2.material.opacity = 0.06;
                    window.snitchRightBlur1.material.opacity = 0.12;
                    window.snitchRightBlur2.material.opacity = 0.06;
                }
            }
        }
        
        // When return is complete, re-attach to camera
        if (window.snitchReturnProgress >= 1) {
            // Initialize final transition if not started
            if (!window.snitchFinalTransition) {
                window.snitchFinalTransition = true;
                window.snitchFinalTransitionTime = time;
                // Get final position in world space
                window.snitchFinalWorldPos = new THREE.Vector3();
                snitchGroup.getWorldPosition(window.snitchFinalWorldPos);
            }
            
            // Smoothly transition to camera attachment position
            var finalTransitionProgress = Math.min(1, (time - window.snitchFinalTransitionTime) / 0.5);
            
            // Calculate target position in world space (where snitch should be relative to camera)
            var cameraWorldPos = new THREE.Vector3();
            camera.getWorldPosition(cameraWorldPos);
            var cameraForward = new THREE.Vector3();
            camera.getWorldDirection(cameraForward);
            var targetWorldPos = cameraWorldPos.clone();
            targetWorldPos.add(cameraForward.multiplyScalar(2)); // 2 units in front
            targetWorldPos.x += 0.4; // Slight offset to the right
            targetWorldPos.y -= 0.2; // Slight offset down
            
            // Lerp to target world position
            snitchGroup.position.lerpVectors(window.snitchFinalWorldPos, targetWorldPos, finalTransitionProgress);
            
            // When final transition is complete, re-attach to camera
            if (finalTransitionProgress >= 1) {
                // Remove from scene
                scene.remove(snitchGroup);
                
                // Set to normal weaving position relative to camera
                snitchGroup.position.set(0.4, -0.2, -2);
                
                // Re-attach to camera
                camera.add(snitchGroup);
                
                // Clear all transition variables
                window.snitchReturnTime = null;
                window.snitchReturnProgress = null;
                window.snitchReturnPath = null;
                window.snitchFinalTransition = null;
                window.snitchFinalTransitionTime = null;
                window.snitchFinalWorldPos = null;
                window.snitchTransitionTime = null;
                window.snitchStartPos = null;
                window.snitchPathPoints = [];
                window.snitchDetaching = false;
                window.snitchDetachmentTime = null;
                window.snitchDetachStartPos = null;
            }
        }
    }
    
    // Clean render loop - no debug objects
    
    // Animate particles - slower rotation
    particleSystem1.rotation.y += 0.00001; // Halved speed
    particleSystem2.rotation.x += 0.000025; // Halved speed
    particleSystem3.rotation.z += 0.000005; // Halved speed
    
    
    // Fade out tunnel geometry when well into space
    if (currentCameraPercentage > 0.98) {
        var fadeProgress = (currentCameraPercentage - 0.98) / 0.12; // Fade from 0.98 to 1.1
        fadeProgress = Math.min(1, Math.max(0, fadeProgress));
        
        // Fade out main tube
        if (tubeMesh && tubeMesh.material) {
            tubeMesh.material.opacity = Math.max(0.1, 1 - fadeProgress); // Keep slightly visible
        }
        
        // Fade out wireframe
        if (wireframe && wireframe.material) {
            wireframe.material.opacity = Math.max(0, 0.15 * (1 - fadeProgress));
        }
    }
    
    
    // Optional: Add warp lines effect when deep in space
    if (currentCameraPercentage > 1.1 && !window.warpLinesCreated) {
        window.warpLinesCreated = true;
        createWarpSpeedEffect();
    }
    
    // Animate warp lines if they exist
    if (window.warpLines && currentCameraPercentage > 1.1) {
        var warpIntensity = (currentCameraPercentage - 1.1) / 0.1; // 0 to 1 from 1.1 to 1.2
        window.warpLines.material.opacity = 0.2 + warpIntensity * 0.3;
        window.warpLines.material.uniforms.uSpeed.value = 1 + warpIntensity * 5;
        window.warpLines.material.uniforms.uTime.value = Date.now() * 0.001;
    }
    
    // Debug logging for text visibility issues
    if (Math.floor(currentCameraPercentage * 1000) % 100 === 0) { // Log every 10%
        console.log('Camera:', currentCameraPercentage.toFixed(2), 'TextMeshes:', textMeshes.length);
    }
    
    // Update text visibility based on camera position
    textMeshes.forEach(function(item) {
        // Special handling for end logo - fade in from 90% to 96%
        if (item.isEndLogo) {
            if (currentCameraPercentage > 0.90) {
                item.mesh.visible = true;
                // The end logo is a group, so handle children
                if (item.mesh.children && item.mesh.children.length > 0) {
                    var fadeProgress = (currentCameraPercentage - 0.90) / 0.06;
                    fadeProgress = Math.min(1, Math.max(0, fadeProgress));
                    item.mesh.children.forEach(function(child) {
                        if (child.material) {
                            child.material.opacity = fadeProgress;
                            child.material.transparent = true;
                        }
                    });
                }
            } else {
                item.mesh.visible = false;
            }
            return;
        }
        
        var distance = Math.abs(currentCameraPercentage - item.position);
        // Special handling for logo - show it earlier and keep it visible longer
        var isLogo = item.position === 0.03;
        var visibilityThreshold = isLogo ? 0.20 : 0.1; // Logo gets much wider visibility range
        
        if (distance < visibilityThreshold) {
            if (!item.mesh.visible) {
                console.log('Making visible:', isLogo ? 'LOGO' : 'text', 'at position', item.position, 'camera at', currentCameraPercentage);
            }
            item.mesh.visible = true;
            // Special handling for text ring (it's a group, not a mesh with material)
            if (!item.isRing) {
                // Fade based on distance for regular text
                var opacity = 1 - (distance / visibilityThreshold);
                item.mesh.material.opacity = opacity;
            }
        } else {
            item.mesh.visible = false;
        }
    });
    
    // Hide portal image as we pass through
    if (window.endPortalImage) {
        if (currentCameraPercentage > 0.95) {
            // Fade OUT the portal image as we approach
            window.endPortalImage.material.opacity = Math.max(0, 1 - (currentCameraPercentage - 0.95) * 10);
            window.endPortalImage.rotation.z += 0.002;
        } else {
            window.endPortalImage.material.opacity = 1;
        }
    }
    
    // Render the scene
    composer.render();
    
    requestAnimationFrame(render);
}
requestAnimationFrame(render);

// Click handler
$('canvas').click(function() {
    console.clear();
    markers.push(p1);
    console.log(JSON.stringify(markers));
});

// Window resize handler
window.addEventListener('resize', function() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    composer.setSize(width, height);
}, false);

// Global mouse position for snitch interaction
var mouseX = 0;
var mouseY = 0;

// Mouse move handler
document.addEventListener('mousemove', function(evt) {
    cameraRotationProxyX = Mathutils.map(evt.clientX, 0, window.innerWidth, 3.24, 3.04);
    cameraRotationProxyY = Mathutils.map(evt.clientY, 0, window.innerHeight, -0.1, 0.1);
    
    // Store normalized mouse position for snitch
    mouseX = (evt.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(evt.clientY / window.innerHeight) * 2 + 1;
    
    // Planet dragging removed
});

// Planet mouse interaction removed

// Mouse up handler
document.addEventListener('mouseup', function(evt) {
    window.planetMouseDown = false;
    // Add some momentum
    if (window.planetInteractive) {
        // Momentum will decay over time
    }
});

// Planet touch interaction removed

// Raycaster for snitch clicking
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// Snitch grabbing and physics state
var snitchGrabbed = false;
var snitchGrabOffset = new THREE.Vector3();
var snitchVelocity = new THREE.Vector3(0, 0, 0);
var mouseVelocity = new THREE.Vector3(0, 0, 0);
var lastMousePos = new THREE.Vector3(0, 0, 0);
var throwPower = 0;

function onMouseDown(event) {
    // Calculate mouse position in normalized device coordinates
    if (event.touches) {
        mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    } else {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    // Check if we can grab the snitch
    if (snitchGroup && snitchGroup.visible && !snitchGrabbed) {
        raycaster.setFromCamera(mouse, camera);
        
        // Create invisible sphere around snitch for hit detection
        var snitchWorldPos = new THREE.Vector3();
        snitchGroup.getWorldPosition(snitchWorldPos);
        
        // Check distance from ray to snitch
        var distance = raycaster.ray.distanceToPoint(snitchWorldPos);
        
        if (distance < 0.5) { // Within grab range
            snitchGrabbed = true;
            snitchGrabOffset.copy(snitchGroup.position);
            document.body.style.cursor = 'grabbing';
            
            // Clear any existing velocity when grabbed
            snitchVelocity.set(0, 0, 0);
            
            console.log('Snitch grabbed!');
        }
    }
}

function onMouseUp() {
    if (snitchGrabbed) {
        snitchGrabbed = false;
        document.body.style.cursor = 'default';
        
        // Calculate throw velocity from mouse movement
        snitchVelocity.copy(mouseVelocity);
        
        // Scale for low gravity portal physics
        snitchVelocity.x *= 0.6;
        snitchVelocity.y *= 0.4;
        
        // Strong forward momentum into portal (negative Z in camera space)
        snitchVelocity.z = Math.min(-0.3, snitchVelocity.z * 1.5 - 0.4);
        
        // Initial upward momentum for graceful arc
        snitchVelocity.y += 0.02;
        
        // Add spin when thrown
        window.snitchSpinX = (Math.random() - 0.5) * 0.1;
        window.snitchSpinY = (Math.random() - 0.5) * 0.1;
        window.snitchSpinZ = (Math.random() - 0.5) * 0.05;
        
        console.log('Snitch released with velocity:', snitchVelocity);
    }
}

// Mouse/touch event listeners for grab and release
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('touchstart', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('touchend', onMouseUp);

// Planet touch move removed

document.addEventListener('touchend', function(evt) {
    window.planetMouseDown = false;
});

// Exit warp space and return to tunnel
function exitWarpSpace() {
    window.inWarpSpace = false;
    
    // Remove warp canvas immediately
    const warpCanvas = document.getElementById('warpCanvas');
    if (warpCanvas) {
        warpCanvas.remove();
        if (window.warpAnimationFrame) {
            cancelAnimationFrame(window.warpAnimationFrame);
        }
    }
    
    // Hide landing page if visible
    const landingPage = document.getElementById('landingPage');
    if (landingPage && landingPage.classList.contains('active')) {
        landingPage.classList.remove('active');
    }
    
    // Reset transition states
    window.landingPageTriggered = false;
    window.whiteTransitionTriggered = false;
    window.finalTransition = false;
    
    // Make sure 3D scene is visible again
    document.querySelector('.experience').style.display = 'block';
    document.querySelector('.scrollTarget').style.display = 'block';
}

// Warp Space Functions
function initUnifiedWarp() {
    // Create fullscreen canvas for warp effect
    const warpCanvas = document.createElement('canvas');
    warpCanvas.id = 'warpCanvas';
    warpCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        z-index: 195;
        pointer-events: none;
        background: #000;
    `;
    document.body.appendChild(warpCanvas);
    
    const ctx = warpCanvas.getContext('2d');
    warpCanvas.width = window.innerWidth;
    warpCanvas.height = window.innerHeight;
    
    // Star properties for warp effect
    const stars = [];
    const starCount = 400;
    let warpSpeed = 0;
    let textOpacity = 0;
    let transitionPhase = 0; // 0: warping, 1: showing text, 2: landing
    
    // Create initial stars
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * warpCanvas.width,
            y: Math.random() * warpCanvas.height,
            z: Math.random() * 1000,
            prevZ: Math.random() * 1000
        });
    }
    
    // Monitor scroll for warp speed
    let animationFrame;
    
    function updateWarp() {
        // Check if we should exit warp
        if (!window.inWarpSpace) {
            return;
        }
        
        // Clear with trail effect based on speed
        if (scrollVelocity > 5) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Long trails when scrolling fast
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Shorter trails when slow
        }
        ctx.fillRect(0, 0, warpCanvas.width, warpCanvas.height);
        
        // Update warp speed based on scroll velocity and direction
        // Also factor in scroll position beyond warp trigger for base speed
        const beyondWarpAmount = Math.max(0, cameraTargetPercentage - 1.0);
        const baseWarpSpeed = 1 + beyondWarpAmount * 15; // Base speed increases with distance beyond 100%
        warpSpeed = baseWarpSpeed + (scrollVelocity * 3 * scrollDirection); // Can go negative for reverse
        
        const centerX = warpCanvas.width / 2;
        const centerY = warpCanvas.height / 2;
        
        // Draw stars
        for (let star of stars) {
            star.prevZ = star.z;
            star.z -= warpSpeed;
            
            // Handle star regeneration based on direction
            if (scrollDirection >= 0 && star.z <= 0) {
                // Moving forward - stars come from far away
                star.x = Math.random() * warpCanvas.width;
                star.y = Math.random() * warpCanvas.height;
                star.z = 1000;
                star.prevZ = 1000;
            } else if (scrollDirection < 0 && star.z >= 1000) {
                // Moving backward - stars come from close
                star.x = Math.random() * warpCanvas.width;
                star.y = Math.random() * warpCanvas.height;
                star.z = 1;
                star.prevZ = 1;
            }
            
            // Calculate positions
            const x = (star.x - centerX) * (600 / star.z) + centerX;
            const y = (star.y - centerY) * (600 / star.z) + centerY;
            const prevX = (star.x - centerX) * (600 / star.prevZ) + centerX;
            const prevY = (star.y - centerY) * (600 / star.prevZ) + centerY;
            
            const size = (1 - star.z / 1000) * 2;
            const opacity = (1 - star.z / 1000);
            
            // Draw star as dot or streak depending on speed
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = size;
            ctx.beginPath();
            
            if (warpSpeed > 10) {
                // Draw as streak when moving fast
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, y);
            } else {
                // Draw as dot when slow
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.fill();
            }
            ctx.stroke();
        }
        
        window.warpAnimationFrame = requestAnimationFrame(updateWarp);
    }
    
    updateWarp();
    
    // Handle resize
    window.addEventListener('resize', () => {
        warpCanvas.width = window.innerWidth;
        warpCanvas.height = window.innerHeight;
    });
}

// Landing Page Functions (removed - now using unified warp)

function initStarfield(startWarp = false) {
    const canvas = document.getElementById('starfieldCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Star properties
    const stars = [];
    const numStars = 300;
    let speed = startWarp ? 50 : 0.5; // Start with warp speed if transitioning
    let targetSpeed = 0.5;
    
    // Create stars positioned for tunnel exit
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: startWarp ? Math.random() * 200 : Math.random() * 1000, // Closer stars if warping
            prevZ: Math.random() * 1000
        });
    }
    
    function animateStarfield() {
        // Clear with fade trail for motion blur
        ctx.fillStyle = startWarp && speed > 5 ? 'rgba(0, 0, 0, 0.05)' : 'rgba(10, 10, 10, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Gradually slow down from warp speed
        if (speed > targetSpeed) {
            speed *= 0.95; // Smooth deceleration
            if (speed < targetSpeed) speed = targetSpeed;
        }
        
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        for (let star of stars) {
            star.prevZ = star.z;
            star.z -= speed;
            
            if (star.z <= 0) {
                star.x = Math.random() * canvas.width;
                star.y = Math.random() * canvas.height;
                star.z = 1000;
                star.prevZ = 1000;
            }
            
            // Project star position
            const x = (star.x - centerX) * (600 / star.z) + centerX;
            const y = (star.y - centerY) * (600 / star.z) + centerY;
            const prevX = (star.x - centerX) * (600 / star.prevZ) + centerX;
            const prevY = (star.y - centerY) * (600 / star.prevZ) + centerY;
            
            const size = (1 - star.z / 1000) * 3;
            const opacity = 1 - star.z / 1000;
            
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw longer trails during warp
            if (speed > 2) {
                ctx.globalAlpha = opacity * 0.6;
                ctx.lineWidth = size / 2;
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
        
        // Show content after warp completes
        if (startWarp && speed <= 1) {
            const content = document.querySelector('.landing-content');
            if (content && !content.classList.contains('visible')) {
                content.classList.add('visible');
            }
        }
        
        requestAnimationFrame(animateStarfield);
    }
    
    animateStarfield();
    
    // Handle resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

function initDotGrid() {
    const canvas = document.getElementById('dotGrid');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;
    
    const dots = [];
    const spacing = 20;
    const rows = Math.floor(canvas.height / spacing);
    const cols = Math.floor(canvas.width / spacing);
    
    // Create dot grid
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            dots.push({
                x: j * spacing + spacing / 2,
                y: i * spacing + spacing / 2,
                baseSize: 1,
                size: 1,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }
    
    let mouseX = 0;
    let mouseY = 0;
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    
    function animateDots() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let dot of dots) {
            const distance = Math.sqrt(
                Math.pow(mouseX - dot.x, 2) + 
                Math.pow(mouseY - dot.y, 2)
            );
            
            const maxDistance = 100;
            const influence = Math.max(0, 1 - distance / maxDistance);
            
            dot.pulse += 0.05;
            dot.size = dot.baseSize + influence * 3 + Math.sin(dot.pulse) * 0.2;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + influence * 0.7})`;
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        requestAnimationFrame(animateDots);
    }
    
    animateDots();
}