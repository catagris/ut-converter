# ut-converter
To prefare enviromant on new computer for Development
Make sure computer is update (Windows 10)
Download and install Visual C++ Redistributable Packages for Visual Studio 2013
Download and install npm from Node.js v18 (Make sure to Check the optional to install Additional Tools), https://nodejs.org/en/download/
If on Windows Download and install Python. (Make sure to check the box to add to PATH)
Install Visual Studio Community (On install check Node.JS, C++ development and .Net Framework)


Install application dependencies:
npm install --save-dev @electron-forge/cli
npm exec --package=@electron-forge/cli -c "electron-forge import"
npm install

Then to run the app for testing
npm start

You may need to install the following packages as well: Install using terminal in VScode. 
npm install

Setup on a new Dev Computer run:
npm install --save-dev @electron-forge/cli
npx electron-forge import