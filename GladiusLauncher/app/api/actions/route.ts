import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function loadActions() {
  const actionsDir = path.join(process.cwd(), 'public', 'actions', 'Jasno');
  try {
    const entries = await fs.readdir(actionsDir);
    const jsonFiles = entries.filter((file) => file.endsWith('.json'));
    const actions = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const raw = await fs.readFile(path.join(actionsDir, file), 'utf8');
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
    );
    return actions.filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET() {
  const actions = await loadActions();
  return NextResponse.json({ actions });
}
