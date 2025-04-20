from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import os
from PIL import Image, ImageDraw, ImageFont
import cv2
import numpy as np
from werkzeug.utils import secure_filename
import zipfile
import shutil
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'ttf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- ADD THIS ROUTE ---
@app.route('/upload-font', methods=['POST'])
def upload_font():
    if 'font' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['font']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({'filename': filename})

    return jsonify({'error': 'Invalid file type'}), 400
# --- END ADD ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload-template', methods=['POST'])
def upload_template():
    if 'template' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['template']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({'filename': filename})
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/generate-certificates', methods=['POST'])
def generate_certificates():
    data = request.json
    template_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(data['template']))
    names = data['names']
    coordinates = data['coordinates']
    font_size = int(data['fontSize'])
    font_color = tuple(int(x) for x in bytes.fromhex(data['fontColor'].strip('#'))[0:3])
    alignment = data.get('alignment', 'left')  # default to left if not provided

    template = Image.open(template_path)

    font_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(data.get('fontFile'))) if data.get('fontFile') else 'arial.ttf'
    try:
        font = ImageFont.truetype(font_path, font_size)
    except:
        font = ImageFont.truetype('arial.ttf', font_size)

    generated_files = []

    for name in names:
        cert = template.copy()
        draw = ImageDraw.Draw(cert)
        bbox = draw.textbbox((0, 0), name, font=font)
        text_width = bbox[2] - bbox[0]
        x = coordinates['x']
        if alignment == 'center':
            # Anchor is the center, so subtract half the width
            x = x - text_width // 2
        elif alignment == 'right':
            # Anchor is the right edge, so subtract the full width
            x = x - text_width
        # For left/start, x stays as is (anchor is left edge)
        draw.text((x, coordinates['y']), name, font=font, fill=font_color)
        output_filename = f"certificate_{name}.png"
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(output_filename))
        cert.save(output_path)
        generated_files.append(secure_filename(output_filename))

    return jsonify({'files': generated_files})

@app.route('/preview-certificate', methods=['POST'])
def preview_certificate():
    try:
        data = request.json
        template_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(data['template']))

        if not os.path.exists(template_path):
            return jsonify({'error': 'Template file not found'}), 404

        coordinates = data['coordinates']
        font_size = data['fontSize']
        font_color = tuple(int(x) for x in bytes.fromhex(data['fontColor'].strip('#'))[0:3])
        alignment = data.get('alignment', 'left')

        template = Image.open(template_path)
        draw = ImageDraw.Draw(template)

        font_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(data.get('fontFile'))) if data.get('fontFile') else 'arial.ttf'
        try:
            font = ImageFont.truetype(font_path, font_size)
        except:
            font = ImageFont.truetype('arial.ttf', font_size)

        sample_text = "Sample Name"
        bbox = draw.textbbox((0, 0), sample_text, font=font)
        text_width = bbox[2] - bbox[0]
        x = coordinates['x']
        if alignment == 'center':
            x = x - text_width // 2
        elif alignment == 'right':
            x = x - text_width
        # For left/start, x stays as is
        draw.text((x, coordinates['y']), sample_text, font=font, fill=font_color)

        preview_filename = 'preview.png'
        preview_path = os.path.join(app.config['UPLOAD_FOLDER'], preview_filename)
        template.save(preview_path)

        return jsonify({'preview': preview_filename})
    except Exception as e:
        print("Preview error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/download-zip', methods=['POST'])
def download_zip():
    # Create a zip file of all generated certificates
    zip_filename = f'certificates_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'
    zip_path = os.path.join(app.config['UPLOAD_FOLDER'], zip_filename)
    
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file in os.listdir(app.config['UPLOAD_FOLDER']):
            if file.startswith('certificate_'):
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], file)
                zipf.write(file_path, file)
    
    return jsonify({'zip': zip_filename})

@app.route('/reset', methods=['POST'])
def reset():
    try:
        # Remove all files in uploads folder
        for file in os.listdir(app.config['UPLOAD_FOLDER']):
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], file)
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing {file}: {str(e)}")
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)