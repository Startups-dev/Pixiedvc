import fs from 'fs';
import path from 'path';

export function loadContractTemplate(templateName: string): string {
  const filePath = path.join(process.cwd(), 'src/contracts/templates', templateName);
  return fs.readFileSync(filePath, 'utf8');
}

export function fillTemplate(template: string, data: Record<string, string | number | null | undefined>): string {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    const val = data[key.trim()];
    return val !== undefined && val !== null ? String(val) : '';
  });
}
