const packageJSON = require('./package.json');

module.exports = {
  packagerConfig: {
    icon: 'src/images/icon/icon',
  },
  rebuildConfig: {},
  makers: [
    ...process.platform === 'win32' ? [{
      name: '@electron-forge/maker-squirrel',
      config: {
        author: "UT LLC",
        description: "UT Conversion Tool",
        icon: 'src/images/icon/icon.ico',
        setupIcon: 'src/images/icon/icon.ico',
        certificateFile: 'src/UTcertSelfSign.pfx',
        certificatePassword: process.env.CERTIFICATE_PASSWORD,
        setupExe: `UT 자동 변환기-${packageJSON.version}.exe`,
        setupMsi: `UT 자동 변환기-${packageJSON.version}.msi`,
      }
    }] : [],
    ...process.platform === 'darwin' ? [{
      name: '@electron-forge/maker-dmg',
      config: {
        name: `UT 자동 변환기-${packageJSON.version}`,
        format: 'ULFO',
        icon: 'src/images/icon/icon.icns'
      }
    }] : [],
  ],
};
