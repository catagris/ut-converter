# UT Converter

This repository contains the UT Converter application. The application is used to prepare the development environment on a new computer.

## Prerequisites

Before getting started, ensure that your computer meets the following requirements:
- Operating System: Windows 10
- Visual C++ Redistributable Packages for Visual Studio 2013
- Node.js v18 (with Additional Tools option selected during installation)
- Python (with "Add to PATH" option selected during installation)
- Visual Studio Community (with Node.js, C++ development, and .NET Framework options selected during installation)

## Installation

To install the application and its dependencies, follow these steps:

1. Install the application dependencies:
`npm install --save-dev @electron-forge/cli`
`npm exec --package=@electron-forge/cli -c "electron-forge import"`
`npm install`
2. To run the app for testing, use the following command:
`npm start`

Note: You may need to install additional packages using the terminal in VScode:
`npm install`


## Contributing

Contributions to this project are welcome! To contribute, please follow these steps:
- Fork the repository
- Create a new branch for your feature or bug fix
- Commit your changes
- Push your changes to your forked repository
- Submit a pull request

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

If you have any questions or suggestions, feel free to reach out to the project maintainer.
