const fs = require('fs');
const path = require('path');

async function getAbiList(chain) {
  if (!chain) {
    throw new Error('Chain parameter is required');
  }

  try {
    const abiPath = path.join(__dirname, `../data/abis/${chain}`);
    console.log('Debug - Reading ABIs from:', abiPath);

    const files = fs.readdirSync(abiPath);
    return files.map((file) => path.parse(file).name);
  } catch (error) {
    console.error('Error reading ABI list:', {
      chain,
      error: error.message
    });
    return [];
  }
}

module.exports = getAbiList;
