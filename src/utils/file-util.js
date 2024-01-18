const fs = require('fs');

const jsonFileReader = async (filePath) => {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, (err, fileData) => {
			if (err) {
				console.log(`Error reading ${filePath}`, err);
				return reject(err);
			}
			try {
				const object = JSON.parse(fileData)
				return resolve(object);
			} catch (err) {
				console.log(`Error reading ${filePath}`, err);
				return reject(null);
			}
		})
	});
}

module.exports = {
  jsonFileReader: jsonFileReader
}