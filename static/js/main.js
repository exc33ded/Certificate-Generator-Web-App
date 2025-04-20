let coordinates = null;
let templateFile = null;
let fontFile = null;

let customFontLoaded = false;
const fontName = 'CustomFont';

// Font upload handler
document.getElementById('fontUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('font', file);

    try {
        const response = await fetch('/upload-font', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.filename) {
            fontFile = data.filename;

            // Check if the font file is accessible
            const fontUrl = `/uploads/${data.filename}`;
            fetch(fontUrl, { method: 'HEAD' })
                .then(res => {
                    if (!res.ok) {
                        alert('Font uploaded but not accessible at ' + fontUrl);
                        return;
                    }
                    // Dynamically load the font and apply it to the preview
                    const newFont = new FontFace(fontName, `url(${fontUrl})`);
                    newFont.load().then(function(loadedFont) {
                        document.fonts.add(loadedFont);
                        customFontLoaded = true;
                        const dragText = document.getElementById('dragText');
                        dragText.style.fontFamily = fontName;
                        // Only show if template is loaded
                        if (templateFile) dragText.style.display = 'block';
                    }).catch(function(error) {
                        alert('Font loading failed: ' + error);
                        console.error('Font loading failed:', error);
                    });
                })
                .catch(err => {
                    alert('Font file not accessible: ' + err);
                    console.error('Font file not accessible:', err);
                });
        } else {
            alert('Font upload failed: No filename returned');
        }
    } catch (error) {
        alert('Font upload failed: ' + error);
        console.error('Error:', error);
    }
});

// Template upload handler
document.getElementById('templateUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('template', file);

    try {
        const response = await fetch('/upload-template', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.filename) {
            templateFile = data.filename;
            const canvas = document.getElementById('previewCanvas');
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Initialize draggable text
                const dragText = document.getElementById('dragText');
                dragText.style.left = '100px';
                dragText.style.top = '100px';
                dragText.style.fontSize = `${document.getElementById('fontSize').value}px`;
                dragText.style.color = document.getElementById('fontColorPicker').value;
                if (customFontLoaded) {
                    dragText.style.fontFamily = fontName;
                    dragText.style.display = 'block';
                } else {
                    dragText.style.display = 'none'; // Hide until font is uploaded
                }
                coordinates = {
                    x: 100,
                    y: 100
                };
            };
            img.src = URL.createObjectURL(file);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

// Drag functionality
const dragText = document.getElementById('dragText');
let isDragging = false;
let currentX;
let currentY;

dragText.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = dragText.getBoundingClientRect();
    currentX = e.clientX - rect.left;
    currentY = e.clientY - rect.top;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const container = document.querySelector('.certificate-container');
    const rect = container.getBoundingClientRect();
    
    let left = e.clientX - rect.left - currentX;
    let top = e.clientY - rect.top - currentY;
    
    // Keep text within bounds
    left = Math.max(0, Math.min(left, rect.width - dragText.offsetWidth));
    top = Math.max(0, Math.min(top, rect.height - dragText.offsetHeight));
    
    dragText.style.left = `${left}px`;
    dragText.style.top = `${top}px`;
    
    // Update coordinates directly
    coordinates = {
        x: Math.round(left),
        y: Math.round(top)
    };
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Font size handler
document.getElementById('fontSize').addEventListener('input', (e) => {
    const fontSize = parseInt(e.target.value);
    dragText.style.fontSize = `${fontSize}px`;
});

// Font color handler
document.getElementById('fontColorPicker').addEventListener('change', (e) => {
    dragText.style.color = e.target.value;
});

// Helper to get scaled coordinates and font size for backend
function getScaledCoordinatesAndFontSize() {
    const container = document.querySelector('.certificate-container');
    const canvas = document.getElementById('previewCanvas');
    const left = parseFloat(dragText.style.left.replace('px', ''));
    const top = parseFloat(dragText.style.top.replace('px', ''));
    const scaleX = canvas.width / container.offsetWidth;
    const scaleY = canvas.height / container.offsetHeight;
    const fontSize = parseInt(document.getElementById('fontSize').value);
    return {
        coordinates: {
            x: Math.round(left * scaleX),
            y: Math.round(top * scaleY)
        },
        fontSize: Math.round(fontSize * scaleX) // scale font size as well
    };
}

// Preview button handler
document.getElementById('previewBtn').addEventListener('click', async () => {
    if (!templateFile) {
        alert('Please upload a template first');
        return;
    }

    const { coordinates: scaledCoordinates, fontSize: scaledFontSize } = getScaledCoordinatesAndFontSize();
    const fontColor = document.getElementById('fontColorPicker').value;
    const alignment = document.getElementById('alignment').value; // <-- get alignment

    try {
        const response = await fetch('/preview-certificate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                template: templateFile,
                coordinates: scaledCoordinates,
                fontSize: scaledFontSize,
                fontColor: fontColor,
                fontFile: fontFile,
                alignment: alignment // <-- send alignment
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate preview');
        }

        const data = await response.json();
        if (data.preview) {
            const previewResult = document.getElementById('previewResult');
            previewResult.innerHTML = `<img src="/uploads/${data.preview}?t=${Date.now()}" alt="Certificate Preview">`;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error generating preview');
    }
});

// Generate button handler
document.getElementById('generateBtn').addEventListener('click', async () => {
    if (!templateFile) {
        alert('Please upload a template and position the text');
        return;
    }

    const { coordinates: scaledCoordinates, fontSize: scaledFontSize } = getScaledCoordinatesAndFontSize();
    const names = document.getElementById('namesInput').value
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

    if (names.length === 0) {
        alert('Please enter at least one name');
        return;
    }

    const fontColor = document.getElementById('fontColorPicker').value;
    const alignment = document.getElementById('alignment').value; // <-- get alignment

    try {
        const response = await fetch('/generate-certificates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                template: templateFile,
                names: names,
                coordinates: scaledCoordinates,
                fontSize: scaledFontSize,
                fontColor: fontColor,
                fontFile: fontFile,
                alignment: alignment // <-- send alignment
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate certificates');
        }

        const result = await response.json();
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
            <h3>Generated Certificates:</h3>
            ${result.files.map(file => `<div><a href="/uploads/${file}" target="_blank">${file}</a></div>`).join('')}
            <button id="downloadZipBtn" class="button">Download All (ZIP)</button>
            <button id="resetBtn" class="button">Reset</button>
        `;

        // Add event listeners for the new buttons
        document.getElementById('downloadZipBtn').addEventListener('click', handleZipDownload);
        document.getElementById('resetBtn').addEventListener('click', handleReset);
    } catch (error) {
        console.error('Error:', error);
        alert('Error generating certificates');
    }
});

// Helper functions for zip download and reset
async function handleZipDownload() {
    try {
        const response = await fetch('/download-zip', { method: 'POST' });
        const data = await response.json();
        if (data.zip) {
            window.location.href = `/uploads/${data.zip}`;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error downloading zip file');
    }
}

async function handleReset() {
    if (confirm('Are you sure you want to reset? This will delete all generated certificates.')) {
        try {
            await fetch('/reset', { method: 'POST' });
            location.reload();
        } catch (error) {
            console.error('Error:', error);
            alert('Error resetting application');
        }
    }
}


document.getElementById('previewBtn').addEventListener('click', async () => {
    if (!templateFile) {
        alert('Please upload a template first');
        return;
    }

    const { coordinates: scaledCoordinates, fontSize: scaledFontSize } = getScaledCoordinatesAndFontSize();
    const fontColor = document.getElementById('fontColorPicker').value;
    const alignment = document.getElementById('alignment').value; // <-- get alignment

    try {
        const response = await fetch('/preview-certificate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                template: templateFile,
                coordinates: scaledCoordinates,
                fontSize: scaledFontSize,
                fontColor: fontColor,
                fontFile: fontFile,
                alignment: alignment // <-- send alignment
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate preview');
        }

        const data = await response.json();
        if (data.preview) {
            const previewResult = document.getElementById('previewResult');
            previewResult.innerHTML = `<img src="/uploads/${data.preview}?t=${Date.now()}" alt="Certificate Preview">`;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error generating preview');
    }
});

// Generate button handler
document.getElementById('generateBtn').addEventListener('click', async () => {
    if (!templateFile) {
        alert('Please upload a template and position the text');
        return;
    }

    const { coordinates: scaledCoordinates, fontSize: scaledFontSize } = getScaledCoordinatesAndFontSize();
    const names = document.getElementById('namesInput').value
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

    if (names.length === 0) {
        alert('Please enter at least one name');
        return;
    }

    const fontColor = document.getElementById('fontColorPicker').value;
    const alignment = document.getElementById('alignment').value; // <-- get alignment

    try {
        const response = await fetch('/generate-certificates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                template: templateFile,
                names: names,
                coordinates: scaledCoordinates,
                fontSize: scaledFontSize,
                fontColor: fontColor,
                fontFile: fontFile,
                alignment: alignment // <-- send alignment
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate certificates');
        }

        const result = await response.json();
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
            <h3>Generated Certificates:</h3>
            ${result.files.map(file => `<div><a href="/uploads/${file}" target="_blank">${file}</a></div>`).join('')}
            <button id="downloadZipBtn" class="button">Download All (ZIP)</button>
            <button id="resetBtn" class="button">Reset</button>
        `;

        // Add event listeners for the new buttons
        document.getElementById('downloadZipBtn').addEventListener('click', handleZipDownload);
        document.getElementById('resetBtn').addEventListener('click', handleReset);
    } catch (error) {
        console.error('Error:', error);
        alert('Error generating certificates');
    }
});

// Helper functions for zip download and reset
async function handleZipDownload() {
    try {
        const response = await fetch('/download-zip', { method: 'POST' });
        const data = await response.json();
        if (data.zip) {
            window.location.href = `/uploads/${data.zip}`;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error downloading zip file');
    }
}

async function handleReset() {
    if (confirm('Are you sure you want to reset? This will delete all generated certificates.')) {
        try {
            await fetch('/reset', { method: 'POST' });
            location.reload();
        } catch (error) {
            console.error('Error:', error);
            alert('Error resetting application');
        }
    }
}


// Manual anchor set button handler
document.getElementById('setAnchorBtn').addEventListener('click', function() {
    const canvas = document.getElementById('previewCanvas');
    const container = document.querySelector('.certificate-container');
    // Listen for next click on the canvas
    canvas.style.cursor = 'crosshair';
    function setAnchor(event) {
        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        // Move the draggable text to this position
        const dragText = document.getElementById('dragText');
        dragText.style.left = `${x}px`;
        dragText.style.top = `${y}px`;
        coordinates = { x: Math.round(x), y: Math.round(y) };
        canvas.style.cursor = 'default';
        canvas.removeEventListener('click', setAnchor);
    }
    canvas.addEventListener('click', setAnchor);
});