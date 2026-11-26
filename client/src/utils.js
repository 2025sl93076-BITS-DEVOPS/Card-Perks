export function bgClass(issuer = '') {
  const i = issuer.toLowerCase();
  if (i.includes('sbi'))   return 'bg-sbi';
  if (i.includes('hdfc'))  return 'bg-hdfc';
  if (i.includes('icici')) return 'bg-icici';
  if (i.includes('axis'))  return 'bg-axis';
  if (i.includes('bob') || i.includes('baroda')) return 'bg-bob';
  return 'bg-other';
}
