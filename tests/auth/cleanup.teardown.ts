import { test as teardown } from '@playwright/test';
import fs from 'fs';

teardown('cleanup authentication', async ({}) => {
  const authFiles = ['auth.json', '.auth/user.json', '.auth/admin.json'];
  
  authFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
});