# Certificate Generator Web App

A web application to generate certificates with custom templates, fonts, and text positioning.

---

## Features

- Upload your own certificate template image (PNG, JPG, JPEG)
- Upload and use custom TTF fonts
- Set font size and color
- Drag and drop or manually set the anchor point for the name placement
- Choose anchor behavior:  
  - Start from anchor (expand right)  
  - Center on anchor (expand both ways)  
  - End at anchor (expand left)
- Preview certificate before generating
- Generate certificates for multiple names at once
- Download all generated certificates as a ZIP file
- Reset/delete all generated certificates

---

## Installation (using uv and pyproject.toml)

1. Install [uv](https://github.com/astral-sh/uv) if you haven't already:
   ```bash
   pip install uv
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/exc33ded/Certificate-Generator-Web-App.git   
   ```

3. Navigate to the project directory:
   ```bash
   cd certificate-generator-web-app
   ```

4. Run the application:
   ```bash
   uv run app.py
   ```

