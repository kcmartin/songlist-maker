import { Router } from 'express';
import { execFile } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

router.post('/', (req, res) => {
  const scriptPath = join(__dirname, '..', 'backup-db.sh');

  execFile('bash', [scriptPath], { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Backup failed:', stderr || error.message);
      return res.status(500).json({ status: 'error', message: stderr || error.message });
    }
    console.log('On-demand backup:', stdout.trim());
    res.json({ status: 'ok', message: stdout.trim() });
  });
});

export default router;
