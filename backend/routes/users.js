const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get user settings
router.get('/:userId/settings', (req, res) => {
  try {
    const { userId } = req.params;
    const database = db.getDb();

    database.get(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId],
      (err, settings) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (!settings) {
          return res.json({ settings: null });
        }
        
        // Parse preferences JSON
        const preferences = settings.preferences 
          ? JSON.parse(settings.preferences) 
          : {};
        
        // Parse background_image - konverter til array hvis det er enkelt værdi
        let backgroundImages = [];
        if (settings.background_image) {
          try {
            // Prøv at parse som JSON array først
            const parsed = JSON.parse(settings.background_image);
            if (Array.isArray(parsed)) {
              backgroundImages = parsed;
            } else {
              // Hvis det er en string (gammel format), konverter til array
              backgroundImages = [settings.background_image];
            }
          } catch (e) {
            // Hvis det ikke er JSON, er det sandsynligvis en gammel enkelt værdi
            backgroundImages = [settings.background_image];
          }
        }
        
        // Konverter slideshow_enabled fra INTEGER til boolean
        const slideshowEnabled = settings.slideshow_enabled !== null && settings.slideshow_enabled !== undefined 
          ? Boolean(settings.slideshow_enabled) 
          : true;
        
        // Default slideshow interval
        const slideshowInterval = settings.slideshow_interval || 10;
        
        // Parse widget_layout JSON
        let widgetLayout = null;
        if (settings.widget_layout) {
          try {
            widgetLayout = JSON.parse(settings.widget_layout);
          } catch (e) {
            console.error('Error parsing widget_layout:', e);
            widgetLayout = null;
          }
        }
        
        res.json({
          settings: {
            ...settings,
            preferences,
            backgroundImages,
            slideshowEnabled,
            slideshowInterval,
            widgetLayout
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.put('/:userId/settings', (req, res) => {
  try {
    const { userId } = req.params;
    const { userName, location, backgroundImages, slideshowEnabled, slideshowInterval, preferences, widgetLayout } = req.body;
    const database = db.getDb();

    const preferencesJson = preferences ? JSON.stringify(preferences) : null;
    
    // Konverter backgroundImages array til JSON string
    const backgroundImagesJson = backgroundImages && Array.isArray(backgroundImages) && backgroundImages.length > 0
      ? JSON.stringify(backgroundImages)
      : null;
    
    // Konverter widgetLayout til JSON string
    const widgetLayoutJson = widgetLayout ? JSON.stringify(widgetLayout) : null;
    
    // Konverter slideshowEnabled boolean til INTEGER (1 eller 0)
    const slideshowEnabledInt = slideshowEnabled !== null && slideshowEnabled !== undefined 
      ? (slideshowEnabled ? 1 : 0) 
      : 1;
    
    // Default slideshow interval
    const slideshowIntervalInt = slideshowInterval || 10;

    // Check if settings exist
    database.get(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
          // Update existing
          database.run(
            `UPDATE user_settings 
             SET user_name = ?, location = ?, background_image = ?, slideshow_enabled = ?, slideshow_interval = ?, preferences = ?, widget_layout = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = ?`,
            [userName, location, backgroundImagesJson, slideshowEnabledInt, slideshowIntervalInt, preferencesJson, widgetLayoutJson, userId],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to update settings' });
              }
              res.json({ success: true, message: 'Settings updated' });
            }
          );
        } else {
          // Create new
          database.run(
            `INSERT INTO user_settings (user_id, user_name, location, background_image, slideshow_enabled, slideshow_interval, preferences, widget_layout) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, userName, location, backgroundImagesJson, slideshowEnabledInt, slideshowIntervalInt, preferencesJson, widgetLayoutJson],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to create settings' });
              }
              res.json({ success: true, message: 'Settings created' });
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
