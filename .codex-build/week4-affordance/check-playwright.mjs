try {
  const mod = await import('playwright');
  console.log('playwright ok', Object.keys(mod).slice(0,5).join(','));
} catch (e) {
  console.error('no playwright', e.message);
  process.exit(2);
}
