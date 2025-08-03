from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    # Create a new image with a white background
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Define colors - Redis brand colors
    primary_color = (220, 56, 45)  # Redis red #DC382D
    secondary_color = (184, 43, 33)  # Darker Redis red
    white = (255, 255, 255)
    
    # Draw background circle
    padding = size * 0.1
    draw.ellipse([padding, padding, size - padding, size - padding], 
                 fill=primary_color, outline=secondary_color, width=2)
    
    # Draw a stylized "P" for PageMind with Redis-inspired design
    center_x = size // 2
    center_y = size // 2
    
    # Calculate font size based on icon size
    font_size = int(size * 0.5)
    
    # Try to use a system font, fallback to default if not available
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        font = ImageFont.load_default()
    
    # Draw the "P" in white
    text = "P"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    text_x = center_x - text_width // 2
    text_y = center_y - text_height // 2 - size * 0.05
    
    draw.text((text_x, text_y), text, fill=white, font=font)
    
    # Add a small Redis-inspired element (small rectangles like Redis logo)
    rect_size = size * 0.08
    rect_y = center_y + text_height // 4
    
    # Draw three small rectangles
    for i in range(3):
        rect_x = center_x - rect_size * 1.5 + i * rect_size * 1.2
        draw.rectangle([rect_x, rect_y, rect_x + rect_size * 0.8, rect_y + rect_size * 0.3], 
                      fill=white)
    
    return img

# Create icons directory if it doesn't exist
if not os.path.exists('icons'):
    os.makedirs('icons')

# Generate icons in different sizes
sizes = [16, 32, 48, 128]
for size in sizes:
    icon = create_icon(size)
    icon.save(f'icons/icon{size}.png', 'PNG')
    print(f'Created icon{size}.png')

print('All icons generated successfully!')
