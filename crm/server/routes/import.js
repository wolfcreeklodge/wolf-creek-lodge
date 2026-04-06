import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import pool from '../db.js';

const router = Router();

// Configure multer for file uploads (5MB max, memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    const ext = file.originalname.toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and XLSX files are allowed'));
    }
  },
});

// POST /api/import/upload - Parse file and return preview
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = req.file.originalname.toLowerCase();
    let rows = [];

    if (filename.endsWith('.csv')) {
      rows = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Use CSV or XLSX.' });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File contains no data rows' });
    }

    const columns = Object.keys(rows[0]);
    const preview = rows.slice(0, 10);

    res.json({
      columns,
      preview,
      total_rows: rows.length,
    });
  } catch (err) {
    console.error('POST /api/import/upload error:', err);
    res.status(500).json({ error: `Failed to parse file: ${err.message}` });
  }
});

// POST /api/import/commit - Import mapped rows
router.post('/commit', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: importRows } = req.body;

    if (!importRows || !Array.isArray(importRows) || importRows.length === 0) {
      client.release();
      return res.status(400).json({ error: 'No rows to import' });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    await client.query('BEGIN');

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      try {
        const firstName = (row.first_name || '').trim();
        const lastName = (row.last_name || '').trim();

        if (!firstName || !lastName) {
          errors.push({ row: i + 1, error: 'Missing first_name or last_name', data: row });
          skipped++;
          continue;
        }

        const email = (row.email || '').trim().toLowerCase() || null;
        const validSources = ['airbnb', 'vrbo', 'direct', 'referral', 'other'];
        const source = validSources.includes(row.source) ? row.source : 'other';
        const tags = row.tags ? (Array.isArray(row.tags) ? JSON.stringify(row.tags) : row.tags) : '[]';

        // Check for duplicate by email
        if (email) {
          const { rows: existing } = await client.query(
            'SELECT * FROM guests WHERE email = $1 AND deleted_at IS NULL', [email]
          );
          if (existing.length > 0) {
            // Merge: update empty fields
            await client.query(`
              UPDATE guests SET
                phone = COALESCE(NULLIF($1, ''), phone),
                city = COALESCE(NULLIF($2, ''), city),
                state_province = COALESCE(NULLIF($3, ''), state_province),
                country = COALESCE(NULLIF($4, ''), country),
                instagram = COALESCE(NULLIF($5, ''), instagram),
                whatsapp = COALESCE(NULLIF($6, ''), whatsapp),
                facebook = COALESCE(NULLIF($7, ''), facebook),
                linkedin = COALESCE(NULLIF($8, ''), linkedin),
                notes = CASE WHEN notes IS NULL OR notes = '' THEN $9 ELSE notes END,
                updated_at = now()
              WHERE id = $10
            `, [
              row.phone || '', row.city || '', row.state_province || '',
              row.country || '', row.instagram || '', row.whatsapp || '',
              row.facebook || '', row.linkedin || '', row.notes || '',
              existing[0].id
            ]);
            await client.query(`
              INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
              VALUES ($1, 'guest', $2, 'imported', $3)
            `, [req.user.email, existing[0].id, JSON.stringify({ merged_with: row, original_id: existing[0].id })]);
            updated++;
            continue;
          }
        }

        // Insert new guest
        const { rows: newRows } = await client.query(`
          INSERT INTO guests (first_name, last_name, email, phone, city, state_province, country,
            instagram, whatsapp, facebook, linkedin, source, tags, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id
        `, [
          firstName, lastName, email,
          row.phone || null, row.city || null, row.state_province || null,
          row.country || 'US', row.instagram || null, row.whatsapp || null,
          row.facebook || null, row.linkedin || null, source, tags,
          row.notes || null
        ]);

        await client.query(`
          INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
          VALUES ($1, 'guest', $2, 'imported', $3)
        `, [req.user.email, newRows[0].id, JSON.stringify(row)]);
        created++;
      } catch (rowErr) {
        errors.push({ row: i + 1, error: rowErr.message, data: row });
        skipped++;
      }
    }

    await client.query('COMMIT');
    client.release();

    res.json({ created, updated, skipped, errors });
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    console.error('POST /api/import/commit error:', err);
    res.status(500).json({ error: `Import failed: ${err.message}` });
  }
});

export default router;
