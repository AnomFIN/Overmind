# PWA Icons

This directory should contain the following icon sizes for PWA support:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Generating Icons

You can generate these icons from a single 512x512 source image using ImageMagick:

```bash
# Install ImageMagick if not available
sudo apt-get install imagemagick

# Generate all sizes from source.png (512x512)
convert source.png -resize 72x72 icon-72x72.png
convert source.png -resize 96x96 icon-96x96.png
convert source.png -resize 128x128 icon-128x128.png
convert source.png -resize 144x144 icon-144x144.png
convert source.png -resize 152x152 icon-152x152.png
convert source.png -resize 192x192 icon-192x192.png
convert source.png -resize 384x384 icon-384x384.png
convert source.png -resize 512x512 icon-512x512.png
```

## Temporary Placeholders

For now, this directory contains a README. The installer will check for icons
and provide instructions if they're missing.
