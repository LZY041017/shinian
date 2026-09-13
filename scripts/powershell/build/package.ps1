$ErrorActionPreference = 'Stop'
$appRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$workspaceRoot = (Resolve-Path (Join-Path $appRoot '../..')).Path
$deliverableRoot = Join-Path $workspaceRoot 'outputs'
Push-Location $appRoot
try {
    $env:SHINIAN_PACKAGE_OUTPUT = $deliverableRoot
    @'
const fs = require('node:fs');
const sharp = require('sharp');
(async () => {
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = await Promise.all(sizes.map(size => sharp('ui/icon.svg').resize(size, size).png().toBuffer()));
  await sharp('ui/icon.svg').png().toFile('ui/icon.png');
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  images.forEach((png, index) => {
    const pos = 6 + index * 16;
    header[pos] = sizes[index] === 256 ? 0 : sizes[index];
    header[pos + 1] = header[pos];
    header.writeUInt16LE(1, pos + 4);
    header.writeUInt16LE(32, pos + 6);
    header.writeUInt32LE(png.length, pos + 8);
    header.writeUInt32LE(offset, pos + 12);
    offset += png.length;
  });
  fs.writeFileSync('ui/icon.ico', Buffer.concat([header, ...images]));
  const {packager} = await import('@electron/packager');
  const paths = await packager({
    dir: process.cwd(), out: process.env.SHINIAN_PACKAGE_OUTPUT,
    name: '\u62fe\u5ff5', executableName: '\u62fe\u5ff5', platform: 'win32', arch: 'x64',
    electronVersion: '44.3.0', asar: true, prune: true, overwrite: false,
    icon: 'ui/icon.ico', ignore: [/\/tests(?:\/|$)/, /\/scripts(?:\/|$)/],
    appVersion: '1.0.0', buildVersion: '1.0.0',
    win32metadata: {CompanyName: 'Shinian', FileDescription: '\u62fe\u5ff5 - Memory and reflection', ProductName: '\u62fe\u5ff5', InternalName: 'Shinian'}
  });
  console.log(JSON.stringify(paths));
})().catch(error => { console.error(error); process.exitCode = 1; });
'@ | node
    if ($LASTEXITCODE -ne 0) { throw 'Application packaging failed.' }
} finally {
    Remove-Item Env:SHINIAN_PACKAGE_OUTPUT -ErrorAction SilentlyContinue
    Pop-Location
}
